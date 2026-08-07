"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, "..");

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}
function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}\n${error.stack}`);
    process.exitCode = 1;
  }
}

// editor.js is a single browser-loaded IIFE with `document`/`window` baked
// into its top-level scope, so it cannot be required or run headlessly as a
// whole. These tests pull individual pure-logic functions out of the source
// by brace-matching and evaluate them standalone, so behavior (not just
// string presence) is actually verified for the functions most likely to
// silently regress.
function extractFunction(source, name) {
  const signature = new RegExp(`function ${name}\\s*\\([^)]*\\)\\s*\\{`),
    match = source.match(signature);
  if (!match) throw new Error(`${name} not found in source`);
  const start = match.index;
  let depth = 0,
    end = start;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (depth !== 0) throw new Error(`${name} braces did not balance`);
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict";return (${source.slice(start, end)});`)();
}

const editorSource = read("editor.js"),
  detectManagedGlow = extractFunction(editorSource, "detectManagedGlow"),
  applyNaturalPreviewSize = extractFunction(
    editorSource,
    "applyNaturalPreviewSize",
  ),
  detectLiteralColorEditables = extractFunction(
    editorSource,
    "detectLiteralColorEditables",
  ),
  detectLiteralNumericEditables = extractFunction(
    editorSource,
    "detectLiteralNumericEditables",
  ),
  translatorKey = extractFunction(editorSource, "translatorKey");

run("detectManagedGlow enables and resolves color/strength keys from matching markers", () => {
  const properties = [
      { key: "dialGlowColor", name: "Dial Glow color" },
      { key: "dialGlowStrength", name: "Dial Glow strength" },
      { key: "unrelated", name: "Something else" },
    ],
    source =
      "/* COMPOSER MANAGED property-dialGlowColor START */\n" +
      "a { filter: drop-shadow(0 0 var(--composer-scope-glow-strength,6px) var(--composer-scope-glow-color)); }\n" +
      "/* COMPOSER MANAGED property-dialGlowColor END */\n" +
      "/* COMPOSER MANAGED property-dialGlowStrength START */\n" +
      "b { --composer-scope-glow-strength: 8px; }\n" +
      "/* COMPOSER MANAGED property-dialGlowStrength END */",
    result = detectManagedGlow(properties, source);
  assert.equal(result.enabled, true);
  assert.equal(result.colorKey, "dialGlowColor");
  assert.equal(result.strengthKey, "dialGlowStrength");
});

run("detectManagedGlow stays disabled when a glow-named property has no marker in source", () => {
  const properties = [{ key: "buttonGlowColor", name: "Button Glow color" }],
    result = detectManagedGlow(properties, "no markers present here");
  assert.equal(result.enabled, false);
  assert.equal(result.colorKey, "");
  assert.equal(result.strengthKey, "");
});

run("detectManagedGlow ignores markers for keys that are not the current property list", () => {
  const properties = [{ key: "otherGlowColor", name: "Other Glow color" }],
    source =
      "/* COMPOSER MANAGED property-buttonGlowColor START */x/* COMPOSER MANAGED property-buttonGlowColor END */",
    result = detectManagedGlow(properties, source);
  assert.equal(result.enabled, false);
});

run("detectManagedGlow handles an empty property list without throwing", () => {
  const result = detectManagedGlow([], "");
  assert.equal(result.enabled, false);
  assert.equal(result.colorKey, "");
  assert.equal(result.strengthKey, "");
});

run("applyNaturalPreviewSize clamps within the supported preview range", () => {
  const frame = { style: {} };
  applyNaturalPreviewSize(frame, 2000, 1200);
  assert.equal(frame.style.width, "640px");
  assert.equal(frame.style.height, "400px");
  assert.equal(frame.style.flex, "0 0 auto");
});

run("applyNaturalPreviewSize raises undersized measurements to the minimum preview size", () => {
  const frame = { style: {} };
  applyNaturalPreviewSize(frame, 20, 10);
  assert.equal(frame.style.width, "90px");
  assert.equal(frame.style.height, "50px");
});

run("applyNaturalPreviewSize leaves the frame untouched for a zero or missing measurement", () => {
  const frame = { style: {} };
  applyNaturalPreviewSize(frame, 0, 0);
  assert.equal(frame.style.width, undefined);
  assert.equal(frame.style.height, undefined);
  applyNaturalPreviewSize(frame, undefined, undefined);
  assert.equal(frame.style.width, undefined);
  applyNaturalPreviewSize(frame, 100, 0);
  assert.equal(frame.style.height, undefined);
});

run("detectLiteralColorEditables suggests rgba(), hsl(), and hex-shorthand colors as text, not just 6-digit hex", () => {
  const styles = `
    .glow-button {
      background: #ff6b6b;
      box-shadow: 0 0 20px rgba(20, 212, 180, 0.6);
      border: 1px solid #0af;
      color: hsl(180, 60%, 50%);
    }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    byValue = (value) => entries.find((entry) => entry.source.toLowerCase() === value);
  assert.equal(entries.length, 4);
  assert.equal(byValue("#ff6b6b").type, "color");
  assert.equal(byValue("#ff6b6b").value, "#ff6b6b");
  assert.equal(byValue("#0af").type, "color");
  assert.equal(byValue("#0af").value, "#00aaff", "3-digit hex should losslessly expand for the color picker");
  const glow = byValue("rgba(20, 212, 180, 0.6)");
  assert.equal(glow.type, "text", "alpha-bearing colors must not be forced through a lossy hex conversion");
  assert.equal(glow.value, "rgba(20, 212, 180, 0.6)");
  const hsl = byValue("hsl(180, 60%, 50%)");
  assert.equal(hsl.type, "text");
  assert.equal(hsl.value, "hsl(180, 60%, 50%)");
});

run("detectLiteralColorEditables preserves original casing for reliable replacement", () => {
  const entries = detectLiteralColorEditables(
    "a { color: #FF6B6B; }",
    new Set(),
    translatorKey,
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].source, "#FF6B6B", "source must keep the exact original text so css.replaceAll can find it");
  assert.equal(entries[0].value, "#ff6b6b");
});

run("detectLiteralColorEditables excludes html/body canvas backgrounds and already-tokenized CSS variables", () => {
  const styles = `
    :root { --accent: #14d4b4; }
    body { background: #182126; }
    .card { background: #14d4b4; border-color: #223344; }
  `,
    entries = detectLiteralColorEditables(
      styles,
      new Set(["#14d4b4"]),
      translatorKey,
    ),
    values = entries.map((entry) => entry.value);
  assert.ok(!values.includes("#182126"), "body background should not be suggested as a component property");
  assert.ok(!values.includes("#14d4b4"), "a value already exposed via a CSS variable should not be duplicated");
  assert.ok(values.includes("#223344"));
});

run("detectLiteralNumericEditables suggests opacity/letter-spacing/line-height but not layout properties", () => {
  const styles = `
    .card {
      width: 200px;
      padding: 10px;
      opacity: 0.85;
      letter-spacing: 0.5px;
    }
  `,
    entries = detectLiteralNumericEditables(styles, translatorKey),
    byRole = (label) => entries.find((entry) => entry.label === label);
  assert.equal(entries.length, 2, "width/padding are structural and must not be exposed as editable properties");
  assert.equal(byRole("Opacity").value, 0.85);
  assert.equal(byRole("Opacity").source, "opacity");
  assert.equal(byRole("Opacity").sourceValue, "0.85");
  assert.equal(byRole("Letter spacing").value, 0.5);
  assert.equal(byRole("Letter spacing").unit, "px");
});

run("detectLiteralNumericEditables dedupes identical values but numbers distinct ones", () => {
  const styles = `
    .a { line-height: 1.4; }
    .b { line-height: 1.4; }
    .c { line-height: 1.8; }
  `,
    entries = detectLiteralNumericEditables(styles, translatorKey),
    labels = entries.map((entry) => entry.label).sort();
  assert.deepEqual(labels, ["Line height", "Line height 2"]);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("All preview runtime checks passed.");
