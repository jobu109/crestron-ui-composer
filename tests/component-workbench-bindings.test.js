"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const editor = fs.readFileSync(path.resolve(__dirname, "..", "editor.js"), "utf8");

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
  effect: { kind: "text-content", name: "", stateScope: "all", unit: "" },
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

console.log("component-workbench-bindings.test.js passed");
