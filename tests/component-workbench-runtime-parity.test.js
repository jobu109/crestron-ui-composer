const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");
const html = fs.readFileSync(path.join(root, "editor.html"), "utf8");

for (const marker of [
  "schemaFingerprint: customComponentReadinessFingerprint(entry)",
  "properties: structuredClone(properties)",
  "signals: structuredClone(",
  "exportProject.customComponents = [",
  "structuredClone(entry)",
  "definition.data?.schemaFingerprint === expectedFingerprint",
  "The exported runtime does not contain the saved Component Workbench definition fingerprint",
  "The exported CH5 payload is missing required runtime, component, or instance structure",
  "One shared component definition across runtimes",
  "Preview registered runtime",
  "Mouse and touchscreen input",
  "Page remount and retained feedback",
  "Widget List with two nested instances",
]) assert.ok(editor.includes(marker), `${marker} parity evidence is missing`);

for (const lifecycleMarker of [
  "function refreshCustomPreview({ refreshSimulator = true, sourceRefresh = false } = {})",
  "function createScopedCustomProperty()",
  "function createScopedCustomSignal()",
  "if (customWizardStep === 3) refreshCustomPreview()",
  '$("custom-component-save").onclick = async (event) =>',
  "workbench: window.ComposerComponentWorkbench.normalize(customWorkbenchDraft)",
  "registerCustomComponent(entry)",
  "function openCustomBuilder(item = null, entry = null, starterTemplate = \"button\", { deferInitialLoad = false } = {})",
  "function exportCustomComponentEntry(entry)",
  "function createCustomComponentPackage(entry, assetCatalog = state.assets)",
  "function parseCustomComponentPackage(packageValue)",
]) assert.ok(editor.includes(lifecycleMarker), `${lifecycleMarker} lifecycle stage is missing`);

for (const adapterValidationMarker of [
  "function resolveCustomAdapterTokens(",
  "function validateResolvedCustomAdapter(",
  "validateResolvedCustomAdapter(",
  "Generated adapter is invalid after property-token resolution",
  "Generated adapter contains unresolved tokens",
]) assert.ok(editor.includes(adapterValidationMarker), `${adapterValidationMarker} adapter validation is missing`);

const adapterValidationCall = editor.indexOf("const resolvedAdapterValidation = validateResolvedCustomAdapter(");
const persistedAdapter = editor.indexOf("customWorkbenchDraft.adapter =", adapterValidationCall);
assert.ok(adapterValidationCall >= 0 && persistedAdapter > adapterValidationCall,
  "the resolved adapter must validate before it is persisted or registered");

const saveLifecycle = editor.slice(
  editor.indexOf('$("custom-component-save").onclick'),
  editor.indexOf('$("custom-package-file").onchange'),
);
assert.ok(
  saveLifecycle.indexOf("workbench: window.ComposerComponentWorkbench.normalize(customWorkbenchDraft)") <
    saveLifecycle.indexOf("registerCustomComponent(entry)"),
  "creation must persist the canonical Workbench definition before registering its runtime",
);
assert.ok(
  saveLifecycle.includes("runRegisteredCustomComponentTest(entry)") &&
    saveLifecycle.includes("scheduleComponentLibrarySave()"),
  "creation must verify the saved runtime and persist it for reopening",
);

for (const performanceFinding of [
  "unbounded-intervals",
  "excessive-timers",
  "excessive-observers",
  "expensive-effects",
  "repeated-animation-cost",
]) {
  assert.ok(editor.includes(`add("${performanceFinding}"`), `${performanceFinding} audit is missing`);
  assert.ok(editor.includes(`"${performanceFinding}": {`), `${performanceFinding} lacks a direct source action`);
}

for (const cleanupMarker of [
  "animationFrameHandles=[]",
  "observerHandles=[]",
  "function scopedAnimationFrame(callback)",
  "function scopedObserver(NativeObserver)",
  "animationFrameHandles.forEach(window.cancelAnimationFrame)",
  "observer.disconnect()",
]) assert.ok(editor.includes(cleanupMarker), `${cleanupMarker} runtime cleanup is missing`);

assert.ok(
  !editor.includes("Reflect.construct(NativeObserver,arguments)"),
  "observer cleanup wrapper must not depend on Reflect.construct",
);
assert.ok(
  editor.includes("new NativeObserver(callback,options)"),
  "observer cleanup wrapper does not use the touch-panel-compatible constructor",
);
assert.ok(
  editor.includes("function customSimulatorBoolean(value)"),
  "custom simulator boolean normalization is missing",
);
assert.ok(
  editor.includes('["true", "1", "yes", "on", "selected", "checked"]'),
  "custom simulator boolean normalization does not recognize explicit true values",
);
assert.ok(
  !editor.includes("checkbox.checked = !!customSimulatorSignalValues.get(signal.key)"),
  'custom simulator must not treat the string "false" as selected feedback',
);

assert.ok(editor.includes("custom-acceptance-ch5-desktop"));
assert.ok(editor.includes("custom-acceptance-touch-panel"));
assert.ok(html.includes("CH5 Desktop &amp; touch-panel verification"));
assert.ok(html.includes("These results are saved with the component package"));

console.log("component-workbench-runtime-parity.test.js passed");
