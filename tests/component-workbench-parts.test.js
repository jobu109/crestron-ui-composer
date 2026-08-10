"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const workbench = require("../component-workbench.js");

const root = path.resolve(__dirname, "..");
const editorHtml = fs.readFileSync(path.join(root, "editor.html"), "utf8");
const editorJs = fs.readFileSync(path.join(root, "editor.js"), "utf8");

assert.match(editorHtml, /id="custom-part-list"/);
assert.match(editorHtml, /id="custom-part-picker"/);
assert.match(editorHtml, /id="custom-part-rescan"/);
assert.match(editorJs, /function renderCustomWorkbenchParts\(/);
assert.match(editorJs, /function addPickedCustomWorkbenchPart\(/);
assert.match(editorJs, /workbench: window\.ComposerComponentWorkbench\.normalize\(customWorkbenchDraft\)/);

const definition = workbench.normalize({
  schemaVersion: 1,
  parts: [{
    id: "part-track",
    name: "Toggle track",
    selector: ".toggle-track",
    role: "toggle",
    multiple: false,
    metadata: {
      tag: "div",
      className: "toggle-track",
      attributes: { role: "switch", "aria-label": "Power" },
      computed: { width: "120px", height: "54px", backgroundColor: "rgb(37, 52, 54)" },
    },
  }],
});
const roundTrip = workbench.normalize(JSON.parse(JSON.stringify(definition)));
assert.deepStrictEqual(roundTrip.parts, definition.parts);
assert.strictEqual(workbench.validate(roundTrip).valid, true);

const broken = workbench.normalize(definition);
broken.properties.push({
  id: "property-orphan",
  key: "orphan",
  label: "Orphan",
  target: { kind: "css-property", partId: "missing-part" },
});
assert.match(workbench.validate(broken).errors.join("\n"), /missing part/);

console.log("component-workbench-parts.test.js passed");
