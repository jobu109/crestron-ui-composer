# Crestron UI Composer

## Windows desktop application

The editor is hosted by a Windows WPF/WebView2 application in `CrestronUiComposer`. Build a self-contained 64-bit release with:

```powershell
.\build-desktop.ps1
```

The published application is written to `dist\win-x64`. End users do not need Python, Node.js, or the .NET Runtime. The Microsoft Edge WebView2 Runtime is required and will be handled by the future installer.

The built-in component catalog is defined by `components.manifest.json`. Crestron output generation is isolated in `exporter.js`, allowing the panel runtime implementation to evolve independently from the desktop editor.

Target touch-panel profiles are defined by `devices.manifest.json`. The initial hardware validation profile is the Crestron TSW-1070 at its native 1920 × 1200 resolution. Projects retain their selected panel profile when saved.

Use **TSW-1070 Test** to replace the current design with a repeatable two-page hardware test. It assigns button press, feedback, and serial label joins 1–9 and includes local forward/back navigation that does not depend on SIMPL.

### Build a touch-panel package

Use **Build .ch5z** in the desktop toolbar to generate a deployable Crestron HTML5 archive. The builder includes the official UMD `cr-com-lib.js`, invokes Crestron's `ch5-cli archive`, and validates the outer manifest plus the internal `.ch5`, `index.html`, and CrComLib payload. If any contract bindings are present, the builder requests the corresponding Contract Editor `.cse2j` mapping.

The current development build locates `ch5-cli.cmd` from the global NPM installation. Install it with `npm install -g @crestron/ch5-utilities-cli` on a development workstation. A future installer will bundle or bootstrap this prerequisite.

## Browser development mode

Open this folder through a small local web server, then visit `editor.html`:

```powershell
python -m http.server 8080
```

The editor automatically loads the HTML snippets when served from the folder. If it is opened directly from disk, use **Import snippets** and select the component HTML files.

The component library organizes snippets into Buttons, Sliders & Levels, Text, Navigation & Menus, Lists & Selectors, Input, and Status & Information. Use the search field to filter across categories. Imported snippets are categorized from their filenames and appear under Other when no category can be inferred.

Drag components onto the panel and select them to change position and size. The inspector automatically detects JavaScript variables whose names end in `Signal`. Each binding can independently be configured as a numeric join or a named contract signal. Use **Edit component HTML** for advanced changes. Save the editable JSON project regularly. **Export HTML** creates a standalone `index.html` suitable as the entry page of a Crestron HTML5 project.

The Windows editor automatically captures unsaved work every 30 seconds and keeps up to ten recovery snapshots. After an interrupted or unsaved session, choose a timestamp from the recovery dialog at startup. Successful manual saves and confirmed new projects clear obsolete recovery data.

The exported widgets run in isolated inline frames. Their existing `getCrComLib()` helpers locate `CrComLib` on the parent page, so their current publish/subscribe behavior is preserved on a panel. Preview mode is useful for layout but cannot simulate Crestron feedback without a CH5 runtime connection.

## Pages and navigation

Use **Add page** in the left sidebar to create pages. A page may be selected externally with either a digital join or a contract signal: select the page, choose the external selection mode, and enter its signal. The exported interface shows that page when the signal goes high.

For navigation that does not involve SIMPL Windows, select a button or other component and set **Local navigation** to its destination page. A successful pointer release on that component changes pages entirely in the browser. External and local navigation can be mixed in the same project.

## Regression checks and project migration

Run `npm test` before packaging. The suite checks project migrations and save/load stability, shipped JavaScript syntax, component-manifest integrity, and generated HTML action-runtime syntax.

Project files use a versioned format. Opening an older project in the Windows application creates a timestamped backup beside the original before applying automatic migrations. Use **Health check** in the toolbar to review or export the current project report.
