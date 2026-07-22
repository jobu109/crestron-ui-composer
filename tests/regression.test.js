"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  childProcess = require("node:child_process"),
  root = path.resolve(__dirname, "..");

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}
function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}\n${error.stack}`);
    process.exitCode = 1;
  }
}

global.window = global;
vm.runInThisContext(read("project-migrations.js"), { filename: "project-migrations.js" });
vm.runInThisContext(read("responsive-layout.js"), { filename: "responsive-layout.js" });

run("legacy projects migrate without mutating the source", () => {
  const legacy = {
      width: 1920,
      height: 1200,
      background: "#123456",
      items: [{ id: "one", name: "Button", x: 1, y: 2, w: 100, h: 50 }],
    },
    before = JSON.stringify(legacy),
    result = ComposerProjectMigrations.migrate(legacy);
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(result.migrated, true);
  assert.equal(result.project.version, ComposerProjectMigrations.CURRENT_VERSION);
  assert.equal(result.project.pages.length, 1);
  assert.equal(result.project.items[0].pageId, result.project.pages[0].id);
  assert.deepEqual(result.project.items[0].actions, []);
});

run("current projects survive a save/load round trip", () => {
  const current = ComposerProjectMigrations.migrate({
    version: ComposerProjectMigrations.CURRENT_VERSION,
    width: 1920,
    height: 1200,
    pages: [{ id: "home", name: "Home", background: "#000", bindingMode: "none" }],
    activePage: "home",
    items: [{ id: "one", pageId: "home", name: "Button", properties: {}, signalBindings: {}, actions: [] }],
    themes: [],
    customComponents: [],
  }).project;
  const roundTrip = ComposerProjectMigrations.migrate(JSON.parse(JSON.stringify(current)));
  assert.equal(roundTrip.migrated, false);
  assert.deepEqual(roundTrip.project, current);
});

run("responsive anchors and panel overrides migrate safely", () => {
  const migrated = ComposerProjectMigrations.migrate({
    version: 4, width: 1920, height: 1200,
    pages: [{ id: "home", name: "Home" }], activePage: "home",
    items: [{ id: "one", pageId: "home", x: 100, y: 100, w: 200, h: 100 }],
  }).project;
  assert.equal(migrated.items[0].layout.anchorX, "left");
  assert.deepEqual(migrated.items[0].deviceOverrides, {});
});

run("removed TSW-570 targets retain their dimensions as custom layouts", () => {
  const migrated = ComposerProjectMigrations.migrate({
    version: ComposerProjectMigrations.CURRENT_VERSION,
    targetDevice: "tsw-570", width: 1280, height: 720,
    pages: [{ id: "home", name: "Home" }], activePage: "home", items: [],
  }).project;
  assert.equal(migrated.targetDevice, "custom");
  assert.equal(migrated.width, 1280);
  assert.equal(migrated.height, 720);
});

run("responsive layout honors right, center, stretch, and proportional rules", () => {
  assert.deepEqual(
    ComposerResponsiveLayout.adaptRect(
      { x: 1620, y: 100, w: 200, h: 100 }, { width: 1920, height: 1200 },
      { width: 1280, height: 800 }, { anchorX: "right", anchorY: "top", scaleMode: "fixed" },
    ),
    { x: 980, y: 100, w: 200, h: 100 },
  );
  assert.deepEqual(
    ComposerResponsiveLayout.adaptRect(
      { x: 100, y: 100, w: 200, h: 100 }, { width: 1000, height: 500 },
      { width: 2000, height: 1000 }, { anchorX: "left", anchorY: "top", scaleMode: "proportional" },
    ),
    { x: 200, y: 200, w: 400, h: 200 },
  );
  assert.equal(ComposerResponsiveLayout.fitsSafeArea(
    { x: 20, y: 20, w: 100, h: 100 }, { width: 200, height: 200 }, 20,
  ), true);
});

run("all shipped JavaScript files pass syntax validation", () => {
  const files = fs.readdirSync(root).filter((name) => name.endsWith(".js"));
  assert.ok(files.length > 10);
  files.forEach((file) =>
    childProcess.execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "pipe" }),
  );
});

run("component manifest references existing unique components", () => {
  const manifest = JSON.parse(read("components.manifest.json")),
    ids = new Set();
  assert.ok(manifest.components.length > 0);
  manifest.components.forEach((component) => {
    assert.ok(fs.existsSync(path.join(root, component.file)), `Missing ${component.file}`);
    assert.ok(component.componentId, `Missing component ID for ${component.file}`);
    assert.ok(!ids.has(component.componentId), `Duplicate component ID ${component.componentId}`);
    ids.add(component.componentId);
  });
});

run("device presets use their effective Construct viewports", () => {
  const devices = new Map(
    JSON.parse(read("devices.manifest.json")).devices.map((device) => [
      device.id,
      device,
    ]),
  );
  ["tsw-770", "tsw-880", "tsw-1070", "tsw-1080", "tst-1080"].forEach(
    (id) => assert.deepEqual([devices.get(id)?.width, devices.get(id)?.height], [1280, 800]),
  );
  assert.deepEqual([devices.get("monitor-4k")?.width, devices.get("monitor-4k")?.height], [2560, 1440]);
  assert.deepEqual([devices.get("dge-100")?.width, devices.get("dge-100")?.height], [3840, 2160]);
});

run("exported action runtime is valid JavaScript", () => {
  vm.runInThisContext(read("component-runtime.js"), { filename: "component-runtime.js" });
  ComposerRuntime.register({
    id: "regression-button",
    name: "Regression Button",
    template: "<button>Test</button>",
    styles: "",
    properties: [],
    signals: [],
    data: {
      html: '<button>Custom</button><script>window.customReady=true;</script>',
    },
    mount() {},
  });
  vm.runInThisContext(read("exporter.js"), { filename: "exporter.js" });
  const html = ComposerExporter.exportProject({
      version: 4,
      width: 1920,
      height: 1200,
      pages: [{ id: "home", name: "Home", background: "#000", bindingMode: "none" }],
      items: [{
        id: "one", pageId: "home", name: "Regression Button", componentId: "regression-button",
        x: 0, y: 0, w: 100, h: 50, z: 1, properties: {}, signalBindings: {},
        actions: [{ event: "signal-change", triggerType: "analog", triggerSignal: "Room.Level", condition: "greater", compareValue: "100", type: "navigate", target: "home", delay: 0, timing: "parallel" }],
      }],
    }),
    start = html.indexOf("<script>", html.indexOf("<body")) + 8,
    end = html.lastIndexOf("</script>");
  assert.ok(html.includes("Room.Level"));
  assert.ok(
    html.includes('<style id="composer-component-styles">'),
    "Export must keep component CSS in the static document head",
  );
  assert.ok(
    html.includes('<div class="scoped-preview"></div>'),
    "Exported widgets must use the same inner mount container as the editor",
  );
  assert.ok(
    html.includes(".scoped-preview{display:block;width:100%;height:100%"),
    "Exported custom-component mounts must fill the saved widget frame",
  );
  assert.ok(
    html.includes("holder&&holder.querySelector('.scoped-preview')"),
    "Export runtime must mount components inside the inner preview container",
  );
  assert.ok(
    html.includes("holder.dataset.assetSelected"),
    "Selected feedback must switch selected-state widget assets",
  );
  assert.ok(
    html.includes('data-asset-selected="false"'),
    "Exported widgets must include two-state asset state",
  );
  assert.ok(!html.includes("Number(index)-1"), "Exported runtime must preserve zero-based item indexes");
  assert.ok(html.includes("legacyCollection"), "Exported runtime must repair legacy collection addresses");
  assert.ok(
    html.includes("factory(bundle.runsInContainerApp())"),
    "Export must select the correct Web XPanel transport before CrComLib initializes",
  );
  assert.equal(
    (html.match(/<\/script>/g) || []).length,
    3,
    "Embedded custom-component scripts must not close the exported runtime script",
  );
  const resolverStart = html.indexOf("function standardAttribute"),
    resolverEnd = html.indexOf("function appearance", resolverStart),
    exportedResolver = new Function(
      `${html.slice(resolverStart, resolverEnd)};return contractAddress;`,
    )();
  assert.equal(
    exportedResolver(
      "RollingMenu.Items[0].Press",
      "digital",
      "output",
      "Home.Rolling_Menu",
    ),
    "Home.Rolling_Menu.Items[0].Press",
    "Exported ranged digital addresses must retain array brackets and separators",
  );
  assert.equal(
    exportedResolver(
      "LightingControl.Items[0].Level_Set",
      "analog",
      "output",
      "Home.Lighting_Control",
    ),
    "Home.Lighting_Control.Items[0].ValueSet",
    "Exported ranged analog addresses must use the mapped ValueSet attribute",
  );
  new Function(html.slice(start, end));
});

run("widget styles cannot enlarge sidebar action buttons", () => {
  const css = read("editor.css");
  assert.ok(css.includes(".sidebar .side-panel-section-body > button"));
  assert.ok(css.includes("height: auto !important"));
  assert.ok(css.includes("min-height: 36px !important"));
});

run("simulator and mounted widgets share resolved contract addresses", () => {
  assert.equal(
    ComposerRuntime.resolveAddress("RollingToggle.Selected", "digital", "input", "Home.RollingToggle"),
    "Home.RollingToggle.Selected",
  );
  assert.equal(
    ComposerRuntime.resolveAddress("1", "digital", "input", "Home.RollingToggle"),
    "1",
  );
  assert.equal(
    ComposerRuntime.resolveAddress(
      "LightingControl.Items.0.Feedback",
      "analog",
      "input",
      "Home.LightingControl",
    ),
    "Home.LightingControl.Items[0].Feedback",
  );
  assert.equal(
    ComposerRuntime.resolveAddress(
      "Sources.Items.2.Name",
      "serial",
      "input",
      "Home.Sources",
    ),
    "Home.Sources.Items[2].Name",
  );
  assert.equal(
    ComposerRuntime.resolveAddress(
      "RollingMenu_Items[2].Selected",
      "digital",
      "input",
      "Home.RollingMenu",
    ),
    "Home.RollingMenu.Items[2].Selected",
  );
  assert.equal(
    ComposerRuntime.resolveAddress(
      "Sources.SelectedSetFeedback",
      "analog",
      "input",
      "Home.Sources",
    ),
    "Home.Sources.SelectedSetFeedback",
  );
});

run("migration repairs legacy Rolling Menu collection paths", () => {
  const result = ComposerProjectMigrations.migrate({
    version: 4,
    pages: [{ id: "home", name: "Home" }],
    activePage: "home",
    items: [{
      id: "rolling",
      pageId: "home",
      componentId: "rolling-menu",
      properties: {
        pressBase: "RollingMenu_Items[{index}].Press",
        feedbackBase: "RollingMenu_Items[{index}].Selected",
        labelBase: "RollingMenu_Items[{index}].Name",
      },
    }],
  });
  assert.equal(result.project.items[0].properties.feedbackBase, "RollingMenu.Items[{index}].Selected");
});

if (process.exitCode) process.exit(process.exitCode);
console.log("All regression checks passed.");
