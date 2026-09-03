"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");
const javascript = fs.readFileSync(path.join(root, "editor.js"), "utf8");
assert.ok(javascript.includes("mapping: structuredClone(mapping.mapping || mapping.connectionConfig?.mapping || null)"));
assert.ok(javascript.includes('$("custom-signal-creator").hidden = true;'));
assert.ok(javascript.includes('["output-min", "output-max"].forEach'));
assert.ok(html.includes('id="custom-authored-classes"'));
assert.ok(javascript.includes("function customAuthoredClassNames()"));
assert.ok(javascript.includes("function renderCustomAuthoredConnectionRecommendations()"));
assert.ok(html.includes('id="custom-authored-connection-list"'));
assert.ok(javascript.includes('button.textContent = existing ? "Edit existing" : "Configure (optional)"'));
assert.ok(javascript.includes('Exact target: ${exactSelector}'));
assert.ok(javascript.includes('row.dataset.recommendation = `${type}:${direction}:${effect}`'));
assert.ok(javascript.includes('definition.value === "classPresence"'));
assert.ok(javascript.includes('["classState", "standardStateText", "selectedStateText"].includes(action[0])'));

const semanticTargets = workbench.inventoryAuthoredInteractiveTargets({
  html: '<div class="decoration"></div><button id="save">Save</button><div class="switch" role="switch"></div>',
});
assert.deepStrictEqual(semanticTargets.map((target) => target.selector), ["#save", ".switch"]);
assert.ok(semanticTargets.every((target) => ["press", "release", "held"].every((event) => target.events.includes(event))));
const scriptedTargets = workbench.inventoryAuthoredInteractiveTargets({
  html: '<div class="tile"></div><div id="other"></div>',
  javascript: "const tile=document.querySelector('.tile'); tile.addEventListener('pointerdown', begin); document.getElementById('other').addEventListener('click', run);",
});
assert.deepStrictEqual(scriptedTargets.map((target) => target.selector), ["#other", ".tile"]);
assert.deepStrictEqual(workbench.inventoryAuthoredInteractiveTargets({ html: '<div class="plain"></div>' }), []);
const stateTargets = workbench.inventoryAuthoredStateTargets({
  html: '<input id="power" type="checkbox"><button id="locked" disabled>Locked</button>',
  css: '.tile.selected{color:red}.tile.disabled{opacity:.5}.panel.mode-night{background:black}',
  javascript: "const tile=document.querySelector('.tile'); tile.classList.toggle('active', on); const field=document.querySelector('.field'); field.disabled=true;",
});
assert.ok(stateTargets.some((target) => target.selector === "#power" && target.action === "checkedState"));
assert.ok(stateTargets.some((target) => target.selector === "#locked" && target.action === "disabledState"));
assert.ok(stateTargets.some((target) => target.selector === ".tile" && target.stateKind === "selected"));
assert.ok(stateTargets.some((target) => target.selector === ".tile" && target.stateKind === "disabled"));
assert.ok(stateTargets.some((target) => target.selector === ".panel" && target.parameter === "mode-night"));
assert.ok(stateTargets.some((target) => target.selector === ".field" && target.action === "disabledState"));
assert.deepStrictEqual(workbench.inventoryAuthoredStateTargets({ html: '<div class="plain"></div>', css: '.plain{color:red}' }), []);
assert.deepStrictEqual(workbench.inventoryAuthoredStateTargets({ css: '.selected .unknown-owner{color:red}' }), []);
const valueTargets = workbench.inventoryAuthoredValueTargets({
  html: '<div class="label">Ready</div><input id="level" type="range" value="25"><div class="plain"></div>',
  css: '.meter{width:40%;background:#ff0000}.meter::before{opacity:.5}.plain{display:flex}',
});
assert.ok(valueTargets.some((target) => target.type === "serial" && target.selector === ".label" && target.action === "text"));
assert.ok(valueTargets.some((target) => target.type === "analog" && target.selector === "#level" && target.action === "value"));
assert.ok(valueTargets.some((target) => target.type === "analog" && target.selector === ".meter" && target.parameter === "width" && target.unit === "%"));
assert.ok(valueTargets.some((target) => target.type === "analog" && target.selector === ".meter" && target.pseudoElement === "::before" && target.parameter === "opacity"));
assert.ok(!valueTargets.some((target) => target.parameter === "background" || target.parameter === "display"));

[
  "custom-signal-hold-duration",
  "custom-signal-pulse-duration",
  "custom-signal-exclusive",
  "custom-signal-input-min",
  "custom-signal-input-max",
  "custom-signal-output-min",
  "custom-signal-output-max",
  "custom-signal-false-mode",
  "custom-signal-false-value",
  "custom-signal-true-value",
  "custom-signal-value-table",
  "custom-signal-style-properties",
  "custom-signal-invert",
  "custom-signal-clamp",
  "custom-signal-zero-based",
  "custom-signal-per-item",
  "custom-signal-generation-preview",
  "custom-connection-mapping-list",
].forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));

const connectionCreatorMarkup = html.slice(
  html.indexOf('id="custom-signal-creator"'),
  html.indexOf('id="custom-connection-mapping-list"'),
);
[
  "custom-signal-target",
  "custom-signal-capability-type",
  "custom-signal-capability-direction",
  "custom-signal-capability-action",
  "custom-signal-state-scope",
  "custom-signal-capability-address",
].reduce((prior, id) => {
  const index = connectionCreatorMarkup.indexOf(`id="${id}"`);
  assert.ok(index > prior, `${id} should follow the simplified target/contract/effect/state/join order`);
  return index;
}, -1);
const connectionOptions = connectionCreatorMarkup.slice(
  connectionCreatorMarkup.indexOf('id="custom-signal-options"'),
  connectionCreatorMarkup.indexOf("</details>"),
);
[
  "custom-signal-capability-label",
  "custom-signal-capability-key",
  "custom-signal-parameter",
  "custom-signal-hold-duration",
  "custom-signal-pulse-duration",
  "custom-signal-input-min",
  "custom-signal-input-max",
  "custom-signal-output-min",
  "custom-signal-output-max",
  "custom-signal-false-mode",
  "custom-signal-false-value",
  "custom-signal-true-value",
  "custom-signal-value-table",
  "custom-signal-style-properties",
  "custom-signal-unit",
  "custom-signal-invert",
  "custom-signal-clamp",
  "custom-signal-per-item",
].forEach((id) => assert.ok(
  connectionOptions.includes(`id="${id}"`),
  `${id} should remain available in contextual conversion/connection options`,
));
assert.ok(
  javascript.includes('requiredOptions = analog || twoValueMap || needsParameter || eventTiming || repeatedTarget') &&
    javascript.includes('if (requiredOptions) signalOptions.open = true'),
  "conversion and event options should open automatically when the selected effect needs them",
);
for (const label of [
  "Visual value — False / True",
  "Text — False / True",
  "Visibility — False / True",
  "Indexed visual values",
  "Indexed text values",
  "Indexed visibility values",
]) assert.ok(javascript.includes(label), `${label} basic binding option is missing`);
assert.ok(javascript.includes("function parseCustomSignalValueTable("));
assert.ok(javascript.includes('falseValue: $("custom-signal-false-mode").value === "preserve"'));

[
  "function collectCustomSignalCreatorConfig(",
  "function customInventoriedConnectionTargets(",
  "function renderCustomConnectionMappings(",
  "function customScopePartLabel(",
  "function editCustomConnectionMapping(",
  "function duplicateCustomConnectionMapping(",
  "function removeCustomConnectionMapping(",
  "customWorkbenchDraft.connections.push(mapping)",
  "composer-state-change",
  "durationScale=4-(ratio*3.8)",
].forEach((value) => assert.ok(javascript.includes(value), value));
assert.ok(javascript.includes('group.label = "Inventoried source targets"'));
assert.ok(javascript.includes('option.dataset.compatibility = JSON.stringify(target.compatibility)'));
assert.ok(javascript.includes('fillCustomScopeTarget($("custom-signal-target"), true, true)'));
assert.ok(html.includes("Press fires only when released before Held duration"));
assert.ok(javascript.includes('["standardStateText", "Standard-state text"'));
assert.ok(javascript.includes('["selectedStateText", "Selected-state text"'));
assert.ok(javascript.includes("textTarget.__composerStateText"));
assert.ok(javascript.includes("new MutationObserver(render)"));
assert.ok(javascript.includes("control.addEventListener('composer-state-change',render)"));
assert.ok(javascript.includes('group.label = "Component parts"'));
assert.ok(javascript.includes('group.label = "Advanced selectors"'));
assert.ok(javascript.includes('const identity = partId ? `part:${partId}` : `selector:${value}`'));
assert.ok(javascript.includes("duplicate visual selectors are valid"));
assert.ok(
  javascript.includes("preferredOption = preferredPartId") &&
    javascript.includes("Do not let it match the first selector-only option"),
  "refreshing a connection form must preserve Track/Handle instead of treating Whole component's blank part id as preferred",
);
const connectionRenderer = javascript.slice(
  javascript.indexOf("function renderCustomConnectionMappings("),
  javascript.indexOf("function editCustomConnectionMapping("),
);
assert.ok(
  connectionRenderer.includes('[edit, test, duplicate, up, down, remove].forEach((button) => (button.type = "button"))'),
  "connection mapping actions must not submit and close the Workbench dialog",
);
assert.ok(connectionRenderer.includes("customConnectionInlineTester(mapping)"));
assert.ok(connectionRenderer.includes('test.textContent = "Test"'));
assert.ok(connectionRenderer.includes("inlineTester.hidden = true"));
assert.ok(connectionRenderer.includes('test.setAttribute("aria-pressed", String(!inlineTester.hidden))'));
assert.ok(connectionRenderer.includes('`${mapping.type} ${mapping.direction}:'));
assert.ok(connectionRenderer.includes("Number(mapping.mapping?.inputMin)"));
assert.ok(connectionRenderer.includes("Number(mapping.mapping?.inputMax)"));
assert.ok(javascript.includes("data.lifecycle==='press-release'"));
assert.ok(javascript.includes("[data-inline-output-key]"));

const connectionEditor = javascript.slice(
  javascript.indexOf("function editCustomConnectionMapping("),
  javascript.indexOf("function customAnimationSpeedRuntimeBody("),
);
assert.ok(connectionEditor.includes('openCustomScopeCreator("signal", { key: mapping.key, id: mapping.id || "" })'));
assert.ok(connectionEditor.includes('dataset.editingId = mapping.id || ""'));
const connectionCreator = javascript.slice(
  javascript.indexOf("function createScopedCustomSignal("),
  javascript.indexOf("function uniqueCustomBehaviorKey("),
);
assert.ok(connectionCreator.includes("customWorkbenchDraft?.connections?.find((connection) => connection.id === editingId)"));
assert.ok(connectionCreator.includes("findIndex((connection) => connection.id === editingId)"));
assert.ok(connectionCreator.includes("ComposerComponentWorkbench.withCanonicalBinding(mapping)"));

const connectionChangeHandlers = javascript.slice(
  javascript.indexOf('["custom-signal-capability-type", "custom-signal-capability-direction"]'),
  javascript.indexOf('$("custom-signal-create").onclick = createScopedCustomSignal'),
);
assert.ok(
  !connectionChangeHandlers.includes('resetCustomScopeCreatorEdits("custom-signal-capability-")') &&
    !connectionChangeHandlers.includes('delete $("custom-signal-capability-address").dataset.edited'),
  "changing connection type, direction, target, or effect must preserve user-entered form values",
);
assert.ok(
  javascript.includes('resetCustomScopeCreatorEdits(property ? "custom-property-" : "custom-signal-")'),
  "opening a new connection must reset stale edit markers across the entire signal form",
);

assert.ok(!javascript.includes('["visibility", "Visibility feedback"'));
assert.ok(!javascript.includes('["disabled", "Disabled feedback"'));
assert.ok(javascript.includes('value: "standardFontSize"'), "Workbench should offer a Standard/Idle text-size property");
assert.ok(javascript.includes('value: "selectedFontSize"'), "Workbench should offer a Selected text-size property");
assert.ok(javascript.includes(':not(.selected):not(.active):not(:checked):not([aria-checked="true"])'), "Standard text size should only apply outside Selected state");
assert.ok(javascript.includes('${selector}.selected, ${selector}.active, ${selector}:checked, ${selector}[aria-checked="true"]'), "Selected text size should follow Composer Selected feedback state");

const definition = workbench.normalize({
  parts: [{ id: "part-button", name: "Button", selector: ".button", role: "button", multiple: false }],
  connections: [
    {
      id: "connection-press",
      key: "press",
      label: "Press",
      type: "digital",
      direction: "output",
      defaultValue: "Control.Press",
      action: "press",
      target: { kind: "press", partId: "part-button", selector: ".button" },
      holdDuration: 3,
      pulseDuration: 50,
      exclusive: true,
    },
    {
      id: "connection-level",
      key: "level",
      label: "Level feedback",
      type: "analog",
      direction: "input",
      defaultValue: "Control.Feedback",
      action: "mappedProperty",
      target: { kind: "mappedProperty", partId: "part-button", selector: ".button", parameter: "--level" },
      mapping: { inputMin: 0, inputMax: 65535, outputMin: 0, outputMax: 100, unit: "%", invert: false, clamp: true },
    },
    {
      id: "connection-selected",
      key: "selected",
      label: "Selected feedback",
      type: "digital",
      direction: "input",
      defaultValue: "Control.Selected",
      action: "selected",
      target: { kind: "selected", partId: "part-button", selector: ".button" },
    },
    {
      id: "connection-set",
      key: "set",
      label: "Value Set",
      type: "analog",
      direction: "output",
      defaultValue: "Control.ValueSet",
      action: "valueSet",
      target: { kind: "valueSet", partId: "part-button", selector: ".button" },
      mapping: { inputMin: 0, inputMax: 100, outputMin: 0, outputMax: 65535, unit: "%", invert: false, clamp: true },
    },
    {
      id: "connection-label",
      key: "label",
      label: "Label feedback",
      type: "serial",
      direction: "input",
      defaultValue: "Control.Label",
      action: "text",
      target: { kind: "text", partId: "part-button", selector: ".button" },
    },
    {
      id: "connection-text",
      key: "text",
      label: "Text output",
      type: "serial",
      direction: "output",
      defaultValue: "Control.Text",
      action: "textOutput",
      target: { kind: "textOutput", partId: "part-button", selector: ".button" },
    },
  ],
});
assert.strictEqual(workbench.validate(definition).valid, true);
assert.deepStrictEqual(
  definition.connections.map(({ type, direction }) => `${type}:${direction}`).sort(),
  ["analog:input", "analog:output", "digital:input", "digital:output", "serial:input", "serial:output"],
  "canonical mappings must preserve every Crestron signal type and direction",
);
assert.deepStrictEqual(
  workbench.normalize(JSON.parse(JSON.stringify(definition))).connections,
  definition.connections,
);

console.log("component-workbench-connections.test.js passed");
