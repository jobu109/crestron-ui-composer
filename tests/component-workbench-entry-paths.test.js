const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// Normalize line endings: this file's assertions embed literal "\n" to
// match specific multi-line source snippets, and a CRLF checkout of
// editor.js/editor.html would otherwise make every one of those .includes()
// checks fail even though the actual source content is unchanged.
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8").replace(/\r\n/g, "\n");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8").replace(/\r\n/g, "\n");

for (const key of ["button", "toggle", "slider", "gauge", "text", "repeated", "blank"]) {
  assert.ok(html.includes(`data-creator-template="${key}"`), `${key} creator entry is missing`);
  assert.ok(new RegExp(`\\n\\s{4}${key}: \\{`).test(editor), `${key} starter template is missing`);
}

assert.ok(editor.includes("function populateCustomWorkbenchFromStarterTemplate"));
assert.ok(editor.includes("populateCustomWorkbenchFromStarterTemplate(template, key)"));
assert.ok(editor.includes("refreshCustomPreview({ refreshSimulator: false });"), "Step 2 must rebuild its preview from the current Workbench source");
assert.ok(editor.includes('kind: "authored-token"'));
assert.ok(editor.includes('kind: "authored-runtime"'));
assert.ok(editor.includes('starterTemplate: templateKey'));
assert.ok(editor.includes('repeatedCollections: template.repeatedItems ? [structuredClone(template.repeatedItems)] : []'));
assert.ok(editor.includes('openCustomBuilder(null, null, button.dataset.creatorTemplate)'));
assert.ok(editor.includes('openCustomBuilder(null, null, "button", { deferInitialLoad: true })'));
assert.ok(editor.includes('if (!deferInitialLoad) {\n      loadCustomOriginalSource(entry);'));
assert.ok(editor.includes('setCustomWizardStep(0, { refreshPreview: !deferInitialLoad })'));
for (const page of ["properties", "connections", "states", "repeated", "advanced"])
  assert.ok(html.includes(`data-custom-capability-page="${page}"`), `${page} capability page is missing`);
assert.ok(!html.includes('data-custom-capability-page="code"'));
assert.ok(html.includes('class="custom-source-code custom-step-capabilities custom-step-authored" data-capability-panel="advanced"'));
assert.ok(editor.includes("function setCustomCapabilityPage"));
assert.ok(editor.includes('setCustomCapabilityPage(customWizardStep === 1 ? "properties" : "connections")'));
assert.ok(html.includes("custom-step-authored"));
assert.ok(html.includes("custom-step-authored-preview"));
assert.ok(html.includes("custom-imported-mappings"));
const stepSwitcher = editor.slice(
  editor.indexOf("function setCustomWizardStep"),
  editor.indexOf("function setCustomCapabilityPage"),
);
for (const [step, label] of [[0, "Source &amp; preview"], [1, "Editable properties"], [2, "Crestron connections"], [3, "Test &amp; create"]])
  assert.ok(html.includes(`data-custom-wizard-step="${step}"><strong>${step + 1}</strong><span>${label}</span>`));
assert.ok(stepSwitcher.includes('if (customWizardStep === 0)'));
assert.ok(stepSwitcher.includes('Math.min(3, Number(step) || 0)'));
assert.ok(stepSwitcher.includes('customWizardStep === 1 ? "properties" : "connections"'));
assert.ok(stepSwitcher.includes('switchCustomSourceTab("html")'));
assert.ok(stepSwitcher.includes("refreshCustomPreview()"));
assert.ok(
  stepSwitcher.indexOf('if (customWizardStep === 0)') < stepSwitcher.indexOf('if (customWizardStep === 1 || customWizardStep === 2) analyzeCustomElements()'),
  "authored source must render before Step 2 analyzes or presents mappings",
);

const packageHandler = editor.slice(
  editor.indexOf('$("custom-package-file").onchange'),
  editor.indexOf('$("component-library-file").onchange'),
);
assert.ok(packageHandler.includes("openCustomBuilder(null, entry)"));

const pickerHandler = editor.slice(
  editor.indexOf('if (event.data?.type === "composer-element-picked")'),
  editor.indexOf("function exportCustomComponentEntry"),
);
assert.ok(pickerHandler.includes("addPickedCustomWorkbenchPart"));
assert.ok(pickerHandler.includes("focusPickedCustomWorkbenchPart(pickedPart)"));
const pickedPartHelper = editor.slice(
  editor.indexOf("function addPickedCustomWorkbenchPart"),
  editor.indexOf("function focusPickedCustomWorkbenchPart"),
);
assert.ok(pickedPartHelper.includes("selectCustomWorkbenchPart(existing.id)"));
assert.ok(pickedPartHelper.includes("selectCustomWorkbenchPart(part.id)"));
const propertyCreator = editor.slice(
  editor.indexOf("function createScopedCustomProperty"),
  editor.indexOf("function createScopedCustomSignal"),
);
assert.ok(propertyCreator.includes("targetOption?.dataset.partId"));
assert.ok(propertyCreator.includes("ComposerComponentWorkbench.withCanonicalBinding(mapping)"));

const renderProperties = editor.slice(
  editor.indexOf("function renderCustomPropertyMappings"),
  editor.indexOf("function editCustomPropertyMapping"),
);
const renderConnections = editor.slice(
  editor.indexOf("function renderCustomConnectionMappings"),
  editor.indexOf("function editCustomConnectionMapping"),
);
assert.ok(!renderProperties.includes('legacy-adapter-rules"\)'));
assert.ok(!renderConnections.includes('legacy-adapter-rules"\)'));

console.log("component-workbench-entry-paths.test.js passed");
