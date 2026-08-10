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
assert.ok(!javascript.includes('["input-min", "input-max", "output-min", "output-max"'));

[
  "custom-signal-hold-duration",
  "custom-signal-pulse-duration",
  "custom-signal-exclusive",
  "custom-signal-input-min",
  "custom-signal-input-max",
  "custom-signal-invert",
  "custom-signal-clamp",
  "custom-signal-zero-based",
  "custom-signal-per-item",
  "custom-signal-generation-preview",
  "custom-connection-mapping-list",
].forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));

[
  "function collectCustomSignalCreatorConfig(",
  "function renderCustomConnectionMappings(",
  "function customScopePartLabel(",
  "function editCustomConnectionMapping(",
  "function duplicateCustomConnectionMapping(",
  "function removeCustomConnectionMapping(",
  "customWorkbenchDraft.connections.push(mapping)",
  "composer-state-change",
  "durationScale=4-(ratio*3.8)",
].forEach((value) => assert.ok(javascript.includes(value), value));
assert.ok(html.includes("Press fires only when released before Held duration"));
assert.ok(javascript.includes('["standardStateText", "Standard-state text"'));
assert.ok(javascript.includes('["selectedStateText", "Selected-state text"'));
assert.ok(javascript.includes("textTarget.__composerStateText"));
assert.ok(javascript.includes("new MutationObserver(render)"));
assert.ok(javascript.includes("control.addEventListener('composer-state-change',render)"));
assert.ok(javascript.includes('group.label = "Component parts"'));
assert.ok(javascript.includes('group.label = "Advanced selectors"'));
assert.ok(javascript.includes("if (node && nodeOwners.has(node)) return"));
const connectionRenderer = javascript.slice(
  javascript.indexOf("function renderCustomConnectionMappings("),
  javascript.indexOf("function editCustomConnectionMapping("),
);
assert.ok(
  connectionRenderer.includes('[edit, duplicate, up, down, remove].forEach((button) => (button.type = "button"))'),
  "connection mapping actions must not submit and close the Workbench dialog",
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
  ],
});
assert.strictEqual(workbench.validate(definition).valid, true);
assert.deepStrictEqual(
  workbench.normalize(JSON.parse(JSON.stringify(definition))).connections,
  definition.connections,
);

console.log("component-workbench-connections.test.js passed");
