using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Text.Json;
using System.Windows;

namespace CrestronUiComposer;

public partial class MainWindow : Window
{
    private const string AppHost = "composer.local";
    private readonly string? _initialProjectPath = Environment.GetCommandLineArgs().Skip(1).FirstOrDefault(path => File.Exists(path));

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
            MessageBox.Show(
                "Crestron UI Composer could not start. Ensure the Microsoft Edge WebView2 Runtime is installed.\n\n" + ex.Message,
                "Startup error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var message = JsonDocument.Parse(e.WebMessageAsJson);
            var root = message.RootElement;
            var id = root.GetProperty("id").GetString() ?? "";
            var command = root.GetProperty("command").GetString() ?? "";

            switch (command)
            {
                case "saveProject":
                    SaveText(id, root.GetProperty("payload").GetString() ?? "", "Crestron UI Composer Project (*.cuiproj)|*.cuiproj|JSON Project (*.json)|*.json", "crestron-ui-project.cuiproj");
                    break;
                case "exportHtml":
                    SaveText(id, root.GetProperty("payload").GetString() ?? "", "HTML Interface (*.html)|*.html", "index.html");
                    break;
                case "openProject":
                    OpenProject(id);
                    break;
                case "importSnippets":
                    ImportSnippets(id);
                    break;
                case "buildCh5Package":
                    BuildCh5Package(id, root.GetProperty("payload"));
                    break;
                case "selectCh5Package":
                    SelectCh5Package(id);
                    break;
                case "checkPanel":
                    CheckPanel(id, root.GetProperty("payload").GetString() ?? "");
                    break;
                case "deployCh5Package":
                    DeployCh5Package(id, root.GetProperty("payload"));
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
            Respond("", false, null, ex.Message);
        }
    }

    private void SaveText(string id, string contents, string filter, string defaultName)
    {
        var dialog = new SaveFileDialog { Filter = filter, FileName = defaultName, AddExtension = true };
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
            AddExtension = true
        };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        File.WriteAllText(dialog.FileName, contents);
        if (openAfterSave)
        {
            try
            {
                Process.Start(new ProcessStartInfo(dialog.FileName) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("The .cce project was saved, but Windows could not open it. Install Crestron Contract Editor or associate .cce files with it.\n\nSaved to: " + dialog.FileName, ex);
            }
        }
        Respond(id, true, new { path = dialog.FileName, opened = openAfterSave }, null);
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
        var dialog = new OpenFileDialog { Filter = "Crestron UI Composer Project (*.cuiproj)|*.cuiproj|JSON Project (*.json)|*.json|All files (*.*)|*.*", Multiselect = false };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        Respond(id, true, new { path = dialog.FileName, contents = File.ReadAllText(dialog.FileName) }, null);
    }

    private void ImportSnippets(string id)
    {
        var dialog = new OpenFileDialog { Filter = "HTML snippets (*.html)|*.html", Multiselect = true };
        if (dialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
        var files = dialog.FileNames.Select(path => new { name = Path.GetFileName(path), html = File.ReadAllText(path) }).ToArray();
        Respond(id, true, files, null);
    }

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
            var contractDialog = new OpenFileDialog { Title = "Select the Contract Editor mapping", Filter = "Crestron contract mapping (*.cse2j)|*.cse2j", Multiselect = false };
            if (contractDialog.ShowDialog(this) != true) { Respond(id, false, null, "cancelled"); return; }
            contractPath = contractDialog.FileName;
        }

        var saveDialog = new SaveFileDialog { Title = "Build Crestron CH5 Package", Filter = "Crestron HTML5 Archive (*.ch5z)|*.ch5z", FileName = projectName + ".ch5z", AddExtension = true };
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

            var arguments = $"/d /s /c \"\"{cli}\" archive -p \"{projectName}\" -d \"{source}\" -o \"{output}\"";
            if (contractPath is not null) arguments += $" -c \"{contractPath}\"";
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

    private static string? FindCh5Cli()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var globalCli = Path.Combine(appData, "npm", "ch5-cli.cmd");
        if (File.Exists(globalCli)) return globalCli;
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        return path.Split(Path.PathSeparator).Select(folder => Path.Combine(folder.Trim('"'), "ch5-cli.cmd")).FirstOrDefault(File.Exists);
    }

    private void SelectCh5Package(string id)
    {
        var dialog = new OpenFileDialog { Title = "Select Crestron CH5 Package", Filter = "Crestron HTML5 Archive (*.ch5z)|*.ch5z", Multiselect = false };
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

    private void DeployCh5Package(string id, JsonElement payload)
    {
        var host = payload.GetProperty("host").GetString()?.Trim() ?? "";
        var package = payload.GetProperty("packagePath").GetString() ?? "";
        var slowMode = payload.TryGetProperty("slowMode", out var slow) && slow.GetBoolean();
        if (string.IsNullOrWhiteSpace(host)) throw new InvalidOperationException("Enter the panel IP address or host name.");
        ValidateCh5Archive(package);
        var cli = FindCh5Cli() ?? throw new FileNotFoundException("Crestron's ch5-cli was not found. Install @crestron/ch5-utilities-cli before deploying.");
        var backupRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer", "DeploymentBackups");
        Directory.CreateDirectory(backupRoot);
        var backupPath = Path.Combine(backupRoot, $"{DateTime.Now:yyyyMMdd-HHmmss}-{Path.GetFileName(package)}");
        File.Copy(package, backupPath, true);
        var command = $"\"{cli}\" deploy -p -H \"{host}\" -t touchscreen \"{package}\"{(slowMode ? " --slow-mode" : "")}";
        var start = new ProcessStartInfo("cmd.exe", $"/d /s /c \"{command}\"") { UseShellExecute = true, CreateNoWindow = false, WindowStyle = ProcessWindowStyle.Normal };
        var process = Process.Start(start) ?? throw new InvalidOperationException("The Crestron deployment terminal could not be started.");
        Respond(id, true, new { started = true, processId = process.Id, host, packagePath = package, backupPath, slowMode }, null);
    }

    private void SystemDiagnostics(string id)
    {
        var settingsFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrestronUiComposer");
        var cli = FindCh5Cli();
        Respond(id, true, new
        {
            appVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown",
            os = Environment.OSVersion.VersionString,
            architecture = System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString(),
            dotnet = Environment.Version.ToString(),
            webView2 = EditorView.CoreWebView2.Environment.BrowserVersionString,
            node = RunVersion("node", "--version"),
            npm = RunVersion("npm.cmd", "--version"),
            ch5Cli = cli is null ? null : RunVersion(cli, "--version"),
            ch5CliPath = cli,
            settingsFolder,
            installFolder = AppContext.BaseDirectory,
            portable = !AppContext.BaseDirectory.StartsWith(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), StringComparison.OrdinalIgnoreCase)
        }, null);
    }

    private static string? RunVersion(string fileName, string arguments)
    {
        try
        {
            var start = new ProcessStartInfo(fileName, arguments) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
            using var process = Process.Start(start);
            if (process is null) return null;
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit(4000);
            return process.ExitCode == 0 ? output.Trim() : null;
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

    private void Respond(string id, bool ok, object? data, string? error)
    {
        EditorView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "nativeResponse", id, ok, data, error }));
    }
}
