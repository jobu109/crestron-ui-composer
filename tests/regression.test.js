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
vm.runInThisContext(read("project-migrations.js"), {
  filename: "project-migrations.js",
});
vm.runInThisContext(read("responsive-layout.js"), {
  filename: "responsive-layout.js",
});

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
  assert.equal(
    result.project.version,
    ComposerProjectMigrations.CURRENT_VERSION,
  );
  assert.equal(result.project.pages.length, 1);
  assert.equal(result.project.items[0].pageId, result.project.pages[0].id);
  assert.deepEqual(result.project.items[0].actions, []);
});

run("current projects survive a save/load round trip", () => {
  const current = ComposerProjectMigrations.migrate({
    version: ComposerProjectMigrations.CURRENT_VERSION,
    width: 1920,
    height: 1200,
    pages: [
      { id: "home", name: "Home", background: "#000", bindingMode: "none" },
    ],
    activePage: "home",
    items: [
      {
        id: "one",
        pageId: "home",
        name: "Button",
        properties: {},
        signalBindings: {},
        actions: [],
      },
    ],
    themes: [],
    customComponents: [],
  }).project;
  const roundTrip = ComposerProjectMigrations.migrate(
    JSON.parse(JSON.stringify(current)),
  );
  assert.equal(roundTrip.migrated, false);
  assert.deepEqual(roundTrip.project, current);
});

run("responsive anchors and panel overrides migrate safely", () => {
  const migrated = ComposerProjectMigrations.migrate({
    version: 4,
    width: 1920,
    height: 1200,
    pages: [{ id: "home", name: "Home" }],
    activePage: "home",
    items: [{ id: "one", pageId: "home", x: 100, y: 100, w: 200, h: 100 }],
  }).project;
  assert.equal(migrated.items[0].layout.anchorX, "left");
  assert.deepEqual(migrated.items[0].deviceOverrides, {});
});

run("global components backfill per-page visibility overrides", () => {
  const migrated = ComposerProjectMigrations.migrate({
    version: 5,
    width: 1920,
    height: 1200,
    pages: [
      { id: "home", name: "Home" },
      { id: "splash", name: "Splash" },
    ],
    activePage: "home",
    items: [
      { id: "toast", pageId: "home", master: true, x: 0, y: 0, w: 240, h: 140 },
    ],
  }).project;
  assert.deepEqual(migrated.items[0].excludedPages, []);
  assert.equal(migrated.version, ComposerProjectMigrations.CURRENT_VERSION);
});

run("per-page hide control is limited to true global components", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("const isGlobalComponent = item.master === true && !item.systemManaged"));
  assert.ok(editor.includes('$("prop-hide-on-page-wrap").hidden = !isGlobalComponent'));
  assert.ok(editor.includes("if (!item || item.master !== true || item.systemManaged)"));
});

run("legacy projects gain exactly one system Toast Notifications item", () => {
  const legacy = ComposerProjectMigrations.migrate({
    version: 5,
    width: 1920,
    height: 1200,
    pages: [{ id: "home", name: "Home" }],
    activePage: "home",
    items: [{ id: "button", pageId: "home", name: "Button" }],
  }).project;
  const systemItems = legacy.items.filter(
    (item) => item.componentId === "toast-queue" && item.systemManaged,
  );
  assert.equal(systemItems.length, 1);
  assert.equal(systemItems[0].master, true);
  assert.deepEqual(systemItems[0].excludedPages, []);
  assert.equal(legacy.version, ComposerProjectMigrations.CURRENT_VERSION);

  const roundTrip = ComposerProjectMigrations.migrate(
    JSON.parse(JSON.stringify(legacy)),
  ).project;
  assert.equal(
    roundTrip.items.filter(
      (item) => item.componentId === "toast-queue" && item.systemManaged,
    ).length,
    1,
    "migrating an already-migrated project must not create a duplicate system item",
  );
});

run("removed TSW-570 targets retain their dimensions as custom layouts", () => {
  const migrated = ComposerProjectMigrations.migrate({
    version: ComposerProjectMigrations.CURRENT_VERSION,
    targetDevice: "tsw-570",
    width: 1280,
    height: 720,
    pages: [{ id: "home", name: "Home" }],
    activePage: "home",
    items: [],
  }).project;
  assert.equal(migrated.targetDevice, "custom");
  assert.equal(migrated.width, 1280);
  assert.equal(migrated.height, 720);
});

run(
  "responsive layout honors right, center, stretch, and proportional rules",
  () => {
    assert.deepEqual(
      ComposerResponsiveLayout.adaptRect(
        { x: 1620, y: 100, w: 200, h: 100 },
        { width: 1920, height: 1200 },
        { width: 1280, height: 800 },
        { anchorX: "right", anchorY: "top", scaleMode: "fixed" },
      ),
      { x: 980, y: 100, w: 200, h: 100 },
    );
    assert.deepEqual(
      ComposerResponsiveLayout.adaptRect(
        { x: 100, y: 100, w: 200, h: 100 },
        { width: 1000, height: 500 },
        { width: 2000, height: 1000 },
        { anchorX: "left", anchorY: "top", scaleMode: "proportional" },
      ),
      { x: 200, y: 200, w: 400, h: 200 },
    );
    assert.equal(
      ComposerResponsiveLayout.fitsSafeArea(
        { x: 20, y: 20, w: 100, h: 100 },
        { width: 200, height: 200 },
        20,
      ),
      true,
    );
  },
);

run("all shipped JavaScript files pass syntax validation", () => {
  const files = fs.readdirSync(root).filter((name) => name.endsWith(".js"));
  assert.ok(files.length > 10);
  files.forEach((file) =>
    childProcess.execFileSync(
      process.execPath,
      ["--check", path.join(root, file)],
      { stdio: "pipe" },
    ),
  );
});

run("component manifest references existing unique components", () => {
  const manifest = JSON.parse(read("components.manifest.json")),
    ids = new Set();
  assert.ok(manifest.components.length > 0);
  manifest.components.forEach((component) => {
    assert.ok(
      fs.existsSync(path.join(root, component.file)),
      `Missing ${component.file}`,
    );
    assert.ok(
      component.componentId,
      `Missing component ID for ${component.file}`,
    );
    assert.ok(
      !ids.has(component.componentId),
      `Duplicate component ID ${component.componentId}`,
    );
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
  ["tsw-770", "tsw-880", "tsw-1070", "tsw-1080", "tst-1080"].forEach((id) =>
    assert.deepEqual(
      [devices.get(id)?.width, devices.get(id)?.height],
      [1280, 800],
    ),
  );
  assert.deepEqual(
    [devices.get("monitor-4k")?.width, devices.get("monitor-4k")?.height],
    [2560, 1440],
  );
  assert.deepEqual(
    [devices.get("dge-100")?.width, devices.get("dge-100")?.height],
    [3840, 2160],
  );
});

run("exported action runtime is valid JavaScript", () => {
  vm.runInThisContext(read("component-runtime.js"), {
    filename: "component-runtime.js",
  });
  ComposerRuntime.register({
    id: "regression-button",
    name: "Regression Button",
    template: "<button>Test</button>",
    styles: "",
    properties: [],
    signals: [],
    data: {
      html: "<button>Custom</button><script>window.customReady=true;</script>",
    },
    mount() {},
  });
  vm.runInThisContext(read("exporter.js"), { filename: "exporter.js" });
  const html = ComposerExporter.exportProject({
      version: 4,
      width: 1920,
      height: 1200,
      pages: [
        { id: "home", name: "Home", background: "#000", bindingMode: "none" },
      ],
      items: [
        {
          id: "one",
          pageId: "home",
          name: "Regression Button",
          componentId: "regression-button",
          x: 0,
          y: 0,
          w: 100,
          h: 50,
          z: 1,
          properties: {},
          signalBindings: {},
          interaction: {
            trigger: "none",
            pressEffect: "particle-burst",
            effectDuration: 650,
            effectSize: 125,
          },
          actions: [
            {
              event: "signal-change",
              triggerType: "analog",
              triggerSignal: "Room.Level",
              condition: "greater",
              compareValue: "100",
              type: "navigate",
              target: "home",
              delay: 0,
              timing: "parallel",
            },
          ],
        },
      ],
    }),
    start = html.indexOf("<script>", html.indexOf("<body")) + 8,
    end = html.indexOf("</script>", start);
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
  assert.ok(
    !html.includes("Number(index)-1"),
    "Exported runtime must preserve zero-based item indexes",
  );
  assert.ok(
    html.includes("legacyCollection"),
    "Exported runtime must repair legacy collection addresses",
  );
  assert.ok(
    html.includes("particleBurst(root,c,e)"),
    "Exported runtime must include Particle Burst press effects",
  );
  assert.ok(
    html.includes("distance=Math.max(2,6*s)"),
    "Exported runtime must include Shake press effects",
  );
  assert.ok(
    html.includes("bundle.getWebXPanel(!inContainer)"),
    "Export must select the correct Web XPanel transport for CH5 Desktop or Web XPanel",
  );
  assert.ok(
    html.indexOf("startComposerCommunication") < html.indexOf("function standardAttribute"),
    "WebXPanel communication must initialize before component subscriptions",
  );
  assert.ok(
    html.indexOf("startComposerCommunication") < html.indexOf('src="cr-com-lib.js"'),
    "WebXPanel must select the CH5 Desktop native bridge before CrComLib loads",
  );
  assert.ok(
    html.includes("window.__composerCommunicationReady=true"),
    "Export must expose CH5 Desktop communication readiness for diagnostics",
  );
  assert.ok(
    html.includes("window.__composerFeedbackState") &&
      html.includes("feedbackState.has(key)"),
    "Exported widgets must replay the last Crestron feedback after a remount",
  );
  assert.ok(
    !html.includes("tokenSource:''") && !html.includes("tokenUrl:''"),
    "WebXPanel initialization must not pass empty optional configuration values",
  );
  assert.ok(
    html.includes("params.ipid") && html.includes("params.host") && html.includes("params.roomid"),
    "Web XPanel must honor CH5 Desktop connection parameters from the launch URL",
  );
  assert.ok(
    html.includes("key==='NOT_AUTHORIZED'") && html.includes("window.location.replace(detail.redirectTo)"),
    "Web XPanel must follow the processor authentication redirect",
  );
  assert.equal(
    (html.match(/<\/script>/g) || []).length,
    4,
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

run("real Crestron feedback survives widget remounts until changed", () => {
  ComposerRuntime.feedbackState.clear();
  let firstHandler,
    replayed = [],
    synchronous = [],
    deferred = [];
  const originalQueueMicrotask = global.queueMicrotask;
  global.queueMicrotask = (callback) => deferred.push(callback);
  const asynchronousLib = {
    subscribeState(type, signal, callback) {
      assert.equal(type, "n");
      assert.equal(signal, "Room.Level");
      firstHandler = callback;
      return function () {};
    },
  };
  ComposerRuntime.subscribeFeedback(
    asynchronousLib,
    "analog",
    "Room.Level",
    function () {},
  );
  firstHandler(32768);
  ComposerRuntime.subscribeFeedback(
    asynchronousLib,
    "analog",
    "Room.Level",
    (value) => replayed.push(value),
  );
  assert.deepEqual(replayed, []);
  deferred.splice(0).forEach((callback) => callback());
  assert.deepEqual(replayed, [32768]);
  ComposerRuntime.subscribeFeedback(
    {
      subscribeState(type, signal, callback) {
        callback(49152);
        return function () {};
      },
    },
    "analog",
    "Room.Level",
    (value) => synchronous.push(value),
  );
  assert.deepEqual(synchronous, [49152]);
  assert.equal(ComposerRuntime.feedbackState.get("n:Room.Level"), 49152);
  global.queueMicrotask = originalQueueMicrotask;
});

run("widget styles cannot enlarge sidebar action buttons", () => {
  const css = read("editor.css");
  assert.ok(css.includes(".sidebar .side-panel-section-body > button"));
  assert.ok(css.includes("height: auto !important"));
  assert.ok(css.includes("min-height: 36px !important"));
});

run("desktop close prompts to save dirty projects", () => {
  const desktop = read("CrestronUiComposer/MainWindow.xaml.cs"), editor = read("editor.js");
  assert.ok(desktop.includes("Closing += OnClosing"));
  assert.ok(desktop.includes("MessageBoxButton.YesNoCancel"));
  assert.ok(desktop.includes("Save Project Before Closing"));
  assert.ok(desktop.includes("window.ComposerCloseBridge ? window.ComposerCloseBridge.prepareClose() : null"));
  assert.ok(editor.includes("window.ComposerCloseBridge ="));
  assert.ok(editor.includes("dirty: projectDirty"));
  assert.ok(editor.includes("errors = projectIntegrityErrors(value)"));
});

run("simulator and mounted widgets share resolved contract addresses", () => {
  assert.equal(
    ComposerRuntime.resolveAddress(
      "RollingToggle.Selected",
      "digital",
      "input",
      "Home.RollingToggle",
    ),
    "Home.RollingToggle.Selected",
  );
  assert.equal(
    ComposerRuntime.resolveAddress(
      "1",
      "digital",
      "input",
      "Home.RollingToggle",
    ),
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

run("signal simulator pulses exercise the actual widget press lifecycle", () => {
  const editor = read("editor.js"), styles = read("editor.css");
  assert.ok(editor.includes("function dispatchSimulatedWidgetPress"));
  assert.ok(editor.includes("definition?.itemSelector"));
  assert.ok(editor.includes('new PointerEvent(eventName'));
  assert.ok(editor.includes('new MouseEvent("click"'));
  assert.ok(editor.includes("if (e.composerSimulator) return"));
  assert.ok(styles.includes(".widget.simulator-live-press"));
});

run("eligible single-surface buttons distinguish Press from Held", () => {
  ComposerRuntime.register({
    id: "shared-hold-regression-button",
    name: "Shared Hold Regression Button",
    category: "Standard Buttons",
    template: "<button>Test</button>",
    styles: "",
    properties: [],
    signals: [
      {
        key: "press",
        name: "Press",
        type: "digital",
        direction: "output",
        defaultValue: "SharedHold.Press",
      },
    ],
    mount() {},
  });
  const definition = ComposerRuntime.get("shared-hold-regression-button"),
    runtime = read("component-runtime.js"),
    exporter = read("exporter.js"),
    editor = read("editor.js");
  assert.equal(definition.standardHoldCapability.pressKey, "press");
  assert.equal(definition.standardHoldCapability.heldKey, "held");
  assert.equal(
    definition.properties.find((property) => property.key === "heldDuration")
      ?.defaultValue,
    3,
  );
  assert.equal(
    definition.signals.find((signal) => signal.key === "held")
      ?.standardHoldOutput,
    true,
  );
  assert.ok(runtime.includes("if (standardHold.completed)"));
  assert.ok(exporter.includes("standardHold=def.hold"));
  assert.ok(editor.includes("signal.standardHoldOutput"));
});

run("standard button hold duration defaults to three seconds", () => {
  const runtime = read("component-runtime.js");
  assert.ok(runtime.includes('name: "Held duration (seconds)"'));
  assert.ok(runtime.includes("defaultValue: 3"));
  assert.ok(runtime.includes("(Number(options.properties.heldDuration) || 3) * 1000"));
});

run("native touch highlights are disabled in editor runtime and exports", () => {
  const editorStyles = read("editor.css"), runtime = read("component-runtime.js"), exporter = read("exporter.js");
  assert.ok(editorStyles.includes("-webkit-tap-highlight-color: transparent !important"));
  assert.ok(runtime.includes("data-composer-touch-reset"));
  assert.ok(runtime.includes("-webkit-tap-highlight-color:transparent!important"));
  assert.ok(exporter.includes("-webkit-tap-highlight-color:transparent!important"));
  assert.ok(exporter.includes("[data-component] :focus,.scoped-widget :focus{outline:none!important}"));
});

run("mouse and touch hold controls share one captured pointer lifecycle", () => {
  const editor = read("editor.js"), runtime = read("component-runtime.js"), exporter = read("exporter.js"),
    controls = [
      "hold-button.component.js",
      "circular-hold-button.component.js",
      "safety-armed.component.js",
      "countdown-auto-fire.component.js",
    ].map(read);
  assert.ok(editor.includes("const openComponentCategories = new Set()"));
  assert.ok(editor.includes("group.open = !!query || openComponentCategories.has(category)"));
  assert.ok(runtime.includes("function bindPrimaryPointer"));
  assert.ok(runtime.includes("setPointerCapture?.(event.pointerId)"));
  assert.ok(runtime.includes("event.pointerType === \"mouse\" && event.button !== 0"));
  assert.ok(runtime.includes('element.addEventListener("pointercancel", pointerCancel)'));
  assert.ok(runtime.includes('element.addEventListener("contextmenu", preventNative)'));
  assert.ok(exporter.includes('global.ComposerRuntime.bindPrimaryPointer.toString() + "function show(id){"'));
  assert.ok(exporter.includes("interactions:{bindPrimaryPointer:bindPrimaryPointer},navigate:show"));
  assert.ok(runtime.includes('element.addEventListener("touchstart", touchStart, { passive: false })'));
  assert.ok(runtime.includes('event.pointerType === "touch"'));
  controls.forEach((source) => {
    assert.ok(source.includes("context.interactions.bindPrimaryPointer"));
    assert.ok(source.includes("configuredDuration") || source.includes("configuredWindowMs"));
  });
  assert.ok(
    controls.slice(0, 2).every((source) =>
      source.includes("function cancel()") && !source.includes('addEventListener("lostpointercapture"'),
    ),
    "Cancelled holds must reset without publishing a short press",
  );
});

run("empty processor feedback preserves configured widget labels and timing", () => {
  const radio = read("radio-group.component.js"), menu = read("menu-item.component.js"),
    neo = read("neumorphic-kit-components.js"), folding = read("folding-menu.component.js"),
    microphone = read("microphone-control.component.js"), shade = read("shade-control.component.js"),
    carousel = read("horizontal-carousel.component.js");
  assert.ok(radio.includes('String(value) !== ""'));
  assert.ok(menu.includes("if (choice > 0) renderChoice(button, choice - 1, localLabels[index])"));
  assert.ok((neo.match(/String\(value\) !== ""/g) || []).length >= 4);
  assert.ok((folding.match(/String\(value\) !== ""/g) || []).length >= 2);
  assert.ok(microphone.includes('String(value)!==""'));
  assert.ok(shade.includes('String(value)!==""'));
  assert.ok(carousel.includes('String(value) !== ""'));
});

run("Glass Block remains visible and styled on older touch-panel Chromium", () => {
  const glass = read("glass-block.component.js");
  assert.ok(glass.includes('key: "useVisibleFeedback"'));
  assert.ok(glass.includes("if (p.useVisibleFeedback === true"));
  assert.ok(glass.includes("background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(52,68,68,.72)"));
  assert.ok(glass.includes("-webkit-backdrop-filter"));
});

run("circular D-Pad center icon does not depend on panel fonts", () => {
  const neo = read("neumorphic-kit-components.js");
  assert.ok(neo.includes('centerIconMarkup = `<svg viewBox="0 0 24 24"'));
  assert.ok(neo.includes('root.querySelector(".nd-center").innerHTML = centerIconMarkup'));
  assert.ok(neo.includes('power: \'<path d="M12 3v9"'));
});

run("migration repairs legacy Rolling Menu collection paths", () => {
  const result = ComposerProjectMigrations.migrate({
    version: 4,
    pages: [{ id: "home", name: "Home" }],
    activePage: "home",
    items: [
      {
        id: "rolling",
        pageId: "home",
        componentId: "rolling-menu",
        properties: {
          pressBase: "RollingMenu_Items[{index}].Press",
          feedbackBase: "RollingMenu_Items[{index}].Selected",
          labelBase: "RollingMenu_Items[{index}].Name",
        },
      },
    ],
  });
  assert.equal(
    result.project.items[0].properties.feedbackBase,
    "RollingMenu.Items[{index}].Selected",
  );
});

run(
  "Import & Translate infers standard text, button, and analog capabilities",
  () => {
    const source = read("editor.js");
    assert.match(
      source,
      /features\s*:\s*\{[\s\S]*?buttonCount\s*:/,
      "translator must record detected buttons",
    );
    assert.ok(
      source.includes("interactiveNumericCount"),
      "translator must distinguish interactive numeric controls",
    );
    assert.ok(
      /name:\s*"Value Set"[\s\S]*?type:\s*"analog"[\s\S]*?direction:\s*"output"/.test(source),
      "interactive numeric controls need Value Set",
    );
    assert.ok(
      /name:\s*"Feedback"[\s\S]*?type:\s*"analog"[\s\S]*?direction:\s*"input"/.test(source),
      "numeric displays need Feedback",
    );
    assert.ok(
      source.includes("data-translated-text"),
      "detected text must be addressable by serial feedback",
    );
    assert.ok(
      source.includes("data-translated-button"),
      "every detected button must receive an adapter",
    );
    assert.ok(source.includes("function renderTranslateReview"));
    assert.ok(source.includes("function selectedTranslateSignals"));
    assert.ok(source.includes("function inferSnippetBehaviors"));
    assert.ok(source.includes("function inferSnippetSuggestions"));
    assert.ok(source.includes("function selectedTranslateInferences"));
    assert.ok(source.includes("Generate Crestron rule"));
    assert.ok(source.includes("function applyTranslateSuggestion"));
    assert.ok(source.includes("data-translate-apply"));
    assert.ok(source.includes("function refreshTranslateSimulator"));
    assert.ok(source.includes("composer-translate-test-input"));
    assert.ok(read("editor.html").includes('id="translate-signal-simulator"'));
    assert.ok(read("editor.html").includes('id="translate-signal-log"'));
    assert.ok(
      source.includes("Auto-test signals") ||
        read("editor.html").includes("Auto-test signals"),
    );
    [
      "faceColor",
      "selectedFaceColor",
      "textColor",
      "selectedTextColor",
      "borderColor",
      "selectedBorderColor",
      "glowColor",
      "selectedGlowColor",
      "cornerRadius",
      "iconSize",
      "textSize",
    ].forEach((key) =>
      assert.ok(
        source.includes(`key: "${key}"`),
        `translated buttons need ${key}`,
      ),
    );
  },
);

run("Import & Translate treats checkbox switches as digital responsive toggles", () => {
  const editor = read("editor.js");
  assert.ok(
    editor.includes('input[type="checkbox"],input[type="radio"],[role="switch"]'),
  );
  assert.ok(editor.includes("!isToggleTrack(element)"));
  assert.ok(
    editor.includes(
      "action: (detected.toggleButtonIndexes || []).includes(index)",
    ),
  );
  assert.ok(editor.includes('? "checkedState"'));
  assert.ok(
    editor.includes(
      "function translatedToggleCss(properties, tokenized = false)",
    ),
  );
  assert.ok(editor.includes("function translatedResponsiveFitRuntime()"));
  assert.ok(editor.includes("function upgradeCustomResponsiveFitRuntime(source)"));
  assert.ok(editor.includes("upgradeCustomResponsiveFitRuntime("));
});

run("Import & Translate exposes selector-aware toggle appearance", () => {
  const editor = read("editor.js");
  for (const key of [
    "trackColor",
    "selectedTrackColor",
    "knobColor",
    "trackWidth",
    "trackHeight",
    "knobWidth",
    "knobHeight",
    "trackRadius",
    "knobRadius",
    "knobTravel",
  ])
    assert.ok(editor.includes(`\"${key}\"`), `missing ${key}`);
  assert.ok(editor.includes('kind: "css-declaration"'));
  assert.ok(editor.includes("function replaceTranslatedCssDeclaration"));
  assert.ok(editor.includes("selectorAwareToggle"));
  assert.ok(editor.includes("transparentCanvasColors"));
  assert.ok(editor.includes("renderTranslateSignals(false);"));
  assert.ok(editor.includes('properties.some((entry) => entry.key === "iconSize")'));
});

run("component readiness findings explain and directly repair orphan tokens", () => {
  const editor = read("editor.js"), css = read("editor.css");
  assert.ok(editor.includes("Composer found {{${token}}}, but no matching property exists."));
  assert.ok(editor.includes('"Remove unused rule"'));
  assert.ok(editor.includes('"Add missing property"'));
  assert.ok(editor.includes('"Show location"'));
  assert.ok(css.includes(".custom-readiness-finding .finding-message small"));
});

run("isolated custom component documents retain local ids and document selectors", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("var runtimeDocument=window.document"));
  assert.ok(editor.includes("data-composer-responsive-stage"));
  assert.ok(
    editor.includes(
      "filter(function(node){return node.tagName!=='SCRIPT'&&node.tagName!=='STYLE'})",
    ),
  );
  assert.ok(editor.includes("body.style.flexDirection='row'"));
  assert.ok(editor.includes("stage.scrollWidth,rect.width,childWidth"));
  assert.ok(editor.includes("sourceDisplay==='flex'?'inline-flex'"));
  assert.ok(editor.includes("body.clientWidth>1&&body.clientHeight>1"));
  assert.ok(editor.includes("observer.observe(body)"));
  assert.ok(editor.includes("window.addEventListener('resize',function(){fit(true)})"));
  assert.ok(editor.includes("window.innerWidth-safeInset*2"));
  assert.ok(editor.includes("window.innerHeight-safeInset*2"));
  assert.ok(editor.includes("Math.min(window.innerWidth,window.innerHeight)*.1"));
  assert.ok(!editor.includes("event.preventDefault();window.ComposerSignals.publish(rule.key,true)"));
  assert.ok(
    !editor.includes('generatedLabel.textContent = "Toggle"'),
    "Import should not invent a visible Toggle caption that was absent from the authored component",
  );
  assert.ok(editor.includes("[data-translated-generated-label]{position:absolute"));
  assert.ok(editor.includes("[data-translated-text],[data-translated-generated-label]"));
  assert.ok(editor.includes("!(detected.toggleButtonIndexes || []).includes(index)"));
  assert.ok(!editor.includes("new ResizeObserver(fit)"));
  assert.ok(!editor.includes('add("document-selectors", "JavaScript uses document-wide selectors.'));
  assert.ok(!editor.includes('if (selected.has("document-selectors"))'));
  assert.ok(!editor.includes('if (selected.has("global-ids"))'));
  assert.ok(editor.includes("function repairDanglingCustomRoot(javascript = \"\")"));
  assert.ok(editor.includes('"document.$1("'));
});

run("translated components discard unused generated properties and safe iframe root warnings", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("const translatedSource = `${html}\\n${css}\\n${javascript}`"));
  assert.ok(editor.includes("generatedPropertyKeys.has(key)"));
  assert.ok(!editor.includes('add("global-css", "CSS targets html, body, or :root.'));
  assert.ok(editor.includes('finding.code === "duplicate-ids"'));
  assert.ok(editor.includes("translatedComponent = /data-translated-/i.test"));
  assert.ok(editor.includes('property.key === "contentInset"'));
});

run("custom component creator provides functional starter templates", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  ["button", "toggle", "slider", "gauge", "text", "blank"].forEach((key) =>
    assert.ok(
      new RegExp(`${key}\\s*:\\s*\\{[\\s\\S]*?name\\s*:`).test(editor),
      `creator needs a ${key} starter`,
    ),
  );
  assert.ok(markup.includes('id="custom-component-template"'));
  assert.ok(markup.includes('data-creator-template="repeated"'));
  assert.ok(markup.includes('<option value="repeated">Repeated list</option>'));
  assert.ok(markup.includes('id="custom-component-apply-template"'));
  assert.ok(editor.includes("customStandardSignals"));
  assert.ok(editor.includes("customButtonProperties"));
  assert.ok(editor.includes("customToggleProperties"));
  assert.ok(editor.includes('class="custom-toggle-track"'));
  assert.ok(editor.includes('class="custom-toggle-knob"'));
  assert.ok(editor.includes(".custom-toggle.active .custom-toggle-knob"));
  assert.ok(editor.includes("transform:translateX(108%)"));
  assert.ok(editor.includes("applyCustomStarterTemplate"));
});

run("custom components support generated repeated-item contract ranges", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="custom-repeat-enabled"'));
  assert.ok(markup.includes('id="custom-repeat-container"'));
  assert.ok(editor.includes("repeatedItemRanges"));
  assert.ok(editor.includes("Digital sub-item press range"));
  assert.ok(editor.includes("Digital sub-item selected range"));
  assert.ok(editor.includes("Serial sub-item name range"));
  assert.ok(editor.includes("__repeatPress:"));
  assert.ok(editor.includes("__repeatSelected:"));
  assert.ok(editor.includes("__repeatName:"));
  assert.ok(
    editor.includes("data-translated-repeat-container"),
    "Import & Translate must detect repeated sibling buttons",
  );
  assert.ok(editor.includes("function translatedBehaviorPlan"));
  assert.ok(editor.includes("function runTranslatedComponentAcceptance"));
  assert.ok(editor.includes("Import & Translate behaviors validated:"));
  assert.ok(editor.includes("translator-acceptance.html"));
  assert.ok(editor.includes("generatedPlan.behaviors.forEach(addCustomBehaviorRow)"));
  assert.ok(editor.includes("setCustomStateStyles(generatedPlan.stateStyles)"));
});

run(
  "visual behavior builder remains separate from handwritten component code",
  () => {
    const editor = read("editor.js"),
      markup = read("editor.html");
    assert.ok(markup.includes('id="custom-element-picker"'));
  assert.ok(markup.includes('id="custom-behavior-list"'));
  assert.ok(markup.includes('id="custom-generated-css"'));
  assert.ok(markup.includes('id="custom-generated-javascript"'));
  assert.ok(markup.includes('id="custom-behavior-preset-add"'));
  assert.ok(markup.includes('id="custom-state-grid"'));
  assert.ok(markup.includes('id="custom-state-signals"'));
  assert.ok(markup.includes('id="custom-self-test"'));
  assert.ok(editor.includes("function customBehaviorRuntime"));
  assert.ok(editor.includes("function customBehaviorCss"));
  assert.ok(editor.includes("function customStateCss"));
  assert.ok(editor.includes("function customStateRuntime"));
  assert.ok(editor.includes("function runCustomComponentSelfTest"));
  assert.ok(editor.includes("function customComponentDependencyReport"));
  assert.ok(editor.includes("function restoreCustomComponentDependencies"));
  assert.ok(editor.includes("function createCustomComponentPackage"));
  assert.ok(editor.includes("function parseCustomComponentPackage"));
  assert.ok(editor.includes("Custom package assets round-tripped:"));
  assert.ok(editor.includes("version: 3"));
  assert.ok(editor.includes("stateStyles: collectCustomStateStyles()"));
  assert.ok(editor.includes("function addCustomBehaviorPreset"));
  assert.ok(editor.includes("function uniqueCustomBehaviorKey"));
  assert.ok(editor.includes("function updateCustomBehaviorReferences"));
  assert.ok(editor.includes("function removeCustomBehaviorReferences"));
  assert.ok(editor.includes("function collectCustomBehaviorRow"));
  assert.ok(editor.includes("rule.enabled===false"));
  assert.ok(editor.includes("function customBehaviorTypeWarnings"));
  assert.ok(editor.includes("behaviorPropertyKeys"));
  assert.ok(markup.includes('value="propertyAsset"'));
  assert.ok(editor.includes("function mapped(rule,value)"));
  assert.ok(editor.includes("case'glowStrength'"));
  assert.ok(editor.includes("function transforms(target)"));
  assert.ok(editor.includes('data-field="mapEnabled"'));
  assert.ok(editor.includes('data-field="booleanMapEnabled"'));
  assert.ok(editor.includes("rule.booleanMapping.trueValue"));
  assert.ok(editor.includes('["imageSource", "Image / asset source"]'));
  assert.ok(editor.includes("case'imageSource'"));
  assert.ok(editor.includes("<option>asset</option>"));
  assert.ok(editor.includes('["hold", "Hold-complete pulse"]'));
  assert.ok(editor.includes("function pulse(key)"));
    assert.ok(editor.includes("composer-element-picked"));
    assert.ok(editor.includes("behaviors: collectCustomBehaviors()"));
    assert.ok(editor.includes("behaviorRuntime: customBehaviorRuntime("));
    assert.ok(
      editor.includes("Generated rules are stored separately") ||
        markup.includes("Generated rules are stored separately"),
    );
  },
);

run("visual state overrides are explicit and preserve imported CSS by default", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="custom-state-enabled"'));
  assert.ok(html.includes("Authored CSS transitions"));
  assert.ok(html.includes('id="custom-state-add"'));
  assert.ok(html.includes('id="custom-mode-add"'));
  assert.ok(html.includes('id="custom-state-controls" hidden'));
  assert.ok(editor.includes("if (!$('custom-state-enabled').checked) return null;"));
  assert.ok(editor.includes('$("custom-state-controls").hidden = !enabled;'));
  assert.ok(css.includes("#custom-state-controls[hidden]"));
});

run("recovery snapshots are verified and crash-aware", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(editor.includes("function projectIntegrityErrors"));
  assert.ok(editor.includes("function recoveryFingerprint"));
  assert.ok(editor.includes("function recoveryIntegrity"));
  assert.ok(editor.includes("previousSessionWasUnclean"));
  assert.ok(editor.includes("Snapshot checksum does not match"));
  assert.ok(markup.includes('id="recovery-context"'));
});

run("undo history covers every persistent project field", () => {
  const editor = read("editor.js"),
    styles = read("editor.css");
  assert.ok(editor.includes("function projectSnapshot()"));
  assert.ok(editor.includes("return JSON.stringify(projectSnapshot())"));
  assert.ok(editor.includes("...projectSnapshot()"));
  [
    "pages",
    "items",
    "assets",
    "reusables",
    "pageTemplates",
    "themes",
    "customComponents",
    "acceptance",
    "contract",
  ].forEach((field) =>
    assert.ok(
      editor.includes(`${field}: state.${field}`),
      `history snapshot is missing ${field}`,
    ),
  );
  assert.ok(editor.includes("responsive layout`"));
  assert.ok(editor.includes("Changed reusable designs"));
  assert.ok(editor.includes("Changed custom components"));
  assert.ok(styles.includes(".history-entry-time"));
});

run("versioned design libraries import without replacing existing components", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="design-library-export"'));
  assert.ok(markup.includes('id="design-library-import"'));
  assert.ok(markup.includes(".cuilibrary"));
  assert.ok(editor.includes('format: "crestron-ui-composer-library"'));
  assert.ok(editor.includes("function importDesignLibrary"));
  assert.ok(editor.includes("function remapLibraryReferences"));
  assert.ok(editor.includes("uniqueLibraryName"));
  assert.ok(editor.includes("registerCustomComponent(component)"));
});

run("new projects support blank projects and persistent preset templates", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    desktop = read("CrestronUiComposer/MainWindow.xaml.cs");
  assert.ok(markup.includes('id="new-project-dialog"'));
  assert.ok(markup.includes('id="create-blank-project"'));
  assert.ok(markup.includes('id="create-from-preset"'));
  assert.ok(markup.includes('id="save-project-preset"'));
  assert.ok(markup.includes('id="project-preset-list"'));
  assert.ok(!markup.includes('data-starter-project="conference"'));
  assert.ok(!markup.includes('data-starter-project="classroom"'));
  assert.ok(!markup.includes('data-starter-project="multi-room"'));
  assert.ok(editor.includes("function createBlankProject"));
  assert.ok(editor.includes('nativeRequest("saveProjectPreset"'));
  assert.ok(editor.includes('nativeRequest("listProjectPresets"'));
  assert.ok(editor.includes('nativeRequest("readProjectPreset"'));
  assert.ok(editor.includes('nativeRequest("deleteProjectPreset"'));
  assert.ok(desktop.includes('case "saveProjectPreset"'));
  assert.ok(desktop.includes("ProjectPresetFolder"));
  assert.ok(desktop.includes('"Project Presets"'));
});

run("panel zoom controls remain above high-z widgets and subpages", () => {
  const styles = read("editor.css");
  assert.match(styles, /\.stage-tools\s*\{[\s\S]*?z-index:\s*1000001/);
  assert.match(styles, /\.stage\s*\{[\s\S]*?isolation:\s*isolate/);
  assert.match(styles, /\.toolbar\s*\{[\s\S]*?z-index:\s*2000000/);
  assert.match(styles, /\.app-menu-popup\s*\{[\s\S]*?z-index:\s*2000001/);
});

run("all pop-out dialogs use one draggable resizable dark window system", () => {
  const editor = read("editor.js"), styles = read("editor.css");
  assert.ok(editor.includes(".dialog-title > button"));
  assert.ok(editor.includes('close.classList.add("dialog-close")'));
  assert.ok(editor.includes('form.querySelector(".dialog-title")'));
  assert.match(styles, /dialog\s*\{[\s\S]*?resize:\s*both/);
  assert.ok(styles.includes('dialog input:not([type="checkbox"])'));
  assert.ok(styles.includes("dialog select option"));
  assert.ok(styles.includes(".subpage-properties-dialog{width:min(820px,92vw)}"));
});

run("subpages use visual placement choices and direct instance sizing", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    styles = read("editor.css");
  assert.ok(markup.includes('id="create-subpage-dialog"'));
  ["top", "bottom", "left", "right"].forEach((placement) =>
    assert.ok(markup.includes(`name="create-subpage-placement" value="${placement}"`)),
  );
  assert.ok(editor.includes("function openCreateSubpage"));
  assert.ok(editor.includes("function subpagePointerOp"));
  assert.ok(editor.includes('layer.placement = "custom"'));
  assert.ok(editor.includes("instance.deviceOverrides[targetKey]"));
  assert.ok(editor.includes("masterSubpage ? subpageResolved(masterSubpage, state.activePage)"));
  assert.ok(editor.includes("pasteOriginX + (Number(item.x) || 0) - sourceBounds.left"));
  assert.ok(editor.includes("inside subpage"));
  assert.ok(editor.includes('stage.classList.toggle("subpage-master-canvas"'));
  assert.ok(editor.includes("masterBounds?.width || state.width"));
  assert.ok(editor.includes("PLACED ${String(resolved.placement"));
  assert.ok(editor.includes("function centerSubpageMasterCanvas"));
  assert.ok(markup.includes('id="center-subpage-master"'));
  assert.ok(styles.includes(".subpage-resize-handle"));
  assert.ok(styles.includes(".stage.subpage-master-canvas"));
});

run("responsive compare identifies and saves missing target overrides", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    styles = read("editor.css");
  assert.ok(markup.includes('id="responsive-compare-dialog"'));
  assert.ok(markup.includes('id="responsive-save-adapted"'));
  assert.ok(editor.includes("function renderResponsiveComparison"));
  assert.ok(editor.includes("function saveAdaptedResponsiveLayout"));
  assert.ok(editor.includes("without saved ${target.name} overrides"));
  assert.ok(styles.includes(".responsive-mini-widget.missing-override"));
});

run("scrolling components retain bounded overflow beside global press effects", () => {
  const runtime = read("component-runtime.js"),
    editor = read("editor.css"),
    exporter = read("exporter.js");
  assert.ok(runtime.includes('"composer-scroll-horizontal"'));
  assert.ok(runtime.includes('"composer-scroll-vertical"'));
  assert.ok(editor.includes(".scoped-preview.composer-scroll-horizontal"));
  assert.ok(editor.includes("overflow-x: auto !important"));
  assert.ok(exporter.includes("composer-scroll-horizontal:not"));
  assert.ok(exporter.includes("def.scrollAxes"));
});

run("responsive workflow validates and fits every supported target", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="responsive-validate-all"'));
  assert.ok(markup.includes('id="responsive-fit-all"'));
  assert.ok(editor.includes("function responsiveTargetReport"));
  assert.ok(editor.includes("function validateAllResponsiveTargets"));
  assert.ok(editor.includes("function fitAndSaveAllResponsiveTargets"));
  assert.ok(editor.includes("item.deviceOverrides[key] ="));
  assert.ok(editor.includes("device.width - margin - width"));
});

run("responsive layouts copy safely between panel targets", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="responsive-copy-source"'));
  assert.ok(markup.includes('id="responsive-copy-layout"'));
  assert.ok(editor.includes("function copyResponsiveLayoutToTarget"));
  assert.ok(editor.includes("sourceKey === currentKey"));
  assert.ok(editor.includes("item.deviceOverrides[targetKey] ="));
  assert.ok(editor.includes("Existing ${target.name} overrides will be replaced"));
});

run("responsive breakpoint families cover touch, iPad, and large displays", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="responsive-breakpoint-family"'));
  ["same-viewport", "compact-touch", "hd", "large-display"].forEach((family) =>
    assert.ok(markup.includes(`value="${family}"`)),
  );
  assert.ok(editor.includes("function responsiveBreakpointTargets"));
  assert.ok(editor.includes("function applyResponsiveBreakpointFamily"));
  assert.ok(editor.includes("device.width <= 1280"));
  assert.ok(editor.includes("device.width <= 1920"));
  assert.ok(editor.includes("device.width > 1920"));
});

run("successful deployments can be verified and rolled back directly", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("async function redeployDeploymentBackup"));
  assert.ok(editor.includes('nativeRequest("checkDeploymentProfile"'));
  assert.ok(editor.includes('nativeRequest("deployCh5PackageWait"'));
  assert.ok(editor.includes('rollback.textContent = "Roll back"'));
  assert.ok(editor.includes("entry.success !== true"));
  assert.ok(editor.includes("Rollback package target"));
  assert.ok(editor.includes("deviceId: profile.deviceId"));
});

run("project health is a navigable validation dashboard", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="health-dashboard"'));
  assert.ok(markup.includes('id="health-search"'));
  assert.ok(markup.includes('data-health-filter="error"'));
  assert.ok(editor.includes("function renderHealthDashboard"));
  assert.ok(editor.includes("function navigateToHealthIssue"));
  assert.ok(editor.includes("Go to problem"));
  assert.ok(editor.includes("category: details.category"));
});

run("build self-test includes save, recovery, and export workflow gates", () => {
  const editor = read("editor.js"),
    packageJson = JSON.parse(read("package.json"));
  assert.ok(editor.includes("function runProjectWorkflowAcceptance"));
  assert.ok(editor.includes("project serialized to JSON"));
  assert.ok(editor.includes("recovery snapshot checksum and structure validated"));
  assert.ok(editor.includes("export included the Crestron signal runtime"));
  assert.ok(editor.includes("Project workflow checks passed:"));
  assert.ok(packageJson.scripts.test.includes("component-continuity.test.js"));
});

run("CH5 archives identify themselves as Shell projects like Construct", () => {
  const desktop = fs.readFileSync(
    path.join(root, "CrestronUiComposer", "MainWindow.xaml.cs"),
    "utf8",
  );
  assert.strictEqual(
    (desktop.match(/-P \\"samplesource=Shell\\"/g) || []).length,
    2,
  );
});

run("project health includes Crestron performance budgets", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="health-metrics"'));
  assert.ok(editor.includes("function projectPerformanceAudit"));
  assert.ok(editor.includes("function renderHealthMetrics"));
  assert.ok(editor.includes("Peak widgets / page"));
  assert.ok(editor.includes("Embedded assets"));
  assert.ok(editor.includes('category: "Performance"'));
});

run("project health and panel performance use distinct report views", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("function setHealthDisplayMode(dashboard, showMetrics = false)"));
  assert.ok(editor.includes("setHealthDisplayMode(true, true);"));
  assert.ok(editor.includes("setHealthDisplayMode(true, false);"));
  assert.ok(editor.includes('$("health-metrics").hidden = !dashboard || !showMetrics'));
});

run("panel performance profiler identifies expensive pages and widgets", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.match(markup, /id="panel-performance"/);
  assert.match(editor, /function panelPerformanceIssues/);
  assert.match(editor, /function panelPerformanceReport/);
  assert.match(editor, /function runPanelPerformanceReport/);
  assert.match(editor, /strongFilterWidgets/);
  assert.match(editor, /Peak page score/);
  assert.match(editor, /HIGHEST-COST WIDGETS/);
  assert.match(editor, /confirm final frame rate, startup time, and memory/);
  assert.match(editor, /animated = items\.filter[\s\S]*?\),\s*profiles = itemProfiles\.filter/);
  assert.match(editor, /function runAuditUi/);
  assert.match(editor, /The audit could not complete/);
  assert.match(editor, /health-metric-help/);
  assert.match(editor, /it is not a measured frame rate/);
  assert.match(editor, /large CSS filters are expensive on touch panels/);
  assert.match(editor, /Guidelines for/);
  assert.match(editor, /conservative Composer engineering guidelines/);
  assert.match(editor, /1280 × 800-class touch panels/);
  assert.match(editor, /className = `health-metric \$\{rating/);
});

run("release readiness gates beta publication on verified evidence", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.match(markup, /id="release-readiness"/);
  assert.match(editor, /function releaseReadinessAudit/);
  assert.match(editor, /Project Health/);
  assert.match(editor, /Contract generation/);
  assert.match(editor, /Acceptance checklist/);
  assert.match(editor, /Current build artifact/);
  assert.match(editor, /Verified deployment/);
  assert.match(editor, /clean-install and upgrade-install tests/);
});

run("Help includes a complete built-in general user manual", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    styles = read("editor.css");
  assert.match(markup, /id="users-manual"[^>]*>General user’s manual/);
  assert.match(markup, /id="users-manual-content"/);
  ["Getting started", "Signals, joins, and Contracts", "Building and deploying", "Troubleshooting checklist"].forEach((heading) => assert.ok(markup.includes(heading)));
  assert.match(editor, /openFeatureHelp\("users-manual"\)/);
  assert.match(styles, /\.manual-contents/);
  assert.match(styles, /\.manual-table/);
});

run("project health audits touch-panel usability", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("function projectUsabilityAudit"));
  assert.ok(editor.includes("function auditContrast"));
  assert.ok(editor.includes("at least 44 × 44 pixels"));
  assert.ok(editor.includes('category: "Touch usability"'));
  assert.ok(editor.includes("Small touch targets"));
});

run("project health offers undoable safe quick fixes", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="health-fix-all"'));
  assert.ok(editor.includes("function applyHealthFix"));
  assert.ok(editor.includes("function fixAllHealthIssues"));
  assert.ok(editor.includes('fix: "fit-bounds"'));
  assert.ok(editor.includes('fix: "touch-minimum"'));
  assert.ok(editor.includes('fix: "minimum-type"'));
  assert.ok(editor.includes("commitHistory()"));
});

run("build and deployment are guarded by Project Health preflight", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("lastApprovedPreflightFingerprint"));
  assert.ok(editor.includes("Build/deploy blocked by"));
  assert.ok(editor.includes("Choose Cancel to review these warnings"));
  assert.ok(editor.includes("Project Health preflight passed. Check the panel"));
  assert.ok(
    (editor.match(/if \(!approveExport\(\)\) return;/g) || []).length >= 7,
  );
});

run("built CH5Z artifacts retain deployment provenance", () => {
  const editor = read("editor.js"),
    desktop = read("CrestronUiComposer/MainWindow.xaml.cs");
  assert.ok(editor.includes("function recordBuildArtifact"));
  assert.ok(editor.includes("function deploymentArtifactProblems"));
  assert.ok(editor.includes("Package verification warning:"));
  assert.ok(editor.includes("older project state"));
  assert.ok(editor.includes("buildArtifacts"));
  assert.ok(desktop.includes("SHA256.HashData"));
  assert.ok(desktop.includes("sha256"));
});

run("deployment dialog exposes recent verified build artifacts", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="build-artifact-list"'));
  assert.ok(editor.includes("function renderBuildArtifacts"));
  assert.ok(editor.includes("Use package"));
  assert.ok(editor.includes("SHA-256"));
  assert.ok(editor.includes("CURRENT"));
  assert.ok(editor.includes("STALE"));
});

run("deployment includes a structural CH5Z package inspector", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    desktop = read("CrestronUiComposer/MainWindow.xaml.cs");
  assert.ok(markup.includes('id="deploy-inspect"'));
  assert.ok(markup.includes('id="package-inspector-dialog"'));
  assert.ok(editor.includes('nativeRequest("inspectCh5Package"'));
  assert.ok(editor.includes("CH5Z PACKAGE INSPECTION"));
  assert.ok(desktop.includes("void InspectCh5Package"));
  assert.ok(desktop.includes("contractStates"));
  assert.ok(desktop.includes("hasWebXPanel"));
});

run("Signal Manager includes a navigable page and widget map", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="signal-view-map"'));
  assert.ok(markup.includes('id="signal-map"'));
  assert.ok(editor.includes("function renderSignalMap"));
  assert.ok(editor.includes("function navigateToSignalRow"));
  assert.ok(editor.includes("signal-map-row"));
  assert.ok(editor.includes("Duplicate"));
  assert.ok(editor.includes("Unbound"));
});

run("Signal Manager maps commands and feedback by address", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    styles = read("editor.css");
  assert.ok(markup.includes('id="signal-view-address"'));
  assert.ok(markup.includes('id="signal-address-map"'));
  assert.ok(editor.includes("function renderSignalAddressMap"));
  assert.ok(styles.includes("command + feedback"));
  assert.ok(editor.includes("Collision"));
  assert.ok(editor.includes("sameDirectionCount"));
});

run("Signal Manager supports undoable address refactoring", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="signal-replace-prefix"'));
  assert.ok(editor.includes("function renameSignalAddress"));
  assert.ok(editor.includes("function replaceContractPrefix"));
  assert.ok(editor.includes("function validSignalRefactorValue"));
  assert.ok(editor.includes("Rename all uses…"));
  assert.ok(editor.includes("This operation can be undone in one step"));
  assert.ok(editor.includes("finishSignalRefactor"));
});

run("Signal Manager allocates collision-free joins with range awareness", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="signal-allocate-joins"'));
  assert.ok(markup.includes('id="join-allocator-dialog"'));
  assert.ok(editor.includes("function buildJoinAllocationPlan"));
  assert.ok(editor.includes("function applyJoinAllocationPlan"));
  assert.ok(editor.includes("rangeIncrement"));
  assert.ok(editor.includes("without reusing occupied joins"));
  assert.ok(editor.includes("This operation can be undone in one step"));
});

run("Signal Manager generates standardized collision-free contract names", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="signal-name-contracts"'));
  assert.ok(markup.includes('id="contract-namer-dialog"'));
  assert.ok(editor.includes("function standardContractLeaf"));
  assert.ok(editor.includes("function generatedContractAddress"));
  assert.ok(editor.includes("function buildContractNamingPlan"));
  assert.ok(editor.includes("function applyContractNamingPlan"));
  assert.ok(editor.includes("Items[{index}]"));
  assert.ok(editor.includes("collision-free contract name"));
});

run("Signal Manager previews the exact SIMPL contract hierarchy", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.match(markup, /id="signal-view-simpl"[^>]*>SIMPL preview/);
  assert.match(markup, /id="signal-simpl-preview"/);
  assert.match(editor, /function renderSimplPreview\(\)/);
  assert.match(editor, /SIMPL extender:/);
  assert.match(editor, /contract\.specifications/);
  assert.match(editor, /component\.specifications/);
  assert.match(editor, /attribute\.notes/);
});

run("Signal Manager compares CCE and CSE2J contract mappings", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.match(markup, /id="signal-compare-contract"/);
  assert.match(markup, /accept="\.cce,\.cse2j/);
  assert.match(editor, /function cceComparisonSignals/);
  assert.match(editor, /function cse2jComparisonSignals/);
  assert.match(editor, /function compareContractFile/);
  assert.match(editor, /Missing from imported mapping/);
  assert.match(editor, /Extra in imported mapping/);
  assert.match(editor, /Type or direction mismatch/);
});

run("Signal Manager exports a human-readable signal schedule", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.match(markup, /id="signal-export-schedule"/);
  assert.match(editor, /function signalScheduleReport/);
  assert.match(editor, /CRESTRON UI COMPOSER — SIGNAL SCHEDULE/);
  assert.match(editor, /CONTRACT BUILD ERRORS/);
  assert.match(editor, /SIMPL COMPONENT SUMMARY/);
  assert.match(editor, /-signal-schedule\.txt/);
});

run("custom fonts remain embedded from import through CH5Z export", () => {
  const editor = read("editor.js"),
    runtime = read("component-runtime.js"),
    exporter = read("exporter.js"),
    desktop = read("CrestronUiComposer/MainWindow.xaml.cs");
  assert.ok(desktop.includes("*.woff;*.woff2;*.ttf;*.otf"));
  assert.ok(runtime.includes('type: "font"'));
  assert.ok(runtime.includes('key: "fontAsset"'));
  assert.ok(editor.includes("function fontFaceCss"));
  assert.ok(editor.includes('Default (Segoe UI)'));
  assert.ok(editor.includes("properties.fontAssetData"));
  assert.ok(exporter.includes("fontFaces"));
  assert.ok(exporter.includes("@font-face"));
});

run("cross-runtime acceptance workflow is project-persistent and reportable", () => {
  const editor = read("editor.js"),
    markup = read("editor.html"),
    styles = read("editor.css");
  assert.ok(markup.includes('id="acceptance-test"'));
  assert.ok(markup.includes('id="acceptance-dialog"'));
  assert.ok(markup.includes('id="acceptance-create-project"'));
  assert.ok(markup.includes('id="acceptance-run-automatic"'));
  assert.ok(editor.includes("const acceptanceChecks"));
  assert.ok(editor.includes("function createAcceptanceProject"));
  assert.ok(editor.includes("function runAcceptanceAutomaticChecks"));
  assert.ok(editor.includes("function acceptanceReport"));
  assert.ok(editor.includes("acceptance: state.acceptance"));
  assert.ok(editor.includes('"CH5 Desktop"'));
  assert.ok(editor.includes('"TSW-1070"'));
  assert.ok(editor.includes("if (x.systemManaged || y.systemManaged || x.hidden || y.hidden) continue"));
  assert.ok(editor.includes("0 blocking errors"));
  assert.ok(styles.includes(".acceptance-checklist"));
});

run("linked subpages persist, render, export, and travel in design libraries", () => {
  const editor = read("editor.js"), markup = read("editor.html"), exporter = read("exporter.js");
  assert.ok(markup.includes('id="create-subpage"'));
  assert.ok(markup.includes('id="new-blank-subpage"'));
  assert.ok(markup.includes('id="subpage-list"'));
  assert.ok(markup.includes('id="subpage-pages-dialog"'));
  assert.ok(markup.includes('id="subpage-pages-invert"'));
  assert.ok(editor.includes("subpages: state.subpages"));
  assert.ok(editor.includes("function createSubpageFromCurrentPage"));
  assert.ok(editor.includes("function createBlankSubpage"));
  assert.ok(editor.includes("function renderSubpageInstances"));
  assert.ok(editor.includes("function openSubpagePages"));
  assert.ok(editor.includes("function saveSubpagePages"));
  assert.ok(editor.includes("masterItems"));
  assert.ok(editor.includes('bindingScope: "shared"'));
  assert.ok(editor.includes("function subpageInstanceOverride(entry, pageId)"));
  assert.ok(editor.includes("function openSubpageProperties(entry)"));
  assert.ok(editor.includes("function saveSubpageProperties(event)"));
  assert.ok(editor.includes("itemOverrides"));
  assert.ok(exporter.includes("entry.instanceOverrides?.[page.id]"));
  assert.ok(markup.includes('id="subpage-properties-dialog"'));
  assert.ok(markup.includes('id="subpage-context-menu"'));
  assert.ok(editor.includes("function showSubpageContextMenu"));
  assert.ok(editor.includes("function simulateSubpage(entry, pageId)"));
  assert.ok(editor.includes("hiddenSubpageInstances"));
  assert.ok(editor.includes('category: "Subpages"'));
  assert.ok(editor.includes("assigned to no normal pages"));
  assert.ok(editor.includes("targets a subpage master"));
  assert.ok(editor.includes("function materializeSubpageInstance(entry, pageId)"));
  assert.ok(editor.includes("function detachSubpageInstance(entry, pageId)"));
  assert.ok(editor.includes("function convertSubpageToNormalContent(entry)"));
  assert.ok(editor.includes("function refactorSubpageNamespace(entry)"));
  assert.ok(markup.includes('id="subpage-context-detach"'));
  assert.ok(editor.includes("function duplicateSubpage(entry)"));
  assert.ok(editor.includes("function moveSubpageLayer(entry, direction)"));
  assert.ok(editor.includes("function exportSubpagePackage(entry)"));
  assert.ok(editor.includes("itemIdMap"));
  assert.ok(editor.includes("targetPage.subpageMasterId"));
  assert.ok(editor.includes("subpage-instance-surface"));
  assert.ok(exporter.includes("project.subpages || []"));
  assert.ok(exporter.includes("resolved.visibilityEnabled"));
  assert.ok(exporter.includes("subpageClipStyle"));
  assert.ok(exporter.includes("contractSourcePageId"));
});

run("Widget List exports nested component identities and styling", () => {
  const exporter = read("exporter.js"), widgetList = read("widget-list.component.js"), editor = read("editor.js");
  assert.ok(exporter.includes("{id:${JSON.stringify(id)},template:"));
  assert.ok(widgetList.includes("widget.dataset.component = definition.id"));
  assert.ok(widgetList.includes('"<style>" + definition.styles + "</style>"'));
  assert.ok(widgetList.includes('inspectorProperties: includedWidgetProperties'));
  assert.ok(widgetList.includes('includedWidget__'));
  assert.ok(widgetList.includes('definition.optionalContent || {}'));
  assert.ok(widgetList.includes('dynamicRangeBindings: includedWidgetRanges'));
  assert.ok(widgetList.includes('includedRange__${signal.key}'));
  assert.ok(widgetList.includes('includedGraphicAsset'));
  assert.ok(widgetList.includes('wl-shared-graphic-selected'));
  assert.ok(widgetList.includes('Included Widget Interaction & Animation'));
  assert.ok(widgetList.includes('function wireSharedInteraction(target, index)'));
  assert.ok(widgetList.includes('includedMaxEffects'));
  assert.ok(widgetList.includes('includedEffectIntensity'));
  assert.ok(widgetList.includes('includedHoldAnimation'));
  assert.ok(widgetList.includes('includedActionTrigger'));
  assert.ok(widgetList.includes('function runIncludedAction(phase, index, target)'));
  assert.ok(widgetList.includes('replace(/\\{index\\}/g'));
  assert.ok(widgetList.includes('context.interactions.bindPrimaryPointer'));
  assert.ok(widgetList.includes('name + "-percent"'));
  assert.ok(editor.includes('definition.inspectorProperties(item.properties || {}'));
  assert.ok(editor.includes('orderedProperties = item.componentId === "widget-list"'));
  assert.ok(editor.indexOf('...dynamicProperties,') < editor.indexOf('property.group === "Included Widget Graphics"'));
  assert.ok(editor.indexOf('property.group === "Included Widget Graphics"') < editor.indexOf('property.group === "Included Widget Interaction & Animation"'));
  assert.ok(editor.includes('function resolvedRangeBindings(definition, item)'));
  assert.ok(exporter.includes('optionalContent:${JSON.stringify(d.optionalContent || {})}'));
  assert.ok(exporter.includes('properties.includedGraphicAssetData = assetUrl'));
  assert.ok(editor.includes('function widgetListResponsiveSnapshot(item)'));
  assert.ok(editor.includes('function fitWidgetListItems(item, rect = item)'));
  assert.ok(editor.includes('scrolling lists'));
  assert.ok(editor.includes('Reset included widget settings'));
  assert.ok(editor.includes('unavailable or recursive included widget'));
  assert.ok(editor.includes('simultaneous effects across a large list'));
  assert.ok(read("editor.html").includes('id="widget-list-responsive-tools"'));
});

run("Video Switcher supports touch drag routing and per-item assets", () => {
  const component = read("video-switcher.component.js"), editor = read("editor.js"), exporter = read("exporter.js"), manifest = read("components.manifest.json");
  assert.ok(component.includes('id: "video-switcher"'));
  assert.ok(component.includes('name: "TV Source Value Set range"'));
  assert.ok(component.includes('defaultValue: "VideoSwitcher.TVs[{index}].ValueSet"'));
  assert.ok(component.includes('sourceSelectedAssets'));
  assert.ok(component.includes('tvSelectedAssets'));
  assert.ok(component.includes('key: "sourcePosition"'));
  assert.ok(component.includes('[data-source-position="bottom"] .vs-root{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) minmax(110px,30%)}'));
  assert.ok(component.includes('key: "sourceDisplayMode"'));
  assert.ok(component.includes(':not([data-source-display="card"]) .vs-source{border-color:transparent;background-color:transparent;background-image:none;box-shadow:none}'));
  assert.ok(component.includes(':not([data-source-display="card"]) .vs-source.active{background-color:transparent;box-shadow:none;filter:drop-shadow'));
  assert.ok(!component.includes('[data-source-display!="card"]'));
  assert.ok(component.includes('const sourceIconPattern = ['));
  assert.ok(component.includes('const iconPaths = {'));
  assert.ok(component.includes('<svg viewBox="0 0 24 24"'));
  assert.ok(component.includes('.vs-icon[hidden]'));
  assert.ok(component.includes('.vs-empty[hidden]'));
  assert.ok(component.includes('key: "sourceLayout"'));
  assert.ok(component.includes('key: "sourcePosition"'));
  assert.ok(component.includes('defaultValue: "bottom"'));
  assert.ok(component.includes('defaultValue: "grid"'));
  assert.ok(component.includes('key: "tvLayout"'));
  assert.ok(component.includes('key: "tvNamePosition"'));
  assert.ok(component.includes('aspect-ratio:16/9'));
  assert.ok(component.includes('data-tv-name-position="bottom-right"'));
  assert.ok(component.includes('font-size:var(--assigned-label-size)'));
  assert.ok(!component.includes('key: "tvIcons"'));
  assert.ok(!component.includes('key: "showTvIcons"'));
  assert.ok(component.includes('function applyFitLayout()'));
  assert.ok(component.includes('--source-fit-columns'));
  assert.ok(component.includes('--tv-fit-rows'));
  assert.ok(component.includes('flex:1 1 0;width:100%;height:auto'));
  assert.ok(component.includes('root.style.setProperty("--tv-card-width", "180px")'));
  assert.ok(component.includes('overflow:hidden!important'));
  assert.ok(component.includes('cardHeight * 16 / 9') || component.includes('cellHeight * 16 / 9'));
  assert.ok(component.includes('key: "noSourceValue"'));
  assert.ok(component.includes('class="vs-tv-header"'));
  assert.ok(component.includes('class="vs-program"'));
  assert.ok(component.includes('class="vs-empty"'));
  assert.ok(component.includes('getPropertyValue("--composer-item-asset")'));
  assert.ok(component.includes('program.style.backgroundColor = "transparent"'));
  assert.ok(component.includes('>DISPLAYS</div>'));
  assert.ok(component.includes('root.appendChild(ghost)'));
  assert.ok(component.includes('ghost.style.setProperty("height", `${rect.height}px`, "important")'));
  assert.ok(component.includes('ghost.style.setProperty("inset", "auto", "important")'));
  assert.ok(component.includes('(event.clientX - rect.left) * scaleX - grabX'));
  assert.ok(component.includes('transform:none'));
  assert.ok(component.includes('key: "assignedIconSize"'));
  assert.ok(component.includes('key: "assignedLabelSize"'));
  assert.ok(component.includes('--assigned-icon-size'));
  assert.ok(component.includes('--assigned-label-size'));
  assert.ok(component.includes('ghost.style.backgroundImage = computed.backgroundImage'));
  assert.ok(component.includes('element.setPointerCapture?.(event.pointerId)'));
  assert.ok(component.includes('assign(Number(target.dataset.index), index, true)'));
  assert.ok(component.includes('function clearAssignment(tvIndex, publish)'));
  assert.ok(component.includes('function wireAssigned(program, tvIndex)'));
  assert.ok(component.includes('clearAssignment(tvIndex, true)'));
  assert.ok(component.includes('if (source === noSource)'));
  assert.ok(editor.includes('assetListProperties.forEach'));
  assert.ok(exporter.includes('assetListProperties.flatMap'));
  assert.ok(manifest.includes('"componentId":"video-switcher"'));
});

run("visible scrollbars share the Display Control appearance", () => {
  const css = read("editor.css"), exporter = read("exporter.js"), runtime = read("component-runtime.js");
  assert.ok(css.includes("*::-webkit-scrollbar-thumb"));
  assert.ok(css.includes("background: rgba(112, 112, 112, 0.76)"));
  assert.ok(css.includes("scrollbar-color: rgba(112, 112, 112, 0.76)"));
  assert.ok(exporter.includes("*::-webkit-scrollbar{width:7px;height:7px}"));
  assert.ok(exporter.includes("*::-webkit-scrollbar-thumb{min-width:36px;min-height:36px"));
  assert.ok(css.includes("*::-webkit-scrollbar-button:single-button"));
  assert.ok(exporter.includes("*::-webkit-scrollbar-button:horizontal:decrement"));
  assert.ok(exporter.includes("-webkit-appearance:none!important"));
  assert.ok(runtime.includes("function wireUniformScrollbars(root, holder, axes)"));
  assert.ok(exporter.includes("global.ComposerRuntime.wireUniformScrollbars.toString()"));
  assert.ok(runtime.includes('bar.className = `composer-uniform-scrollbar ${axis}`'));
  assert.ok(runtime.includes('background:#2a2a2a61'));
  assert.ok(runtime.includes('background:#707070c2'));
  assert.ok(runtime.includes('root.querySelector(".dc-scroll")'));
});

run("Password Entry preserves icon orientation during slower result morphs", () => {
  const runtime = fs.readFileSync(path.join(root, "component-runtime.js"), "utf8");
  const component = fs.readFileSync(path.join(root, "password-entry.component.js"), "utf8");
  assert.ok(runtime.includes('transform:rotate(-360deg)'));
  assert.ok(runtime.includes('transition:all .72s'));
  assert.ok(!runtime.includes('[data-component="password-entry"] .pw-keypad.success .pw-enter,[data-component="password-entry"] .pw-keypad.error .pw-enter{transform:rotate(-180deg)}'));
  assert.strictEqual((component.match(/width="90%" height="90%"/g) || []).length, 2);
  assert.strictEqual((component.match(/enter\.style\.padding = "5%"/g) || []).length, 2);
});

run("palette preferences hide built-in and custom components non-destructively", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="palette-preferences"'));
  assert.ok(html.includes('id="palette-preferences-dialog"'));
  assert.ok(html.includes('id="palette-preferences-search"'));
  assert.ok(html.includes('id="palette-preferences-show-all"'));
  assert.ok(html.includes('id="palette-preferences-hide-all"'));
  assert.ok(editor.includes('crestron-ui-composer-palette-preferences-v1'));
  assert.ok(editor.includes('function componentPreferenceId(component)'));
  assert.ok(editor.includes('!hiddenPaletteComponents.has(componentPreferenceId(c))'));
  assert.ok(editor.includes('return component.componentId || `file:${component.name}`'));
  assert.ok(editor.includes('kind.textContent = customEntry'));
  assert.ok(editor.includes('savePalettePreferences();'));
  assert.ok(editor.includes('renderComponentLibrary();'));
  assert.ok(css.includes('.palette-preferences-dialog'));
  assert.ok(css.includes('.palette-preference-entry'));
  assert.ok(!editor.includes('state.components = state.components.filter((component) => !hiddenPaletteComponents'));
});

run("Import and Translate dialog uses non-overlapping responsive flow", () => {
  const css = read("editor.css"), html = read("editor.html");
  assert.ok(html.includes('id="translate-snippet-dialog"'));
  assert.ok(html.includes('aria-label="Close Import and Translate"'));
  assert.ok(css.includes('#translate-snippet-dialog form'));
  assert.ok(css.includes('#custom-component-dialog,\n#translate-snippet-dialog {'));
  assert.ok(css.includes('display: block;'));
  assert.ok(css.includes('#translate-snippet-dialog .translate-builder-layout'));
  assert.ok(css.includes('#translate-snippet-dialog .translate-review-layout'));
  assert.ok(css.includes('#translate-snippet-dialog .dialog-actions'));
  assert.ok(css.includes('position: sticky;'));
  assert.ok(css.includes('@media (max-width: 1050px)'));
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr);'));
});

run("Import and Translate preserves authored morph and interactive appearance", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(editor.includes("preserveAuthoredButtonAppearance"));
  assert.ok(editor.includes("const preserveAuthoredButtonAppearance = true"));
  assert.ok(editor.includes("if (!preserveAuthoredButtonAppearance)"));
  assert.ok(!editor.includes("[data-translated-toggle-track]{background-color:"));
  assert.ok(editor.includes("Preserved ${entry.label}"));
  assert.ok(editor.includes("Use the generated Selected digital input"));
  assert.ok(html.includes("Manual details — detected code, inferred behavior, and generated rules"));
  assert.ok(css.includes(".translate-inference-row.preserved"));
  assert.ok(css.includes(".translate-inference-row.preserved .translate-inference-key"));
  assert.ok(editor.includes('["button-style", "standard-style"].includes(entry.kind)'));
  assert.ok(editor.includes('? "__preserve__"'));
  assert.ok(editor.includes("const stateStyles = null;"));
  assert.ok(editor.includes("Imported source owns its authored Standard/Pressed/Selected states"));
});

run("Import and Translate merges preset and detected Name bindings", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes('["press", "selected", "label", "name"]'));
  assert.ok(editor.includes("entry.suffix === signal.suffix"));
  assert.ok(editor.includes("entry.type === signal.type"));
  assert.ok(editor.includes("entry.direction === signal.direction"));
});

run("the managed-glow escape uses the component's own declared color/strength defaults, not an unrelated hardcoded fallback", () => {
  const editor = read("editor.js");
  // Real bug (two layers, both confirmed via a live placed widget):
  // (1) a freshly-placed widget's saved properties start out empty, so
  // properties[colorKey]/[strengthKey] are undefined until the user
  // explicitly edits them; (2) "button-style" properties are saved with
  // preserveDefault:true, so an UNedited one isn't actually undefined —
  // it's the literal string "__preserve__" (both on the placed widget's
  // own properties AND on collectCustomProperties()'s defaultValue,
  // which previewProperties is built from), which plain ?? does NOT
  // fall through on, since ?? only triggers for null/undefined. Both
  // consumers of managedGlow (the real placed-widget mount() and the
  // wizard's own live preview) must treat "__preserve__" as unset too,
  // or the approximated escape glow keeps using the unrelated hardcoded
  // #04aa8e/6px fallback instead of the widget's real declared glow.
  assert.ok(
    editor.includes(
      'value === undefined || value === null || value === "__preserve__"',
    ),
    "isUnsetGlowValue must treat the literal preserveDefault sentinel as unset, not just null/undefined",
  );
  assert.ok(
    editor.includes("resolveGlowValue = (key, fallbackDefault) =>") &&
      editor.includes("isUnsetGlowValue(properties[key]) ? fallbackDefault : properties[key]"),
    "mount()'s glow color/strength resolution must route through the same __preserve__-aware fallback",
  );
  assert.ok(
    editor.includes("isUnsetGlowValue(previewProperties[managedGlow.colorKey])") &&
      editor.includes("isUnsetGlowValue(previewProperties[managedGlow.strengthKey])"),
    "the wizard's own live preview must apply the same __preserve__-aware fallback",
  );
  assert.ok(editor.includes("managedGlow.colorDefault") && editor.includes("managedGlow.strengthDefault"));
});

run("the managed-glow escape dynamically switches to a bigger/different glow for the widget's own Selected signal, not just at mount time", () => {
  // Confirmed via a live screenshot: a widget can morph shape AND
  // noticeably enlarge its own glow specifically in the selected state
  // (e.g. a square-to-circle button) — a glow size computed once at
  // mount time and never revisited stays wrong the moment the widget is
  // actually selected, even though the escape mechanism itself (shape,
  // fallback resolution) is otherwise working correctly.
  const editor = read("editor.js");
  assert.ok(
    editor.includes("applyManagedGlow = (isSelected) => {"),
    "the glow application must be a reusable function, callable both at mount time and on live signal changes",
  );
  assert.ok(
    editor.includes("selectedSignal = signals.find(") &&
      editor.includes('signal.direction === "input" && /^selected'),
    "must find the widget's own Selected input signal (accounting for per-button suffixes like selected1/selected2) to subscribe to",
  );
  assert.ok(
    editor.includes("managedGlowSelected = truthy(value);") &&
      editor.includes("applyManagedGlow(managedGlowSelected);"),
    "must re-apply the glow live whenever the Selected signal changes, using the same truthy-parsing convention used elsewhere for digital signals",
  );
  assert.ok(
    editor.includes("selectedColorKey: selectedColorProperty?.key || colorProperty?.key || \"\"") &&
      editor.includes("selectedStrengthKey: selectedStrengthProperty?.key || strengthProperty?.key || \"\""),
    "detectManagedGlow must resolve a selected-specific color/strength, falling back to the standard pair when the widget has no dedicated selected glow property",
  );
});

run("the managed-glow escape stacks two glow layers (matching Composer's own glow synthesis elsewhere), not a single flat one", () => {
  // Confirmed via a live screenshot: even with the correct color/
  // strength and correct alpha-following shape, a single shadow layer
  // still read as boxy/hard-edged rather than a soft glow —
  // customBehaviorRuntime's own appearance() function (used for
  // hand-built components' glowStrength behavior) already solves this
  // by stacking a second layer at double the blur radius, so the escape
  // approximation should render the same way, not differently.
  const editor = read("editor.js");
  assert.ok(
    editor.includes("`0 0 ${outerGlowStrength}px ${outerGlowColor}`") &&
      editor.includes("`0 0 ${outerGlowStrength * 2}px ${outerGlowColor}`"),
    "mount()'s host-level glow must stack a second, wider layer",
  );
  assert.ok(
    editor.includes(
      "`drop-shadow(0 0 ${glowStrength}px ${glowColor}) drop-shadow(0 0 ${glowStrength * 2}px ${glowColor})`",
    ),
    "the wizard preview's glow filter must apply the same two-layer treatment",
  );
});

run("the managed-glow escape uses a shape-sized proxy outside the iframe", () => {
  // Confirmed via a live screenshot + DOM inspection: none of host's
  // ancestors have their own background/border/box-shadow, yet the glow
  // still visibly took on a rectangular shape rather than following the
  // widget's rounded/circular button — because filter:drop-shadow shapes
  // itself from the source element's rendered alpha, and browsers
  // commonly treat an <iframe> as opaque for that purpose regardless of
  // how transparent its own document's background is. box-shadow is
  // drawn purely from the element's own box geometry (its border-radius),
  // never its content's pixels — sidestepping the iframe issue entirely,
  // as long as host's own border-radius is kept in sync with the
  // widget's real shape.
  const editor = read("editor.js");
  assert.ok(
    editor.includes("measureGlowShape = () => {"),
    "must measure the widget's actual rendered shape rather than assuming a fixed radius",
  );
  assert.ok(
    editor.includes(".custom-component-glow-proxy{position:absolute;z-index:2;pointer-events:none;background:transparent}"),
    "the transparent proxy must paint above the iframe compositing surface so Chromium cannot clip it to the iframe edge",
  );
  assert.ok(
    editor.includes('glowProxyParent = root.closest(".widget,.scoped-widget") || root') &&
      editor.includes("glowProxyParent.appendChild(glowProxy)"),
    "the proxy must live outside the scoped component subtree so no iframe/host wrapper can clip it",
  );
  assert.ok(
    editor.includes('radius = style.borderRadius || "0px"') &&
      editor.includes("radius,"),
    "must read the real border-radius off the widget's own largest visual element",
  );
  assert.ok(
    editor.includes("borderRadius: shape.radius") &&
      editor.includes("glowProxy.style"),
    "the external glow proxy must mirror the measured shape before its box-shadow is applied",
  );
  assert.ok(
    !editor.includes("host.style.filter = `drop-shadow"),
    "the host-level escape must no longer use filter:drop-shadow, since that's the mechanism that broke the shape",
  );
  assert.ok(
    editor.includes(
      "applyManagedGlow(managedGlowSelected);",
    ),
    "the first glow application must run after the iframe's load event, not synchronously at mount time, since shape measurement needs the iframe's document to actually exist",
  );
});

run("measureShapeRadius breaks area ties in favor of the deeper/more specific element, not document order", () => {
  // Confirmed live: a layout wrapper <div> that exactly hugs its only
  // child <button> ties with it for largest area. querySelectorAll
  // returns the wrapper first (document order), so a plain `>` comparison
  // kept the wrapper - which has no border-radius - instead of the button,
  // which is the widget's real visual shape. Depth must break the tie.
  const editor = read("editor.js");
  assert.ok(
    editor.includes("largestDepth = -1"),
    "must track the depth of the current best candidate to break area ties",
  );
  assert.ok(
    editor.includes("area > largestArea || (area === largestArea && depth > largestDepth)"),
    "an area tie must be broken in favor of the deeper element, not whichever came first in document order",
  );
});

run("mount() suppresses the widget's own internal glow when the escape is externally painting it, so they don't stack into a double halo", () => {
  // Confirmed live via DevTools: btn.style.boxShadow was set inline (by the
  // widget's own behaviorRuntime, via appearance()'s glowStrength handling)
  // to the exact same two-layer glow our external host-level escape also
  // paints - producing a visible "halo around a halo" instead of one glow
  // that's allowed to bleed past the bounding box. The widget's own
  // appearance() is the shared, general mechanism for ALL custom/translated
  // widgets, so it must be the one to skip painting the glow, driven by a
  // flag the parent sets before behaviorRuntime's script ever runs.
  const editor = read("editor.js");
  assert.ok(
    editor.includes(
      'managedGlowFlagScript = managedGlow.enabled\n            ? "<script>window.__composerManagedGlowExternal=true;<\\/script>"',
    ),
    "mount() must flag the iframe when managedGlow is escaping externally, before behaviorRuntime's script runs",
  );
  assert.ok(
    editor.includes("bridge +\n                  managedGlowFlagScript +"),
    "the flag script must be inserted into documentText ahead of behaviorRuntime (both the </body>-present and fallback assembly branches)",
  );
  assert.ok(
    editor.includes(
      "if(glow&&!window.__composerManagedGlowExternal){parts.push('0 0 '+glow+'px '+color);parts.push('0 0 '+glow*2+'px '+color)}",
    ),
    "appearance()'s shared glow-painting helper must skip its own glow portion (but keep the unrelated drop-shadow part) once the flag is set",
  );
});

run("the translated button-style preset's glowStrength default is substantial enough to actually read as a glow once escaped, not the old barely-visible 3px", () => {
  // Confirmed via a live screenshot: with the managed-glow escape fully
  // working (correct shape, correct fallback resolution), a widget's
  // glow was STILL visually "cut off" — because 3px is such a small
  // blur radius that it barely registers as a glow at all once it's the
  // ONLY thing standing in for the widget's authored effect. 12 matches
  // the default already used for this exact concept elsewhere in
  // Composer (the hand-built "Override custom appearance" glow
  // property), rather than being a smaller, inconsistent one-off.
  const editor = read("editor.js"),
    marker = 'key: "glowStrength",\n          label: "Glow strength",',
    markerStart = editor.indexOf(marker);
  assert.notEqual(markerStart, -1, "the translate button-style glowStrength property definition was not found — has it moved?");
  const nearby = editor.slice(markerStart, markerStart + 900);
  assert.ok(/value:\s*12,/.test(nearby), `expected the button-style glowStrength default to be 12, found: ${nearby.match(/value:\s*\d+,/)?.[0]}`);
});

run("the placed-widget signal bridge script embedded in registerCustomComponent's mount() is syntactically valid", () => {
  // Real bug: a misplaced ')' inside subscribe's unsubscribe closure
  // (`...callback)}}};` instead of `...callback})}}};`) made this whole
  // <script> tag throw "Unexpected token ')'" at parse time in every
  // placed custom/translated component — meaning window.ComposerSignals
  // never got defined at all, breaking signal communication (including
  // the properties a mounted component reads) for every such widget.
  // Being embedded in a template literal, this had no static type
  // checking to catch it; only actually parsing the extracted script
  // text would.
  const editor = read("editor.js"),
    marker = "bridge = `<script>(function(){if(!window.ComposerSignals)",
    markerStart = editor.indexOf(marker);
  assert.notEqual(markerStart, -1, "the mount() signal bridge script was not found — has it moved or been renamed?");
  const scriptOpen = editor.indexOf("<script>", markerStart) + "<script>".length,
    scriptClose = editor.indexOf("<\\/script>", scriptOpen),
    js = editor.slice(scriptOpen, scriptClose);
  try {
    new Function(js);
  } catch (error) {
    throw new Error(`mount()'s bridge script has a syntax error: ${error.message}`);
  }
});

run("Import and Translate skips the redundant Selected signal for a detected multi-state widget, since Selected is essentially state index 1", () => {
  const editor = read("editor.js");
  // Two separate places must both exclude it: the preset's own baseline
  // "selected" signal (added to the list before the per-button loop even
  // runs — a real bug slipped through here once, because a loop-only guard
  // never got a chance to run against a signal the preset had already
  // added) and the per-button loop's own (re-)addition.
  assert.ok(
    editor.includes(
      '(buttonCount > 1 || (key === "selected" && detected.stateFamily))',
    ),
    "the preset's baseline Selected signal must be explicitly removed for a single-button state-family widget, not just guarded against re-addition by the loop below",
  );
  assert.ok(
    editor.includes("if (!(buttonCount === 1 && detected.stateFamily))") &&
      editor.includes("key: `selected${suffix}`"),
    "the per-button loop must also not re-add the Selected signal for a single-button widget that already has a detected state family",
  );
  assert.ok(
    editor.includes(
      "!(detected.stateFamily && /^selected\\d*$/.test(entry.key))",
    ),
    "an inferred class-toggle candidate keyed 'selected' must also be suppressed once a state family is detected, even though it comes from a different detector",
  );
});

run("Build Component's compatibility audit ignores Composer's own generated runtime code, not just the widget's own JavaScript", () => {
  const editor = read("editor.js");
  // Real bug: translatedResponsiveFitRuntime()'s own unconditional
  // ResizeObserver usage made "modern-browser-apis" fire on every single
  // translated component regardless of what the widget's own code did —
  // a finding the user could never act on, since it wasn't about their
  // code at all. auditCustomSource() must scan the marker-stripped
  // authoredJavascript, not the raw javascript, for every JS-content
  // compatibility check.
  assert.ok(
    editor.includes(
      "authoredJavascript = javascript.replace(",
    ) &&
      editor.includes(
        "/\\/\\* composer-generated-runtime \\*\\/[\\s\\S]*?\\/\\* \\/composer-generated-runtime \\*\\//g",
      ),
  );
  [
    '.test(authoredJavascript))\n      add("parent-document"',
    "...authoredJavascript.matchAll(",
    '.test(authoredJavascript))\n      add("window-state"',
    '.test(authoredJavascript))\n      add("browser-storage"',
    '.test(authoredJavascript))\n      add("dynamic-code"',
    '.test(authoredJavascript))\n      add("network-api"',
    '.test(authoredJavascript) && "String.replaceAll"',
    '.test(authoredJavascript) && "structuredClone"',
    '.test(authoredJavascript) && "ResizeObserver"',
  ].forEach((snippet) => assert.ok(editor.includes(snippet), `missing: ${snippet}`));
});

run("Build Component's non-repairable compatibility findings offer a 'Show location' action instead of being inert text", () => {
  const editor = read("editor.js"), css = read("editor.css");
  assert.ok(editor.includes("const customAuditFindingSearch = {"));
  assert.ok(editor.includes("function goToCustomAuditFindingSource(code)"));
  assert.ok(editor.includes("function switchCustomSourceTab(name)"));
  assert.ok(
    editor.includes('data-custom-audit-location="${finding.code}"') &&
      editor.includes("goToCustomAuditFindingSource(button.dataset.customAuditLocation)"),
  );
  assert.ok(css.includes("[data-custom-audit-location]"));
});

run("Import and Translate is consolidated into Component Creator", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(!html.includes('id="translate-snippet-menu"'));
  assert.ok(!html.includes('id="translate-snippet"'));
  assert.ok(html.includes('id="creator-import-code"'));
  assert.ok(editor.includes("async function openTranslateImport()"));
  assert.ok(editor.includes('$("creator-import-code").onclick'));
});

run("custom component workflows are available from the File menu", () => {
  const editor = read("editor.js"), html = read("editor.html");
  assert.ok(html.includes('id="custom-package-menu"'));
  assert.ok(html.includes('id="new-custom-component-menu"'));
  assert.ok(html.includes('id="custom-package-menu">Install Component Package</button>'));
  assert.ok(html.includes('id="new-custom-component-menu">Create Component</button>'));
  assert.ok(editor.includes('$("custom-package-menu").onclick = () => $("custom-package-file").click()'));
  assert.ok(editor.includes('$("new-custom-component-menu").onclick = openComponentCreator'));
});

run("Component Creator provides one unified import and starter workflow", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="component-creator-dialog"'));
  assert.ok(html.includes('id="creator-import-code"'));
  assert.ok(html.includes('id="creator-import-package"'));
  ["button", "toggle", "slider", "gauge", "text", "blank"].forEach((template) =>
    assert.ok(html.includes(`data-creator-template="${template}"`)),
  );
  assert.ok(editor.includes("function openComponentCreator()"));
  assert.ok(editor.includes("openCustomBuilder(null, null, button.dataset.creatorTemplate)"));
  assert.ok(!html.includes('id="custom-mode-guided"'));
  assert.ok(!html.includes('id="custom-mode-advanced"'));
  assert.ok(html.includes("Imported setup</span>"));
  assert.ok(html.includes("Add capabilities &amp; edit code</span>"));
  assert.ok(html.includes('id="custom-capability-panel"'));
  assert.ok(html.includes('id="custom-repeat-held-signal"'));
  assert.ok(editor.includes("function renderCustomCapabilityQuestions"));
  assert.ok(css.includes(".creator-template-list"));
});

run("custom element picker classifies elements and generates standard capabilities", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="custom-element-classifier"'));
  assert.ok(html.includes('id="custom-element-role"'));
  assert.ok(html.includes('id="custom-element-apply-role"'));
  ["button", "text", "textInput", "icon", "selected", "gauge", "slider", "repeated", "ignore"].forEach((role) =>
    assert.ok(html.includes(`value="${role}"`)),
  );
  // Phase 2: container/track/handle/label/toggle must be selectable
  // everywhere a role can be assigned or displayed — the single-element
  // classifier dropdown, the bulk inventory list's per-row dropdown, and
  // the Component Map's own role dropdown + icon lookup — not just
  // producible by inferCustomElementRole. A role inferCustomElementRole can
  // return but that isn't registered in one of these renders as a stale
  // blank/mismatched selection, the exact bug class the "speed" action
  // dropdown mismatch was earlier this session.
  ["container", "track", "handle", "label", "toggle"].forEach((role) => {
    assert.ok(html.includes(`value="${role}"`), `custom-element-role select is missing ${role}`);
    assert.ok(editor.includes(`["${role}", `), `renderCustomElementInventory's roles array is missing ${role}`);
  });
  assert.ok(editor.includes('roles = ["element", "container", "track", "handle", "label", "button", "toggle"'));
  ["container: ", "track: ", "handle: ", "label: "].forEach((entry) =>
    assert.ok(editor.includes(entry), `customWorkbenchRoleIcons is missing an icon for ${entry.trim()}`),
  );
  // Phase 2: seedCustomWorkbenchParts must de-dupe by the resolved live
  // node, not just by exact selector string, so a translation-generated
  // duplicate (same element, differently-written selector) doesn't create
  // a second "Mapped target"-style part for something already named.
  assert.ok(editor.includes("claimedNodes"), "seedCustomWorkbenchParts is missing resolved-node de-duplication");
  assert.ok(editor.includes("function filterRedundantGenericWrappers(inventory)"));
  assert.ok(editor.includes("inventory = filterRedundantGenericWrappers(inventory);"), "analyzeCustomElements must actually apply the generic-wrapper filter, not just define it");
  // Phase 2: the live-preview refinement pass and dynamic-element observer
  // only do anything useful if they're actually wired into the preview's
  // lifecycle, not just defined and never called.
  assert.ok(editor.includes("function computeCustomWorkbenchRoleRefinement(node, frameDocument, role, confidence)"));
  assert.ok(editor.includes("function refineCustomElementInventoryWithLivePreview()"));
  // refineWorkbenchPartsWithLivePreview refines Component Map parts
  // directly (not just ones synced from the inventory pipeline) — required
  // for a manually-added or live-picked part, which never has a
  // customAnalyzedElements entry to sync from in the first place.
  assert.ok(editor.includes("function refineWorkbenchPartsWithLivePreview()"));
  assert.ok(editor.includes("function observeCustomWorkbenchDynamicElements(frameDocument)"));
  assert.ok(editor.includes("function healComponentRootPart(frameDocument)"));
  assert.ok(editor.includes("refineCustomElementInventoryWithLivePreview();\n      refineWorkbenchPartsWithLivePreview();\n      healComponentRootPart(previewFrame.contentDocument);\n      observeCustomWorkbenchDynamicElements(previewFrame.contentDocument);"));
  // Phase 3: one state selector remains visible throughout Workbench and is
  // reapplied after every live-preview rebuild.
  assert.ok(html.includes('id="custom-workbench-state-toolbar"'));
  assert.ok(html.includes('id="custom-workbench-state-buttons"'));
  assert.ok(editor.includes('let customWorkbenchActiveState = "standard"'));
  assert.ok(editor.includes("function setCustomWorkbenchActiveState(name"));
  assert.ok(editor.includes("requestAnimationFrame(() => applyCustomWorkbenchActiveState())"));
  assert.ok(editor.includes("function refreshCustomWorkbenchForActiveState()"));
  assert.ok(editor.includes("setTimeout(refreshCustomWorkbenchForActiveState, 80)"));
  assert.ok(editor.includes("function customWorkbenchStateSimulationMessage("));
  assert.ok(editor.includes("function customWorkbenchStateSimulationBridge("));
  assert.ok(editor.includes("data-composer-workbench-state-bridge"));
  assert.ok(html.includes('id="custom-workbench-state-compare"'));
  assert.ok(html.includes('id="custom-workbench-state-comparison"'));
  assert.ok(html.includes('id="custom-workbench-compare-standard"'));
  assert.ok(html.includes('id="custom-workbench-compare-selected"'));
  assert.ok(editor.includes("function refreshCustomWorkbenchStateComparison("));
  assert.ok(editor.includes("function applyCustomWorkbenchComparisonState("));
  assert.ok(css.includes(".custom-workbench-state-comparison"));
  assert.ok(html.includes('id="custom-property-context"'));
  assert.ok(html.includes('id="custom-signal-context"'));
  assert.ok(html.includes('id="custom-property-state-scope"'));
  assert.ok(html.includes('id="custom-signal-state-scope"'));
  assert.ok(editor.includes("target.dataset.preferPartId = customWorkbenchSelectedPartId"));
  assert.ok(editor.includes("function fillCustomStateScopeSelect("));
  assert.ok(editor.includes("function customStateScopedCssSelector("));
  assert.ok(editor.includes("function customPropertySentence("));
  assert.ok(editor.includes("function customConnectionSentence("));
  assert.ok(editor.includes("function renderCustomMappingConflict("));
  assert.ok(editor.includes("function customPropertyRoleRecommendations("));
  assert.ok(editor.includes("function renderCustomPropertyLiveTest("));
  assert.ok(editor.includes("function applyCustomTemporaryPropertyValue("));
  assert.ok(html.includes('id="custom-property-sentence"'));
  assert.ok(html.includes('id="custom-property-test-control"'));
  assert.ok(html.includes('id="custom-property-test-reset"'));
  assert.ok(html.includes('id="custom-property-test-compare"'));
  assert.ok(html.includes('id="custom-property-original-preview"'));
  assert.ok(html.includes('<option value="select">Dropdown</option>'));
  assert.ok(html.includes('id="custom-signal-sentence"'));
  assert.ok(html.includes("Digital — true / false"));
  assert.ok(html.includes("Analog — number"));
  assert.ok(html.includes("Serial — text"));
  assert.ok(editor.includes("function customSignalActionApplies("));
  assert.ok(editor.includes("function customConnectionInlineTester("));
  assert.ok(css.includes(".custom-connection-inline-tester"));
  ["charging", "completed", "customEvent", "positionX", "positionY", "name", "textEntry"].forEach((action) => assert.ok(editor.includes(`[\"${action}\"`)));
  assert.ok(html.includes("Advanced: generated CSS / JavaScript"));
  assert.ok(html.includes("Advanced mapping details"));
  assert.ok(css.includes(".custom-mapping-sentence"));
  assert.ok(css.includes(".custom-mapping-advanced"));
  assert.ok(css.includes(".custom-property-live-test"));
  assert.ok(css.includes(".custom-property-original-comparison"));
  ["fontFamily", "fontWeight", "textAlign", "wrapText", "lineHeight", "letterSpacing", "shadowSize", "shadowColor", "padding", "margin", "positionX", "positionY", "rotation", "fill", "animationDuration", "transitionDuration"].forEach((capability) => assert.ok(editor.includes(`value: "${capability}"`)));
  assert.ok(editor.includes('{ value: "width", label: "Width", type: "number", defaultValue: 100, css: "width"'));
  assert.ok(editor.includes('{ value: "height", label: "Height", type: "number", defaultValue: 50, css: "height"'));
  assert.ok(editor.includes("const position = [\"positionX\", \"positionY\"].includes(definition.value)"));
  assert.ok(editor.includes("custom-component-glow-proxy"));
  assert.ok(editor.includes("properties.contentInset"));
  assert.ok(editor.includes('stateScope: definition.stateScope'));
  assert.ok(editor.includes('stateScope: config.stateScope || "all"'));
  assert.ok(editor.includes('stateScope: mapping.stateScope || "all"'));
  assert.ok(editor.includes("function inferCustomElementRole(element = {})"));
  assert.ok(editor.includes("function applyCustomElementRole("));
  assert.ok(editor.includes("Existing definitions were preserved"));
  assert.ok(editor.includes("function customElementSignalKey(baseKey, selector)"));
  [
    "selectedFaceColor", "selectedText", "selectedAsset", "showBackground",
    "showLabel", "showIcon", "showPercentage", "textAlignment", "wrapText",
    "shadowSize", "Value Set", "Feedback",
  ].forEach((capability) => assert.ok(editor.includes(capability)));
  assert.ok(editor.includes("previewProperties[property.key]"));
  assert.ok(html.includes('id="custom-apply-recommended"'));
  assert.ok(editor.includes("function applyAllRecommendedCustomRoles()"));
  assert.ok(editor.includes("function customElementPropertyKey(baseKey, selector)"));
  assert.ok(editor.includes("inputType:original.type||''"));
  assert.ok(css.includes(".custom-element-classifier"));
});

run("custom component creator summarizes generated behavior in plain language", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes("Plain-language component review"));
  assert.ok(html.includes('id="custom-behavior-review"'));
  assert.ok(editor.includes("function renderCustomPlainLanguageReview()"));
  assert.ok(editor.includes("Pressing ${target} sends the ${signalName} digital output."));
  assert.ok(editor.includes("The original animation remains local"));
  assert.ok(!editor.includes("Visibility and Disabled remain optional Composer-level bindings"));
  assert.ok(css.includes(".custom-behavior-review-item"));
});

run("custom components include reversible compatibility auditing and safe repairs", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="custom-audit-report"'));
  assert.ok(html.includes('id="custom-audit-repair"'));
  assert.ok(html.includes('id="custom-audit-restore"'));
  assert.ok(editor.includes("function auditCustomSource()"));
  assert.ok(editor.includes("function repairCustomSourceSafely()"));
  assert.ok(editor.includes('mousedown: "pointerdown"'));
  assert.ok(editor.includes('.replace(/100vw\\b/gi, "100%")'));
  assert.ok(editor.includes("captureCustomOriginalSource()"));
  assert.ok(html.includes("Apply selected safe repairs"));
  assert.ok(editor.includes('data-custom-repair="${finding.code}"'));
  assert.ok(editor.includes('add("duplicate-ids"'));
  assert.ok(!editor.includes('selected.has("global-ids")'));
  assert.ok(editor.includes('selected.has("effect-clipping")'));
  assert.ok(editor.includes('name: "Glow-safe inset"'));
  assert.ok(editor.includes("customOriginalSourceSnapshot.properties.forEach(addCustomPropertyRow)"));
  assert.ok(editor.includes("function customLocalDependencyReferences(source)"));
  assert.ok(editor.includes("function customAssetForLocalReference(reference)"));
  assert.ok(editor.includes('selected.has("local-assets")'));
  assert.ok(editor.includes("Import ${missingLocal.map"));
  assert.ok(editor.includes("function loadCustomOriginalSource(entry = null)"));
  assert.ok(editor.includes("entry.originalSource ||"));
  assert.ok(editor.includes("originalSource: preservedOriginalSource"));
  assert.ok(editor.includes('add("css-inset"'));
  assert.ok(editor.includes('selected.has("css-inset")'));
  assert.ok(editor.includes('add("legacy-js-apis"'));
  assert.ok(editor.includes("composer-panel-compatibility-polyfills"));
  assert.ok(editor.includes("Generated: ${generatedPropertyCount} properties · ${generatedSignalCount} signals"));
  assert.ok(editor.includes("authored animation definition${authoredAnimations.length === 1"));
  assert.ok(editor.includes("entry?.readiness?.reportText"));
  assert.ok(editor.includes("Exported HTML / CH5 package runtime"));
  assert.ok(editor.includes("function customRelatedElementSelector(selector, candidates, includeTarget = false)"));
  assert.ok(editor.includes("if (trackSelector)"));
  assert.ok(editor.includes("if (handleSelector)"));
  assert.ok(editor.includes("if (valueSelector)"));
  assert.ok(html.includes('value="decorative"'));
  assert.ok(editor.includes("customSavedElementRoles"));
  assert.ok(editor.includes("elementRoles: customAnalyzedElements.map"));
  assert.ok(editor.includes("decorative element${decorative.length === 1"));
  assert.ok(editor.includes('"generated-animation-conflict"'));
  assert.ok(editor.includes("scaleDeclaration = Math.abs(scale - 1)"));
  assert.ok(editor.includes("customOriginalSourceSnapshot.stateStyles"));
  assert.ok(!editor.includes("transition:background-color .16s,color .16s"));
  assert.ok(editor.includes("function customDetectedStateStyles(selector)"));
  assert.ok(editor.includes('target.classList.add("selected", "active")'));
  assert.ok(editor.includes('target.classList.add("disabled")'));
  assert.ok(editor.includes("detected Standard, Pressed, Selected, and Disabled appearances"));
  assert.ok(editor.includes("function customDetectedEventCapabilities(selector)"));
  assert.ok(editor.includes('tag === "select"'));
  assert.ok(editor.includes("detectedEvents.change && !detectedEvents.input"));
  assert.ok(editor.includes('action: outputAction'));
  assert.ok(editor.includes('name: "Horizontal padding"'));
  assert.ok(editor.includes('name: "Vertical padding"'));
  assert.ok(editor.includes('name: "Text / icon spacing"'));
  assert.ok(editor.includes('name: "Item spacing"'));
  assert.ok(editor.includes('name: "Standard state — indicator color"'));
  assert.ok(editor.includes('name: "Selected state — indicator color"'));
  assert.ok(editor.includes('name: "Selected state — indicator glow strength"'));
  assert.ok(editor.includes('name: "Standard state — icon color"'));
  assert.ok(editor.includes('data-composer-original-src'));
  assert.ok(editor.includes('name: "Repeated-item layout"'));
  assert.ok(editor.includes('name: "Grid columns"'));
  assert.ok(editor.includes("function applyLayout(items)"));
  assert.ok(editor.includes('name: "Analog sub-item value set range"'));
  assert.ok(editor.includes('name: "Analog sub-item feedback range"'));
  assert.ok(editor.includes("__repeatValueSet:"));
  assert.ok(editor.includes("__repeatFeedback:"));
  assert.ok(editor.includes("rule.action==='input'||rule.action==='change'"));
  assert.ok(editor.includes("target.type==='checkbox'"));
  assert.ok(editor.includes("entry.controlOwner = controlOwner.selector"));
  assert.ok(editor.includes("shared Selected feedback will be used"));
  assert.ok(editor.includes("control-group-member"));
  assert.ok(editor.includes("function customGroupedSelectedSignalKey"));
  assert.ok(editor.includes('entry.role === "button" ? 1 : 2'));
  assert.ok(editor.includes("function customDetectedNumericPresentation"));
  assert.ok(editor.includes("function translatedNumericPresentation"));
  assert.ok(editor.includes('action: target.action || (target.visualFill ? "width" : "value")'));
  assert.ok(editor.includes("presentation = translatedNumericPresentation"));
  assert.ok(editor.includes('kind: "interaction-relationship"'));
  assert.ok(editor.includes("customPreservedRelationships"));
  assert.ok(editor.includes("preservedRelationships: structuredClone(customPreservedRelationships)"));
  assert.ok(editor.includes("selectorCoverage: selectorCoverage.passed"));
  assert.ok(editor.includes("Generated selectors and preserved interaction targets"));
  assert.ok(editor.includes("entry.readiness.acceptanceMatrix"));
  assert.ok(html.includes('<option value="requires-hardware">Not tested</option>'));
  assert.ok(editor.includes("ACCEPTANCE MATRIX"));
  assert.ok(html.includes('id="custom-manual-acceptance"'));
  assert.ok(editor.includes('acceptanceStatus("ch5Desktop")'));
  assert.ok(editor.includes("manualVerificationNotes"));
  assert.ok(editor.includes("manualVerification: Object.fromEntries"));
  assert.ok(editor.includes("importedFingerprintCurrent"));
  assert.ok(editor.includes("validStatuses.has(check.status)"));
  assert.ok(editor.includes("readiness not included"));
  assert.ok(editor.includes("The authored relationship remains local"));
  assert.ok(editor.includes("selects a dataset-linked target"));
  assert.ok(editor.includes("creates related content"));
  assert.ok(editor.includes("Delegated press controls the matched item"));
  assert.ok(editor.includes('action === "relationships"'));
  assert.ok(editor.includes('role: "sliderHandle"'));
  assert.ok(editor.includes('role: "backgroundAsset"'));
  assert.ok(editor.includes('name: "Show handle"'));
  assert.ok(editor.includes('name: "Standard state — background asset"'));
  assert.ok(editor.includes('name: "Selected state — background asset"'));
  assert.ok(editor.includes('name: "Show decorative visual"'));
  assert.ok(editor.includes("function scopedTimeout"));
  assert.ok(editor.includes("function scopedInterval"));
  assert.ok(editor.includes("timerHandles.forEach(window.clearTimeout)"));
  assert.ok(editor.includes('add("parent-document"'));
  assert.ok(editor.includes('add("duplicate-listeners"'));
  assert.ok(editor.includes('selected.has("parent-document")'));
  assert.ok(editor.includes('add("fixed-root-size"'));
  assert.ok(editor.includes("composer-responsive-root"));
  assert.ok(editor.includes("composer-glow-safe-layout"));
  assert.ok(editor.includes('name: "Glow-safe component inset"'));
  assert.ok(editor.includes('add("duplicate-definitions"'));
  assert.ok(editor.includes('selected.has("duplicate-definitions")'));
  assert.ok(editor.includes('add("modern-browser-apis"'));
  assert.ok(editor.includes('add("advanced-css"'));
  assert.ok(editor.includes('/conic-gradient|rotate\\s*\\(/i'));
  assert.ok(editor.includes('name: "Fill color"'));
  assert.ok(editor.includes("numericCandidates = \"[data-value-control],[data-value],[class*='gauge']"));
  assert.ok(editor.includes("numericAction: numericPresentation?.action || \"\""));
  assert.ok(editor.includes("action=config.numericAction||('value'in control?'value':'width')"));
  assert.ok(editor.includes("else if(action==='height')control.style.height=percent+'%'"));
  assert.ok(editor.includes("else if(action==='cssVariable')control.style.setProperty(config.numericParameter||'--value',String(percent))"));
  assert.ok(editor.includes("detectedEvents.holdDuration"));
  assert.ok(editor.includes('action: "release"'));
  assert.ok(editor.includes('action: "hold", parameter: String(detectedEvents.holdDuration)'));
  assert.ok(editor.includes("repairDanglingCustomRoot"));
  assert.ok(editor.includes('selected.has("fixed-position")'));
  assert.ok(editor.includes("effect-clipping"));
  assert.ok(css.includes(".custom-compatibility-audit"));
});

run("custom component creation is gated by blocking automated errors", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes("Validate &amp; create component"));
  assert.ok(editor.includes("COMPONENT READINESS —"));
  assert.ok(!editor.includes("Confidence: ${confidence}%"));
  assert.ok(editor.includes("Multiple-instance isolation"));
  assert.ok(editor.includes("function customComponentReadinessFingerprint(entry)"));
  assert.ok(editor.includes("function customComponentReadinessStatus(entry)"));
  assert.ok(editor.includes("component-readiness ${readiness.key}"));
  assert.ok(editor.includes('if (readiness.key !== "tested")'));
  assert.ok(!editor.includes('key: "review", label: "Review"'));
  assert.ok(editor.includes("Open component readiness"));
  assert.ok(editor.includes("if (issue.customComponentId)"));
  assert.ok(editor.includes("openCustomBuilder(null, entry)"));
  assert.ok(css.includes(".component-readiness.tested"));
  assert.ok(editor.includes("testedAt: new Date().toISOString()"));
  assert.ok(editor.includes("changed after its ${new Date(readiness.testedAt).toLocaleString()} readiness test"));
  assert.ok(editor.includes("Matching mouse and touchscreen input"));
  assert.ok(editor.includes("Package export/import and dependencies"));
  assert.ok(editor.includes("readiness = await runCustomComponentSelfTestSafely()"));
  assert.ok(editor.includes("if (!readiness.passed)"));
  assert.ok(editor.includes("parseCustomComponentPackage(JSON.parse(JSON.stringify(probe)))"));
});

run("component creation uses one three-step workflow with source editing in step two", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.equal((html.match(/data-custom-wizard-step=/g) || []).length, 3);
  assert.ok(html.includes("Imported setup</span>"));
  assert.ok(html.includes("Add capabilities &amp; edit code</span>"));
  assert.ok(html.includes("Test &amp; create</span>"));
  assert.ok(html.includes('class="custom-source-code custom-step-capabilities"'));
  assert.ok(html.includes("Composer-generated CSS / JavaScript (live)"));
  assert.ok(editor.includes("function setCustomWizardStep(step = 0)"));
  assert.ok(editor.includes("if (customWizardStep === 1) analyzeCustomElements()"));
  assert.ok(editor.includes("if (customWizardStep === 2)"));
  assert.ok(css.includes("custom-wizard-step-1 .custom-step-imported"));
  assert.ok(css.includes("custom-wizard-step-2 .custom-builder-controls"));
});

run("component scoping creates real Composer properties and Crestron connections", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(!html.includes('id="custom-property-add"'));
  assert.ok(!html.includes('id="custom-signal-add"'));
  assert.ok(html.includes('id="custom-scope-add-property"'));
  assert.ok(html.includes('id="custom-scope-add-signal"'));
  assert.ok(html.includes('id="custom-property-creator"'));
  assert.ok(html.includes('id="custom-signal-creator"'));
  assert.ok(html.includes("Add an editable Composer property or a Crestron connection"));
  assert.ok(html.includes("What should it do?<select id=\"custom-signal-capability-action\""));
  assert.ok(editor.includes("function createScopedCustomProperty()"));
  assert.ok(editor.includes("function preferredCustomPropertyTarget(definition, select)"));
  assert.ok(editor.includes('part.title === "Track"'));
  assert.ok(editor.includes("__COMPOSER_PROPERTY_TOKEN_"));
  assert.ok(editor.includes("restoreTokens(entry[2].trim())"));
  assert.ok(editor.includes("function createScopedCustomSignal()"));
  assert.ok(editor.includes("addCustomPropertyRow(propertyDefinition)"));
  assert.ok(editor.includes("customWorkbenchDraft.properties.push(mapping)"));
  assert.ok(editor.includes("addCustomSignalRow(signalDefinition)"));
  assert.ok(editor.includes("connectionConfig: config"));
  assert.ok(editor.includes("COMPOSER MANAGED ${safeId} START"));
  assert.ok(editor.includes("window.ComposerSignals.subscribe"));
  assert.ok(editor.includes("window.ComposerSignals.publish"));
  assert.ok(editor.includes("target.style.opacity=String(mapped>1?mapped/100:mapped)"));
  assert.ok(editor.includes("node.style.transitionDuration=scaleDurations(transitionBase)"));
  assert.ok(editor.includes("node.style.animationDuration=scaleDurations(animationBase)"));
  assert.ok(editor.includes("durationScale=4-(ratio*3.8)"));
  assert.ok(editor.includes("function upgradeCustomAnimationSpeedRuntime(source)"));
  assert.ok(editor.includes("upgradeCustomAnimationSpeedRuntime(entry.html)"));
  assert.ok(editor.includes("function upgradeCustomFrameOverflow(source)"));
  assert.ok(editor.includes('frame.setAttribute("scrolling", "no")'));
  assert.ok(editor.includes("overflow:hidden!important;box-sizing:border-box;background:transparent!important"));
  assert.ok(editor.includes("filter: drop-shadow(0 0 var(--composer-scope-glow-strength"));
  assert.ok(editor.includes("target.style.filter='drop-shadow(0 0 '"));
  assert.ok(editor.includes('defaultValue: 6, help: "Adds an editable glow radius'));
  assert.ok(editor.includes("host.dataset.composerGlowOverflow = \"true\""));
  assert.ok(editor.includes("glowProxy.style") && editor.includes("custom-component-glow-proxy"));
  assert.ok(editor.includes("managedGlow = context.options.definitionData.managedGlow || {}"));
  assert.ok(editor.includes("managedGlow,"));
  const customMount = editor.slice(
    editor.indexOf("mount(root, context) {", editor.indexOf("function registerCustomComponent(entry)")),
    editor.indexOf("return () =>", editor.indexOf("mount(root, context) {", editor.indexOf("function registerCustomComponent(entry)"))),
  );
  assert.ok(!customMount.includes("entry.properties"));
  assert.ok(css.includes(".custom-scope-creator"));
});

run("component creator exposes detected toggle parts without manual selectors", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="custom-visual-parts"'));
  assert.ok(html.includes("Detected visual parts"));
  assert.ok(editor.includes("function detectedCustomVisualParts()"));
  assert.ok(editor.includes('title: "Track"'));
  assert.ok(editor.includes('title: "Knob"'));
  assert.ok(editor.includes('key: "selectedTrackColor"'));
  assert.ok(editor.includes('key: "selectedKnobColor"'));
  assert.ok(editor.includes('key: "glowStrength"'));
  assert.ok(editor.includes('option.pairedParameter'));
  assert.ok(editor.includes('replace(/::?(?:before|after)\\b/gi, "")'));
  assert.ok(css.includes(".custom-visual-part-card"));
});

run("custom component readiness probes resize and multiple live instances", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("function runCustomCompatibilityProbe()"));
  assert.ok(editor.includes("composer-compatibility-probe"));
  assert.ok(editor.includes("Multiple-instance isolation (two live instances)"));
  assert.ok(editor.includes("Component-bound responsive sizing (320px and 480px)"));
  assert.ok(editor.includes("Page remounts restore cached Crestron feedback"));
  assert.ok(editor.includes("Registered Composer runtime and Widget List are verified immediately after save"));
  assert.ok(editor.includes("function syncWidgetListCustomOptions()"));
  assert.ok(editor.includes("Widget List compatible"));
});

run("custom component save verifies the registered Composer runtime", () => {
  const editor = read("editor.js");
  assert.ok(editor.includes("async function runRegisteredCustomComponentTest(entry)"));
  assert.ok(editor.includes("window.ComposerRuntime.mount(root, entry.id"));
  assert.ok(editor.includes("entry.readiness.checks.registeredRuntime = registeredRuntime.passed"));
  assert.ok(editor.includes("entry.readiness.checks.widgetListRuntime"));
  assert.ok(editor.includes("Widget List did not create a runtime frame for both nested instances"));
  assert.ok(editor.includes("composer-export-readiness"));
  assert.ok(editor.includes("entry.readiness.checks.exportedRuntime"));
  assert.ok(editor.includes("The exported component did not create its runtime frame"));
  assert.ok(editor.includes("Page remount did not recreate the component runtime frame"));
  assert.ok(editor.includes("entry.readiness.checks.pageRemount"));
  assert.ok(editor.includes("REMOUNT_${index + 1}"));
  assert.ok(editor.includes("function removeExactCustomDefinitionDuplicates()"));
  assert.ok(editor.includes("exactDuplicatesRemoved: duplicateRepairs.length"));
  assert.ok(editor.includes("Testing saved runtime…"));
  assert.ok(editor.includes("The saved-runtime test exceeded 10 seconds and was stopped."));
  assert.ok(editor.includes("let exportedRuntime = { passed: false, errors: [] }"));
});

run("custom component source is automatically inventoried for guided setup", () => {
  const editor = read("editor.js"), html = read("editor.html"), css = read("editor.css");
  assert.ok(html.includes('id="custom-analyze-elements"'));
  assert.ok(html.includes('id="custom-element-inventory"'));
  assert.ok(editor.includes("function analyzeCustomElements()"));
  assert.ok(editor.includes("function customElementSelector(element, documentValue)"));
  assert.ok(editor.includes("renderCustomElementInventory(inventory)"));
  assert.ok(editor.includes('$("custom-analyze-elements").onclick = analyzeCustomElements'));
  assert.ok(editor.includes('configure.textContent = "Edit setup"'));
  assert.ok(css.includes(".custom-element-inventory-row"));
  assert.ok(editor.includes("function inferCustomRepeatedConfiguration(selector)"));
  assert.ok(editor.includes("child controls already managed by a repeated collection"));
  assert.ok(editor.includes("setCustomRepeatedControls(repeated)"));
  assert.ok(html.includes("Decorative element — preserve locally"));
  assert.ok(html.includes("Ignore — exclude from Composer setup"));
  assert.ok(editor.includes("structurallyRepeated"));
  assert.ok(editor.includes("Marked as a decorative local visual"));
  assert.ok(editor.includes("excluded from Composer setup and review"));
  assert.ok(editor.includes("function customComputedAppearance(selector)"));
  assert.ok(editor.includes('name: "Font family"'));
  assert.ok(editor.includes("defaultValue: appearance.backgroundColor"));
  assert.ok(editor.includes("function measureCustomPreviewDefaultSize()"));
  assert.ok(editor.includes("effectPadding"));
  assert.ok(editor.includes("measureCustomPreviewDefaultSize()),"));
});

run("visibility and disabled are optional Composer capabilities, not translated", () => {
  const editor = read("editor.js"), html = read("editor.html"), runtime = read("component-runtime.js"), exporter = read("exporter.js");
  assert.ok(runtime.includes('key: "visibilityEnabled"'));
  assert.ok(runtime.includes('key: "disabledEnabled"'));
  assert.ok(runtime.includes('optionalProperty: "visibilityEnabled"'));
  assert.ok(runtime.includes('disabledSignal.optionalProperty = "disabledEnabled"'));
  assert.ok(runtime.includes('if (options.properties?.disabledEnabled)'));
  assert.ok(editor.includes('(signal) => signal.key !== "visibility" && signal.key !== "disabled"'));
  assert.ok(editor.includes('property.key !== "disabledEnabled"'));
  assert.ok(!editor.includes('name: "Component Visibility"'));
  assert.ok(!editor.includes('name: "Component Disabled"'));
  assert.ok(exporter.includes("item.properties.disabledEnabled"));
  assert.ok(!html.includes('value="digitalVisibility"'));
  assert.ok(!html.includes("Add Selected &amp; Disabled signals"));
  assert.ok(!editor.includes('defaultValue: "CustomButton.Visibility"'));
  assert.ok(editor.includes('signal.key !== "visibility" && signal.key !== "disabled"'));
});

run("custom components persist in the application-wide Composer library", () => {
  const editor = read("editor.js"), html = read("editor.html"), desktop = read("CrestronUiComposer/MainWindow.xaml.cs");
  assert.ok(editor.includes('nativeRequest("readComponentLibrary")'));
  assert.ok(editor.includes('nativeRequest("writeComponentLibrary", serialized)'));
  assert.ok(editor.includes("function mergeGlobalCustomComponents("));
  assert.ok(editor.includes("globalComponentLibrary.components"));
  assert.ok(editor.includes("state.customComponents = structuredClone(globalComponentLibrary.components || [])"));
  assert.ok(editor.includes(".then(loadComponentLibrary)"));
  assert.ok(desktop.includes('case "readComponentLibrary"'));
  assert.ok(desktop.includes('case "writeComponentLibrary"'));
  assert.ok(desktop.includes('"Composer Component Library"'));
  assert.ok(desktop.includes('"custom-components.json"'));
  assert.ok(html.includes('id="export-component-menu"'));
  assert.ok(html.includes('id="export-component-library-menu"'));
  assert.ok(html.includes('id="import-component-library-menu"'));
  assert.ok(html.includes('accept=".cuicomponents,application/json"'));
  assert.ok(editor.includes('"crestron-ui-composer-component-library"'));
  assert.ok(editor.includes("function exportCustomComponentEntry(entry)"));
  assert.ok(editor.includes("Installed component library"));
  assert.ok(editor.includes("Installed “${entry.name}” permanently in Composer"));
});

if (process.exitCode) process.exit(process.exitCode);
console.log("All regression checks passed.");
