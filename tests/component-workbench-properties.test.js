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
const propertyRenderer = javascript.slice(
  javascript.indexOf("function renderCustomPropertyMappings("),
  javascript.indexOf("function editCustomPropertyMapping("),
);
assert.ok(
  propertyRenderer.includes('[edit, duplicate, up, down, remove].forEach((button) => (button.type = "button"))'),
  "property mapping actions must not submit and close the Workbench dialog",
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

console.log("component-workbench-properties.test.js passed");
