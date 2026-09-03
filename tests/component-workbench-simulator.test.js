const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");

assert.ok(
  editor.includes('const previewValue = previewProperties[property.key] ?? property.defaultValue ?? ""'),
  "the final test step must render the current simulated property value rather than only its saved default",
);
assert.ok(
  editor.includes('if (property.type === "color") input.oninput = apply'),
  "final-step color controls must update the Composer preview while the color picker is used",
);
assert.ok(
  editor.includes("refreshCustomPreview({ refreshSimulator: false })"),
  "live property changes must not rebuild and reset their own Inspector control",
);
assert.ok(
  editor.includes("if (customWizardStep === 3) refreshCustomPreview()"),
  "entering Step 4 must populate both preview frames without requiring Refresh",
);

assert.ok(editor.includes("function customSimulatorAnalogScale(signal)"));
assert.ok(editor.includes("Crestron ${minimum}–${maximum} → component ${scale.outputMin}–${scale.outputMax}"));
assert.ok(editor.includes("minimum = scale?.inputMin ?? 0"));
assert.ok(editor.includes("sendCustomSimulatorInput(signal, bounded())"));
assert.ok(editor.includes("outputMin = finite(mapping.outputMin, inputMin)"));
assert.ok(!/\bsafeKey\s*\(/.test(editor), "Workbench must use the defined key normalizer");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");
const css = fs.readFileSync(path.join(root, "editor.css"), "utf8");

assert.ok(editor.includes("async function runCustomComponentSelfTestSafely()"));
assert.ok(editor.includes("Component validation exceeded 18 seconds and was stopped."));
assert.ok(editor.includes('$("custom-self-test").onclick = runCustomComponentSelfTestSafely'));

for (const id of [
  "custom-simulator-inputs",
  "custom-simulator-outputs",
  "custom-simulator-target",
  "custom-simulate-press",
  "custom-simulate-release",
  "custom-simulate-cancel",
  "custom-simulate-hold",
  "custom-simulator-state",
  "custom-simulate-state",
  "custom-simulate-standard",
]) assert.ok(html.includes(`id="${id}"`), `${id} simulator control is missing`);

for (const implementation of [
  "function renderCustomSignalSimulator",
  "function sendCustomSimulatorInput",
  "function simulateCustomPointerLifecycle",
  'type: "composer-pointer-simulate"',
  "new PointerEvent",
  "pointercancel",
  "maximumHoldDuration",
  "Page remounts restore cached Crestron feedback",
  "Widget List runtime with two nested instances",
]) assert.ok(editor.includes(implementation), `${implementation} coverage is missing`);

assert.ok(editor.includes('range.type = "range"'));
assert.ok(editor.includes('checkbox.type = "checkbox"'));
assert.ok(editor.includes('textInput.type = "text"'));
assert.ok(editor.includes('row.dataset.outputKey = signal.key'));
assert.ok(editor.includes('connection.action === "stateIndex"'));
assert.ok(editor.includes('sendCustomSimulatorInput(selectedConnection, normalized === "selected")'));
assert.ok(editor.includes('sendCustomSimulatorInput(modeConnection, Number(stateDefinition.modeIndex))'));
assert.ok(editor.includes('Pointer lifecycle: press, release, cancellation'));
const simulatorRenderer = editor.slice(
  editor.indexOf("function renderCustomSignalSimulator"),
  editor.indexOf("function refreshCustomPreview"),
);
assert.ok(!simulatorRenderer.includes("escapeHtml("), "Simulator depends on an undefined HTML helper");
assert.ok(simulatorRenderer.includes("target.add(new Option"));
assert.ok(simulatorRenderer.includes("stateSelect.add("));

assert.ok(css.includes(".custom-signal-simulator"));
assert.ok(css.includes(".custom-simulator-output.active"));
assert.ok(css.includes(".custom-simulator-lifecycle"));

const readiness = editor.slice(
  editor.indexOf("function renderCustomReadinessFindings"),
  editor.indexOf("async function runCustomComponentSelfTest"),
);
assert.ok(readiness.includes("readiness?.warnings"), "Review notes are not actionable");
assert.ok(readiness.includes("customReadinessFindingAction"), "Readiness findings lack exact repair actions");
assert.ok(readiness.includes("customReadinessFindingHelp"), "Readiness findings lack correction guidance");

console.log("component-workbench-simulator.test.js passed");
