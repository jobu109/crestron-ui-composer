"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");
const javascript = fs.readFileSync(path.join(root, "editor.js"), "utf8");
assert.ok(javascript.includes("mappedPropertyKeys"), "Workbench-managed properties should count as source-backed properties during validation");
assert.ok(javascript.includes("definition.stateMode"), "state-specific text sizes should react to their related selected control");
assert.ok(javascript.includes('value: "standardText"'), "Workbench should offer editable Standard / Idle text content");
assert.ok(javascript.includes('value: "selectedText"'), "Workbench should offer editable Selected text content");
assert.ok(javascript.includes('definition.javascript === "stateText"'), "state text properties should generate safe state-aware runtime behavior");
assert.ok(javascript.includes("function customSafeTextTargetRuntime"), "text properties should preserve structural toggle children");
assert.ok(javascript.includes("data-composer-property-text"), "Workbench should create a dedicated text target instead of replacing a toggle container");
[
  '"Track"',
  '"Handle / knob"',
  '"Toggle control"',
  '"Toggle container"',
  '"Slider control"',
  '"Text input"',
  '"Label / text"',
  '"Value / percentage"',
  '"Icon / graphic"',
  '"Status / selected indicator"',
  '"Gauge / meter"',
  '"Button"',
  '"Item / card"',
  '"Items / list container"',
  '"Background"',
  '"Overlay / mask"',
  '"Container / surface"',
].forEach((semanticLabel) => assert.ok(
  javascript.includes(semanticLabel),
  `Workbench target choices should expose the semantic label ${semanticLabel}`,
));
assert.ok(
  javascript.includes("Composer will create a separate Label for this text; it will not replace the toggle Track or Handle."),
  "text capabilities aimed at a toggle should explain that Composer preserves its structure",
);
const propertyCreator = javascript.slice(
  javascript.indexOf("function createScopedCustomProperty()"),
  javascript.indexOf("function createScopedCustomSignal()"),
);
assert.ok(propertyCreator.includes('$("custom-property-create").dataset.editingKey = ""'), "a saved property should leave edit mode so the next property is added");
assert.ok(propertyCreator.includes('$("custom-property-creator").hidden = true'), "the property creator should close after saving, matching Crestron connections");

[
  "custom-property-value-type",
  "custom-property-target-name",
  "custom-property-additional-targets",
  "custom-property-generation-preview",
  "custom-property-mapping-list",
].forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));

[
  "cssProperty",
  "cssVariable",
  "attribute",
  "domProperty",
  "classPresence",
  "dataAttribute",
  "foregroundAsset",
  "visibility",
].forEach((kind) => assert.match(javascript, new RegExp(`value: "${kind}"`)));

assert.match(javascript, /function renderCustomPropertyMappings\(/);
assert.match(javascript, /function editCustomPropertyMapping\(/);
assert.match(javascript, /function duplicateCustomPropertyMapping\(/);
assert.match(javascript, /function removeCustomPropertyMapping\(/);
assert.match(javascript, /COMPOSER MANAGED/);
assert.ok(
  workbench.scopeCssSelector(".track", "selected").includes("input:checked + .track"),
  "Selected-only properties must support checkbox sibling tracks",
);
assert.ok(
  javascript.includes('style.textContent = `${scopedSelector} { ${declaration.split(";")'),
  "temporary property previews must override authored component CSS",
);
assert.ok(
  javascript.includes('(frameDocument.body || frameDocument.documentElement).appendChild(style)'),
  "temporary property previews must be placed after imported body styles",
);
assert.ok(
  javascript.includes('editingMapping?.authoredCss?.selector ||') && javascript.includes('selectedPart?.selector ||'),
  "temporary previews must prefer the same saved authored selector used by Apply before a friendly Component Map selector",
);
assert.ok(
  javascript.includes("function customTemporaryPropertyDeclaration") &&
    javascript.includes("ComposerComponentWorkbench.bindingDeclaration") &&
    workbench.bindingDeclaration({ target: { selector: ".face" }, effect: { kind: "css-property", capability: "glowColor" } }, "#00e5c3").includes("drop-shadow") &&
    workbench.bindingDeclaration({ target: { selector: ".face" }, effect: { kind: "css-property", capability: "shadowSize" } }, 6).includes("box-shadow") &&
    workbench.bindingDeclaration({ target: { selector: ".label" }, effect: { kind: "adapter-value", capability: "wrapText" } }, true).includes("white-space:normal"),
  "all visual property families must use the shared state-scoped temporary preview path",
);
assert.ok(
  javascript.includes('exactAuthoredPart') && javascript.includes('ownerCandidates') && javascript.includes('allParts.find(matchesMeaning)'),
  "editing a pseudo-element property must restore its exact authored Component Map part",
);
assert.ok(
  javascript.includes('$("custom-property-target").dataset.preferPartId = editorPartId') &&
    javascript.includes('customWorkbenchSelectedPartId = editorPartId'),
  "the resolved semantic part must remain selected through the final Edit-form refresh",
);
assert.ok(
  javascript.includes('withPseudo(`${owner}:not(.selected):not(.active):not([aria-checked="true"])`)'),
  "Standard-only temporary previews must not leak into Selected state",
);
assert.ok(
  javascript.includes('pseudoMatch = base.match(/(::?(?:before|after))') &&
    javascript.includes('withPseudo(`${owner}.selected`)'),
  "state qualifiers must be inserted before pseudo-elements so scoped preview rules remain valid CSS",
);
assert.ok(
  javascript.includes("function customAuthoredCssSelectorForState"),
  "state changes must preserve authored pseudo-element selectors in Live Preview",
);
assert.ok(
  javascript.includes("stableCustomSelectorForAuthoredRule(part.selector) === stableSelector"),
  "property editing must distinguish semantic Track and Knob parts that share a visible owner",
);
assert.ok(
  javascript.includes('defaultField.value = String(value)'),
  "the tested property value must become the value saved with the property mapping",
);
assert.ok(
  javascript.includes('customTemporaryPropertyValues.set(editingMapping.key') &&
    javascript.includes('stateScope: normalizedScope') &&
    javascript.includes('refreshCustomPreview({ refreshSimulator: false })'),
  "editing an existing property must preview through a state-scoped temporary value without contaminating Simulator state",
);
assert.ok(
  javascript.includes('customTemporaryPropertyValues.get(property.key).stateScope === "all"') &&
    javascript.includes("customAuthoredCssSelectorForState(editingMapping, unscopedSelector, normalizedScope)"),
  "state-scoped temporary values must use guarded CSS instead of globally replacing authored tokens",
);
assert.ok(
  javascript.includes('if ($("custom-property-creator")?.hidden && $("custom-signal-creator")?.hidden)') &&
    javascript.includes('setTimeout(refreshCustomWorkbenchForActiveState, 80)'),
  "switching preview states must not rebuild Component Map while a property editor is open",
);
assert.ok(
  javascript.includes("let customPropertyEditSession = null") &&
    javascript.includes("function captureCustomPropertyEditSession()") &&
    javascript.includes("function restoreCustomPropertyEditSession("),
  "an open property edit must have durable state independent from the preview toolbar",
);
const previewStateSwitcher = javascript.slice(
  javascript.indexOf("function setCustomWorkbenchActiveState("),
  javascript.indexOf("function preferredCustomStatePart("),
);
assert.ok(
  previewStateSwitcher.includes("captureCustomPropertyEditSession()") &&
    previewStateSwitcher.includes("restoreCustomPropertyEditSession(") &&
    !previewStateSwitcher.includes("refreshCustomPreview({ refreshSimulator: false })"),
  "switching Standard, Pressed, or Selected must preserve the open mapping without rebuilding its editor",
);
assert.ok(
  javascript.includes("selectedPartId: selected?.dataset.partId || customWorkbenchSelectedPartId") &&
    javascript.includes("session.targetPartId || session.selectedPartId"),
  "the edited property's exact target must outrank a transient Component Map selection",
);
const propertyRenderer = javascript.slice(
  javascript.indexOf("function renderCustomPropertyMappings("),
  javascript.indexOf("function editCustomPropertyMapping("),
);
assert.ok(
  propertyRenderer.includes('[edit, duplicate, up, down, remove].forEach((button) => (button.type = "button"))'),
  "property mapping actions must not submit and close the Workbench dialog",
);

const propertyDefinitionRow = javascript.slice(
  javascript.indexOf("function addCustomPropertyRow("),
  javascript.indexOf("function addCustomSignalRow("),
);
const propertyCollector = javascript.slice(
  javascript.indexOf("function collectCustomProperties("),
  javascript.indexOf("function collectCustomSignals("),
);
assert.ok(
  propertyDefinitionRow.includes('row.dataset.mappingId = property.id || ""'),
  "each visible Inspector definition row must retain the id of its complete Workbench mapping",
);
assert.ok(
  propertyCollector.includes("savedMapping = customWorkbenchDraft?.properties?.find") &&
    propertyCollector.includes("...(savedMapping ? structuredClone(savedMapping) : {})"),
  "collecting visible property definitions must preserve selector, part, state, and authored-CSS metadata",
);
assert.ok(
  propertyCreator.includes('definitionRow.dataset.mappingId = mapping.id || ""'),
  "Apply must bind a newly created or updated definition row back to the mapping it saved",
);

const signalDefinitionRow = javascript.slice(
  javascript.indexOf("function addCustomSignalRow("),
  javascript.indexOf("function collectCustomProperties("),
);
const signalCollector = javascript.slice(
  javascript.indexOf("function collectCustomSignals("),
  javascript.indexOf("function normalizeCustomKey("),
);
const signalCreator = javascript.slice(
  javascript.indexOf("function createScopedCustomSignal("),
  javascript.indexOf("function uniqueCustomBehaviorKey("),
);
assert.ok(
  signalDefinitionRow.includes('row.dataset.mappingId = signal.id || ""'),
  "each visible signal row must retain the id of its complete Workbench connection",
);
assert.ok(
  signalCollector.includes("savedMapping = customWorkbenchDraft?.connections?.find") &&
    signalCollector.includes("...(savedMapping ? structuredClone(savedMapping) : {})"),
  "collecting visible signal definitions must preserve target, action, state, and range metadata",
);
assert.ok(
  signalCreator.includes('definitionRow.dataset.mappingId = mapping.id || ""'),
  "Apply must bind a newly created or updated signal row back to the connection it saved",
);

const definition = workbench.normalize({
  parts: [
    { id: "part-track", name: "Track", selector: ".track", role: "toggle", multiple: false },
    { id: "part-knob", name: "Knob", selector: ".knob", role: "element", multiple: false },
  ],
  properties: [{
    id: "property-accent",
    key: "accentColor",
    label: "Accent color",
    type: "color",
    defaultValue: "#04dcb9",
    target: { kind: "css-custom-property", partId: "part-track", selector: ".track", name: "--accent" },
    targets: [
      { kind: "css-custom-property", partId: "part-track", selector: ".track", name: "--accent" },
      { kind: "css-property", partId: "part-knob", selector: ".knob", name: "border-color" },
    ],
  }],
});
assert.strictEqual(workbench.validate(definition).valid, true);
const roundTrip = workbench.normalize(JSON.parse(JSON.stringify(definition)));
assert.deepStrictEqual(roundTrip.properties, definition.properties);

const importedToggleCss = `
.slider { background-color: {{trackColor}}; }
.slider::before { background-color: {{knobColor}}; }
input:checked + .slider { background-color: {{selectedTrackColor}}; }
input:checked + .slider::before { transform: translateX(28px); }
`;
const authored = (key, selector, syntheticDeclaration = false) => ({
  id: `property-${key}`,
  key,
  type: "color",
  defaultValue: "#000000",
  stateScope: key.startsWith("selected") ? "selected" : "standard",
  target: { kind: "authored-token", selector: selector.replace(/::before$/, "") },
  authoredCss: { selector, property: "background-color", syntheticDeclaration },
});
let toggleCss = importedToggleCss;
[
  authored("trackColor", ".slider"),
  authored("knobColor", ".slider::before"),
  authored("selectedTrackColor", "input:checked + .slider"),
  authored("selectedKnobColor", "input:checked + .slider::before", true),
].forEach((mapping) => {
  const result = workbench.materializeAuthoredCssMapping(toggleCss, mapping);
  assert.ok(result.matched, `${mapping.key} must own an exact authored selector`);
  toggleCss = result.css;
});
assert.match(toggleCss, /\.slider\s*\{[^}]*\{\{trackColor\}\}/s);
assert.match(toggleCss, /\.slider::before\s*\{[^}]*\{\{knobColor\}\}/s);
assert.match(toggleCss, /input:checked \+ \.slider\s*\{[^}]*\{\{selectedTrackColor\}\}/s);
assert.match(toggleCss, /input:checked \+ \.slider::before\s*\{[^}]*\{\{selectedKnobColor\}\}/s);
assert.strictEqual((toggleCss.match(/\{\{trackColor\}\}/g) || []).length, 1, "Standard track token must not leak into selected track");
assert.strictEqual((toggleCss.match(/\{\{knobColor\}\}/g) || []).length, 1, "Standard knob token must not leak into selected knob");

console.log("component-workbench-properties.test.js passed");
