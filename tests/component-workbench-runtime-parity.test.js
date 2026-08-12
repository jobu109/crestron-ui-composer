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

assert.ok(editor.includes("custom-acceptance-ch5-desktop"));
assert.ok(editor.includes("custom-acceptance-touch-panel"));
assert.ok(html.includes("CH5 Desktop &amp; touch-panel verification"));
assert.ok(html.includes("These results are saved with the component package"));

console.log("component-workbench-runtime-parity.test.js passed");
