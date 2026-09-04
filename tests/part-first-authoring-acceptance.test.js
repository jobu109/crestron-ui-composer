"use strict";

const assert = require("node:assert/strict");
const workbench = require("../component-workbench.js");

const html = '<label class="switch"><input id="toggle" type="checkbox"><span class="track"></span><span class="label">Off</span></label>';
const css = '.track{background-color:#4a4f5c;border-radius:8px}input:checked + .track{background-color:#14b8a6}.label{color:#fff}';
const draft = workbench.empty();
draft.parts.push(
  { id: "part-toggle", name: "Toggle control", selector: "#toggle", role: "toggle" },
  { id: "part-track", name: "Track", selector: ".track", role: "track" },
  { id: "part-label", name: "Label", selector: ".label", role: "label" },
);

const capabilities = workbench.materializePartCapabilities(draft, { html, css });
const radius = capabilities.find((entry) => entry.part.partId === "part-track" && entry.capability === "cornerRadius");
const standardColor = capabilities.find((entry) => entry.part.partId === "part-track" && entry.capability === "backgroundColor" && entry.binding.effect.stateScope === "standard");
const selectedColor = capabilities.find((entry) => entry.part.partId === "part-track" && entry.capability === "backgroundColor" && entry.binding.effect.stateScope === "selected");
const selected = capabilities.find((entry) => entry.part.partId === "part-toggle" && entry.capability === "selected");
const text = capabilities.find((entry) => entry.part.partId === "part-label" && entry.capability === "text");
assert.ok(radius && standardColor && selectedColor && selected && text, "the source must provide part-aware standard, selected, text, numeric, and native-state capabilities");

radius.selected = standardColor.selected = selectedColor.selected = text.selected = true;
draft.partCapabilities = capabilities;
draft.properties.push(workbench.withCanonicalBinding({
  id: "property-track-color",
  key: "trackColor",
  type: "color",
  defaultValue: "#4a4f5c",
  target: { kind: "authored-token", partId: "part-track", selector: ".track", name: "{{trackColor}}" },
  authoredCss: { selector: ".track", property: "background-color", originalValue: "#4a4f5c" },
  binding: standardColor.binding,
}));
draft.connections.push(
  workbench.withCanonicalBinding({
    id: "connection-selected",
    key: "selected",
    type: "digital",
    direction: "input",
    target: { kind: "dom-property", partId: "part-toggle", selector: "#toggle", name: "checked" },
    binding: selected.binding,
  }),
  workbench.withCanonicalBinding({
    id: "connection-radius",
    key: "trackRadius",
    type: "analog",
    direction: "input",
    target: { kind: "css-property", partId: "part-track", selector: ".track", parameter: "border-radius" },
    mapping: { inputMin: 0, inputMax: 65535, outputMin: 0, outputMax: 20, unit: "px", clamp: true },
    binding: radius.binding,
  }),
  workbench.withCanonicalBinding({
    id: "connection-label",
    key: "label",
    type: "serial",
    direction: "input",
    target: { kind: "adapter-value", partId: "part-label", selector: ".label", name: "text" },
    binding: text.binding,
  }),
);

const reopened = workbench.normalize(JSON.parse(JSON.stringify(draft)));
assert.equal(reopened.partCapabilities.filter((entry) => entry.selected).length, 4, "selected source capabilities must survive reopen/export JSON");
assert.equal(reopened.connections.length, 3, "Digital, Analog, and Serial connections must survive reopen/export JSON");
assert.ok(workbench.bindingDeclaration(reopened.connections[1].binding, workbench.mapBindingValue(reopened.connections[1], 32767.5)).includes("border-radius:10px"));
assert.ok(workbench.bindingCssText(selectedColor.binding, "#14b8a6").includes("input:checked + .track"), "selected-only Inspector properties must use the authored selected selector");

const tokenized = workbench.materializePartCapabilities(reopened, {
  html,
  css: '.track{background-color:{{trackColor}};border-radius:8px}input:checked + .track{background-color:#14b8a6}.label{color:#fff}',
});
assert.ok(tokenized.some((entry) => entry.id === standardColor.id && entry.selected), "source refresh must preserve accepted capability selection after tokenization");

const events = [], checkbox = { checked: false, setAttribute() {}, dispatchEvent(event) { events.push(event.type); } };
workbench.applyEntryBinding({ nodeType: 9, querySelectorAll() { return [checkbox]; } }, reopened.connections[0], true);
assert.equal(checkbox.checked, true);
assert.deepEqual(events, ["input", "change"]);
const label = { textContent: "", style: {}, classList: { toggle() {} }, setAttribute() {}, matches() { return false; }, querySelector() { return null; } };
workbench.applyEntryBinding({ nodeType: 9, querySelectorAll() { return [label]; } }, reopened.connections[2], "Paired");
assert.equal(label.textContent, "Paired", "Serial input must execute through the canonical binding runtime");

console.log("part-first-authoring-acceptance.test.js passed");
