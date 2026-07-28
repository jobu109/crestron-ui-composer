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

run("widget styles cannot enlarge sidebar action buttons", () => {
  const css = read("editor.css");
  assert.ok(css.includes(".sidebar .side-panel-section-body > button"));
  assert.ok(css.includes("height: auto !important"));
  assert.ok(css.includes("min-height: 36px !important"));
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
  assert.ok(markup.includes('id="custom-component-apply-template"'));
  assert.ok(editor.includes("customStandardSignals"));
  assert.ok(editor.includes("customButtonProperties"));
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

run("new projects provide editable AV starter templates", () => {
  const editor = read("editor.js"),
    markup = read("editor.html");
  assert.ok(markup.includes('id="new-project-dialog"'));
  ["blank", "conference", "classroom", "multi-room"].forEach((starter) =>
    assert.ok(markup.includes(`data-starter-project="${starter}"`)),
  );
  assert.ok(editor.includes("function createStarterProject"));
  assert.ok(editor.includes("function starterItem"));
  assert.ok(editor.includes('bindingMode: "contract"'));
  assert.ok(editor.includes('targetPage: target.id'));
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

if (process.exitCode) process.exit(process.exitCode);
console.log("All regression checks passed.");
