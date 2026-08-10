const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");

assert.ok(editor.includes("function populateCustomWorkbenchFromTranslation"));
assert.ok(editor.includes("translatedSuggestion: true"));
assert.ok(editor.includes('preserveLocalBehavior: true'));
assert.ok(editor.includes('source: "import-and-translate"'));
assert.ok(editor.includes("uncheckedSuggestionsRemoved: true"));
assert.ok(editor.includes("populateCustomWorkbenchFromTranslation({"));
assert.ok(editor.includes("properties: collectCustomProperties()"));
assert.ok(editor.includes("signals: collectCustomSignals()"));
assert.ok(editor.includes("behaviors: collectCustomBehaviors()"));
assert.ok(editor.includes("repeatedItems: collectCustomRepeatedItems()"));

const handoff = editor.slice(
  editor.indexOf('$("translate-continue").onclick'),
  editor.indexOf('$("component-search").oninput'),
);
assert.ok(handoff.includes("analyzeCustomElements();\n    populateCustomWorkbenchFromTranslation"));
assert.ok(handoff.includes("captureCustomOriginalSource();"));
assert.ok(handoff.includes('continueButton.textContent = "Opening Component Workbench…"'));
assert.ok(handoff.includes("setTimeout(() => {"));
assert.ok(handoff.includes("openCustomBuilder();"));
assert.ok(handoff.includes("Component Workbench handoff failed"));
assert.ok(handoff.includes('$("translate-snippet-dialog").showModal()'));
assert.ok(handoff.includes("repairMissingTranslatedTargetMarkers();"), "translated targets should be repaired before the Workbench captures its source");
assert.ok(editor.includes("function repairMissingTranslatedTargetMarkers()"));
assert.ok(editor.includes('target.setAttribute("data-translated-button", String(index))'));
assert.ok(!handoff.includes('generatedLabel.textContent = "Toggle"'), "toggle imports must not invent a visible Toggle label");

console.log("component-workbench-translation.test.js passed");
