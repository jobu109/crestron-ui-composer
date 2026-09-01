const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");

for (const key of ["button", "toggle", "slider", "gauge", "text", "repeated", "blank"]) {
  assert.ok(html.includes(`data-creator-template="${key}"`), `${key} creator entry is missing`);
  assert.ok(new RegExp(`\\n\\s{4}${key}: \\{`).test(editor), `${key} starter template is missing`);
}

assert.ok(editor.includes("function populateCustomWorkbenchFromStarterTemplate"));
assert.ok(editor.includes("populateCustomWorkbenchFromStarterTemplate(template, key)"));
assert.ok(editor.includes('kind: "authored-token"'));
assert.ok(editor.includes('kind: "authored-runtime"'));
assert.ok(editor.includes('starterTemplate: templateKey'));
assert.ok(editor.includes('repeatedCollections: template.repeatedItems ? [structuredClone(template.repeatedItems)] : []'));
assert.ok(editor.includes('openCustomBuilder(null, null, button.dataset.creatorTemplate)'));
for (const page of ["properties", "connections", "states", "repeated", "code", "advanced"])
  assert.ok(html.includes(`data-custom-capability-page="${page}"`), `${page} capability page is missing`);
assert.ok(editor.includes("function setCustomCapabilityPage"));
assert.ok(editor.includes('setCustomCapabilityPage(customCapabilityPage || "properties")'));
assert.ok(html.includes("custom-step-authored"));
assert.ok(html.includes("custom-step-authored-preview"));
assert.ok(html.includes("custom-imported-mappings"));
const stepSwitcher = editor.slice(
  editor.indexOf("function setCustomWizardStep"),
  editor.indexOf("function setCustomCapabilityPage"),
);
assert.ok(stepSwitcher.includes('if (customWizardStep === 0)'));
assert.ok(stepSwitcher.includes('switchCustomSourceTab("html")'));
assert.ok(stepSwitcher.includes("refreshCustomPreview()"));
assert.ok(
  stepSwitcher.indexOf('if (customWizardStep === 0)') < stepSwitcher.indexOf('if (customWizardStep === 1) analyzeCustomElements()'),
  "authored source must render before Step 2 analyzes or presents mappings",
);

const packageHandler = editor.slice(
  editor.indexOf('$("custom-package-file").onchange'),
  editor.indexOf('$("component-library-file").onchange'),
);
assert.ok(packageHandler.includes("openCustomBuilder(null, entry)"));

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
