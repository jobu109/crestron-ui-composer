"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const editor = fs.readFileSync(path.resolve(__dirname, "..", "editor.js"), "utf8");
const editorHtml = fs.readFileSync(path.resolve(__dirname, "..", "editor.html"), "utf8");

assert.strictEqual(workbench.BINDING_VERSION, 1);

const definition = workbench.normalize({
  parts: [
    { id: "part-face", name: "Button face", selector: ".button-face", role: "button" },
    { id: "part-label", name: "Label", selector: ".button-label", role: "text" },
  ],
  properties: [
    {
      id: "property-face-color",
      key: "faceColor",
      label: "Standard color",
      type: "color",
      defaultValue: "#253436",
      stateScope: "standard",
      target: { kind: "cssProperty", partId: "part-face", selector: ".button-face", name: "background-color" },
    },
  ],
  connections: [
    {
      id: "connection-label",
      key: "label",
      label: "Label",
      type: "serial",
      direction: "input",
      action: "textContent",
      target: { kind: "textContent", partId: "part-label", selector: ".button-label" },
    },
  ],
});

assert.deepStrictEqual(definition.properties[0].binding, {
  version: 1,
  target: { partId: "part-face", selector: ".button-face", pseudoElement: "" },
  effect: { kind: "css-property", name: "background-color", stateScope: "standard", unit: "" },
});
assert.deepStrictEqual(definition.connections[0].binding, {
  version: 1,
  target: { partId: "part-label", selector: ".button-label", pseudoElement: "" },
  effect: { kind: "text-content", name: "", stateScope: "all", unit: "", capability: "textContent" },
});
assert.strictEqual(workbench.validate(definition).valid, true);

const pseudoBinding = workbench.normalizeBinding(null, {
  stateScope: "selected",
  target: { kind: "css-property", partId: "part-handle", selector: ".track:before", name: "background-color" },
});
assert.deepStrictEqual(pseudoBinding.target, {
  partId: "part-handle",
  selector: ".track",
  pseudoElement: "::before",
});
assert.strictEqual(pseudoBinding.effect.stateScope, "selected");
assert.strictEqual(
  workbench.scopeCssSelector(".track::before", "selected"),
  '.track.selected::before,.track.active::before,.track:checked::before,.track[aria-checked="true"]::before,input:checked + .track::before,.selected .track::before,.active .track::before,[aria-checked="true"] .track::before',
  "state qualifiers must be inserted before pseudo-elements",
);
assert.strictEqual(
  workbench.scopeCssSelector(".face", "standard"),
  '.face:not(.selected):not(.active):not(.composer-pressed):not(:checked):not(:disabled):not([aria-checked="true"]):not([data-state])',
);
const cssCapabilities = [
  ["glowColor", "#00e5c3", "drop-shadow"],
  ["glowStrength", 8, "--composer-scope-glow-strength:8px"],
  ["shadowSize", 6, "box-shadow"],
  ["shadowColor", "#000000", "--composer-shadow-color:#000000"],
  ["wrapText", true, "white-space:normal"],
  ["rotation", 45, "transform:rotate(45deg)"],
  ["positionX", 12, "left:12px"],
  ["positionY", 9, "top:9px"],
  ["asset", "image.png", 'background-image:url("image.png")'],
];
cssCapabilities.forEach(([capability, value, expected]) => {
  const kind = capability === "wrapText" ? "adapter-value" : "css-property",
    binding = { target: { selector: ".part" }, effect: { kind, capability, stateScope: "selected" } };
  assert.ok(workbench.bindingDeclaration(binding, value).includes(expected), capability);
});
assert.strictEqual(
  workbench.bindingCssText(
    { target: { selector: ".face", pseudoElement: "::before" }, effect: { kind: "css-property", name: "background-color", stateScope: "selected" } },
    "#ff0000",
  ).includes(".face.selected::before"),
  true,
);
const stateScopeMarkers = {
  all: ".face{",
  standard: ".face:not(.selected)",
  pressed: ".face.composer-pressed",
  selected: ".face.selected",
  disabled: ".face:disabled",
  night: '.face[data-state="night"]',
};
Object.entries(stateScopeMarkers).forEach(([stateScope, marker]) => {
  const css = workbench.bindingCssText(
    { target: { selector: ".face" }, effect: { kind: "css-property", name: "color", stateScope } },
    "#fff",
  );
  assert.ok(css.includes(marker), `state scope ${stateScope} must use the shared selector resolver`);
});

function fakeTarget() {
  const classes = new Set(), attributes = new Map();
  return {
    textContent: "",
    style: {},
    checked: false,
    classList: { toggle(name, active) { active ? classes.add(name) : classes.delete(name); } },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    matches() { return false; },
    querySelector() { return null; },
    classes,
    attributes,
  };
}
const target = fakeTarget(), fakeDocument = { nodeType: 9, querySelectorAll() { return [target]; } };
[
  [{ kind: "text-content" }, "Hello", () => assert.strictEqual(target.textContent, "Hello")],
  [{ kind: "attribute", name: "aria-label" }, "Label", () => assert.strictEqual(target.attributes.get("aria-label"), "Label")],
  [{ kind: "data-attribute", name: "mode" }, "2", () => assert.strictEqual(target.attributes.get("data-mode"), "2")],
  [{ kind: "dom-property", name: "value" }, 42, () => assert.strictEqual(target.value, 42)],
  [{ kind: "class-presence", name: "active" }, true, () => assert.ok(target.classes.has("active"))],
  [{ kind: "visibility" }, false, () => assert.strictEqual(target.style.display, "none")],
  [{ kind: "state-activation", name: "selected" }, true, () => assert.ok(target.classes.has("selected"))],
].forEach(([effect, value, verify]) => {
  const result = workbench.applyBinding(fakeDocument, { target: { selector: ".part" }, effect }, value);
  assert.strictEqual(result.applied, true);
  verify();
});
assert.strictEqual(
  workbench.mapBindingValue({ mapping: { inputMin: 0, inputMax: 65535, outputMin: 0, outputMax: 100, clamp: true } }, 32767.5),
  50,
);
assert.strictEqual(
  workbench.mapBindingValue({ mapping: { inputMin: 0, inputMax: 100, outputMin: 0, outputMax: 1, invert: true } }, 25),
  0.75,
);
assert.strictEqual(
  workbench.mapBindingValue({ mapping: { valueMap: { falseValue: "__preserve__", trueValue: "#ff0000" } } }, true),
  "#ff0000",
);
assert.strictEqual(
  workbench.mapBindingValue({ mapping: { valueMap: { falseValue: "__preserve__", trueValue: "#ff0000" } } }, false),
  "__preserve__",
);
assert.strictEqual(
  workbench.mapBindingValue({ mapping: { valueTable: [
    { input: 0, value: "red" }, { input: 1, value: "blue" }, { input: 2, value: "green" },
  ] } }, 1),
  "blue",
);
assert.strictEqual(
  workbench.mapBindingValue({ mapping: { valueTable: [
    { input: 0, value: "red" }, { input: 1, value: "blue" }, { input: 2, value: "green" },
  ] } }, 1.8),
  "green",
  "indexed analog mappings should resolve to the nearest configured value",
);
assert.strictEqual(
  workbench.normalizeBinding(null, { action: "mappedText", target: { selector: ".label" } }).effect.kind,
  "text-content",
);
assert.strictEqual(
  workbench.normalizeBinding(null, { action: "indexedVisibility", target: { selector: ".label" } }).effect.kind,
  "visibility",
);
let preserveRemoved = false;
const preserveResult = workbench.applyBinding(
  { nodeType: 9, getElementById(id) { return id === "choice-red" ? { remove() { preserveRemoved = true; } } : null; } },
  { target: { selector: ".track" }, effect: { kind: "css-property", name: "background-color" } },
  "__preserve__",
  { styleId: "choice-red" },
);
assert.strictEqual(preserveResult.mode, "preserve");
assert.strictEqual(preserveRemoved, true, "a false preserve value must remove only that connection's generated style");
for (const color of ["#ff0000", "#0066ff", "#00b050"]) {
  const colorEntry = workbench.withCanonicalBinding({
    action: "mappedProperty",
    target: { selector: ".track", parameter: "background-color" },
    mapping: { valueMap: { falseValue: "__preserve__", trueValue: color } },
  });
  assert.strictEqual(workbench.mapBindingValue(colorEntry, true), color);
  assert.strictEqual(workbench.mapBindingValue(colorEntry, false), "__preserve__");
  assert.ok(workbench.bindingDeclaration(colorEntry.binding, color).includes(`background-color:${color}`));
}
const glowEntry = workbench.withCanonicalBinding({
  action: "mappedProperty",
  target: { selector: ".track", parameter: "box-shadow" },
  mapping: { valueMap: { falseValue: "none", trueValue: "0 0 12px #00e5c3" } },
});
assert.strictEqual(workbench.mapBindingValue(glowEntry, false), "none");
assert.ok(workbench.bindingDeclaration(glowEntry.binding, workbench.mapBindingValue(glowEntry, true)).includes("0 0 12px #00e5c3"));
const mappedTextTarget = fakeTarget(), mappedTextDocument = { nodeType: 9, querySelectorAll() { return [mappedTextTarget]; } },
  mappedTextEntry = workbench.withCanonicalBinding({
    action: "mappedText",
    target: { selector: ".label" },
    mapping: { valueMap: { falseValue: "", trueValue: "Active" } },
  });
workbench.applyEntryBinding(mappedTextDocument, mappedTextEntry, true);
assert.strictEqual(mappedTextTarget.textContent, "Active");
workbench.applyEntryBinding(mappedTextDocument, mappedTextEntry, false);
assert.strictEqual(mappedTextTarget.textContent, "");
const selectedEntry = workbench.withCanonicalBinding({
  action: "selected",
  target: { selector: ".part" },
  mapping: null,
});
target.classes.delete("selected");
workbench.applyEntryBinding(fakeDocument, selectedEntry, true);
assert.ok(target.classes.has("selected"));
const checkboxEvents = [], checkboxTarget = {
  checked: false,
  attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  dispatchEvent(event) { checkboxEvents.push(event.type); return true; },
};
workbench.applyEntryBinding(
  { nodeType: 9, querySelectorAll() { return [checkboxTarget]; } },
  workbench.withCanonicalBinding({
    action: "checkedState",
    stateScope: "standard",
    target: { selector: "#toggle" },
  }),
  "true",
);
assert.strictEqual(checkboxTarget.checked, true, "checkedState must set the real native checkbox property");
assert.strictEqual(checkboxTarget.attributes["aria-checked"], "true");
assert.deepStrictEqual(checkboxEvents, ["input", "change"], "checkedState must notify authored input/change handlers");
assert.strictEqual(
  workbench.normalizeBinding(null, { action: "checkedState", stateScope: "standard", target: { selector: "#toggle" } }).effect.stateScope,
  "all",
  "native checkbox state must never be constrained to one visual state",
);
const installedExecutor = Function(`return ${workbench.bindingExecutorSource()}`)(),
  installedTarget = fakeTarget(),
  installedDocument = { nodeType: 9, querySelectorAll() { return [installedTarget]; } };
installedExecutor.applyEntryBinding(
  installedDocument,
  workbench.withCanonicalBinding({ action: "textContent", target: { selector: ".part" } }),
  "Installed parity",
);
assert.strictEqual(installedTarget.textContent, "Installed parity");
assert.strictEqual(
  installedExecutor.mapBindingValue(
    { mapping: { inputMin: 0, inputMax: 10, outputMin: 0, outputMax: 100 } },
    5,
  ),
  workbench.mapBindingValue(
    { mapping: { inputMin: 0, inputMax: 10, outputMin: 0, outputMax: 100 } },
    5,
  ),
  "installed adapter must serialize the same conversion behavior",
);

const authoredBinding = workbench.normalizeBinding(null, {
  target: { kind: "authored-token", partId: "part-face", selector: ".button-face" },
  authoredCss: { property: "border-color" },
});
assert.strictEqual(authoredBinding.effect.kind, "css-property");
assert.strictEqual(authoredBinding.effect.name, "border-color");

const migrated = workbench.migrate({
  elementRoles: [{ selector: ".button-label", role: "text", name: "Label" }],
  signals: [{ key: "label", name: "Label", type: "serial", direction: "input" }],
  behaviors: [{ source: "signal-input", key: "label", action: "textContent", selector: ".button-label" }],
});
assert.strictEqual(migrated.connections[0].binding.effect.kind, "text-content");
assert.strictEqual(migrated.connections[0].legacy.name, "Label");

const roundTrip = workbench.normalize(JSON.parse(JSON.stringify(definition)));
assert.deepStrictEqual(roundTrip.properties, definition.properties);
assert.deepStrictEqual(roundTrip.connections, definition.connections);
assert.ok(
  editor.includes("ComposerComponentWorkbench.withCanonicalBinding(mapping)"),
  "new and edited Workbench mappings must receive the canonical binding at insertion time",
);
assert.ok(
  !editorHtml.includes("data-custom-capability-bundle") &&
    !editorHtml.includes("custom-apply-safe-recommendations"),
  "source-first creation must not expose mixed property/connection capability bundles",
);
const roleMappingBuilder = editor.slice(
  editor.indexOf("function applyCustomElementRole("),
  editor.indexOf("function addCustomBehaviorPreset("),
);
assert.ok(
  roleMappingBuilder.includes("canonicalMappings = []") &&
    roleMappingBuilder.includes("recordCanonicalMapping(registerCustomWorkbenchPropertyCapability") &&
    roleMappingBuilder.includes("recordCanonicalMapping(registerCustomWorkbenchConnectionCapability") &&
    roleMappingBuilder.includes('Object.defineProperty(added, "canonicalMappings"'),
  "role presets must expose the exact canonical property and connection mappings they created",
);
assert.ok(
  editor.includes("ComposerComponentWorkbench.applyEntryBinding") &&
    editor.includes("custom-signal-preview-${mapping.id || mapping.key}"),
  "Step 3 Crestron input simulation must execute the same canonical binding before exercising the signal adapter",
);
assert.ok(
  editor.includes("ComposerComponentWorkbench.bindingExecutorSource()") &&
    editor.includes("executor.applyEntryBinding(document,entry,value,options)"),
  "installed signal-input adapters must embed and call the shared binding executor",
);
assert.ok(!editorHtml.includes("Serial input for Name / label"));
assert.ok(!editorHtml.includes("Serial Name input"));
assert.ok(editorHtml.includes("Serial input for Label"));
assert.ok(editorHtml.includes("Serial Label input"));
assert.ok(
  editor.includes("function customCanonicalBinding(mapping = {})") &&
    editor.includes("customCanonicalBindingSelector(editingMapping)"),
  "temporary property preview must resolve the canonical binding target",
);
const adapterRenderer = editor.slice(
  editor.indexOf("function customAdapterBlocks()"),
  editor.indexOf("function customGeneratedAdapter()"),
);
assert.ok(
  adapterRenderer.includes("const binding = customCanonicalBinding(mapping)") &&
    adapterRenderer.includes("binding.effect.stateScope") &&
    adapterRenderer.includes("binding.effect.name") &&
    adapterRenderer.includes("binding.effect.event"),
  "installed adapter generation must resolve target, effect, state, parameter, and event from the canonical binding",
);

console.log("component-workbench-bindings.test.js passed");
