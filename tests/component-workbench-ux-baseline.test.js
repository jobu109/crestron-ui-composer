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

assert.match(editorJs, /function renderCustomPropertyMappings\(/);
assert.match(editorJs, /function renderCustomConnectionMappings\(/);
assert.match(editorJs, /function renderCustomStatePartOptions\(/);
assert.match(editorJs, /function renderCustomSignalSimulator\(/);
assert.match(editorJs, /function renderCustomReadinessFindings\(/);
assert.match(editorJs, /Open repair location/);

console.log("component-workbench-ux-baseline.test.js passed");
