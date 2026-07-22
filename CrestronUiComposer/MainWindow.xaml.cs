using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Net.Http;
using System.Windows;
using MessageBox = System.Windows.MessageBox;
using OpenFileDialog = Microsoft.Win32.OpenFileDialog;
using SaveFileDialog = Microsoft.Win32.SaveFileDialog;

namespace CrestronUiComposer;

public partial class MainWindow : Window
{
    private const string AppHost = "composer.local";
    private readonly string? _initialProjectPath = Environment.GetCommandLineArgs().Skip(1).FirstOrDefault(path => File.Exists(path));

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CrestronUiComposer",
                "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await EditorView.EnsureCoreWebView2Async(environment);

            var webRoot = Path.Combine(AppContext.BaseDirectory, "Web");
            if (!File.Exists(Path.Combine(webRoot, "editor.html")))
                throw new FileNotFoundException("The embedded editor assets could not be found.", webRoot);

            EditorView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                AppHost,
                webRoot,
                CoreWebView2HostResourceAccessKind.Allow);
            EditorView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            EditorView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            EditorView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            EditorView.NavigationCompleted += (_, args) =>
            {
                LoadingPanel.Visibility = Visibility.Collapsed;
                if (!args.IsSuccess)
                    MessageBox.Show($"The editor failed to load: {args.WebErrorStatus}", "Crestron UI Composer", MessageBoxButton.OK, MessageBoxImage.Error);
                else if (_initialProjectPath is not null)
                    EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "openProjectFile", path = _initialProjectPath, contents = File.ReadAllText(_initialProjectPath) }));
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

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        var requestId = "";
        try
        {
            using var message = JsonDocument.Parse(e.WebMessageAsJson);
            var root = message.RootElement;
            var id = root.GetProperty("id").GetString() ?? "";
            requestId = id;
            var command = root.GetProperty("command").GetString() ?? "";

            switch (command)
            {
                case "saveProject":
                    SaveText(id, root.GetProperty("payload").GetString() ?? "", "Crestron UI Composer Project (*.cuiproj)|*.cuiproj|JSON Project (*.json)|*.json", "crestron-ui-project.cuiproj", "projects");
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
                case "checkPanel":
                    CheckPanel(id, root.GetProperty("payload").GetString() ?? "");
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

    private void SaveContractEditorProject(string id, JsonElement payload, bool openAfterSave)
    {
        var contents = payload.GetProperty("contents").GetString() ?? "";
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
                throw new InvalidOperationException("The .cce project was saved, but Windows could not open it. Install Crestron Contract Editor or associate .cce files with it.\n\nSaved to: " + dialog.FileName, ex);
            }
        }
        Respond(id, true, new { path = dialog.FileName, opened = openAfterSave }, null);
    }

    private static void OpenContractEditorProject(string contractEditor, string projectPath)
    {
        var editorProcess = Process.GetProcessesByName("CH5-Contract-Editor")
            .FirstOrDefault(process => process.MainWindowHandle != IntPtr.Zero);
        if (editorProcess is null)
        {
            var explorer = new ProcessStartInfo("explorer.exe") { UseShellExecute = true };
            explorer.ArgumentList.Add(contractEditor);
            Process.Start(explorer);
            var deadline = DateTime.UtcNow.AddSeconds(12);
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
        Thread.Sleep(350);
        System.Windows.Clipboard.SetText(projectPath);
        System.Windows.Forms.SendKeys.SendWait("^o");
        Thread.Sleep(900);
        System.Windows.Forms.SendKeys.SendWait("^a");
        System.Windows.Forms.SendKeys.SendWait("^v");
        Thread.Sleep(250);
        System.Windows.Forms.SendKeys.SendWait("{ENTER}");
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
        var projectEntry = archive.GetEntry("project.cuiproj")
            ?? throw new InvalidDataException("This package does not contain project.cuiproj.");
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

    private void CheckForUpdates(string id)
    {
        const string releasesApi = "https://api.github.com/repos/jobu109/crestron-ui-composer/releases/latest";
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("CrestronUiComposer-Updater/1.0");
        using var response = client.GetAsync(releasesApi).GetAwaiter().GetResult();
        var current = Assembly.GetExecutingAssembly().GetName().Version ?? new Version(0, 0, 0);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            Respond(id, true, new { currentVersion = DisplayVersion(current), latestVersion = "", updateAvailable = false, releaseNotes = "", releaseUrl = "", downloadUrl = "" }, null);
            return;
        }
        response.EnsureSuccessStatusCode();
        using var release = JsonDocument.Parse(response.Content.ReadAsStringAsync().GetAwaiter().GetResult());
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
        if (usesContracts)
        {
            var contractDialog = new OpenFileDialog { Title = "Select the Contract Editor mapping (.cse2j)", Filter = "Contract Editor mapping (.cse2j)|*.cse2j", Multiselect = false };
            if (contractDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
            contractPath = contractDialog.FileName;
        }

        var saveDialog = new SaveFileDialog { Title = "Build Crestron CH5 Package", Filter = "Crestron HTML5 Archive (*.ch5z)|*.ch5z", FileName = projectName + ".ch5z", AddExtension = true, InitialDirectory = LoadStorageSettings()["exports"] };
        if (saveDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }

        var cli = FindCh5Cli();
        if (cli is null) throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before building a panel package.");
        var runtime = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js");
        if (!File.Exists(runtime)) throw new FileNotFoundException("The packaged CrComLib runtime is missing.", runtime);

        var workRoot = Path.Combine(Path.GetTempPath(), "CrestronUiComposer", Guid.NewGuid().ToString("N"));
        var source = Path.Combine(workRoot, "project");
        var output = Path.Combine(workRoot, "output");
        Directory.CreateDirectory(source);
        Directory.CreateDirectory(output);
        try
        {
            File.WriteAllText(Path.Combine(source, "index.html"), html);
            File.WriteAllText(Path.Combine(source, "composer-target.json"), deviceJson);
            File.Copy(runtime, Path.Combine(source, "cr-com-lib.js"), true);
            var runtimeLicense = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js.LICENSE.txt");
            if (File.Exists(runtimeLicense)) File.Copy(runtimeLicense, Path.Combine(source, "cr-com-lib.js.LICENSE.txt"), true);

            var archiveContractPath = contractPath ?? CreateEmptyContractMapping(workRoot, projectName);
            var arguments = $"/d /s /c \"\"{cli}\" archive -p \"{projectName}\" -d \"{source}\" -o \"{output}\" -c \"{archiveContractPath}\"";
            arguments += "\"";
            var start = new ProcessStartInfo("cmd.exe", arguments) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
            using var process = Process.Start(start) ?? throw new InvalidOperationException("The Crestron archive utility could not be started.");
            var stdOut = process.StandardOutput.ReadToEnd();
            var stdErr = process.StandardError.ReadToEnd();
            process.WaitForExit();
            if (process.ExitCode != 0) throw new InvalidOperationException("Crestron ch5-cli failed:\n" + stdErr + "\n" + stdOut);

            var archive = Path.Combine(output, projectName + ".ch5z");
            ValidateCh5Archive(archive);
            File.Copy(archive, saveDialog.FileName, true);
            Respond(id, true, new { path = saveDialog.FileName, projectName, usedContract = contractPath is not null }, null);
        }
        finally
        {
            try { Directory.Delete(workRoot, true); } catch { }
        }
    }

    private void BuildCh5Packages(string id, JsonElement payload)
    {
        var packages = payload.GetProperty("packages").EnumerateArray().ToArray();
        if (packages.Length == 0) throw new InvalidOperationException("Select at least one panel package.");
        var usesContracts = payload.TryGetProperty("usesContracts", out var contractFlag) && contractFlag.GetBoolean();
        string? contractPath = null;
        if (usesContracts)
        {
            var contractDialog = new OpenFileDialog { Title = "Select the Contract Editor mapping (.cse2j) for all panel packages", Filter = "Contract Editor mapping (.cse2j)|*.cse2j", Multiselect = false };
            if (contractDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
            contractPath = contractDialog.FileName;
        }

        var folderDialog = new OpenFolderDialog { Title = "Select the multi-panel package output folder", Multiselect = false, InitialDirectory = LoadStorageSettings()["exports"] };
        if (folderDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        var cli = FindCh5Cli();
        if (cli is null) throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before building panel packages.");
        var runtime = Path.Combine(AppContext.BaseDirectory, "Packaging", "cr-com-lib.js");
        if (!File.Exists(runtime)) throw new FileNotFoundException("The packaged CrComLib runtime is missing.", runtime);

        var paths = new List<string>();
        foreach (var package in packages)
        {
            var requestedName = package.GetProperty("projectName").GetString() ?? "CrestronUi";
            var projectName = new string(requestedName.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
            if (string.IsNullOrWhiteSpace(projectName)) throw new InvalidOperationException("A package name must contain letters or numbers.");
            var html = package.GetProperty("html").GetString() ?? "";
            var deviceJson = package.TryGetProperty("device", out var device) ? device.GetRawText() : "{}";
            var destination = Path.Combine(folderDialog.FolderName, projectName + ".ch5z");
            CreateCh5Archive(cli, runtime, html, projectName, deviceJson, contractPath, destination);
            paths.Add(destination);
        }
        Respond(id, true, new { folder = folderDialog.FolderName, paths }, null);
    }

    private static void CreateCh5Archive(string cli, string runtime, string html, string projectName, string deviceJson, string? contractPath, string destination)
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
            File.Copy(runtime, Path.Combine(source, "cr-com-lib.js"), true);
            var runtimeLicense = Path.Combine(Path.GetDirectoryName(runtime)!, "cr-com-lib.js.LICENSE.txt");
            if (File.Exists(runtimeLicense)) File.Copy(runtimeLicense, Path.Combine(source, "cr-com-lib.js.LICENSE.txt"), true);
            var archiveContractPath = contractPath ?? CreateEmptyContractMapping(workRoot, projectName);
            var arguments = $"/d /s /c \"\"{cli}\" archive -p \"{projectName}\" -d \"{source}\" -o \"{output}\" -c \"{archiveContractPath}\"";
            arguments += "\"";
            var start = new ProcessStartInfo("cmd.exe", arguments) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
            using var process = Process.Start(start) ?? throw new InvalidOperationException("The Crestron archive utility could not be started.");
            var stdOut = process.StandardOutput.ReadToEnd();
            var stdErr = process.StandardError.ReadToEnd();
            process.WaitForExit();
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
        var folder = Path.Combine(Path.GetTempPath(), "CrestronUiComposer", "SelfTest", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        var destination = Path.Combine(folder, "ComposerSelfTest.ch5z");
        var timer = Stopwatch.StartNew();
        try
        {
            CreateCh5Archive(cli, runtime, html, "ComposerSelfTest", deviceJson, null, destination);
            ValidateCh5Archive(destination);
            timer.Stop();
            Respond(id, true, new { size = new FileInfo(destination).Length, elapsedMilliseconds = timer.ElapsedMilliseconds }, null);
        }
        finally
        {
            try { Directory.Delete(folder, true); } catch { }
        }
    }

    private static string? FindCh5Cli()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var globalCli = Path.Combine(appData, "npm", "ch5-cli.cmd");
        if (File.Exists(globalCli)) return globalCli;
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        return path.Split(Path.PathSeparator).Select(folder => Path.Combine(folder.Trim('"'), "ch5-cli.cmd")).FirstOrDefault(File.Exists);
    }

    private static string CreateEmptyContractMapping(string folder, string projectName)
    {
        var path = Path.Combine(folder, projectName + "-empty.cse2j");
        var empty = new Dictionary<string, object>();
        var mapping = new
        {
            name = projectName,
            timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"),
            version = "1.0.0.0",
            schema_version = 1,
            extra_value = "Generated join-only mapping",
            signals = new
            {
                states = new { boolean = empty, numeric = empty, @string = empty },
                events = new { boolean = empty, numeric = empty, @string = empty }
            }
        };
        File.WriteAllText(path, JsonSerializer.Serialize(mapping, new JsonSerializerOptions { WriteIndented = true }));
        return path;
    }

    private void SelectCh5Package(string id)
    {
        var dialog = new OpenFileDialog { Title = "Select Crestron CH5 Package", Filter = "Crestron HTML5 Archive (*.ch5z)|*.ch5z", Multiselect = false, InitialDirectory = LoadStorageSettings()["exports"] };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        ValidateCh5Archive(dialog.FileName);
        Respond(id, true, new { path = dialog.FileName, size = new FileInfo(dialog.FileName).Length }, null);
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
try {
    Start-Transcript -Path $LogPath -Force | Out-Null
    & $Cli deploy -p -H $PanelHost -t $DeploymentType $Package --slow-mode -vvv
    $deploymentExitCode = $LASTEXITCODE
} finally {
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
        var candidates = new List<string> {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
        };
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        candidates.AddRange(path.Split(Path.PathSeparator).Where(folder => !string.IsNullOrWhiteSpace(folder)).Select(folder => Path.Combine(folder.Trim('"'), "node.exe")));
        return candidates.FirstOrDefault(File.Exists);
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
            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            if (!process.WaitForExit(4000)) { try { process.Kill(true); } catch { } return null; }
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
            "ch5cli" => new ProcessStartInfo("cmd.exe", "/k npm install -g @crestron/ch5-utilities-cli @crestron/ch5-shell-utilities-cli") { UseShellExecute = true, WindowStyle = ProcessWindowStyle.Normal },
            _ => throw new InvalidOperationException("Unknown prerequisite.")
        };
        Process.Start(start);
        Respond(id, true, new { started = true, prerequisite }, null);
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
        var ch5Entry = zip.Entries.FirstOrDefault(entry => entry.FullName.EndsWith(".ch5", StringComparison.OrdinalIgnoreCase)) ?? throw new InvalidDataException("The generated archive does not contain a .ch5 payload.");
        if (!zip.Entries.Any(entry => entry.FullName.EndsWith("manifest.json", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The generated archive does not contain the required manifest.");
        using var payloadMemory = new MemoryStream();
        using (var payloadStream = ch5Entry.Open()) payloadStream.CopyTo(payloadMemory);
        payloadMemory.Position = 0;
        using var payload = new ZipArchive(payloadMemory, ZipArchiveMode.Read);
        if (!payload.Entries.Any(entry => entry.FullName.EndsWith("index.html", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The CH5 payload is missing index.html.");
        if (!payload.Entries.Any(entry => entry.FullName.EndsWith("cr-com-lib.js", StringComparison.OrdinalIgnoreCase))) throw new InvalidDataException("The CH5 payload is missing CrComLib.");
    }

    private static string? ReadCh5TargetDeviceId(string path)
    {
        using var zip = ZipFile.OpenRead(path);
        var ch5Entry = zip.Entries.FirstOrDefault(entry => entry.FullName.EndsWith(".ch5", StringComparison.OrdinalIgnoreCase));
        if (ch5Entry is null) return null;
        using var payloadMemory = new MemoryStream();
        using (var payloadStream = ch5Entry.Open()) payloadStream.CopyTo(payloadMemory);
        payloadMemory.Position = 0;
        using var payload = new ZipArchive(payloadMemory, ZipArchiveMode.Read);
        var target = payload.Entries.FirstOrDefault(entry => entry.FullName.EndsWith("composer-target.json", StringComparison.OrdinalIgnoreCase));
        if (target is null) return null;
        using var stream = target.Open();
        using var document = JsonDocument.Parse(stream);
        return document.RootElement.TryGetProperty("id", out var id) ? id.GetString() : null;
    }

    private void Respond(string id, bool ok, object? data, string? error)
    {
        EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "nativeResponse", id, ok, data, error }));
    }
}
