using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using Renci.SshNet;
using System.Diagnostics;
using System.ComponentModel;
using System.IO;
using System.IO.Compression;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net;
using System.Net.Sockets;
using System.Net.Security;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Windows;
using MessageBox = System.Windows.MessageBox;
using OpenFileDialog = Microsoft.Win32.OpenFileDialog;
using SaveFileDialog = Microsoft.Win32.SaveFileDialog;

namespace CrestronUiComposer;

public partial class MainWindow : Window
{
    private const string AppHost = "composer.local";
    private const long MaxProjectPackageEntryBytes = 256L * 1024 * 1024;
    private const long MaxCh5PayloadBytes = 512L * 1024 * 1024;
    private const int MaxArchiveEntries = 10_000;
    private readonly string? _initialProjectPath = Environment.GetCommandLineArgs().Skip(1).FirstOrDefault(path => File.Exists(path));
    private readonly string _webMessageToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private bool _editorReady;
    private bool _allowClose;
    private bool _closeCheckRunning;
    private readonly HashSet<string> _previewCertificateHosts = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _approvedPreviewCertificates = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _previewCertificateHostsLock = new();
    private readonly SemaphoreSlim _directCipRelayGate = new(1, 1);
    private DirectCipRelay? _directCipRelay;

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    public MainWindow()
    {
        RefreshProcessPathFromWindows();
        InitializeComponent();
        Loaded += OnLoaded;
        Closing += OnClosing;
        Closed += async (_, _) => await StopDirectCipRelayAsync();
    }

    private static bool IsComposerUri(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) &&
        uri.Host.Equals(AppHost, StringComparison.OrdinalIgnoreCase);

    private static string ValidateNetworkHost(string? value)
    {
        var host = value?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(host) || host.Any(ch => char.IsWhiteSpace(ch) || ch is '/' or '?' or '#'))
            throw new InvalidOperationException("Enter a valid processor host or IP address.");
        return host;
    }

    private static MemoryStream ReadArchiveEntryWithLimit(ZipArchiveEntry entry, long maximumBytes, string description)
    {
        if (entry.Length > maximumBytes)
            throw new InvalidDataException($"The {description} exceeds the supported size limit of {maximumBytes / 1024 / 1024} MB.");
        if (entry.Length > 10 * 1024 * 1024 && entry.CompressedLength > 0 && entry.Length / Math.Max(1, entry.CompressedLength) > 1_000)
            throw new InvalidDataException($"The {description} has an unsafe compression ratio.");
        var memory = new MemoryStream(entry.Length > 0 ? checked((int)entry.Length) : 0);
        using var stream = entry.Open();
        stream.CopyTo(memory);
        memory.Position = 0;
        return memory;
    }

    private bool IsPreparedPreviewHost(string? requestUri)
    {
        if (!Uri.TryCreate(requestUri, UriKind.Absolute, out var uri)) return false;
        lock (_previewCertificateHostsLock) return _previewCertificateHosts.Contains(uri.Host);
    }

    private bool ApprovePreviewCertificate(string host, string fingerprint, string details)
    {
        host = host.Trim('[', ']');
        lock (_previewCertificateHostsLock)
        {
            if (!_previewCertificateHosts.Contains(host)) return false;
            if (_approvedPreviewCertificates.TryGetValue(host, out var approvedFingerprint) &&
                approvedFingerprint.Equals(fingerprint, StringComparison.OrdinalIgnoreCase)) return true;
        }
        bool AskUser() => MessageBox.Show(
            $"The processor at {host} presented a certificate Windows does not trust.\n\n{details}\nSHA-256: {fingerprint}\n\nTrust this exact certificate for the current Composer session?",
            "Trust processor certificate",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning) == MessageBoxResult.Yes;
        var approved = Dispatcher.CheckAccess() ? AskUser() : Dispatcher.Invoke(AskUser);
        if (approved)
            lock (_previewCertificateHostsLock) _approvedPreviewCertificates[host] = fingerprint;
        return approved;
    }

    private void PrepareWebXPanelPreview(string id, JsonElement payload)
    {
        var host = ValidateNetworkHost(payload.GetProperty("host").GetString());
        lock (_previewCertificateHostsLock) _previewCertificateHosts.Add(host.Trim('[', ']'));
        Respond(id, true, new { host }, null);
    }

    private bool IsDirectCipRelayCertificate(Uri requestUri, string fingerprint)
    {
        if (!IPAddress.TryParse(requestUri.Host, out var address) || !IPAddress.IsLoopback(address)) return false;
        return _directCipRelay?.CertificateFingerprint.Equals(fingerprint, StringComparison.OrdinalIgnoreCase) == true;
    }

    private async void StartDirectCipPreview(string id, JsonElement payload)
    {
        try
        {
            var host = ValidateNetworkHost(payload.GetProperty("host").GetString());
            var port = payload.TryGetProperty("port", out var portProperty) &&
                       portProperty.TryGetInt32(out var requestedPort) && requestedPort is > 0 and <= 65535
                ? requestedPort
                : 41794;
            await _directCipRelayGate.WaitAsync();
            try
            {
                if (_directCipRelay is not null) await _directCipRelay.DisposeAsync();
                _directCipRelay = DirectCipRelay.Start(host, port);
                Respond(id, true, new
                {
                    relayHost = IPAddress.Loopback.ToString(),
                    relayPort = _directCipRelay.Port,
                    processorHost = host,
                    processorPort = port,
                }, null);
            }
            finally { _directCipRelayGate.Release(); }
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private async Task StopDirectCipRelayAsync()
    {
        await _directCipRelayGate.WaitAsync();
        try
        {
            if (_directCipRelay is not null) await _directCipRelay.DisposeAsync();
            _directCipRelay = null;
        }
        finally { _directCipRelayGate.Release(); }
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CrestronUiComposer",
                "WebView2");
            CoreWebView2Environment environment;
            try
            {
                environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            }
            catch (COMException ex) when ((uint)ex.HResult == 0x800700AA)
            {
                // A forcibly-closed prior instance can briefly leave its
                // WebView2 profile locked. Do not strand the application
                // behind a startup dialog; an isolated session profile is
                // safe because project/component persistence lives outside
                // WebView2's browser cache.
                var fallbackUserData = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "CrestronUiComposer",
                    "WebView2-Sessions",
                    Environment.ProcessId.ToString());
                environment = await CoreWebView2Environment.CreateAsync(userDataFolder: fallbackUserData);
            }
            await EditorView.EnsureCoreWebView2Async(environment);
            // The editor is shipped beside the executable and changes between
            // builds. Do not let WebView2 silently reuse an older editor.js or
            // editor.css after an application update/rebuild.
            await EditorView.CoreWebView2.Profile.ClearBrowsingDataAsync(
                CoreWebView2BrowsingDataKinds.DiskCache);

            var webRoot = Path.Combine(AppContext.BaseDirectory, "Web");
            if (!File.Exists(Path.Combine(webRoot, "editor.html")))
                throw new FileNotFoundException("The embedded editor assets could not be found.", webRoot);

            EditorView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                AppHost,
                webRoot,
                CoreWebView2HostResourceAccessKind.Allow);
            EditorView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            EditorView.CoreWebView2.Settings.AreDevToolsEnabled = Debugger.IsAttached;
            EditorView.CoreWebView2.NavigationStarting += (_, args) =>
            {
                if (!IsComposerUri(args.Uri)) args.Cancel = true;
            };
            // window.open() gets a separate CoreWebView2 instance. Host it in
            // a real WPF window and apply the preview-only certificate policy
            // there; the main editor never bypasses certificate validation.
            EditorView.CoreWebView2.NewWindowRequested += async (_, args) =>
            {
                var deferral = args.GetDeferral();
                Window? popupWindow = null;
                try
                {
                    popupWindow = new Window { Title = "Crestron UI Composer — Live Preview", Width = 1366, Height = 850 };
                    var popupWebView = new Microsoft.Web.WebView2.Wpf.WebView2();
                    popupWindow.Content = popupWebView;
                    popupWindow.Closed += (_, _) => popupWebView.Dispose();
                    // WebView2 needs a real HWND before initialization can complete.
                    popupWindow.Show();
                    await popupWebView.EnsureCoreWebView2Async(EditorView.CoreWebView2.Environment);
                    popupWebView.CoreWebView2.ServerCertificateErrorDetected += (_, certArgs) =>
                    {
                        if (!Uri.TryCreate(certArgs.RequestUri, UriKind.Absolute, out var certificateUri))
                        {
                            certArgs.Action = CoreWebView2ServerCertificateErrorAction.Cancel;
                            return;
                        }
                        using var certificate = X509Certificate2.CreateFromPem(certArgs.ServerCertificate.ToPemEncoding());
                        var fingerprint = certificate.GetCertHashString(HashAlgorithmName.SHA256);
                        if (IsDirectCipRelayCertificate(certificateUri, fingerprint))
                        {
                            certArgs.Action = CoreWebView2ServerCertificateErrorAction.AlwaysAllow;
                            return;
                        }
                        if (!IsPreparedPreviewHost(certArgs.RequestUri))
                        {
                            certArgs.Action = CoreWebView2ServerCertificateErrorAction.Cancel;
                            return;
                        }
                        certArgs.Action = ApprovePreviewCertificate(certificateUri.Host, fingerprint, certArgs.ErrorStatus.ToString())
                            ? CoreWebView2ServerCertificateErrorAction.AlwaysAllow
                            : CoreWebView2ServerCertificateErrorAction.Cancel;
                    };
                    args.NewWindow = popupWebView.CoreWebView2;
                }
                catch (Exception ex)
                {
                    popupWindow?.Close();
                    MessageBox.Show($"The preview window could not be initialized.\n\n{ex.Message}", "Preview error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                finally
                {
                    deferral.Complete();
                }
            };
            EditorView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            EditorView.NavigationCompleted += (_, args) =>
            {
                LoadingPanel.Visibility = Visibility.Collapsed;
                if (!args.IsSuccess)
                    MessageBox.Show($"The editor failed to load: {args.WebErrorStatus}", "Crestron UI Composer", MessageBoxButton.OK, MessageBoxImage.Error);
                else
                {
                    _editorReady = true;
                    EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "nativeBridgeReady", token = _webMessageToken }));
                    if (_initialProjectPath is not null)
                        EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "openProjectFile", path = _initialProjectPath, contents = File.ReadAllText(_initialProjectPath) }));
                }
            };
            EditorView.Source = new Uri($"https://{AppHost}/editor.html");
        }
        catch (Exception ex)
        {
            LoadingPanel.Visibility = Visibility.Collapsed;
            var message = ex is FileNotFoundException fileError &&
                          fileError.Message.Contains("editor assets", StringComparison.OrdinalIgnoreCase)
                ? "Crestron UI Composer could not start because its editor files are missing. Reinstall the application or extract the entire portable package; do not run the EXE by itself.\n\n" + ex.Message
                : "Crestron UI Composer could not start its embedded WebView2 browser. Install or repair the Microsoft WebView2 Runtime.\n\n" + ex.Message;
            MessageBox.Show(
                message,
                "Startup error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }

    private async void OnClosing(object? sender, CancelEventArgs e)
    {
        if (_allowClose || !_editorReady || EditorView.CoreWebView2 is null) return;
        e.Cancel = true;
        if (_closeCheckRunning) return;
        _closeCheckRunning = true;
        try
        {
            var result = await EditorView.CoreWebView2.ExecuteScriptAsync(
                "window.ComposerCloseBridge ? window.ComposerCloseBridge.prepareClose() : null");
            using var response = JsonDocument.Parse(result);
            if (response.RootElement.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                _allowClose = true;
                Close();
                return;
            }
            var closeState = response.RootElement;
            if (closeState.ValueKind == JsonValueKind.String)
            {
                var nested = closeState.GetString();
                if (string.IsNullOrWhiteSpace(nested)) return;
                response.Dispose();
                using var parsed = JsonDocument.Parse(nested);
                await CompleteCloseCheck(parsed.RootElement.Clone());
                return;
            }
            await CompleteCloseCheck(closeState.Clone());
        }
        catch (Exception ex)
        {
            var choice = MessageBox.Show(
                $"Composer could not verify whether the project has unsaved changes.\n\n{ex.Message}\n\nClose without saving?",
                "Close Crestron UI Composer",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning);
            if (choice == MessageBoxResult.Yes)
            {
                _allowClose = true;
                Close();
            }
        }
        finally { _closeCheckRunning = false; }
    }

    private Task CompleteCloseCheck(JsonElement closeState)
    {
        if (!closeState.TryGetProperty("dirty", out var dirtyValue) || !dirtyValue.GetBoolean())
        {
            _allowClose = true;
            Close();
            return Task.CompletedTask;
        }
        var choice = MessageBox.Show(
            "Do you want to save your changes before closing?",
            "Save Crestron UI Composer Project",
            MessageBoxButton.YesNoCancel,
            MessageBoxImage.Question);
        if (choice == MessageBoxResult.Cancel) return Task.CompletedTask;
        if (choice == MessageBoxResult.No)
        {
            _allowClose = true;
            Close();
            return Task.CompletedTask;
        }
        var errors = closeState.TryGetProperty("errors", out var errorsValue) && errorsValue.ValueKind == JsonValueKind.Array
            ? errorsValue.EnumerateArray().Select(value => value.GetString()).Where(value => !string.IsNullOrWhiteSpace(value)).ToArray()
            : [];
        if (errors.Length > 0)
        {
            MessageBox.Show(
                "The project could not be saved because its integrity check failed:\n\n" + string.Join("\n", errors),
                "Project Save Failed",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            return Task.CompletedTask;
        }
        var contents = closeState.TryGetProperty("contents", out var contentsValue) ? contentsValue.GetString() ?? "" : "";
        var suggestedName = closeState.TryGetProperty("suggestedName", out var nameValue) ? nameValue.GetString() ?? "crestron-ui-project" : "crestron-ui-project";
        var dialog = new SaveFileDialog
        {
            Title = "Save Project Before Closing",
            Filter = "Crestron UI Composer Project (*.cuiproj)|*.cuiproj|JSON Project (*.json)|*.json",
            FileName = SafeFileName(suggestedName, "crestron-ui-project") + ".cuiproj",
            AddExtension = true,
            InitialDirectory = LoadStorageSettings()["projects"]
        };
        if (dialog.ShowDialog(this) != true) return Task.CompletedTask;
        File.WriteAllText(dialog.FileName, contents);
        _allowClose = true;
        Close();
        return Task.CompletedTask;
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        var requestId = "";
        try
        {
            if (!IsComposerUri(e.Source)) return;
            using var message = JsonDocument.Parse(e.WebMessageAsJson);
            var root = message.RootElement;
            if (!root.TryGetProperty("bridgeToken", out var tokenProperty) ||
                !string.Equals(tokenProperty.GetString(), _webMessageToken, StringComparison.Ordinal))
                return;
            var id = root.GetProperty("id").GetString() ?? "";
            requestId = id;
            var command = root.GetProperty("command").GetString() ?? "";

            switch (command)
            {
                case "saveProject":
                    SaveProject(id, root.GetProperty("payload"));
                    break;
                case "exportHtml":
                    SaveText(id, root.GetProperty("payload").GetString() ?? "", "HTML Interface (*.html)|*.html", "index.html", "exports");
                    break;
                case "openProject":
                    OpenProject(id);
                    break;
                case "saveProjectPackage":
                    SaveProjectPackage(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "openProjectPackage":
                    OpenProjectPackage(id);
                    break;
                case "backupProject":
                    BackupProject(id, root.GetProperty("payload"));
                    break;
                case "createProjectBackup":
                    CreateProjectBackup(id, root.GetProperty("payload"));
                    break;
                case "listProjectBackups":
                    ListProjectBackups(id);
                    break;
                case "readProjectBackup":
                    ReadProjectBackup(id, root.GetProperty("payload"));
                    break;
                case "deleteProjectBackup":
                    DeleteProjectBackup(id, root.GetProperty("payload"));
                    break;
                case "saveProjectPreset":
                    SaveProjectPreset(id, root.GetProperty("payload"));
                    break;
                case "listProjectPresets":
                    ListProjectPresets(id);
                    break;
                case "readProjectPreset":
                    ReadProjectPreset(id, root.GetProperty("payload"));
                    break;
                case "deleteProjectPreset":
                    DeleteProjectPreset(id, root.GetProperty("payload"));
                    break;
                case "readComponentLibrary":
                    ReadComponentLibrary(id);
                    break;
                case "writeComponentLibrary":
                    WriteComponentLibrary(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "getStorageSettings":
                    GetStorageSettings(id);
                    break;
                case "selectStorageFolder":
                    SelectStorageFolder(id, root.GetProperty("payload"));
                    break;
                case "openStorageFolder":
                    OpenStorageFolder(id, root.GetProperty("payload"));
                    break;
                case "checkForUpdates":
                    CheckForUpdates(id);
                    break;
                case "openExternalUrl":
                    OpenExternalUrl(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "importSnippets":
                    ImportSnippets(id);
                    break;
                case "importAssets":
                    ImportAssets(id);
                    break;
                case "buildCh5Package":
                    BuildCh5Package(id, root.GetProperty("payload"));
                    break;
                case "buildCh5Packages":
                    BuildCh5Packages(id, root.GetProperty("payload"));
                    break;
                case "buildSelfTest":
                    BuildSelfTest(id, root.GetProperty("payload"));
                    break;
                case "selectCh5Package":
                    SelectCh5Package(id);
                    break;
                case "inspectCh5Package":
                    InspectCh5Package(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "checkPanel":
                    CheckPanel(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "checkProcessorConnection":
                    CheckProcessorConnection(id, root.GetProperty("payload"));
                    break;
                case "startDirectCipPreview":
                    StartDirectCipPreview(id, root.GetProperty("payload"));
                    break;
                case "launchVirtualPanelPreview":
                    LaunchVirtualPanelPreview(id, root.GetProperty("payload"));
                    break;
                case "prepareWebXPanelPreview":
                    PrepareWebXPanelPreview(id, root.GetProperty("payload"));
                    break;
                case "getWebXPanelToken":
                    GetWebXPanelToken(id, root.GetProperty("payload"));
                    break;
                case "checkDeploymentProfile":
                    CheckDeploymentProfile(id, root.GetProperty("payload"));
                    break;
                case "deployCh5Package":
                    DeployCh5Package(id, root.GetProperty("payload"));
                    break;
                case "deployCh5PackageWait":
                    DeployCh5PackageWait(id, root.GetProperty("payload"));
                    break;
                case "deploySshPackage":
                    DeploySshPackage(id, root.GetProperty("payload"));
                    break;
                case "testDeploymentConnection":
                    TestDeploymentConnection(id, root.GetProperty("payload"));
                    break;
                case "saveDeploymentCredential":
                    SaveDeploymentCredential(id, root.GetProperty("payload"));
                    break;
                case "deleteDeploymentCredential":
                    DeleteDeploymentCredential(id, root.GetProperty("payload"));
                    break;
                case "hasDeploymentCredential":
                    HasDeploymentCredential(id, root.GetProperty("payload"));
                    break;
                case "systemDiagnostics":
                    SystemDiagnostics(id);
                    break;
                case "installPrerequisite":
                    InstallPrerequisite(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "openSettingsFolder":
                    OpenSettingsFolder(id);
                    break;
                case "writeRecovery":
                    WriteRecovery(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "readRecovery":
                    ReadRecovery(id);
                    break;
                case "clearRecovery":
                    ClearRecovery(id);
                    break;
                case "saveContractEditorProject":
                    SaveContractEditorProject(id, root.GetProperty("payload"), false);
                    break;
                case "openContractEditorProject":
                    SaveContractEditorProject(id, root.GetProperty("payload"), true);
                    break;
                case "buildChdFile":
                    BuildChdFile(id, root.GetProperty("payload"));
                    break;
                default:
                    Respond(id, false, null, $"Unknown desktop command: {command}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Respond(requestId, false, null, ex.Message);
        }
    }

    private void SaveText(string id, string contents, string filter, string defaultName, string storageKey)
    {
        var dialog = new SaveFileDialog { Filter = filter, FileName = defaultName, AddExtension = true, InitialDirectory = LoadStorageSettings()[storageKey] };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        File.WriteAllText(dialog.FileName, contents);
        Respond(id, true, dialog.FileName, null);
    }

    private static bool WriteTextIfChanged(string path, string contents)
    {
        if (File.Exists(path) && string.Equals(File.ReadAllText(path), contents, StringComparison.Ordinal))
            return false;
        File.WriteAllText(path, contents);
        return true;
    }

    private void SaveProject(string id, JsonElement payload)
    {
        var legacyPayload = payload.ValueKind == JsonValueKind.String;
        var contents = legacyPayload ? payload.GetString() ?? "" : payload.GetProperty("contents").GetString() ?? "";
        var requestedName = legacyPayload || !payload.TryGetProperty("name", out var nameValue)
            ? "crestron-ui-project"
            : nameValue.GetString() ?? "crestron-ui-project";
        var fileName = SafeFileName(requestedName, "crestron-ui-project");
        var dialog = new SaveFileDialog
        {
            Filter = "Crestron UI Composer Project (*.cuiproj)|*.cuiproj|JSON Project (*.json)|*.json",
            FileName = fileName + ".cuiproj",
            AddExtension = true,
            InitialDirectory = LoadStorageSettings()["projects"]
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        File.WriteAllText(dialog.FileName, contents);

        string? chdPath = null;
        var chdChanged = false;
        if (!legacyPayload && payload.TryGetProperty("chdContents", out var chdValue) && chdValue.ValueKind == JsonValueKind.String)
        {
            var chdContents = chdValue.GetString();
            if (!string.IsNullOrWhiteSpace(chdContents))
            {
                chdPath = Path.ChangeExtension(dialog.FileName, ".chd");
                chdChanged = WriteTextIfChanged(chdPath, chdContents);
            }
        }
        Respond(id, true, new { path = dialog.FileName, chdPath, chdChanged }, null);
    }

    private void SaveContractEditorProject(string id, JsonElement payload, bool openAfterSave)
    {
        var contents = payload.GetProperty("contents").GetString() ?? "";
        ValidateContractEditorProject(contents);
        var requestedName = payload.TryGetProperty("name", out var nameValue) ? nameValue.GetString() ?? "CrestronUiContract" : "CrestronUiContract";
        var fileName = new string(requestedName.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or ' ').ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(fileName)) fileName = "CrestronUiContract";
        var dialog = new SaveFileDialog
        {
            Title = openAfterSave ? "Import into Crestron Contract Editor" : "Export Contract Editor Project",
            Filter = "Crestron Contract Editor Project (*.cce)|*.cce",
            FileName = fileName + ".cce",
            AddExtension = true,
            InitialDirectory = LoadStorageSettings()["exports"]
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        File.WriteAllText(dialog.FileName, contents);
        if (openAfterSave)
        {
            try
            {
                var contractEditor = FindContractEditor();
                if (contractEditor is null)
                    throw new FileNotFoundException("Crestron CH5 Contract Editor was not found. Install Contract Editor and try again.");
                OpenContractEditorProject(contractEditor, dialog.FileName);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    "The .cce project was saved, but Contract Editor could not open it.\n\n" +
                    "Reason: " + ex.Message + "\n\nSaved to: " + dialog.FileName,
                    ex);
            }
        }
        Respond(id, true, new { path = dialog.FileName, opened = openAfterSave }, null);
    }

    private void BuildChdFile(string id, JsonElement payload)
    {
        var contents = payload.GetProperty("contents").GetString() ?? "";
        if (string.IsNullOrWhiteSpace(contents))
            throw new InvalidDataException("The generated SIMPL interface is empty. Assign at least one contract binding before building it.");
        var requestedName = payload.TryGetProperty("name", out var nameValue) ? nameValue.GetString() ?? "CrestronUiContract" : "CrestronUiContract";
        var fileName = new string(requestedName.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or ' ').ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(fileName)) fileName = "CrestronUiContract";
        var dialog = new SaveFileDialog
        {
            Title = "Build SIMPL Windows Interface",
            Filter = "SIMPL Windows Interface (*.chd)|*.chd",
            FileName = fileName + ".chd",
            AddExtension = true,
            InitialDirectory = LoadStorageSettings()["exports"]
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        var changed = WriteTextIfChanged(dialog.FileName, contents);
        Respond(id, true, new { path = dialog.FileName, changed }, null);
    }

    private static void ValidateContractEditorProject(string contents)
    {
        if (string.IsNullOrWhiteSpace(contents))
            throw new InvalidDataException("The generated Contract Editor project is empty.");

        using var document = JsonDocument.Parse(contents);
        var root = document.RootElement;
        if (!root.TryGetProperty("components", out var components) ||
            components.ValueKind != JsonValueKind.Array ||
            components.GetArrayLength() == 0)
        {
            throw new InvalidDataException(
                "The generated Contract Editor project contains no components. Assign at least one contract binding before opening it.");
        }
    }

    private static void OpenContractEditorProject(string contractEditor, string projectPath)
    {
        if (!File.Exists(projectPath))
            throw new FileNotFoundException("The generated Contract Editor project could not be found.", projectPath);

        var editorProcess = Process.GetProcessesByName("CH5-Contract-Editor")
            .FirstOrDefault(process => process.MainWindowHandle != IntPtr.Zero);

        // Contract Editor does not register .cce files with Windows and does not accept
        // a project path on its command line. A failed command-line launch can leave its
        // Electron helper processes alive without a window; clear only that headless
        // instance before starting the editor normally.
        if (editorProcess is null)
        {
            foreach (var process in Process.GetProcessesByName("CH5-Contract-Editor"))
            {
                try { process.Kill(true); process.WaitForExit(3000); }
                catch { /* A helper may exit while the process list is being cleared. */ }
            }

            // Launch the installed Start Menu shortcut when available. This old
            // Electron/Squirrel package relies on its shell shortcut context and may
            // create only Chromium helper processes when its EXE is started directly.
            var shortcut = FindContractEditorShortcut();
            var explorer = new ProcessStartInfo("explorer.exe") { UseShellExecute = true };
            explorer.ArgumentList.Add(shortcut ?? contractEditor);
            Process.Start(explorer);
            var deadline = DateTime.UtcNow.AddSeconds(20);
            while (DateTime.UtcNow < deadline)
            {
                Thread.Sleep(250);
                editorProcess = Process.GetProcessesByName("CH5-Contract-Editor")
                    .FirstOrDefault(process => process.MainWindowHandle != IntPtr.Zero);
                if (editorProcess is not null) break;
            }
        }

        if (editorProcess is null || editorProcess.MainWindowHandle == IntPtr.Zero)
            throw new InvalidOperationException("Crestron Contract Editor did not create a visible window.");

        SetForegroundWindow(editorProcess.MainWindowHandle);
        Thread.Sleep(500);
        // Contract Editor 1.x has no reliable command-line open action or standard
        // Ctrl+O shortcut. Sending Ctrl+O can invoke Save As and overwrite the
        // populated CCE with a blank contract. Keep the validated file intact, copy
        // its path, and select it in Explorer for the editor's Open Project command.
        System.Windows.Clipboard.SetText(projectPath);
        var selectFile = new ProcessStartInfo("explorer.exe") { UseShellExecute = true };
        selectFile.ArgumentList.Add("/select," + projectPath);
        Process.Start(selectFile);
    }

    private static string? FindContractEditor()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Crestron", "CH5-contract-editor", "CH5-Contract-Editor.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "CH5-contract-editor", "CH5-Contract-Editor.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Crestron", "CH5 Contract Editor", "CH5-Contract-Editor.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Crestron", "CH5 Contract Editor", "CH5-Contract-Editor.exe")
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static string? FindContractEditorShortcut()
    {
        var startMenus = new[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
            Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu)
        };
        foreach (var startMenu in startMenus.Where(Directory.Exists))
        {
            var shortcut = Directory.EnumerateFiles(startMenu, "CH5-Contract-Editor.lnk", SearchOption.AllDirectories)
                .FirstOrDefault();
            if (shortcut is not null) return shortcut;
        }
        return null;
    }

    private static string RecoveryFilePath()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "CrestronUiComposer",
            "Recovery",
            "recovery.json");
    }

    private void WriteRecovery(string id, string contents)
    {
        var path = RecoveryFilePath();
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporaryPath = path + ".tmp";
        File.WriteAllText(temporaryPath, contents);
        File.Move(temporaryPath, path, true);
        Respond(id, true, new { path }, null);
    }

    private void ReadRecovery(string id)
    {
        var path = RecoveryFilePath();
        Respond(id, true, File.Exists(path) ? File.ReadAllText(path) : "", null);
    }

    private void ClearRecovery(string id)
    {
        var path = RecoveryFilePath();
        if (File.Exists(path)) File.Delete(path);
        var temporaryPath = path + ".tmp";
        if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
        Respond(id, true, true, null);
    }

    private void OpenProject(string id)
    {
        var dialog = new OpenFileDialog { Filter = "Crestron UI Composer Project (*.cuiproj)|*.cuiproj|JSON Project (*.json)|*.json|All files (*.*)|*.*", Multiselect = false, InitialDirectory = LoadStorageSettings()["projects"] };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        Respond(id, true, new { path = dialog.FileName, contents = File.ReadAllText(dialog.FileName) }, null);
    }

    private void SaveProjectPackage(string id, string projectJson)
    {
        using var project = JsonDocument.Parse(projectJson);
        var root = project.RootElement;
        var requestedName = root.TryGetProperty("contract", out var contract) &&
                            contract.TryGetProperty("name", out var contractName)
            ? contractName.GetString() ?? "CrestronUiProject"
            : "CrestronUiProject";
        var packageName = SafeFileName(requestedName, "CrestronUiProject");
        var dialog = new SaveFileDialog
        {
            Title = "Save Portable Project Package",
            Filter = "Crestron UI Portable Package (*.cuipkg)|*.cuipkg",
            FileName = packageName + ".cuipkg",
            AddExtension = true,
            InitialDirectory = LoadStorageSettings()["packages"]
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }

        using var file = new FileStream(dialog.FileName, FileMode.Create, FileAccess.Write, FileShare.None);
        using var archive = new ZipArchive(file, ZipArchiveMode.Create);
        WriteArchiveText(archive, "project.cuiproj", projectJson);

        var assetCount = 0;
        if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
        {
            foreach (var asset in assets.EnumerateArray())
            {
                var dataUrl = asset.TryGetProperty("dataUrl", out var data) ? data.GetString() ?? "" : "";
                var comma = dataUrl.IndexOf(',');
                if (comma < 0) continue;
                var name = asset.TryGetProperty("name", out var assetName) ? assetName.GetString() ?? "asset" : "asset";
                var idValue = asset.TryGetProperty("id", out var assetId) ? assetId.GetString() ?? $"asset-{assetCount + 1}" : $"asset-{assetCount + 1}";
                var entryName = $"assets/{SafeFileName(idValue, $"asset-{assetCount + 1}")}-{SafeFileName(name, "asset")}";
                var metadata = dataUrl[..comma];
                var payload = dataUrl[(comma + 1)..];
                byte[] bytes;
                try
                {
                    bytes = metadata.Contains(";base64", StringComparison.OrdinalIgnoreCase)
                        ? Convert.FromBase64String(payload)
                        : System.Text.Encoding.UTF8.GetBytes(Uri.UnescapeDataString(payload));
                }
                catch { continue; }
                var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
                using var stream = entry.Open();
                stream.Write(bytes);
                assetCount++;
            }
        }

        var componentCount = 0;
        if (root.TryGetProperty("customComponents", out var components) && components.ValueKind == JsonValueKind.Array)
        {
            foreach (var component in components.EnumerateArray())
            {
                var name = component.TryGetProperty("name", out var componentName) ? componentName.GetString() ?? $"component-{componentCount + 1}" : $"component-{componentCount + 1}";
                WriteArchiveText(archive, $"components/{SafeFileName(name, $"component-{componentCount + 1}")}.json", component.GetRawText());
                componentCount++;
            }
        }

        var manifest = JsonSerializer.Serialize(new
        {
            format = "crestron-ui-composer-portable-project",
            version = 1,
            createdUtc = DateTime.UtcNow,
            applicationVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown",
            projectFile = "project.cuiproj",
            assets = assetCount,
            customComponents = componentCount
        }, new JsonSerializerOptions { WriteIndented = true });
        WriteArchiveText(archive, "package-manifest.json", manifest);
        Respond(id, true, new { path = dialog.FileName, assets = assetCount, customComponents = componentCount }, null);
    }

    private void OpenProjectPackage(string id)
    {
        var dialog = new OpenFileDialog
        {
            Title = "Open Portable Project Package",
            Filter = "Crestron UI Portable Package (*.cuipkg)|*.cuipkg",
            Multiselect = false,
            InitialDirectory = LoadStorageSettings()["packages"]
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        using var archive = ZipFile.OpenRead(dialog.FileName);
        if (archive.Entries.Count > MaxArchiveEntries)
            throw new InvalidDataException($"This package contains too many entries (maximum {MaxArchiveEntries:N0}).");
        var projectEntry = archive.GetEntry("project.cuiproj")
            ?? throw new InvalidDataException("This package does not contain project.cuiproj.");
        if (projectEntry.Length > MaxProjectPackageEntryBytes)
            throw new InvalidDataException($"The project exceeds the supported size limit of {MaxProjectPackageEntryBytes / 1024 / 1024} MB.");
        using var reader = new StreamReader(projectEntry.Open());
        var contents = reader.ReadToEnd();
        using var validation = JsonDocument.Parse(contents);
        Respond(id, true, new { path = dialog.FileName, contents }, null);
    }

    private static void WriteArchiveText(ZipArchive archive, string path, string contents)
    {
        var entry = archive.CreateEntry(path, CompressionLevel.Optimal);
        using var writer = new StreamWriter(entry.Open());
        writer.Write(contents);
    }

    private static string SafeFileName(string value, string fallback)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safe = new string(value.Where(ch => !invalid.Contains(ch) && !char.IsControl(ch)).ToArray()).Trim().Trim('.');
        return string.IsNullOrWhiteSpace(safe) ? fallback : safe;
    }

    private void BackupProject(string id, JsonElement payload)
    {
        var sourcePath = payload.GetProperty("path").GetString() ?? "";
        if (string.IsNullOrWhiteSpace(sourcePath) || !File.Exists(sourcePath))
            throw new FileNotFoundException("The original project could not be found for backup.", sourcePath);
        var folder = Path.GetDirectoryName(sourcePath) ?? Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        var name = Path.GetFileNameWithoutExtension(sourcePath);
        var extension = Path.GetExtension(sourcePath);
        var backupPath = Path.Combine(folder, $"{name}.pre-migration-{DateTime.Now:yyyyMMdd-HHmmss}{extension}");
        File.Copy(sourcePath, backupPath, false);
        Respond(id, true, backupPath, null);
    }

    private static string ProjectBackupFolder()
    {
        return LoadStorageSettings()["backups"];
    }

    private static string StorageSettingsPath() => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "storage-settings.json");

    private static string ComponentLibraryPath()
    {
        var folder = Path.Combine(LoadStorageSettings()["templates"], "Composer Component Library");
        Directory.CreateDirectory(folder);
        return Path.Combine(folder, "custom-components.json");
    }

    private void ReadComponentLibrary(string id)
    {
        var path = ComponentLibraryPath();
        Respond(id, true, File.Exists(path) ? File.ReadAllText(path) : "", null);
    }

    private void WriteComponentLibrary(string id, string contents)
    {
        if (string.IsNullOrWhiteSpace(contents))
            throw new InvalidOperationException("The component library cannot be empty.");
        using (JsonDocument.Parse(contents)) { }
        var path = ComponentLibraryPath();
        var temporaryPath = path + ".tmp";
        File.WriteAllText(temporaryPath, contents);
        File.Move(temporaryPath, path, true);
        Respond(id, true, path, null);
    }

    private static Dictionary<string, string> DefaultStorageSettings()
    {
        var documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        var root = Path.Combine(documents, "Crestron UI Composer");
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["projects"] = Path.Combine(root, "Projects"),
            ["packages"] = Path.Combine(root, "Portable Packages"),
            ["exports"] = Path.Combine(root, "Exports"),
            ["backups"] = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "ProjectBackups"),
            ["assets"] = Path.Combine(root, "Assets"),
            ["templates"] = Path.Combine(root, "Components and Templates")
        };
    }

    private static Dictionary<string, string> LoadStorageSettings()
    {
        var settings = DefaultStorageSettings();
        var path = StorageSettingsPath();
        if (File.Exists(path))
        {
            try
            {
                var saved = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path));
                if (saved is not null)
                    foreach (var entry in saved)
                        if (settings.ContainsKey(entry.Key) && !string.IsNullOrWhiteSpace(entry.Value)) settings[entry.Key] = Path.GetFullPath(entry.Value);
            }
            catch { }
        }
        foreach (var folder in settings.Values) Directory.CreateDirectory(folder);
        return settings;
    }

    private static void SaveStorageSettings(Dictionary<string, string> settings)
    {
        var path = StorageSettingsPath();
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true }));
    }

    private void GetStorageSettings(string id) => Respond(id, true, LoadStorageSettings(), null);

    private void SelectStorageFolder(string id, JsonElement payload)
    {
        var key = payload.GetProperty("key").GetString() ?? "";
        var settings = LoadStorageSettings();
        if (!settings.ContainsKey(key)) throw new InvalidOperationException("Unknown storage location.");
        var dialog = new OpenFolderDialog { Title = $"Choose {key} folder", InitialDirectory = settings[key], Multiselect = false };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        settings[key] = Path.GetFullPath(dialog.FolderName);
        Directory.CreateDirectory(settings[key]);
        SaveStorageSettings(settings);
        Respond(id, true, settings, null);
    }

    private void OpenStorageFolder(string id, JsonElement payload)
    {
        var key = payload.GetProperty("key").GetString() ?? "";
        var settings = LoadStorageSettings();
        if (!settings.TryGetValue(key, out var folder)) throw new InvalidOperationException("Unknown storage location.");
        Directory.CreateDirectory(folder);
        Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
        Respond(id, true, folder, null);
    }

    private async void CheckForUpdates(string id)
    {
        try
        {
            const string releasesApi = "https://api.github.com/repos/jobu109/crestron-ui-composer/releases/latest";
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            client.DefaultRequestHeaders.UserAgent.ParseAdd("CrestronUiComposer-Updater/1.0");
            using var response = await client.GetAsync(releasesApi);
            var current = Assembly.GetExecutingAssembly().GetName().Version ?? new Version(0, 0, 0);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Respond(id, true, new { currentVersion = DisplayVersion(current), latestVersion = "", updateAvailable = false, releaseNotes = "", releaseUrl = "", downloadUrl = "" }, null);
                return;
            }
            response.EnsureSuccessStatusCode();
            using var release = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = release.RootElement;
            var tag = root.TryGetProperty("tag_name", out var tagValue) ? tagValue.GetString() ?? "" : "";
            var latest = ParseReleaseVersion(tag);
            var releaseUrl = root.TryGetProperty("html_url", out var htmlUrl) ? htmlUrl.GetString() ?? "" : "";
            var notes = root.TryGetProperty("body", out var body) ? body.GetString() ?? "" : "";
            var downloadUrl = "";
            if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
            {
                var preferred = assets.EnumerateArray()
                    .Select(asset => new
                    {
                        name = asset.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
                        url = asset.TryGetProperty("browser_download_url", out var url) ? url.GetString() ?? "" : ""
                    })
                    .OrderBy(asset => asset.name.EndsWith(".msi", StringComparison.OrdinalIgnoreCase) ? 0 : asset.name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? 1 : asset.name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) ? 2 : 3)
                    .FirstOrDefault(asset => !string.IsNullOrWhiteSpace(asset.url));
                downloadUrl = preferred?.url ?? "";
            }
            Respond(id, true, new
            {
                currentVersion = DisplayVersion(current),
                latestVersion = latest is null ? tag : DisplayVersion(latest),
                updateAvailable = latest is not null && latest > current,
                releaseNotes = notes,
                releaseUrl,
                downloadUrl
            }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private static Version? ParseReleaseVersion(string value)
    {
        var clean = value.Trim().TrimStart('v', 'V').Split('-', '+')[0];
        return Version.TryParse(clean, out var version) ? version : null;
    }

    private static string DisplayVersion(Version version) => version.Revision > 0
        ? $"{version.Major}.{version.Minor}.{version.Build}.{version.Revision}"
        : $"{version.Major}.{version.Minor}.{Math.Max(0, version.Build)}";

    private void OpenExternalUrl(string id, string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps ||
            !(uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase) || uri.Host.EndsWith(".githubusercontent.com", StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Only trusted GitHub update links can be opened.");
        Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        Respond(id, true, true, null);
    }

    private void CreateProjectBackup(string id, JsonElement payload)
    {
        var contents = payload.GetProperty("contents").GetString() ?? "";
        using var validation = JsonDocument.Parse(contents);
        var requestedName = payload.TryGetProperty("name", out var nameValue) ? nameValue.GetString() ?? "CrestronUiProject" : "CrestronUiProject";
        var reason = payload.TryGetProperty("reason", out var reasonValue) ? reasonValue.GetString() ?? "manual" : "manual";
        var folder = ProjectBackupFolder();
        Directory.CreateDirectory(folder);
        var safeName = SafeFileName(requestedName, "CrestronUiProject");
        var safeReason = SafeFileName(reason, "manual");
        var name = $"{DateTime.Now:yyyyMMdd-HHmmss-fff}-{safeName}-{safeReason}.cuiproj";
        var path = Path.Combine(folder, name);
        File.WriteAllText(path, contents);
        Respond(id, true, new { path, name }, null);
    }

    private void ListProjectBackups(string id)
    {
        var folder = ProjectBackupFolder();
        Directory.CreateDirectory(folder);
        var backups = Directory.EnumerateFiles(folder, "*.cuiproj", SearchOption.TopDirectoryOnly)
            .Select(path => new FileInfo(path))
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .Select(file => new { path = file.FullName, name = file.Name, modifiedUtc = file.LastWriteTimeUtc, size = file.Length })
            .ToArray();
        Respond(id, true, backups, null);
    }

    private static string ValidateProjectBackupPath(JsonElement payload)
    {
        var requested = payload.GetProperty("path").GetString() ?? "";
        var folder = Path.GetFullPath(ProjectBackupFolder()).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(requested);
        if (!path.StartsWith(folder, StringComparison.OrdinalIgnoreCase) || !path.EndsWith(".cuiproj", StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("The selected file is not in the project backup folder.");
        return path;
    }

    private void ReadProjectBackup(string id, JsonElement payload)
    {
        var path = ValidateProjectBackupPath(payload);
        if (!File.Exists(path)) throw new FileNotFoundException("The selected backup no longer exists.", path);
        var contents = File.ReadAllText(path);
        using var validation = JsonDocument.Parse(contents);
        Respond(id, true, new { path, contents }, null);
    }

    private void DeleteProjectBackup(string id, JsonElement payload)
    {
        var path = ValidateProjectBackupPath(payload);
        if (File.Exists(path)) File.Delete(path);
        Respond(id, true, true, null);
    }

    private static string ProjectPresetFolder() => Path.Combine(LoadStorageSettings()["templates"], "Project Presets");

    private void SaveProjectPreset(string id, JsonElement payload)
    {
        var contents = payload.GetProperty("contents").GetString() ?? "";
        using var validation = JsonDocument.Parse(contents);
        var requestedName = payload.TryGetProperty("name", out var nameValue) ? nameValue.GetString() ?? "Project Preset" : "Project Preset";
        var displayName = requestedName.Trim();
        if (string.IsNullOrWhiteSpace(displayName)) throw new InvalidOperationException("Enter a name for the preset template.");
        var folder = ProjectPresetFolder();
        Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, SafeFileName(displayName, "Project Preset") + ".cuipreset");
        File.WriteAllText(path, JsonSerializer.Serialize(new { format = "crestron-ui-composer-project-preset", version = 1, name = displayName, savedUtc = DateTime.UtcNow, project = JsonDocument.Parse(contents).RootElement }, new JsonSerializerOptions { WriteIndented = true }));
        var file = new FileInfo(path);
        Respond(id, true, new { path, name = displayName, modifiedUtc = file.LastWriteTimeUtc, size = file.Length }, null);
    }

    private void ListProjectPresets(string id)
    {
        var folder = ProjectPresetFolder();
        Directory.CreateDirectory(folder);
        var presets = Directory.EnumerateFiles(folder, "*.cuipreset", SearchOption.TopDirectoryOnly)
            .Select(path =>
            {
                var file = new FileInfo(path);
                var name = Path.GetFileNameWithoutExtension(path);
                try
                {
                    using var document = JsonDocument.Parse(File.ReadAllText(path));
                    if (document.RootElement.TryGetProperty("name", out var value)) name = value.GetString() ?? name;
                }
                catch { }
                return new { path = file.FullName, name, modifiedUtc = file.LastWriteTimeUtc, size = file.Length };
            })
            .OrderByDescending(entry => entry.modifiedUtc)
            .ToArray();
        Respond(id, true, presets, null);
    }

    private static string ValidateProjectPresetPath(JsonElement payload)
    {
        var requested = payload.GetProperty("path").GetString() ?? "";
        var folder = Path.GetFullPath(ProjectPresetFolder()).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(requested);
        if (!path.StartsWith(folder, StringComparison.OrdinalIgnoreCase) || !path.EndsWith(".cuipreset", StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("The selected file is not in the project preset folder.");
        return path;
    }

    private void ReadProjectPreset(string id, JsonElement payload)
    {
        var path = ValidateProjectPresetPath(payload);
        if (!File.Exists(path)) throw new FileNotFoundException("The selected preset no longer exists.", path);
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var root = document.RootElement;
        if (!root.TryGetProperty("project", out var project)) throw new InvalidDataException("The preset does not contain a project.");
        Respond(id, true, new { path, name = root.TryGetProperty("name", out var name) ? name.GetString() : Path.GetFileNameWithoutExtension(path), contents = project.GetRawText() }, null);
    }

    private void DeleteProjectPreset(string id, JsonElement payload)
    {
        var path = ValidateProjectPresetPath(payload);
        if (File.Exists(path)) File.Delete(path);
        Respond(id, true, true, null);
    }

    private void ImportSnippets(string id)
    {
        var dialog = new OpenFileDialog { Filter = "HTML snippets (*.html)|*.html", Multiselect = true, InitialDirectory = LoadStorageSettings()["templates"] };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        var files = dialog.FileNames.Select(path => new { name = Path.GetFileName(path), html = File.ReadAllText(path) }).ToArray();
        Respond(id, true, files, null);
    }

    private void ImportAssets(string id)
    {
        var dialog = new OpenFileDialog
        {
            Title = "Import from Asset Library",
            Filter = "Supported assets|*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg;*.mp4;*.webm;*.mp3;*.wav;*.ogg;*.woff;*.woff2;*.ttf;*.otf|All files (*.*)|*.*",
            Multiselect = true,
            InitialDirectory = LoadStorageSettings()["assets"]
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        var files = dialog.FileNames.Select(path =>
        {
            var bytes = File.ReadAllBytes(path);
            var type = AssetMimeType(Path.GetExtension(path));
            return new { name = Path.GetFileName(path), type, size = bytes.Length, dataUrl = $"data:{type};base64,{Convert.ToBase64String(bytes)}" };
        }).ToArray();
        Respond(id, true, files, null);
    }

    private static string AssetMimeType(string extension) => extension.ToLowerInvariant() switch
    {
        ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", ".gif" => "image/gif",
        ".webp" => "image/webp", ".svg" => "image/svg+xml", ".mp4" => "video/mp4",
        ".webm" => "video/webm", ".mp3" => "audio/mpeg", ".wav" => "audio/wav",
        ".ogg" => "audio/ogg", ".woff" => "font/woff", ".woff2" => "font/woff2",
        ".ttf" => "font/ttf", ".otf" => "font/otf", _ => "application/octet-stream"
    };

    private void BuildCh5Package(string id, JsonElement payload)
    {
        var html = payload.GetProperty("html").GetString() ?? "";
        var requestedName = payload.GetProperty("projectName").GetString() ?? "CrestronUi";
        var usesContracts = payload.TryGetProperty("usesContracts", out var contractFlag) && contractFlag.GetBoolean();
        var deviceJson = payload.TryGetProperty("device", out var device) ? device.GetRawText() : "{}";
        var projectName = new string(requestedName.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
        if (string.IsNullOrWhiteSpace(projectName)) throw new InvalidOperationException("The package name must contain letters or numbers.");

        string? contractPath = null;
        string? generatedContractMapping = null;
        if (usesContracts)
        {
            if (payload.TryGetProperty("contractMapping", out var mappingProp) && mappingProp.ValueKind == JsonValueKind.String)
                generatedContractMapping = mappingProp.GetString();
            if (string.IsNullOrWhiteSpace(generatedContractMapping))
            {
                // Composer generates the .cse2j mapping inline from its own contract data; this
                // dialog only remains as a fallback if that generation did not run (e.g. an older
                // cached page) or the caller explicitly wants to supply a Contract Editor file.
                var contractDialog = new OpenFileDialog { Title = "Select the Contract Editor mapping (.cse2j)", Filter = "Contract Editor mapping (.cse2j)|*.cse2j", Multiselect = false };
                if (contractDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
                contractPath = contractDialog.FileName;
                ValidateContractMapping(contractPath);
            }
        }

        var saveDialog = new SaveFileDialog { Title = "Build Crestron CH5 Package", Filter = "Crestron HTML5 Archive (*.ch5z)|*.ch5z", FileName = projectName + ".ch5z", AddExtension = true, InitialDirectory = LoadStorageSettings()["exports"] };
        if (saveDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        projectName = new string(Path.GetFileNameWithoutExtension(saveDialog.FileName)
            .Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
        if (string.IsNullOrWhiteSpace(projectName))
            throw new InvalidOperationException("The package file name must contain letters or numbers.");

        var cli = FindCh5Cli();
        if (cli is null) throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before building a panel package.");
        var runtime = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js");
        if (!File.Exists(runtime)) throw new FileNotFoundException("The packaged CrComLib runtime is missing.", runtime);
        var destinationPath = saveDialog.FileName;

        RunBackgroundCommand(id, () =>
        {
            var workRoot = Path.Combine(Path.GetTempPath(), "CrestronUiComposer", Guid.NewGuid().ToString("N"));
            var source = Path.Combine(workRoot, "project");
            var output = Path.Combine(workRoot, "output");
            Directory.CreateDirectory(source);
            Directory.CreateDirectory(output);
            try
            {
                File.WriteAllText(Path.Combine(source, "index.html"), html);
                File.WriteAllText(Path.Combine(source, "composer-target.json"), deviceJson);
                WriteConstructProjectConfig(source);
                File.Copy(runtime, Path.Combine(source, "cr-com-lib.js"), true);
                var runtimeLicense = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js.LICENSE.txt");
                if (File.Exists(runtimeLicense)) File.Copy(runtimeLicense, Path.Combine(source, "cr-com-lib.js.LICENSE.txt"), true);
                CopyWebXPanelRuntime(source);

                string archiveContractPath;
                if (!string.IsNullOrWhiteSpace(generatedContractMapping))
                {
                    archiveContractPath = Path.Combine(workRoot, projectName + ".cse2j");
                    File.WriteAllText(archiveContractPath, generatedContractMapping);
                    ValidateContractMapping(archiveContractPath);
                }
                else
                {
                    archiveContractPath = contractPath ?? CreateEmptyContractMapping(workRoot, projectName);
                }
                var arguments = $"/d /s /c \"\"{cli}\" archive -p \"{projectName}\" -d \"{source}\" -o \"{output}\" -c \"{archiveContractPath}\" -P \"samplesource=Shell\"";
                arguments += "\"";
                var start = new ProcessStartInfo("cmd.exe", arguments) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
                using var process = Process.Start(start) ?? throw new InvalidOperationException("The Crestron archive utility could not be started.");
                var stdOutTask = process.StandardOutput.ReadToEndAsync();
                var stdErrTask = process.StandardError.ReadToEndAsync();
                process.WaitForExit();
                var stdOut = stdOutTask.GetAwaiter().GetResult();
                var stdErr = stdErrTask.GetAwaiter().GetResult();
                if (process.ExitCode != 0) throw new InvalidOperationException("Crestron ch5-cli failed:\n" + stdErr + "\n" + stdOut);

                var archive = Path.Combine(output, projectName + ".ch5z");
                ValidateCh5Archive(archive);
                File.Copy(archive, destinationPath, true);
                ValidateCh5Archive(destinationPath);
                var file = new FileInfo(destinationPath);
                var sha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(destinationPath)));
                return new { path = destinationPath, projectName, usedContract = contractPath is not null || generatedContractMapping is not null, size = file.Length, sha256 };
            }
            finally
            {
                try { Directory.Delete(workRoot, true); } catch { }
            }
        });
    }

    private void BuildCh5Packages(string id, JsonElement payload)
    {
        var packages = payload.GetProperty("packages").EnumerateArray().ToArray();
        if (packages.Length == 0) throw new InvalidOperationException("Select at least one panel package.");
        var usesContracts = payload.TryGetProperty("usesContracts", out var contractFlag) && contractFlag.GetBoolean();
        var chdContents = payload.TryGetProperty("chdContents", out var chdValue) && chdValue.ValueKind == JsonValueKind.String
            ? chdValue.GetString()
            : null;
        if (usesContracts && string.IsNullOrWhiteSpace(chdContents))
            throw new InvalidDataException("The generated SIMPL interface is empty. Assign at least one contract binding before building selected panels.");
        string? contractPath = null;
        string? generatedContractMapping = null;
        if (usesContracts)
        {
            if (payload.TryGetProperty("contractMapping", out var mappingProp) && mappingProp.ValueKind == JsonValueKind.String)
                generatedContractMapping = mappingProp.GetString();
            if (string.IsNullOrWhiteSpace(generatedContractMapping))
            {
                var contractDialog = new OpenFileDialog { Title = "Select the Contract Editor mapping (.cse2j) for all panel packages", Filter = "Contract Editor mapping (.cse2j)|*.cse2j", Multiselect = false };
                if (contractDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
                contractPath = contractDialog.FileName;
                ValidateContractMapping(contractPath);
            }
        }

        var folderDialog = new OpenFolderDialog { Title = "Select the multi-panel package output folder", Multiselect = false, InitialDirectory = LoadStorageSettings()["exports"] };
        if (folderDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        var cli = FindCh5Cli();
        if (cli is null) throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before building panel packages.");
        var runtime = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js");
        if (!File.Exists(runtime)) throw new FileNotFoundException("The packaged CrComLib runtime is missing.", runtime);

        var packageRequests = packages.Select(package => new
        {
            RequestedName = package.GetProperty("projectName").GetString() ?? "CrestronUi",
            Html = package.GetProperty("html").GetString() ?? "",
            DeviceJson = package.TryGetProperty("device", out var device) ? device.GetRawText() : "{}"
        }).ToArray();
        var destinationFolder = folderDialog.FolderName;
        var requestedChdName = payload.TryGetProperty("chdName", out var chdNameValue)
            ? chdNameValue.GetString() ?? "CrestronUiContract"
            : "CrestronUiContract";
        var chdFileName = SafeFileName(requestedChdName, "CrestronUiContract") + ".chd";
        RunBackgroundCommand(id, () =>
        {
            var paths = new List<string>();
            var artifacts = new List<object>();
            foreach (var package in packageRequests)
            {
                var requestedName = package.RequestedName;
                var projectName = new string(requestedName.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
                if (string.IsNullOrWhiteSpace(projectName)) throw new InvalidOperationException("A package name must contain letters or numbers.");
                var destination = Path.Combine(destinationFolder, projectName + ".ch5z");
                CreateCh5Archive(cli, runtime, package.Html, projectName, package.DeviceJson, contractPath, generatedContractMapping, destination);
                paths.Add(destination);
                artifacts.Add(new
                {
                    path = destination,
                    size = new FileInfo(destination).Length,
                    sha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(destination)))
                });
            }
            string? chdPath = null;
            var chdChanged = false;
            if (!string.IsNullOrWhiteSpace(chdContents))
            {
                chdPath = Path.Combine(destinationFolder, chdFileName);
                chdChanged = WriteTextIfChanged(chdPath, chdContents);
            }
            return new { folder = destinationFolder, paths, artifacts, chdPath, chdChanged };
        });
    }

    private static void CreateCh5Archive(string cli, string runtime, string html, string projectName, string deviceJson, string? contractPath, string? generatedContractMapping, string destination)
    {
        var workRoot = Path.Combine(Path.GetTempPath(), "CrestronUiComposer", Guid.NewGuid().ToString("N"));
        var source = Path.Combine(workRoot, "project");
        var output = Path.Combine(workRoot, "output");
        Directory.CreateDirectory(source);
        Directory.CreateDirectory(output);
        try
        {
            File.WriteAllText(Path.Combine(source, "index.html"), html);
            File.WriteAllText(Path.Combine(source, "composer-target.json"), deviceJson);
            WriteConstructProjectConfig(source);
            File.Copy(runtime, Path.Combine(source, "cr-com-lib.js"), true);
            var runtimeLicense = Path.Combine(Path.GetDirectoryName(runtime)!, "cr-com-lib.js.LICENSE.txt");
            if (File.Exists(runtimeLicense)) File.Copy(runtimeLicense, Path.Combine(source, "cr-com-lib.js.LICENSE.txt"), true);
            CopyWebXPanelRuntime(source);
            string archiveContractPath;
            if (!string.IsNullOrWhiteSpace(generatedContractMapping))
            {
                archiveContractPath = Path.Combine(workRoot, projectName + ".cse2j");
                File.WriteAllText(archiveContractPath, generatedContractMapping);
                ValidateContractMapping(archiveContractPath);
            }
            else
            {
                archiveContractPath = contractPath ?? CreateEmptyContractMapping(workRoot, projectName);
            }
            var arguments = $"/d /s /c \"\"{cli}\" archive -p \"{projectName}\" -d \"{source}\" -o \"{output}\" -c \"{archiveContractPath}\" -P \"samplesource=Shell\"";
            arguments += "\"";
            var start = new ProcessStartInfo("cmd.exe", arguments) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
            using var process = Process.Start(start) ?? throw new InvalidOperationException("The Crestron archive utility could not be started.");
            var stdOutTask = process.StandardOutput.ReadToEndAsync();
            var stdErrTask = process.StandardError.ReadToEndAsync();
            process.WaitForExit();
            var stdOut = stdOutTask.GetAwaiter().GetResult();
            var stdErr = stdErrTask.GetAwaiter().GetResult();
            if (process.ExitCode != 0) throw new InvalidOperationException("Crestron ch5-cli failed:\n" + stdErr + "\n" + stdOut);
            var archive = Path.Combine(output, projectName + ".ch5z");
            ValidateCh5Archive(archive);
            File.Copy(archive, destination, true);
        }
        finally
        {
            try { Directory.Delete(workRoot, true); } catch { }
        }
    }

    private void BuildSelfTest(string id, JsonElement payload)
    {
        var cli = FindCh5Cli() ?? throw new FileNotFoundException("Crestron's ch5-cli was not found. Install the Crestron CLI from System Diagnostics and run the self-test again.");
        var runtime = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js");
        if (!File.Exists(runtime)) throw new FileNotFoundException("The packaged CrComLib runtime is missing.", runtime);
        var html = payload.GetProperty("html").GetString() ?? "";
        if (string.IsNullOrWhiteSpace(html)) throw new InvalidDataException("The widget catalog export was empty.");
        var deviceJson = payload.TryGetProperty("device", out var device) ? device.GetRawText() : "{}";
        RunBackgroundCommand(id, () =>
        {
            var folder = Path.Combine(Path.GetTempPath(), "CrestronUiComposer", "SelfTest", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(folder);
            var destination = Path.Combine(folder, "ComposerSelfTest.ch5z");
            var timer = Stopwatch.StartNew();
            try
            {
                CreateCh5Archive(cli, runtime, html, "ComposerSelfTest", deviceJson, null, null, destination);
                ValidateCh5Archive(destination);
                timer.Stop();
                return new { size = new FileInfo(destination).Length, elapsedMilliseconds = timer.ElapsedMilliseconds };
            }
            finally
            {
                try { Directory.Delete(folder, true); } catch { }
            }
        });
    }

    private void LaunchVirtualPanelPreview(string id, JsonElement payload)
    {
        var virtualPanel = FindVirtualPanel() ?? throw new FileNotFoundException(
            "Crestron Virtual Panel is not installed. Install it, then try Emulate again.");
        var cli = FindCh5Cli() ?? throw new FileNotFoundException(
            "Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before launching Virtual Panel preview.");
        var runtime = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js");
        if (!File.Exists(runtime)) throw new FileNotFoundException("The packaged CrComLib runtime is missing.", runtime);

        var host = ValidateNetworkHost(payload.GetProperty("host").GetString());
        var ipId = payload.GetProperty("ipid").GetString()?.Trim() ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(ipId, "^0x[0-9A-Fa-f]{2,4}$") ||
            !int.TryParse(ipId[2..], System.Globalization.NumberStyles.HexNumber, null, out var ipIdValue) ||
            ipIdValue is < 3 or > 0xfe)
            throw new InvalidDataException("IP ID must be hexadecimal from 0x03 through 0xFE.");

        var html = payload.GetProperty("html").GetString() ?? "";
        if (string.IsNullOrWhiteSpace(html)) throw new InvalidDataException("The preview export was empty.");
        var requestedName = payload.GetProperty("projectName").GetString() ?? "CrestronUiPreview";
        var projectName = new string(requestedName.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
        if (string.IsNullOrWhiteSpace(projectName)) projectName = "CrestronUiPreview";
        var deviceJson = payload.TryGetProperty("device", out var device) ? device.GetRawText() : "{}";
        var usesContracts = payload.TryGetProperty("usesContracts", out var contractFlag) && contractFlag.GetBoolean();
        var contractMapping = payload.TryGetProperty("contractMapping", out var mapping) && mapping.ValueKind == JsonValueKind.String
            ? mapping.GetString()
            : null;
        if (usesContracts && string.IsNullOrWhiteSpace(contractMapping))
            throw new InvalidDataException("The generated contract mapping is empty.");

        RunBackgroundCommand(id, () =>
        {
            var previewFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CrestronUiComposer",
                "VirtualPanelPreview");
            Directory.CreateDirectory(previewFolder);
            var destination = Path.Combine(previewFolder, projectName + ".ch5z");
            CreateCh5Archive(cli, runtime, html, projectName, deviceJson, null, contractMapping, destination);
            ValidateCh5Archive(destination);

            var start = new ProcessStartInfo(virtualPanel) { UseShellExecute = true };
            start.ArgumentList.Add("--project");
            start.ArgumentList.Add(destination);
            start.ArgumentList.Add("--host");
            start.ArgumentList.Add(host);
            start.ArgumentList.Add("--ipid");
            start.ArgumentList.Add(ipId.ToUpperInvariant());
            _ = Process.Start(start) ?? throw new InvalidOperationException("Crestron Virtual Panel could not be started.");
            return new { path = destination, host, ipid = ipId.ToUpperInvariant(), application = virtualPanel };
        });
    }

    private static string? FindVirtualPanel()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "CrestronVirtualPanel", "CrestronVirtualPanel.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "CrestronVirtualPanel", "CrestronVirtualPanel.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "CrestronVirtualPanel", "CrestronVirtualPanel.exe"),
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static string? FindCh5Cli()
    {
        RefreshProcessPathFromWindows();
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var globalCli = Path.Combine(appData, "npm", "ch5-cli.cmd");
        if (File.Exists(globalCli)) return globalCli;
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        return path.Split(Path.PathSeparator).Select(folder => Path.Combine(folder.Trim('"'), "ch5-cli.cmd")).FirstOrDefault(File.Exists);
    }

    private static string CreateEmptyContractMapping(string folder, string projectName)
    {
        var path = Path.Combine(folder, projectName + "-empty.cse2j");
        var mapping = new
        {
            name = projectName,
            timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            version = "1.0.0.0",
            schema_version = 1,
            extra_value = "Generated join-only mapping",
            signals = new
            {
                states = new Dictionary<string, object>(),
                events = new Dictionary<string, object>()
            }
        };
        File.WriteAllText(path, JsonSerializer.Serialize(mapping, new JsonSerializerOptions { WriteIndented = true }));
        return path;
    }

    private static void CopyWebXPanelRuntime(string destination)
    {
        var packaging = Path.Combine(AppContext.BaseDirectory, "Packaging");
        var required = new[] { "ch5-webxpanel.js", "d4412f0cafef4f213591.worker.js" };
        foreach (var fileName in required)
        {
            var source = Path.Combine(packaging, fileName);
            if (!File.Exists(source))
                throw new FileNotFoundException("The packaged Crestron WebXPanel runtime is missing.", source);
            File.Copy(source, Path.Combine(destination, fileName), true);
        }
        var license = Path.Combine(packaging, "ch5-webxpanel.LICENSE.txt");
        if (File.Exists(license))
            File.Copy(license, Path.Combine(destination, "ch5-webxpanel.LICENSE.txt"), true);
    }

    private static void WriteConstructProjectConfig(string destination)
    {
        var dataDirectory = Path.Combine(destination, "assets", "data");
        Directory.CreateDirectory(dataDirectory);
        var config = new
        {
            useWebXPanel = true,
            config = new
            {
                controlSystem = new
                {
                    ipId = "0x03"
                }
            }
        };
        File.WriteAllText(
            Path.Combine(dataDirectory, "project-config.json"),
            JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true }));
    }

    private static void ValidateContractMapping(string path)
    {
        if (!File.Exists(path) || new FileInfo(path).Length == 0)
            throw new InvalidDataException(
                "The selected .cse2j mapping is empty. Open the populated .cce in Contract Editor, compile/export it, and select the generated non-empty interface mapping.");
        try
        {
            using var document = JsonDocument.Parse(File.ReadAllText(path));
            var root = document.RootElement;
            if (!root.TryGetProperty("signals", out var signals) || signals.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException("The selected .cse2j mapping does not contain a valid signals object.");
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("The selected .cse2j mapping is not valid JSON.", ex);
        }
    }

    private void SelectCh5Package(string id)
    {
        var dialog = new OpenFileDialog { Title = "Select Crestron CH5 Package", Filter = "Crestron HTML5 Archive (*.ch5z)|*.ch5z", Multiselect = false, InitialDirectory = LoadStorageSettings()["exports"] };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        ValidateCh5Archive(dialog.FileName);
        Respond(id, true, new
        {
            path = dialog.FileName,
            size = new FileInfo(dialog.FileName).Length,
            sha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(dialog.FileName)))
        }, null);
    }

    private void InspectCh5Package(string id, string path)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("The selected CH5Z package no longer exists.", path);
        var warnings = new List<string>();
        var valid = true;
        var validationStatus = "Valid CH5 package";
        try { ValidateCh5Archive(path); }
        catch (Exception ex) { valid = false; validationStatus = ex.Message; }

        using var zip = ZipFile.OpenRead(path);
        var ch5Entry = zip.Entries.FirstOrDefault(entry => entry.FullName.EndsWith(".ch5", StringComparison.OrdinalIgnoreCase));
        var hasManifest = zip.Entries.Any(entry => entry.FullName.EndsWith("manifest.json", StringComparison.OrdinalIgnoreCase));
        string? targetDeviceId = null;
        string? targetName = null;
        int? targetWidth = null;
        int? targetHeight = null;
        var hasIndex = false;
        var hasCrComLib = false;
        var hasWebXPanel = false;
        var hasWorker = false;
        var hasContract = false;
        var contractStates = 0;
        var contractEvents = 0;
        var payloadEntries = 0;
        if (ch5Entry is not null)
        {
            using var payloadMemory = ReadArchiveEntryWithLimit(ch5Entry, MaxCh5PayloadBytes, "embedded CH5 payload");
            using var payload = new ZipArchive(payloadMemory, ZipArchiveMode.Read);
            payloadEntries = payload.Entries.Count;
            hasIndex = payload.Entries.Any(entry => entry.FullName.EndsWith("index.html", StringComparison.OrdinalIgnoreCase));
            hasCrComLib = payload.Entries.Any(entry => entry.FullName.EndsWith("cr-com-lib.js", StringComparison.OrdinalIgnoreCase));
            hasWebXPanel = payload.Entries.Any(entry => entry.FullName.Equals("ch5-webxpanel.js", StringComparison.OrdinalIgnoreCase));
            hasWorker = payload.Entries.Any(entry => entry.FullName.EndsWith(".worker.js", StringComparison.OrdinalIgnoreCase));
            var target = payload.Entries.FirstOrDefault(entry => entry.FullName.EndsWith("composer-target.json", StringComparison.OrdinalIgnoreCase));
            if (target is not null)
            {
                try
                {
                    using var stream = target.Open();
                    using var document = JsonDocument.Parse(stream);
                    var root = document.RootElement;
                    targetDeviceId = root.TryGetProperty("id", out var targetId) ? targetId.GetString() : null;
                    targetName = root.TryGetProperty("name", out var name) ? name.GetString() : null;
                    targetWidth = root.TryGetProperty("width", out var width) && width.TryGetInt32(out var widthValue) ? widthValue : null;
                    targetHeight = root.TryGetProperty("height", out var height) && height.TryGetInt32(out var heightValue) ? heightValue : null;
                }
                catch (Exception ex) { warnings.Add("Target metadata could not be read: " + ex.Message); }
            }
            else warnings.Add("No Composer target metadata is embedded; this may be an external or older package.");
            var contract = payload.Entries.FirstOrDefault(entry => entry.FullName.EndsWith("contract.cse2j", StringComparison.OrdinalIgnoreCase));
            hasContract = contract is not null && contract.Length > 0;
            if (hasContract && contract is not null)
            {
                try
                {
                    using var stream = contract.Open();
                    using var document = JsonDocument.Parse(stream);
                    if (document.RootElement.TryGetProperty("signals", out var signals))
                    {
                        if (signals.TryGetProperty("states", out var states) && states.ValueKind == JsonValueKind.Object) contractStates = states.EnumerateObject().Count();
                        if (signals.TryGetProperty("events", out var events) && events.ValueKind == JsonValueKind.Object) contractEvents = events.EnumerateObject().Count();
                    }
                }
                catch (Exception ex) { warnings.Add("Contract mapping could not be summarized: " + ex.Message); }
            }
        }
        var info = new FileInfo(path);
        Respond(id, true, new
        {
            path,
            name = info.Name,
            size = info.Length,
            sha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(path))),
            valid,
            validationStatus,
            outerEntries = zip.Entries.Count,
            payloadEntries,
            embeddedProject = ch5Entry?.FullName,
            hasManifest,
            hasIndex,
            hasCrComLib,
            hasWebXPanel,
            hasWorker,
            hasContract,
            contractStates,
            contractEvents,
            targetDeviceId,
            targetName,
            targetWidth,
            targetHeight,
            warnings
        }, null);
    }

    private async void CheckPanel(string id, string host)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(host.Trim(), 3000);
            Respond(id, true, new { reachable = reply.Status == IPStatus.Success, status = reply.Status.ToString(), roundtripMs = reply.Status == IPStatus.Success ? reply.RoundtripTime : -1 }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private async void CheckProcessorConnection(string id, JsonElement payload)
    {
        try
        {
            var host = ValidateNetworkHost(payload.GetProperty("host").GetString());
            var port = payload.TryGetProperty("port", out var portProperty) &&
                       portProperty.TryGetInt32(out var requestedPort) && requestedPort is > 0 and <= 65535
                ? requestedPort
                : 49200;
            var useTls = !payload.TryGetProperty("useTls", out var tlsProperty) || tlsProperty.ValueKind != JsonValueKind.False;
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            using var tcp = new TcpClient();
            var timer = Stopwatch.StartNew();
            try
            {
                await tcp.ConnectAsync(host, port, timeout.Token);
            }
            catch (Exception ex) when (ex is SocketException or OperationCanceledException)
            {
                Respond(id, true, new
                {
                    host,
                    port,
                    tcpOpen = false,
                    tlsReady = false,
                    elapsedMs = timer.ElapsedMilliseconds,
                    status = ex is OperationCanceledException ? "Connection timed out" : ex.Message
                }, null);
                return;
            }

            if (!useTls)
            {
                timer.Stop();
                Respond(id, true, new
                {
                    host,
                    port,
                    tcpOpen = true,
                    tlsReady = false,
                    elapsedMs = timer.ElapsedMilliseconds,
                    status = "Native CIP port is accepting TCP connections"
                }, null);
                return;
            }

            X509Certificate2? observedCertificate = null;
            var certificateErrors = SslPolicyErrors.None;
            using var tls = new SslStream(tcp.GetStream(), false, (_, certificate, _, errors) =>
            {
                certificateErrors = errors;
                if (certificate is not null) observedCertificate = new X509Certificate2(certificate);
                // This is a read-only diagnostic handshake. Trust is reported to
                // the UI; it is not persisted or used to authorize credentials.
                return true;
            });
            try
            {
                await tls.AuthenticateAsClientAsync(new SslClientAuthenticationOptions
                {
                    TargetHost = host.Trim('[', ']'),
                    EnabledSslProtocols = System.Security.Authentication.SslProtocols.None,
                    CertificateRevocationCheckMode = X509RevocationMode.NoCheck,
                }, timeout.Token);
                timer.Stop();
                Respond(id, true, new
                {
                    host,
                    port,
                    tcpOpen = true,
                    tlsReady = true,
                    elapsedMs = timer.ElapsedMilliseconds,
                    certificateTrusted = certificateErrors == SslPolicyErrors.None,
                    certificateErrors = certificateErrors.ToString(),
                    certificateSubject = observedCertificate?.Subject ?? "",
                    certificateThumbprint = observedCertificate?.GetCertHashString(HashAlgorithmName.SHA256) ?? "",
                    status = certificateErrors == SslPolicyErrors.None ? "TLS ready" : "TLS ready; certificate requires trust"
                }, null);
            }
            catch (Exception ex) when (ex is System.Security.Authentication.AuthenticationException or IOException or OperationCanceledException)
            {
                Respond(id, true, new
                {
                    host,
                    port,
                    tcpOpen = true,
                    tlsReady = false,
                    elapsedMs = timer.ElapsedMilliseconds,
                    status = ex is OperationCanceledException ? "TLS handshake timed out" : ex.Message
                }, null);
            }
            finally
            {
                observedCertificate?.Dispose();
            }
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private async void CheckDeploymentProfile(string id, JsonElement payload)
    {
        try
        {
            var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
            var package = payload.GetProperty("packagePath").GetString() ?? "";
            if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
            var packageValid = true;
            var packageStatus = "Valid CH5 package";
            string? targetDeviceId = null;
            long size = 0;
            try
            {
                ValidateCh5Archive(package);
                size = new FileInfo(package).Length;
                targetDeviceId = ReadCh5TargetDeviceId(package);
            }
            catch (Exception ex)
            {
                packageValid = false;
                packageStatus = ex.Message;
            }
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(host, 3000);
            Respond(id, true, new {
                reachable = reply.Status == IPStatus.Success,
                status = reply.Status.ToString(),
                roundtripMs = reply.Status == IPStatus.Success ? reply.RoundtripTime : -1,
                packageValid, packageStatus, targetDeviceId, size
            }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private void DeployCh5Package(string id, JsonElement payload)
    {
        var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
        var package = payload.GetProperty("packagePath").GetString() ?? "";
        const bool slowMode = true;
        var deploymentType = DeploymentType(payload);
        if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
        ValidateCh5Archive(package);
        var cli = FindCh5Cli() ?? throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before deploying.");
        var backupRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "DeploymentBackups");
        Directory.CreateDirectory(backupRoot);
        var backupPath = Path.Combine(backupRoot, $"{DateTime.Now:yyyyMMdd-HHmmss}-{Path.GetFileName(package)}");
        File.Copy(package, backupPath, true);
        var launch = StartDeploymentTerminal(cli, host, deploymentType, package);
        Respond(id, true, new { started = true, processId = launch.Process.Id, host, packagePath = package, backupPath, logPath = launch.LogPath, slowMode, deploymentType }, null);
    }

    private async void DeployCh5PackageWait(string id, JsonElement payload)
    {
        try
        {
            var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
            var package = payload.GetProperty("packagePath").GetString() ?? "";
            const bool slowMode = true;
            var deploymentType = DeploymentType(payload);
            if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
            ValidateCh5Archive(package);
            var cli = FindCh5Cli() ?? throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before deploying.");
            var backupRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "DeploymentBackups");
            Directory.CreateDirectory(backupRoot);
            var backupPath = Path.Combine(backupRoot, $"{DateTime.Now:yyyyMMdd-HHmmss}-{Path.GetFileName(package)}");
            File.Copy(package, backupPath, true);
            var launch = StartDeploymentTerminal(cli, host, deploymentType, package);
            using var process = launch.Process;
            await process.WaitForExitAsync();
            Respond(id, true, new {
                success = process.ExitCode == 0, exitCode = process.ExitCode, host,
                packagePath = package, backupPath, logPath = launch.LogPath, slowMode, deploymentType
            }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private static (Process Process, string LogPath) StartDeploymentTerminal(string cli, string host, string deploymentType, string package)
    {
        var logRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "DeploymentLogs");
        Directory.CreateDirectory(logRoot);
        var safeHost = new string(host.Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.' ? ch : '_').ToArray());
        var stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        var logPath = Path.Combine(logRoot, $"{stamp}-{safeHost}.log");
        var scriptPath = Path.Combine(logRoot, "RunDeployment.ps1");
        File.WriteAllText(scriptPath, """
param(
    [Parameter(Mandatory=$true)][string]$Cli,
    [Parameter(Mandatory=$true)][string]$PanelHost,
    [Parameter(Mandatory=$true)][string]$DeploymentType,
    [Parameter(Mandatory=$true)][string]$Package,
    [Parameter(Mandatory=$true)][string]$LogPath
)
$ErrorActionPreference = 'Continue'
$Host.UI.RawUI.WindowTitle = "Crestron UI Composer Deployment - $PanelHost"
Write-Host "Crestron UI Composer deployment" -ForegroundColor Cyan
Write-Host "Panel:  $PanelHost"
Write-Host "Package: $Package"
Write-Host "Log:     $LogPath"
Write-Host ""
$deploymentExitCode = 1
$previousNodeOptions = $env:NODE_OPTIONS
try {
    Start-Transcript -Path $LogPath -Force | Out-Null
    # Crestron's current deployment CLI still calls Node's deprecated util.isDate API.
    # Suppress dependency deprecation noise for this child process without hiding
    # upload failures, authentication prompts, or touchscreen installation errors.
    $env:NODE_OPTIONS = (($previousNodeOptions, '--no-deprecation') -join ' ').Trim()
    & $Cli deploy -p -H $PanelHost -t $DeploymentType $Package --slow-mode -vvv
    $deploymentExitCode = $LASTEXITCODE
} finally {
    $env:NODE_OPTIONS = $previousNodeOptions
    try { Stop-Transcript | Out-Null } catch { }
}
if (Test-Path -LiteralPath $LogPath) {
    $deviceInstallError = Select-String -LiteralPath $LogPath -Pattern 'ERROR:\s*Error installing User project' -Quiet
    if ($deviceInstallError) { $deploymentExitCode = 1 }
}
Write-Host ""
if ($deploymentExitCode -eq 0) {
    Write-Host "Deployment completed successfully." -ForegroundColor Green
} else {
    Write-Host "Deployment failed with exit code $deploymentExitCode." -ForegroundColor Red
    Write-Host "The complete output was saved to: $LogPath" -ForegroundColor Yellow
}
Write-Host ""
[void](Read-Host "Press Enter to close this deployment window")
exit $deploymentExitCode
""");
        var start = new ProcessStartInfo("powershell.exe")
        {
            UseShellExecute = true,
            CreateNoWindow = false,
            WindowStyle = ProcessWindowStyle.Normal,
            WorkingDirectory = logRoot
        };
        start.ArgumentList.Add("-NoLogo");
        start.ArgumentList.Add("-NoProfile");
        start.ArgumentList.Add("-ExecutionPolicy");
        start.ArgumentList.Add("Bypass");
        start.ArgumentList.Add("-File");
        start.ArgumentList.Add(scriptPath);
        start.ArgumentList.Add("-Cli");
        start.ArgumentList.Add(cli);
        start.ArgumentList.Add("-PanelHost");
        start.ArgumentList.Add(host);
        start.ArgumentList.Add("-DeploymentType");
        start.ArgumentList.Add(deploymentType);
        start.ArgumentList.Add("-Package");
        start.ArgumentList.Add(package);
        start.ArgumentList.Add("-LogPath");
        start.ArgumentList.Add(logPath);
        var process = Process.Start(start) ?? throw new InvalidOperationException("The Crestron deployment terminal could not be started.");
        return (process, logPath);
    }

    private static string DeploymentType(JsonElement payload)
    {
        var value = payload.TryGetProperty("deploymentType", out var type) ? type.GetString() : "touchscreen";
        return value is "touchscreen" or "mobile" or "web" ? value : "touchscreen";
    }

    // Matches ch5-cli deploy's own default --deviceDirectory: 'display' for
    // touchscreen, 'HTML' for controlsystem/web/mobile.
    private static string RemoteDeployDirectory(string deploymentType) =>
        deploymentType == "touchscreen" ? "display" : "HTML";

    private static readonly byte[] DeploymentCredentialEntropy = Encoding.UTF8.GetBytes("CrestronUiComposer.DeploymentCredential.v1");

    private static string DeploymentCredentialsPath() =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "DeploymentCredentials.json");

    private static Dictionary<string, string> LoadDeploymentCredentials()
    {
        var path = DeploymentCredentialsPath();
        if (!File.Exists(path)) return [];
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path)) ?? []; }
        catch { return []; }
    }

    private static void SaveDeploymentCredentialsFile(Dictionary<string, string> credentials)
    {
        var path = DeploymentCredentialsPath();
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporaryPath = path + ".tmp";
        File.WriteAllText(temporaryPath, JsonSerializer.Serialize(credentials));
        File.Move(temporaryPath, path, true);
    }

    // DPAPI ties the ciphertext to this Windows user account; entropy is an
    // additional fixed tag so another app's DPAPI blobs can't be swapped in.
    private static string EncryptDeploymentPassword(string password) =>
        Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(password), DeploymentCredentialEntropy, DataProtectionScope.CurrentUser));

    private static string DecryptDeploymentPassword(string encrypted) =>
        Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(encrypted), DeploymentCredentialEntropy, DataProtectionScope.CurrentUser));

    private void SaveDeploymentCredential(string id, JsonElement payload)
    {
        try
        {
            var profileId = payload.GetProperty("profileId").GetString() ?? throw new InvalidOperationException("Missing profile id.");
            var password = payload.TryGetProperty("password", out var passwordProperty) ? passwordProperty.GetString() ?? "" : "";
            // A blank password on save means "leave the stored credential
            // alone" (the profile's own field just shows "(unchanged)") —
            // explicit clearing goes through deleteDeploymentCredential.
            if (string.IsNullOrEmpty(password)) { Respond(id, true, new { saved = false }, null); return; }
            var credentials = LoadDeploymentCredentials();
            credentials[profileId] = EncryptDeploymentPassword(password);
            SaveDeploymentCredentialsFile(credentials);
            Respond(id, true, new { saved = true }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private void DeleteDeploymentCredential(string id, JsonElement payload)
    {
        try
        {
            var profileId = payload.GetProperty("profileId").GetString() ?? throw new InvalidOperationException("Missing profile id.");
            var credentials = LoadDeploymentCredentials();
            credentials.Remove(profileId);
            SaveDeploymentCredentialsFile(credentials);
            Respond(id, true, new { deleted = true }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private void HasDeploymentCredential(string id, JsonElement payload)
    {
        try
        {
            var profileId = payload.GetProperty("profileId").GetString() ?? "";
            Respond(id, true, new { hasPassword = LoadDeploymentCredentials().ContainsKey(profileId) }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private void PostProgress(string id, string step, string message)
    {
        // SFTP/SSH callbacks below run on a background Task.Run thread, but
        // CoreWebView2 requires its owning (UI) thread — unlike Respond,
        // which today's deploy handlers only ever call after an await has
        // already resumed on the UI thread's captured SynchronizationContext.
        Dispatcher.Invoke(() =>
            EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "nativeProgress", id, step, message })));
    }

    // SSH.NET's own default connect timeout runs ~30s, which reads as a hang
    // on an unreachable/wrong-IP panel. Fail fast instead, especially for
    // the "Test connection" button meant to be a quick check.
    private static Renci.SshNet.ConnectionInfo BuildDeploymentConnectionInfo(string host, int port, string username, string password, int timeoutSeconds) =>
        new Renci.SshNet.PasswordConnectionInfo(host, port, username, password) { Timeout = TimeSpan.FromSeconds(timeoutSeconds) };

    private async void TestDeploymentConnection(string id, JsonElement payload)
    {
        try
        {
            var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
            var port = payload.TryGetProperty("port", out var portProperty) && portProperty.TryGetInt32(out var portValue) && portValue > 0 ? portValue : 22;
            var username = payload.GetProperty("username").GetString()?.Trim() ?? "";
            var profileId = payload.GetProperty("profileId").GetString() ?? "";
            if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
            if (string.IsNullOrWhiteSpace(username)) throw new InvalidOperationException("Enter the SFTP username.");
            if (!LoadDeploymentCredentials().TryGetValue(profileId, out var encrypted))
                throw new InvalidOperationException("No stored password for this profile. Enter one and Save first.");
            var password = DecryptDeploymentPassword(encrypted);
            await Task.Run(() =>
            {
                using var client = new SftpClient(BuildDeploymentConnectionInfo(host, port, username, password, 8));
                client.Connect();
                client.Disconnect();
            });
            Respond(id, true, new { reachable = true }, null);
        }
        catch (Renci.SshNet.Common.SshAuthenticationException)
        {
            Respond(id, false, null, "Connected, but the username or password was rejected.");
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private async void DeploySshPackage(string id, JsonElement payload)
    {
        try
        {
            var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
            var port = payload.TryGetProperty("port", out var portProperty) && portProperty.TryGetInt32(out var portValue) && portValue > 0 ? portValue : 22;
            var username = payload.GetProperty("username").GetString()?.Trim() ?? "";
            var package = payload.GetProperty("packagePath").GetString() ?? "";
            var profileId = payload.GetProperty("profileId").GetString() ?? "";
            var deploymentType = DeploymentType(payload);
            if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
            if (string.IsNullOrWhiteSpace(username)) throw new InvalidOperationException("Enter the SFTP username.");
            ValidateCh5Archive(package);
            if (!LoadDeploymentCredentials().TryGetValue(profileId, out var encrypted))
                throw new InvalidOperationException("No stored password for this profile. Enter one and Save, or use Deploy to panel.");
            var password = DecryptDeploymentPassword(encrypted);
            var fileName = Path.GetFileName(package);
            var remotePath = $"{RemoteDeployDirectory(deploymentType)}/{fileName}";
            var fileSize = (double)new FileInfo(package).Length;

            await Task.Run(() =>
            {
                PostProgress(id, "connecting", $"Connecting to {host}…");
                using var sftp = new SftpClient(BuildDeploymentConnectionInfo(host, port, username, password, 15));
                sftp.Connect();

                PostProgress(id, "uploading", $"Uploading {fileName} to {remotePath}…");
                var lastReportedPercent = -1;
                using (var stream = File.OpenRead(package))
                    sftp.UploadFile(stream, remotePath, true, uploaded =>
                    {
                        var percent = fileSize > 0 ? (int)(uploaded / fileSize * 100) : 100;
                        if (percent == lastReportedPercent) return;
                        lastReportedPercent = percent;
                        PostProgress(id, "uploading", $"Uploading {fileName}… {percent}%");
                    });
                sftp.Disconnect();

                PostProgress(id, "reload", "Sending \"projectload\" to reload the project…");
                using var ssh = new SshClient(BuildDeploymentConnectionInfo(host, port, username, password, 15));
                ssh.Connect();
                // The upload already succeeded at this point; a reload
                // command failure is reported as part of a successful
                // response rather than thrown, since the project is on the
                // panel either way and this is exactly the kind of
                // panel/firmware-specific detail the user's own hardware
                // pass needs to confirm.
                string? reloadWarning = null;
                try
                {
                    var reloadResult = ssh.RunCommand("projectload");
                    if (reloadResult.ExitStatus != 0) reloadWarning = reloadResult.Error;
                }
                catch (Exception reloadEx) { reloadWarning = reloadEx.Message; }
                ssh.Disconnect();
                if (reloadWarning is not null)
                    PostProgress(id, "reload-warning", $"Uploaded, but reloading the panel may need attention: {reloadWarning}");
            });

            PostProgress(id, "complete", "Deployment complete");
            Respond(id, true, new { deployed = true, host, packagePath = package, remotePath }, null);
        }
        catch (Renci.SshNet.Common.SshAuthenticationException)
        {
            Respond(id, false, null, "Connected, but the username or password was rejected.");
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private void SystemDiagnostics(string id)
    {
        var settingsFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer");
        var cli = FindCh5Cli();
        var nodePath = FindNodeExecutable();
        var npmCli = nodePath is null ? null : Path.Combine(Path.GetDirectoryName(nodePath)!, "node_modules", "npm", "bin", "npm-cli.js");
        Respond(id, true, new
        {
            appVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown",
            os = Environment.OSVersion.VersionString,
            architecture = System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString(),
            dotnet = Environment.Version.ToString(),
            webView2 = EditorView.CoreWebView2.Environment.BrowserVersionString,
            node = nodePath is null ? null : RunVersion(nodePath, "--version"),
            npm = nodePath is not null && File.Exists(npmCli) ? RunVersion(nodePath, $"\"{npmCli}\" --version") : null,
            ch5Cli = cli is null ? null : RunVersion(cli, "--version"),
            ch5CliPath = cli,
            settingsFolder,
            installFolder = AppContext.BaseDirectory,
            portable = !AppContext.BaseDirectory.StartsWith(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), StringComparison.OrdinalIgnoreCase)
        }, null);
    }

    private static string? FindNodeExecutable()
    {
        RefreshProcessPathFromWindows();
        var candidates = new List<string> {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
        };
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        candidates.AddRange(path.Split(Path.PathSeparator).Where(folder => !string.IsNullOrWhiteSpace(folder)).Select(folder => Path.Combine(folder.Trim('"'), "node.exe")));
        return candidates.FirstOrDefault(File.Exists);
    }

    private static void RefreshProcessPathFromWindows()
    {
        var entries = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        void AddEntries(string? value)
        {
            foreach (var rawEntry in (value ?? "").Split(Path.PathSeparator))
            {
                var entry = Environment.ExpandEnvironmentVariables(rawEntry.Trim().Trim('"'));
                if (!string.IsNullOrWhiteSpace(entry) && seen.Add(entry)) entries.Add(entry);
            }
        }

        try { AddEntries(Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine)); } catch { }
        try { AddEntries(Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User)); } catch { }
        AddEntries(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs"));
        AddEntries(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs"));
        AddEntries(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs"));
        AddEntries(Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Process));
        if (entries.Count > 0)
            Environment.SetEnvironmentVariable("PATH", string.Join(Path.PathSeparator, entries), EnvironmentVariableTarget.Process);
    }

    private static string? RunVersion(string fileName, string arguments)
    {
        try
        {
            var commandScript = Path.GetExtension(fileName).Equals(".cmd", StringComparison.OrdinalIgnoreCase) ||
                Path.GetExtension(fileName).Equals(".bat", StringComparison.OrdinalIgnoreCase);
            var start = commandScript
                ? new ProcessStartInfo("cmd.exe", $"/d /s /c \"\"{fileName}\" {arguments}\"")
                : new ProcessStartInfo(fileName, arguments);
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            start.RedirectStandardOutput = true;
            start.RedirectStandardError = true;
            using var process = Process.Start(start);
            if (process is null) return null;
            var outputTask = process.StandardOutput.ReadToEndAsync();
            var errorTask = process.StandardError.ReadToEndAsync();
            if (!process.WaitForExit(4000)) { try { process.Kill(true); } catch { } return null; }
            var output = outputTask.GetAwaiter().GetResult();
            var error = errorTask.GetAwaiter().GetResult();
            var version = string.IsNullOrWhiteSpace(output) ? error : output;
            return process.ExitCode == 0 ? version.Trim() : null;
        }
        catch { return null; }
    }

    private void InstallPrerequisite(string id, string prerequisite)
    {
        ProcessStartInfo start = prerequisite switch
        {
            "webview2" => new ProcessStartInfo("https://go.microsoft.com/fwlink/p/?LinkId=2124703") { UseShellExecute = true },
            "node" => new ProcessStartInfo("https://nodejs.org/en/download") { UseShellExecute = true },
            "ch5cli" => CreateCh5CliInstallerStartInfo(),
            "ch5docs" => new ProcessStartInfo("https://sdkcon78221.crestron.com/sdk/Crestron_HTML5UI/Content/Topics/UI-CH5-Archives.htm") { UseShellExecute = true },
            _ => throw new InvalidOperationException("Unknown prerequisite.")
        };
        Process.Start(start);
        Respond(id, true, new { started = true, prerequisite }, null);
    }

    private static ProcessStartInfo CreateCh5CliInstallerStartInfo()
    {
        var installerFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Crestron UI Composer");
        Directory.CreateDirectory(installerFolder);
        var installerPath = Path.Combine(installerFolder, "Install-CrestronCh5Cli.ps1");
        File.WriteAllText(installerPath, """
$ErrorActionPreference = 'Stop'
$packages = @('@crestron/ch5-utilities-cli', '@crestron/ch5-shell-utilities-cli')

function Find-NpmCommand {
    $command = Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }

    $candidates = @(
        (Join-Path $env:ProgramFiles 'nodejs\npm.cmd'),
        (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\npm.cmd')
    )
    $programFilesX86 = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFilesX86)
    if ($programFilesX86) { $candidates += (Join-Path $programFilesX86 'nodejs\npm.cmd') }
    return $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}

Write-Host 'Crestron CH5 CLI installer' -ForegroundColor Cyan
Write-Host '===========================' -ForegroundColor Cyan
Write-Host ''

$npm = Find-NpmCommand
if (-not $npm) {
    Write-Host 'Node.js/npm was not found. Installing Node.js LTS first...' -ForegroundColor Yellow
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $winget) {
        Write-Host ''
        Write-Host 'Windows Package Manager (winget) is not available.' -ForegroundColor Red
        Write-Host 'The official Node.js download page will open. Install the LTS release, then click Install Crestron CLI again.' -ForegroundColor Yellow
        Start-Process 'https://nodejs.org/en/download'
        Write-Host ''
        [void](Read-Host 'Press Enter to close this window')
        exit 1
    }

    & $winget.Source install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js LTS installation failed with exit code $LASTEXITCODE."
    }

    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path', 'User')
    $npm = Find-NpmCommand
    if (-not $npm) {
        throw 'Node.js finished installing, but npm.cmd could not be found. Restart Composer and try again.'
    }
}

$nodeFolder = Split-Path -Parent $npm
if (($env:Path -split ';') -notcontains $nodeFolder) {
    $env:Path = $nodeFolder + ';' + $env:Path
}
Write-Host "Using npm: $npm" -ForegroundColor DarkGray
Write-Host 'Installing Crestron CH5 command-line tools...' -ForegroundColor Green
& $npm install --global $packages
if ($LASTEXITCODE -ne 0) {
    throw "Crestron CH5 CLI installation failed with exit code $LASTEXITCODE."
}

$ch5Cli = Join-Path $env:APPDATA 'npm\ch5-cli.cmd'
if (Test-Path -LiteralPath $ch5Cli) {
    Write-Host ''
    Write-Host 'Crestron CH5 CLI installed successfully.' -ForegroundColor Green
    & $ch5Cli --version
    if ($LASTEXITCODE -ne 0) {
        throw "The CLI installed, but its Node.js runtime check failed with exit code $LASTEXITCODE."
    }
} else {
    Write-Host ''
    Write-Host 'NPM completed successfully. Restart Composer before building if the CLI is not detected immediately.' -ForegroundColor Yellow
}

Write-Host ''
[void](Read-Host 'Press Enter to close this window')
""", new UTF8Encoding(false));

        var start = new ProcessStartInfo("powershell.exe")
        {
            UseShellExecute = true,
            CreateNoWindow = false,
            WindowStyle = ProcessWindowStyle.Normal,
            WorkingDirectory = installerFolder
        };
        start.ArgumentList.Add("-NoLogo");
        start.ArgumentList.Add("-NoProfile");
        start.ArgumentList.Add("-ExecutionPolicy");
        start.ArgumentList.Add("Bypass");
        start.ArgumentList.Add("-File");
        start.ArgumentList.Add(installerPath);
        return start;
    }

    private void OpenSettingsFolder(string id)
    {
        var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer");
        Directory.CreateDirectory(folder);
        Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
        Respond(id, true, folder, null);
    }

    private static void ValidateCh5Archive(string path)
    {
        if (!File.Exists(path) || new FileInfo(path).Length == 0) throw new InvalidDataException("Crestron did not produce a CH5 archive.");
        using var zip = ZipFile.OpenRead(path);
        if (zip.Entries.Count > MaxArchiveEntries)
            throw new InvalidDataException($"The CH5 archive contains too many entries (maximum {MaxArchiveEntries:N0}).");
        var ch5Entry = zip.Entries.FirstOrDefault(entry => entry.FullName.EndsWith(".ch5", StringComparison.OrdinalIgnoreCase)) ?? throw new InvalidDataException("The generated archive does not contain a .ch5 payload.");
        var archiveName = Path.GetFileNameWithoutExtension(path);
        var payloadName = Path.GetFileNameWithoutExtension(ch5Entry.FullName);
        if (!string.Equals(archiveName, payloadName, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException(
                $"The CH5Z file name ('{archiveName}') does not match its embedded project name ('{payloadName}'). Rebuild the package instead of renaming it.");
        if (!zip.Entries.Any(entry => entry.FullName.EndsWith("manifest.json", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The generated archive does not contain the required manifest.");
        using var payloadMemory = ReadArchiveEntryWithLimit(ch5Entry, MaxCh5PayloadBytes, "embedded CH5 payload");
        using var payload = new ZipArchive(payloadMemory, ZipArchiveMode.Read);
        if (payload.Entries.Count > MaxArchiveEntries)
            throw new InvalidDataException($"The embedded CH5 payload contains too many entries (maximum {MaxArchiveEntries:N0}).");
        if (!payload.Entries.Any(entry => entry.FullName.EndsWith("index.html", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The CH5 payload is missing index.html.");
        if (!payload.Entries.Any(entry => entry.FullName.EndsWith("cr-com-lib.js", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The CH5 payload is missing CrComLib.");
        if (!payload.Entries.Any(entry => entry.FullName.Equals("ch5-webxpanel.js", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The CH5 payload is missing the WebXPanel runtime required by CH5 Desktop.");
        if (!payload.Entries.Any(entry => entry.FullName.EndsWith(".worker.js", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The CH5 payload is missing the WebXPanel worker required by CH5 Desktop.");
        var contractEntry = payload.Entries.FirstOrDefault(entry => entry.FullName.EndsWith("contract.cse2j", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidDataException("The CH5 payload is missing contract.cse2j.");
        if (contractEntry.Length == 0)
            throw new InvalidDataException("The CH5 payload contains an empty contract.cse2j mapping and would be rejected by the touch panel.");
        using var contractStream = contractEntry.Open();
        using var contractDocument = JsonDocument.Parse(contractStream);
        if (!contractDocument.RootElement.TryGetProperty("signals", out var signals) || signals.ValueKind != JsonValueKind.Object)
            throw new InvalidDataException("The CH5 payload contains an invalid contract.cse2j mapping.");
    }

    private static string? ReadCh5TargetDeviceId(string path)
    {
        using var zip = ZipFile.OpenRead(path);
        var ch5Entry = zip.Entries.FirstOrDefault(entry => entry.FullName.EndsWith(".ch5", StringComparison.OrdinalIgnoreCase));
        if (ch5Entry is null) return null;
        using var payloadMemory = ReadArchiveEntryWithLimit(ch5Entry, MaxCh5PayloadBytes, "embedded CH5 payload");
        using var payload = new ZipArchive(payloadMemory, ZipArchiveMode.Read);
        var target = payload.Entries.FirstOrDefault(entry => entry.FullName.EndsWith("composer-target.json", StringComparison.OrdinalIgnoreCase));
        if (target is null) return null;
        using var stream = target.Open();
        using var document = JsonDocument.Parse(stream);
        return document.RootElement.TryGetProperty("id", out var id) ? id.GetString() : null;
    }

    private async void GetWebXPanelToken(string id, JsonElement payload)
    {
        try
        {
            var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
            var username = payload.GetProperty("username").GetString() ?? "";
            var password = payload.GetProperty("password").GetString() ?? "";
            if (string.IsNullOrWhiteSpace(host) || host.Any(ch => char.IsWhiteSpace(ch) || ch is '/' or '?' or '#'))
                throw new InvalidOperationException("Enter a valid processor host or IP address.");
            if (string.IsNullOrWhiteSpace(username)) throw new InvalidOperationException("Enter the processor username.");
            var baseUri = new Uri($"https://{host}/");
            using var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (_, certificate, _, errors) =>
                    errors == SslPolicyErrors.None || certificate is not null && ApprovePreviewCertificate(
                        host,
                        certificate.GetCertHashString(HashAlgorithmName.SHA256),
                        $"TLS validation: {errors}\nCertificate: {certificate?.Subject ?? "Unknown"}"),
                CookieContainer = new CookieContainer(),
                AllowAutoRedirect = false,
            };
            using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
            // HttpClient sends no User-Agent by default; the processor's web
            // server rejects that (and requests without a same-origin
            // Referer) with a bare server-level 403 before the request ever
            // reaches Crestron's own login handling — set both the way a
            // real browser would.
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) CrestronUiComposer/1.0");
            var referer = new Uri(baseUri, "userlogin.html");
            var tokenUri = new Uri(baseUri, "cws/websocket/getWebSocketToken");
            // The processor's own /userlogin.html page authenticates with a
            // session cookie, not HTTP Basic auth — confirmed by reading its
            // served login form/script directly: it POSTs
            // login=<user>&passwd=<pass> to /userlogin.html, then uses the
            // resulting session cookie (and a CREST-XSRF-TOKEN response
            // header, echoed back on later requests) for everything after.
            // Critically, hitting the login page directly only sets a
            // TRACKID cookie — the processor's own log names this failure
            // "CookieBasedAuthentication" specifically because it also wants
            // a second "redirectCookie" that only gets set when you arrive
            // at the login page *by being redirected from the protected
            // token endpoint* (confirmed via curl: an anonymous GET of the
            // token URL sets both cookies; GETting the login page directly
            // sets only one). Reproduce that exact path a real browser takes.
            using var tokenProbeRequest = new HttpRequestMessage(HttpMethod.Get, tokenUri);
            using (await client.SendAsync(tokenProbeRequest)) { }
            using var loginRequest = new HttpRequestMessage(HttpMethod.Post, referer)
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["login"] = username, ["passwd"] = password }),
            };
            loginRequest.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded") { CharSet = "UTF-8" };
            loginRequest.Headers.Referrer = referer;
            // The two headers that actually mattered — confirmed by capturing
            // a real successful browser login and diffing it against this
            // request: the processor treats this endpoint as AJAX/CORS-only
            // and 403s a request that doesn't look like one from its own
            // page. Neither is sent by HttpClient by default.
            loginRequest.Headers.Add("Origin", baseUri.GetLeftPart(UriPartial.Authority));
            loginRequest.Headers.Add("X-Requested-With", "XMLHttpRequest");
            using var loginResponse = await client.SendAsync(loginRequest);
            if (loginResponse.StatusCode == HttpStatusCode.Forbidden)
            {
                var loginError = await loginResponse.Content.ReadAsStringAsync();
                throw new InvalidOperationException(string.IsNullOrWhiteSpace(loginError) ? "Processor username or password was rejected." : loginError);
            }
            if (!loginResponse.IsSuccessStatusCode)
                throw new InvalidOperationException($"Processor login failed ({(int)loginResponse.StatusCode} {loginResponse.ReasonPhrase}).");
            using var request = new HttpRequestMessage(HttpMethod.Get, tokenUri);
            request.Headers.Referrer = referer;
            request.Headers.Add("Origin", baseUri.GetLeftPart(UriPartial.Authority));
            request.Headers.Add("X-Requested-With", "XMLHttpRequest");
            if (loginResponse.Headers.TryGetValues("CREST-XSRF-TOKEN", out var xsrfValues) && xsrfValues.FirstOrDefault() is { Length: > 0 } xsrfToken)
                request.Headers.Add("CREST-XSRF-TOKEN", xsrfToken);
            using var response = await client.SendAsync(request);
            if (response.StatusCode is HttpStatusCode.Redirect or HttpStatusCode.Found or HttpStatusCode.MovedPermanently or HttpStatusCode.SeeOther)
                throw new InvalidOperationException("Processor session was not accepted for the token request.");
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
                    ? "Processor session was not accepted for the token request."
                    : $"Processor token request failed ({(int)response.StatusCode} {response.ReasonPhrase}).");
            var token = body.Trim().Trim('"');
            try
            {
                using var json = JsonDocument.Parse(body);
                var value = json.RootElement;
                foreach (var key in new[] { "token", "authToken", "access_token" })
                    if (value.ValueKind == JsonValueKind.Object && value.TryGetProperty(key, out var property) && !string.IsNullOrWhiteSpace(property.GetString()))
                    { token = property.GetString()!; break; }
            }
            catch (JsonException) { }
            if (string.IsNullOrWhiteSpace(token) || token.StartsWith("<", StringComparison.Ordinal))
                throw new InvalidOperationException("The processor did not return a Web XPanel token.");
            Respond(id, true, new { token }, null);
        }
        catch (Exception ex) { Respond(id, false, null, ex.Message); }
    }

    private async void RunBackgroundCommand(string id, Func<object> operation)
    {
        try
        {
            var result = await Task.Run(operation);
            Respond(id, true, result, null);
        }
        catch (Exception ex)
        {
            Respond(id, false, null, ex.GetBaseException().Message);
        }
    }

    private void Respond(string id, bool ok, object? data, string? error)
    {
        EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "nativeResponse", id, ok, data, error }));
    }
}
