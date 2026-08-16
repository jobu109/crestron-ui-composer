"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const editorHtml = fs.readFileSync(path.join(root, "editor.html"), "utf8");
const editorJs = fs.readFileSync(path.join(root, "editor.js"), "utf8");
const editorCss = fs.readFileSync(path.join(root, "editor.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "tests", "fixtures", "component-workbench", "fixture-manifest.json"), "utf8"));

const requiredRoles = ["button", "toggle", "animated-button", "analog-control", "text-input", "repeated-list", "advanced-javascript", "dynamic-elements"];
requiredRoles.forEach((role) => assert.ok(manifest.fixtures.some((fixture) => fixture.role === role), `missing UX fixture role: ${role}`));
manifest.fixtures.forEach((fixture) => {
  const source = fs.readFileSync(path.join(root, "tests", "fixtures", "component-workbench", fixture.file), "utf8");
  fixture.requires.forEach((token) => assert.ok(source.includes(token), `${fixture.file} is missing ${token}`));
});

const toggle = fs.readFileSync(path.join(root, "tests", "fixtures", "component-workbench", "authored-toggle.html"), "utf8");
assert.match(toggle, /type="checkbox"/);
assert.match(toggle, /class="toggle-control"/);
assert.match(toggle, /class="track"/);
assert.match(toggle, /class="knob"/);
assert.match(toggle, /class="label"/);

assert.match(editorHtml, /id="custom-component-preview"/);
assert.match(editorHtml, /id="custom-part-list"/);
assert.match(editorHtml, /class="custom-signal-simulator"/);
assert.match(editorHtml, /id="custom-simulator-inputs"/);
assert.match(editorJs, /function addPickedCustomWorkbenchPart\(/);
assert.match(editorJs, /function highlightCustomWorkbenchPart\(/);
assert.match(editorJs, /label\[for=/, "hidden controls must resolve through their visible labels");
assert.match(editorJs, /nextElementSibling/);
assert.match(editorJs, /previousElementSibling/);
assert.match(editorJs, /parentElement/);
assert.match(editorJs, /10000/, "explicit part highlights must remain visible for ten seconds");
assert.match(editorJs, /\.composer-workbench-highlight/);
assert.match(
  editorCss,
  /custom-wizard-step-1 #custom-component-preview\s*\{[^}]*width:\s*100% !important;[^}]*height:\s*100% !important;/s,
  "the Step 2 live preview must fill its pane instead of collapsing to the component's natural iframe width",
);
assert.match(
  editorCss,
  /custom-wizard-step-2 \.custom-test-workspace\s*\{[^}]*grid-template-areas:\s*"map preview"\s*"simulator preview";/s,
  "Step 3 must explicitly place the map, preview, and simulator instead of allowing grid auto-placement to overlap them",
);
assert.match(
  editorCss,
  /custom-wizard-step-2 \.custom-builder-layout\s*\{[^}]*flex:\s*0 0 auto;/s,
  "Step 3 builder must not flex-shrink beneath its workbench content",
);
assert.match(
  editorCss,
  /custom-wizard-step-2 \.custom-test-workspace\s*\{[^}]*height:\s*clamp\(480px,\s*calc\(100vh - 470px\),\s*620px\);/s,
  "Step 3 must reserve viewport room for validation and action sections",
);
assert.match(
  editorCss,
  /custom-wizard-step-2 #custom-component-preview\s*\{[^}]*width:\s*100% !important;[^}]*height:\s*100% !important;/s,
  "the Step 3 Composer preview must fill its assigned pane",
);

assert.match(editorJs, /function renderCustomPropertyMappings\(/);
assert.match(editorJs, /function renderCustomConnectionMappings\(/);
assert.match(editorJs, /function renderCustomStatePartOptions\(/);
assert.match(editorJs, /function renderCustomSignalSimulator\(/);
assert.match(editorJs, /function renderCustomReadinessFindings\(/);
assert.match(editorJs, /function customReadinessFindingAction\(/);
assert.match(editorJs, /Open exact connection/);
assert.match(editorJs, /Select component part/);
assert.match(editorJs, /Open source line/);
assert.doesNotMatch(editorJs, /Open repair location/);
assert.match(
  editorHtml,
  /id="custom-component-save" type="button"/,
  "Workbench creation must be an explicit action rather than an implicit Enter-key submit",
);
assert.match(editorHtml, /type="button" value="cancel" data-close-custom-workbench/);
assert.match(editorHtml, /Apply checked capability setups/);
assert.match(editorJs, /No changes were needed\. All capabilities from the/);
assert.match(editorJs, /review them under Editable properties and Crestron connections/);
assert.match(editorJs, /setup is already complete on/);
assert.match(editorJs, /selectCustomWorkbenchPart\(part\.id\)/);
assert.match(editorJs, /highlightCustomWorkbenchPart\(part\)/);
assert.match(
  editorJs,
  /customWorkbenchForm\.addEventListener\("submit", \(event\) => \{\s*event\.preventDefault\(\);/s,
  "Workbench must ignore implicit form submission while editing fields",
);
assert.match(
  editorJs,
  /dataset\.editingId = mapping\.id \|\| ""/,
  "property edits must retain the exact Workbench mapping identity",
);
assert.match(
  editorJs,
  /findIndex\(\(property\) => property\.id === editingId\)/,
  "property updates must replace the mapping being edited rather than another mapping with a similar key",
);
assert.match(
  editorJs,
  /function previewPendingCustomPropertyEdit\(\)/,
  "Step 2 property edits must have a live-preview path",
);
assert.match(
  editorJs,
  /const editing = !!\$\("custom-property-create"\)\.dataset\.editingId/,
  "changing a property's capability must preserve its selected component part while editing",
);

console.log("component-workbench-ux-baseline.test.js passed");
