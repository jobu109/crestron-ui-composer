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
    version: 4,
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

run("exported action runtime is valid JavaScript", () => {
  vm.runInThisContext(read("component-runtime.js"), { filename: "component-runtime.js" });
  ComposerRuntime.register({
    id: "regression-button",
    name: "Regression Button",
    template: "<button>Test</button>",
    styles: "",
    properties: [],
    signals: [],
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
    start = html.lastIndexOf("<script>") + 8,
    end = html.lastIndexOf("</script>");
  assert.ok(html.includes("Room.Level"));
  assert.ok(!html.includes("Number(index)-1"), "Exported runtime must preserve zero-based item indexes");
  new Function(html.slice(start, end));
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
      "Sources.SelectedSetFeedback",
      "analog",
      "input",
      "Home.Sources",
    ),
    "Home.Sources.SelectedSetFeedback",
  );
});

if (process.exitCode) process.exit(process.exitCode);
console.log("All regression checks passed.");
