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

// UX plan Phase 1: the Component Map must be a persistent panel beside
// Live Preview, not a collapsed <details> buried under Advanced ->
// Technical mappings. Assert both the removal of the old location and the
// presence of the new one, so a future edit can't silently reintroduce
// the buried layout.
assert.doesNotMatch(
  editorHtml,
  /<details class="custom-workbench-parts"/,
  "the Component Map must not live inside a collapsed <details> under Technical mappings anymore",
);
assert.match(
  editorHtml,
  /<section class="custom-workbench-map-pane"[^>]*>[\s\S]*?id="custom-part-list"/,
  "the Component Map must render inside its own persistent pane",
);
assert.match(
  editorHtml,
  /custom-test-workspace">\s*<section class="custom-workbench-map-pane"/,
  "the Component Map pane must be a direct sibling of the preview pane, i.e. genuinely beside Live Preview",
);

// Bidirectional hover highlighting and persistent selection (also Phase 1).
assert.match(editorJs, /function findCustomWorkbenchPartForElement\(/);
assert.match(editorJs, /function buildCustomWorkbenchPartTree\(/);
assert.match(editorJs, /function highlightCustomWorkbenchPartTransient\(/);
assert.match(editorJs, /function wireCustomWorkbenchHoverSync\(/);
assert.match(editorJs, /function selectCustomWorkbenchPart\(/);
assert.match(editorJs, /wireCustomWorkbenchHoverSync\(\);/);

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
