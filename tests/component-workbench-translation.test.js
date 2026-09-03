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
assert.ok(effectiveSuggestions.includes("Never silently discard an explicit selection"));
assert.ok(!effectiveSuggestions.includes('binding.effect.kind === "unresolved"'), "selected translator connections must not be dropped merely because ordinary behavior inference did not own them");
assert.ok(editor.includes("omittedSuggestionCount"));
assert.ok(editor.includes('preserveLocalBehavior: true'));
assert.ok(editor.includes('source: "import-and-translate"'));
assert.ok(editor.includes("uncheckedSuggestionsRemoved: true"));
assert.ok(editor.includes("populateCustomWorkbenchFromTranslation({"));
assert.ok(editor.includes("properties: collectCustomProperties()"));
assert.ok(editor.includes("signals: collectCustomSignals()"));
assert.ok(editor.includes("behaviors: collectCustomBehaviors()"));
assert.ok(editor.includes("repeatedItems: collectCustomRepeatedItems()"));
assert.ok(editor.includes("detected,"));
const translatedConnections = editor.slice(
  editor.indexOf("workbench.connections = signalDefinitions.map"),
  editor.indexOf("const detectedSuggestionCount"),
);
assert.ok(translatedConnections.includes('/^stateText\\d+$/'));
assert.ok(translatedConnections.includes('["state", "stateFeedback"].includes(signal.key)'));
assert.ok(translatedConnections.includes('"authoredRuntime"'));
assert.ok(translatedConnections.includes('kind: authoredRuntime ? "authored-runtime" : action'));
assert.ok(editor.includes('(["selected", "name"].includes(key) && detected.stateFamily)'), "a multi-state translation must not retain the preset's redundant generic Label signal");
assert.ok(editor.includes('detected.stateFamily && entry.key === "name" && entry.action === "text"'), "inference must not add the same redundant generic Label signal back");

const handoff = editor.slice(
  editor.indexOf('$("translate-continue").onclick'),
  editor.indexOf('$("component-search").oninput'),
);
assert.ok(handoff.includes("repairMissingTranslatedTargetMarkers();\n    analyzeCustomElements();\n    populateCustomWorkbenchFromTranslation"));
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
const recommendations = editor.slice(
  editor.indexOf("function renderCustomCapabilityRecommendations("),
  editor.indexOf("function applySelectedSafeCustomRecommendations("),
);
assert.ok(recommendations.includes("customWorkbenchDraft?.authoredSource?.translated"), "translated choices must not be replaced by a second inferred recommendation screen");
assert.ok(recommendations.includes('host.innerHTML = ""'), "stale recommendation cards must be removed for translated handoffs");
assert.ok(!handoff.includes('generatedLabel.textContent = "Toggle"'), "toggle imports must not invent a visible Toggle label");
assert.ok(!editor.includes('generatedLabel.setAttribute("data-translated-generic-label", "")'), "imports without authored text must not synthesize a generic label");
assert.ok(editor.includes("Preserve the authored structure exactly"), "translation should document its no-synthetic-parts contract");

console.log("component-workbench-translation.test.js passed");
