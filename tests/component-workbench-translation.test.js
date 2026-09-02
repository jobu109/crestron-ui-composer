const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// Normalize line endings: git's core.autocrlf can check this file out with
// CRLF on Windows, and the multi-line substring checks below are LF-only.
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8").replace(/\r\n/g, "\n");

assert.ok(editor.includes("function populateCustomWorkbenchFromTranslation"));
assert.ok(editor.includes("function customCanonicalTranslationSuggestion"));
assert.ok(editor.includes("translatedSuggestion: true"));
assert.ok(editor.includes('optional: true') && editor.includes('source: "import-and-translate"'));
assert.ok(editor.includes('customCanonicalTranslationSuggestion("property"'));
assert.ok(editor.includes('customCanonicalTranslationSuggestion("connection"'));
const suggestionDeduper = editor.slice(
  editor.indexOf("function dedupeCustomMappingSuggestions("),
  editor.indexOf("function populateCustomWorkbenchFromTranslation("),
);
assert.ok(suggestionDeduper.includes("frameDocument?.querySelector(target.selector)"));
assert.ok(suggestionDeduper.includes("binding.effect.kind"));
assert.ok(suggestionDeduper.includes("binding.effect.stateScope || \"all\""));
assert.ok(editor.includes("dedupeCustomMappingSuggestions(workbench.properties)"));
assert.ok(editor.includes("dedupeCustomMappingSuggestions(workbench.connections)"));
const effectiveSuggestions = editor.slice(
  editor.indexOf("function effectiveCustomMappingSuggestions("),
  editor.indexOf("function populateCustomWorkbenchFromTranslation("),
);
assert.ok(effectiveSuggestions.includes("mapping.suggestion?.selected === false"));
assert.ok(effectiveSuggestions.includes('binding.effect.kind === "unresolved"'));
assert.ok(effectiveSuggestions.includes("customAnalyzedElements.some"));
assert.ok(editor.includes("omittedSuggestionCount"));
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
assert.ok(handoff.includes('openCustomBuilder(null, null, "button", { deferInitialLoad: true });'));
assert.ok(!handoff.includes("openCustomBuilder();"), "translated imports must not initialize or preview the default button first");
assert.ok(handoff.includes("Component Workbench handoff failed"));
assert.ok(handoff.includes('$("translate-snippet-dialog").showModal()'));
assert.ok(handoff.includes("repairMissingTranslatedTargetMarkers();"), "translated targets should be repaired before the Workbench captures its source");
assert.ok(editor.includes("function repairMissingTranslatedTargetMarkers()"));
assert.ok(editor.includes('target.setAttribute("data-translated-button", String(index))'));
assert.ok(!handoff.includes('generatedLabel.textContent = "Toggle"'), "toggle imports must not invent a visible Toggle label");
assert.ok(!editor.includes('generatedLabel.setAttribute("data-translated-generic-label", "")'), "imports without authored text must not synthesize a generic label");
assert.ok(editor.includes("Preserve the authored structure exactly"), "translation should document its no-synthetic-parts contract");

console.log("component-workbench-translation.test.js passed");
