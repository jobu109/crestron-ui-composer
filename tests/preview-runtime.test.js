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
// A naive char-by-char brace counter breaks the moment a function contains a
// regex literal with an escaped brace in it (e.g. `\}`) — extremely common
// in this codebase's detection functions, which are mostly regex. This is a
// small tokenizer that tracks string/regex/comment state so braces inside
// them don't count toward the function body's own nesting depth.
// Scans forward from `start`, tracking string/regex/comment state so their
// contents don't count toward brace depth, and returns the index right
// after the `}` that matches the first `{` found at or after `start`.
function scanBalancedBraces(source, start) {
  const regexAllowedAfterWord = new Set([
      "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
      "case", "do", "else", "yield", "throw",
    ]),
    canStartRegex = (index) => {
      let j = index - 1;
      while (j >= start && /\s/.test(source[j])) j--;
      if (j < start) return true;
      const ch = source[j];
      if (/[A-Za-z0-9_$)\]]/.test(ch)) {
        const wordMatch = source.slice(Math.max(start, j - 12), j + 1).match(/[A-Za-z_$][\w$]*$/);
        return wordMatch ? regexAllowedAfterWord.has(wordMatch[0]) : false;
      }
      return true;
    };
  let depth = 0,
    end = -1,
    started = false,
    inString = null,
    inRegex = false,
    inLineComment = false,
    inBlockComment = false,
    i = start;
  for (; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === inString) inString = null;
      continue;
    }
    if (inRegex) {
      if (ch === "\\") i++;
      else if (ch === "[") {
        i++;
        while (i < source.length && source[i] !== "]") {
          if (source[i] === "\\") i++;
          i++;
        }
      } else if (ch === "/") inRegex = false;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "/" && canStartRegex(i)) {
      inRegex = true;
      continue;
    }
    if (ch === "{") {
      depth++;
      started = true;
    } else if (ch === "}") {
      depth--;
      if (started && depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (!started || depth !== 0) throw new Error("braces did not balance from index " + start);
  return end;
}
function extractFunction(source, name) {
  const signature = new RegExp(`function ${name}\\s*\\([^)]*\\)\\s*\\{`),
    match = source.match(signature);
  if (!match) throw new Error(`${name} not found in source`);
  // Start brace-scanning from the real body-opening `{` the signature
  // regex already found (its match ends right after that brace), not from
  // the `function` keyword — a default parameter with an object literal
  // (e.g. `properties = {}`) contains its own balanced `{}` earlier in the
  // signature, which would otherwise be mistaken for the function body.
  const bodyStart = match.index + match[0].length - 1,
    end = scanBalancedBraces(source, bodyStart);
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict";return (${source.slice(match.index, end)});`)();
}
// Extracts a standalone `const NAME = {...}` object literal's evaluated
// value, independent of any function.
function extractConst(source, name) {
  const start = source.indexOf(`const ${name} = {`);
  if (start === -1) throw new Error(`${name} not found in source`);
  const braceStart = source.indexOf("{", start),
    end = scanBalancedBraces(source, braceStart);
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict";return (${source.slice(braceStart, end)});`)();
}
// For a `const NAME = [...]` immediately followed (later in the same
// closure) by a `function FN(...) {...}` that references it as a free
// variable — extracts both together and returns them as named exports, so
// the function's dependency on the const is satisfied without needing to
// expose the const globally.
function extractConstThroughFunction(source, constName, functionName) {
  const constStart = source.indexOf(`const ${constName}`);
  if (constStart === -1) throw new Error(`${constName} not found in source`);
  const signature = new RegExp(`function ${functionName}\\s*\\([^)]*\\)\\s*\\{`),
    relativeMatch = source.slice(constStart).match(signature);
  if (!relativeMatch) throw new Error(`${functionName} not found after ${constName}`);
  const fnStart = constStart + relativeMatch.index,
    bodyStart = fnStart + relativeMatch[0].length - 1,
    end = scanBalancedBraces(source, bodyStart);
  // eslint-disable-next-line no-new-func
  return new Function(
    `"use strict";${source.slice(constStart, end)};return {${constName}, ${functionName}};`,
  )();
}

const editorSource = read("editor.js"),
  detectManagedGlow = extractFunction(editorSource, "detectManagedGlow"),
  applyNaturalPreviewSize = extractFunction(
    editorSource,
    "applyNaturalPreviewSize",
  ),
  describeSelectorStateRole = extractFunction(
    editorSource,
    "describeSelectorStateRole",
  ),
  describeSelectorVisualPart = extractFunction(
    editorSource,
    "describeSelectorVisualPart",
  ),
  enclosingSelectorAt = extractFunction(editorSource, "enclosingSelectorAt"),
  detectLoopingAnimation = extractFunction(
    editorSource,
    "detectLoopingAnimation",
  ),
  customBehaviorRuntime = extractFunction(editorSource, "customBehaviorRuntime"),
  customBehaviorActions = extractConst(editorSource, "customBehaviorActions"),
  rgbToHex = extractFunction(editorSource, "rgbToHex"),
  hexToRgb = extractFunction(editorSource, "hexToRgb"),
  formatRgba = extractFunction(editorSource, "formatRgba"),
  detectLiteralColorEditables = extractFunction(
    editorSource,
    "detectLiteralColorEditables",
  ),
  detectLiteralNumericEditables = extractFunction(
    editorSource,
    "detectLiteralNumericEditables",
  ),
  translatorKey = extractFunction(editorSource, "translatorKey"),
  domLookupToSelector = extractFunction(editorSource, "domLookupToSelector"),
  isCustomWorkbenchNodeVisible = extractFunction(
    editorSource,
    "isCustomWorkbenchNodeVisible",
  ),
  isHiddenWorkbenchControlNode = extractFunction(
    editorSource,
    "isHiddenWorkbenchControlNode",
  ),
  findAssociatedVisibleWorkbenchNode = extractFunction(
    editorSource,
    "findAssociatedVisibleWorkbenchNode",
  ),
  findCustomWorkbenchPartForElement = extractFunction(
    editorSource,
    "findCustomWorkbenchPartForElement",
  );
// buildCustomWorkbenchPartTree's hidden-input-adoption pass calls
// isHiddenWorkbenchControlNode/findAssociatedVisibleWorkbenchNode as free
// variables (siblings in editor.js's closure), and isHiddenWorkbenchControlNode
// itself calls isCustomWorkbenchNodeVisible the same way — expose all three
// on the global object before extracting it, same pattern used for
// inferSnippetBehaviors's dependencies below.
global.isCustomWorkbenchNodeVisible = isCustomWorkbenchNodeVisible;
global.isHiddenWorkbenchControlNode = isHiddenWorkbenchControlNode;
global.findAssociatedVisibleWorkbenchNode = findAssociatedVisibleWorkbenchNode;
const buildCustomWorkbenchPartTree = extractFunction(
  editorSource,
  "buildCustomWorkbenchPartTree",
);

// inferSnippetBehaviors calls translatorKey and domLookupToSelector, and
// detectLiteralColorEditables/detectLiteralNumericEditables call
// describeSelectorStateRole/enclosingSelectorAt, all as free variables
// (they're siblings in editor.js's closure, not parameters) — new
// Function()-created functions resolve free variables against the global
// object, so exposing them there lets the extracted functions find them
// exactly like they do inside the real closure.
global.translatorKey = translatorKey;
global.domLookupToSelector = domLookupToSelector;
global.describeSelectorStateRole = describeSelectorStateRole;
global.describeSelectorVisualPart = describeSelectorVisualPart;
global.enclosingSelectorAt = enclosingSelectorAt;
global.hexToRgb = hexToRgb;
const inferSnippetBehaviors = extractFunction(editorSource, "inferSnippetBehaviors");
const { evaluateComponentRequirementRules } = extractConstThroughFunction(
  editorSource,
  "componentRequirementRules",
  "evaluateComponentRequirementRules",
);
const detectStateFamilies = extractFunction(editorSource, "detectStateFamilies");
const translatedStateFamilyRuntime = extractFunction(
  editorSource,
  "translatedStateFamilyRuntime",
);
const translatedResponsiveFitRuntime = extractFunction(
  editorSource,
  "translatedResponsiveFitRuntime",
);
const filterNaturalContentRects = extractFunction(
  editorSource,
  "filterNaturalContentRects",
);
const normalizeFullBleedRootWrapper = extractFunction(
  editorSource,
  "normalizeFullBleedRootWrapper",
);
const detectTranslatedOptionalContent = extractFunction(
  editorSource,
  "detectTranslatedOptionalContent",
);
// normalizeFullBleedRootWrapper only calls bodyElement.querySelector(...)
// and reads .parentElement — a minimal mock covers that without needing a
// real DOM. matches: selectors that should resolve as body's own direct
// child (the only case the function is allowed to rewrite).
function mockBody(matches) {
  const body = {
    querySelector(selector) {
      return matches.includes(selector) ? { parentElement: body } : null;
    },
  };
  return body;
}
// Minimal DOM node mock for the Component Workbench tree/hover tests —
// covers only what buildCustomWorkbenchPartTree and
// findCustomWorkbenchPartForElement actually call: contains() for
// containment checks, closest() for selector-based ancestor lookup. Each
// node is tagged with the single selector it "matches," which is enough
// to exercise the containment/deepest-match algorithm without needing
// real CSS selector matching.
function mockWorkbenchNode(selector, parent = null) {
  const node = {
    selector,
    parent,
    contains(other) {
      let cursor = other;
      while (cursor) {
        if (cursor === node) return true;
        cursor = cursor.parent;
      }
      return false;
    },
    closest(target) {
      let cursor = node;
      while (cursor) {
        if (cursor.selector === target) return cursor;
        cursor = cursor.parent;
      }
      return null;
    },
  };
  return node;
}
function mockWorkbenchFrameDocument(nodesBySelector) {
  return {
    querySelector: (selector) => nodesBySelector[selector] || null,
  };
}

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

run("detectManagedGlow recognizes the button-style preset's glowColor/glowStrength pair without needing a COMPOSER MANAGED marker", () => {
  // translatedBehaviorPlan adds this exact key pair to every translated
  // button-like widget, wired via a real box-shadow-synthesizing
  // behavior — but since it comes from Import & Translate rather than
  // the manual "Add capabilities" builder, the source never gets marker-
  // wrapped. Real bug: without this, the glow-escape-the-bounding-box
  // mechanism never activated for ANY translated widget, so glow/shadow
  // effects were always hard-clipped to the component's rectangular
  // iframe edge.
  const properties = [
      { key: "glowColor", name: "Standard state — glow color" },
      { key: "glowStrength", name: "Glow strength" },
      { key: "selectedGlowColor", name: "Selected state — glow color" },
    ],
    result = detectManagedGlow(properties, "no COMPOSER MANAGED markers anywhere in this source");
  assert.equal(result.enabled, true);
  assert.equal(result.colorKey, "glowColor");
  assert.equal(result.strengthKey, "glowStrength");
});

run("detectManagedGlow carries the component's own declared default color/strength through, not just the keys", () => {
  // Real bug: a freshly-placed widget's saved properties start out
  // completely empty (component-runtime.js's shared mount() never
  // merges a component's own declared defaults in), so
  // properties[colorKey] is undefined until the user explicitly edits
  // it — the mount()-time glow escape fell back to an unrelated
  // hardcoded color/strength instead of the widget's own declared
  // "#04dcb9"/3 defaults, so the approximated glow never matched what
  // the widget actually looked like.
  const properties = [
      { key: "glowColor", name: "Standard state — glow color", defaultValue: "#04dcb9" },
      { key: "glowStrength", name: "Glow strength", defaultValue: 3 },
    ],
    result = detectManagedGlow(properties, "");
  assert.equal(result.colorDefault, "#04dcb9");
  assert.equal(result.strengthDefault, 3);
});

run("detectManagedGlow resolves an independent selected-state color/strength, distinct from the standard pair", () => {
  // A widget's selected/pressed state can have a noticeably different
  // (often larger) glow than standard — e.g. a square-to-circle button
  // that blooms bigger specifically when selected. "Selected" is matched
  // by key PREFIX so "selectedGlowColor" doesn't also satisfy the
  // standard (non-selected) color test.
  const properties = [
      { key: "glowColor", name: "Standard state — glow color", defaultValue: "#04dcb9" },
      { key: "glowStrength", name: "Glow strength", defaultValue: 12 },
      { key: "selectedGlowColor", name: "Selected state — glow color", defaultValue: "#00e5c3" },
      { key: "selectedGlowStrength", name: "Selected state — glow strength", defaultValue: 24 },
    ],
    result = detectManagedGlow(properties, "");
  assert.equal(result.colorKey, "glowColor");
  assert.equal(result.colorDefault, "#04dcb9");
  assert.equal(result.strengthKey, "glowStrength");
  assert.equal(result.strengthDefault, 12);
  assert.equal(result.selectedColorKey, "selectedGlowColor");
  assert.equal(result.selectedColorDefault, "#00e5c3");
  assert.equal(result.selectedStrengthKey, "selectedGlowStrength");
  assert.equal(result.selectedStrengthDefault, 24);
});

run("detectManagedGlow falls back to the standard color/strength for widgets with no dedicated selected glow property", () => {
  // Not every imported widget defines a separate selected glow (this
  // widget only had glowStrength, per an earlier real bug) — the escape
  // must still work, just without a selected-specific size, rather than
  // resolving to nothing.
  const properties = [
      { key: "glowColor", name: "Standard state — glow color", defaultValue: "#04dcb9" },
      { key: "glowStrength", name: "Glow strength", defaultValue: 12 },
    ],
    result = detectManagedGlow(properties, "");
  assert.equal(result.selectedColorKey, "glowColor");
  assert.equal(result.selectedColorDefault, "#04dcb9");
  assert.equal(result.selectedStrengthKey, "glowStrength");
  assert.equal(result.selectedStrengthDefault, 12);
});

run("detectManagedGlow resolves the real value through the preserveDefault/suggestedValue sentinel, not the literal '__preserve__' placeholder (real bug, confirmed via a live placed widget)", () => {
  // Button-style properties are saved with preserveDefault:true so the
  // imported widget's own appearance isn't silently overridden until the
  // user opts in via "Override imported value" — their real value lives
  // in suggestedValue, while defaultValue is left as the literal string
  // "__preserve__". A live placed widget confirmed this exact shape:
  // glowStrength had defaultValue "__preserve__" and suggestedValue "3",
  // and (before this fix) Number("__preserve__") silently became NaN,
  // falling through to an unrelated hardcoded 6px instead of the
  // widget's real 3px — and this widget had no glowColor property at
  // all, so colorKey/colorDefault correctly stay empty here too.
  const properties = [
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        defaultValue: "__preserve__",
        preserveDefault: true,
        suggestedValue: "3",
      },
      {
        key: "contentInset",
        name: "Glow-safe inset",
        type: "number",
        defaultValue: 10,
      },
    ],
    result = detectManagedGlow(properties, "");
  assert.equal(result.enabled, true);
  assert.equal(result.colorKey, "", "this widget genuinely has no glowColor property");
  assert.equal(result.colorDefault, "");
  assert.equal(result.strengthKey, "glowStrength");
  assert.equal(result.strengthDefault, "3");
  assert.equal(Number(result.strengthDefault), 3, "must resolve to a real usable number, not NaN from the literal sentinel string");
});

run("detectManagedGlow still requires a marker for a glow-named property that merely resembles, but isn't, the button-style preset's own keys", () => {
  const properties = [{ key: "glowColorway", name: "Glow colorway" }],
    result = detectManagedGlow(properties, "no markers here");
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

run("detectLiteralColorEditables suggests rgba(), hsl(), and hex-shorthand colors as color-alpha, not just 6-digit hex", () => {
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
  // Alpha-bearing/function-syntax colors get "color-alpha" — a real color
  // picker (swatch + alpha slider, see renderProperties in editor.js) —
  // rather than either a lossy hex conversion or a plain "text" field
  // (which historically rendered as an unrelated CIP-text editor, since
  // "text" is the catch-all property type).
  const glow = byValue("rgba(20, 212, 180, 0.6)");
  assert.equal(glow.type, "color-alpha", "alpha-bearing colors must get a real (alpha-aware) picker, not a lossy hex conversion or a plain text field");
  assert.equal(glow.value, "rgba(20, 212, 180, 0.6)");
  const hsl = byValue("hsl(180, 60%, 50%)");
  assert.equal(hsl.type, "color-alpha");
  assert.equal(hsl.value, "hsl(180, 60%, 50%)");
});

run("rgbToHex converts and clamps RGB components into a 6-digit hex swatch value", () => {
  assert.equal(rgbToHex(37, 99, 235), "#2563eb");
  assert.equal(rgbToHex(0, 0, 0), "#000000");
  assert.equal(rgbToHex(255, 255, 255), "#ffffff");
  assert.equal(rgbToHex(-10, 300, 128.6), "#00ff81", "out-of-range/fractional components must clamp and round rather than produce an invalid hex string");
});

run("hexToRgb parses a 6-digit hex swatch value back into RGB components", () => {
  assert.deepEqual(hexToRgb("#2563eb"), { r: 37, g: 99, b: 235 });
  assert.deepEqual(hexToRgb("#FFFFFF"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb("not-a-color"), { r: 0, g: 0, b: 0 }, "an invalid value must fall back safely rather than throw");
});

run("formatRgba recombines a color swatch and a separately-tracked alpha into one rgba() string", () => {
  assert.equal(formatRgba("#2563eb", 0.46), "rgba(37, 99, 235, 0.46)");
  assert.equal(formatRgba("#ffffff", 1), "rgba(255, 255, 255, 1)");
  assert.equal(formatRgba("#000000", -0.5), "rgba(0, 0, 0, 0)", "alpha must clamp into 0..1");
  assert.equal(formatRgba("#000000", 1.5), "rgba(0, 0, 0, 1)");
});

run("detectLiteralColorEditables correctly roles every stop of a multi-stop gradient, not just the first (real bluetooth-button-face shape)", () => {
  // A later stop can sit well past any fixed lookback window from its own
  // "background:" — this real declaration puts the 2nd/3rd stops over 50
  // characters away, which used to make them fall through to the generic
  // "Text / icon color" bucket instead of "Background color".
  const styles = `
    .bluetooth-button-face {
      background: radial-gradient(ellipse at 45% 38%, #242424 0%, #111111 58%, #020202 100%);
    }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    byValue = (value) => entries.find((entry) => entry.source.toLowerCase() === value);
  assert.equal(byValue("#242424").label, "Background color");
  assert.equal(byValue("#111111").label, "Background color 2");
  assert.equal(byValue("#020202").label, "Background color 3");
});

run("detectLiteralColorEditables correctly roles every layer of a multi-layer box-shadow, not just the first", () => {
  const styles = `
    .bluetooth-button-face {
      box-shadow:
        inset 0 5px 10px rgba(255, 255, 255, 0.06),
        inset 0 -12px 20px rgba(0, 0, 0, 0.95),
        0 5px 18px rgba(0, 0, 0, 0.55);
    }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    byValue = (value) => entries.find((entry) => entry.source.toLowerCase() === value);
  assert.equal(byValue("rgba(255, 255, 255, 0.06)").label, "Shadow color");
  assert.equal(byValue("rgba(0, 0, 0, 0.95)").label, "Shadow color 2");
  assert.equal(byValue("rgba(0, 0, 0, 0.55)").label, "Shadow color 3");
});

run("detectLiteralColorEditables checks every detected authored color by default", () => {
  const styles = `
    .widget.state-idle { background: rgb(37, 99, 235); box-shadow: 0 0 10px rgba(37, 99, 235, 0.5), 0 0 20px rgba(37, 99, 235, 0.2); }
    .widget.state-paired { background: rgb(14, 165, 233); box-shadow: 0 0 10px rgba(14, 165, 233, 0.5); }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    byValue = (value) => entries.find((entry) => entry.source.toLowerCase() === value);
  assert.equal(byValue("rgb(37, 99, 235)").checkedByDefault, true);
  assert.equal(byValue("rgba(37, 99, 235, 0.5)").checkedByDefault, true);
  assert.equal(byValue("rgba(37, 99, 235, 0.2)").checkedByDefault, true);
  assert.equal(byValue("rgb(14, 165, 233)").checkedByDefault, true);
  assert.equal(byValue("rgba(14, 165, 233, 0.5)").checkedByDefault, true);
});

run("detectLiteralColorEditables checks all state-independent colors too", () => {
  const styles = `.face { background: radial-gradient(circle, #242424 0%, #111111 50%, #020202 100%); }`,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    byValue = (value) => entries.find((entry) => entry.source.toLowerCase() === value);
  assert.equal(byValue("#242424").checkedByDefault, true);
  assert.equal(byValue("#111111").checkedByDefault, true);
  assert.equal(byValue("#020202").checkedByDefault, true);
});

run("detectLiteralColorEditables names toggle track and handle colors by part on initial import", () => {
  const styles = `
    .track { background: #4a4f5c; }
    input:checked + .track { background: #14b8a6; }
    .knob { background: #ffffff; }
    input:checked ~ .knob { color: #eeeeee; }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    labels = entries.map((entry) => entry.label);
  assert.ok(labels.includes("Track color"));
  assert.ok(labels.includes("Selected state — Track color"));
  assert.ok(labels.includes("Handle / knob color"));
  assert.ok(labels.includes("Selected state — Handle / knob color"));
  assert.ok(entries.every((entry) => entry.checkedByDefault));
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

run("describeSelectorStateRole names a state-/mode-/is- family member and common semantic classes, and stays quiet otherwise", () => {
  assert.equal(describeSelectorStateRole(".bluetooth-button.state-paired"), "Paired");
  assert.equal(describeSelectorStateRole(".widget.state-not-connected"), "Not connected");
  assert.equal(describeSelectorStateRole(".knob.mode-auto"), "Auto");
  assert.equal(describeSelectorStateRole(".btn.selected"), "Selected");
  assert.equal(describeSelectorStateRole(".btn:hover"), "Hover");
  assert.equal(describeSelectorStateRole(".btn:disabled"), "Disabled");
  assert.equal(describeSelectorStateRole(".card"), "");
  assert.equal(describeSelectorStateRole(""), "");
});

run("detectLiteralColorEditables labels a color inside a detected state rule with that state's name (real bluetooth-button.html shape)", () => {
  const styles = `
    .bluetooth-button.state-idle { border-color: #04dcb9; }
    .bluetooth-button.state-pairing { border-color: #f5a623; }
    .bluetooth-button.state-paired { border-color: #33d17a; }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    labels = entries.map((entry) => entry.label).sort();
  assert.deepEqual(labels, ["Idle state — Border color", "Paired state — Border color", "Pairing state — Border color"]);
});

run("detectLiteralColorEditables falls back to plain role numbering when no state context is detected (regression check)", () => {
  const styles = `
    .a { color: #111111; }
    .b { color: #222222; }
  `,
    entries = detectLiteralColorEditables(styles, new Set(), translatorKey),
    labels = entries.map((entry) => entry.label).sort();
  assert.deepEqual(labels, ["Text / icon color", "Text / icon color 2"]);
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

run("detectLiteralNumericEditables labels an opacity value inside a detected state rule with that state's name", () => {
  const styles = `
    .knob.state-idle { opacity: 0.6; }
    .knob.state-active { opacity: 1; }
  `,
    entries = detectLiteralNumericEditables(styles, translatorKey),
    labels = entries.map((entry) => entry.label).sort();
  assert.deepEqual(labels, ["Active opacity", "Idle opacity"]);
});

run("domLookupToSelector converts each DOM lookup method to an equivalent CSS selector", () => {
  assert.equal(domLookupToSelector("getElementById", "bluetooth-button"), "#bluetooth-button");
  assert.equal(domLookupToSelector("getElementsByClassName", "card active"), ".card.active");
  assert.equal(domLookupToSelector("getElementsByTagName", "button"), "button");
  assert.equal(domLookupToSelector("querySelector", ".card > span"), ".card > span");
});

run("inferSnippetBehaviors detects a press/release pair on a getElementById-looked-up element", () => {
  const javascript = `
    var button = document.getElementById("bluetooth-button");
    function pressButton(event) { button.classList.add("pressed"); }
    function releaseButton() { button.classList.remove("pressed"); }
    button.addEventListener("pointerdown", pressButton);
    button.addEventListener("pointerup", releaseButton);
  `,
    inferred = inferSnippetBehaviors(javascript, ""),
    press = inferred.find((entry) => entry.event === "pointerdown");
  assert.ok(press, "a getElementById-looked-up press handler must be detected, not silently invisible");
  assert.equal(press.selector, "#bluetooth-button");
  assert.equal(press.action, "press");
  assert.equal(press.direction, "output");
  const release = inferred.find((entry) => entry.event === "pointerup");
  assert.ok(release);
  assert.equal(release.action, "release");
});

run("inferSnippetBehaviors still detects the querySelector form (regression check)", () => {
  const javascript = `
    var button = document.querySelector("#bluetooth-button");
    button.addEventListener("pointerdown", function () {});
  `,
    inferred = inferSnippetBehaviors(javascript, ""),
    press = inferred.find((entry) => entry.event === "pointerdown");
  assert.ok(press);
  assert.equal(press.selector, "#bluetooth-button");
});

run("inferSnippetBehaviors detects a getElementById press chained directly onto addEventListener", () => {
  const javascript = `document.getElementById("go").addEventListener("click", function () {});`,
    inferred = inferSnippetBehaviors(javascript, ""),
    press = inferred.find((entry) => entry.event === "click");
  assert.ok(press);
  assert.equal(press.selector, "#go");
});

run("inferSnippetBehaviors detects a getElementById-tracked relationship (trigger toggles a target's class)", () => {
  const javascript = `
    var trigger = document.getElementById("menu-button");
    var panel = document.getElementById("menu-panel");
    trigger.addEventListener("click", function () {
      panel.classList.toggle("open");
    });
  `,
    inferred = inferSnippetBehaviors(javascript, ""),
    relationship = inferred.find((entry) => entry.kind === "interaction-relationship");
  assert.ok(relationship, "a getElementById-tracked trigger/target relationship must be detected");
  assert.equal(relationship.selector, "#menu-button");
  assert.equal(relationship.targetSelector, "#menu-panel");
});

run("evaluateComponentRequirementRules blocks an interactive control with no output signal", () => {
  const findings = evaluateComponentRequirementRules({
    interactiveElementCount: 1,
    numericElementCount: 0,
    signals: [],
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "interactive-control-requires-output-signal");
  assert.equal(findings[0].severity, "error");
});

run("evaluateComponentRequirementRules is satisfied once any output signal exists", () => {
  const findings = evaluateComponentRequirementRules({
    interactiveElementCount: 1,
    numericElementCount: 0,
    signals: [{ key: "press", direction: "output", type: "digital" }],
  });
  assert.equal(findings.length, 0);
});

run("evaluateComponentRequirementRules blocks a numeric control with no analog signal", () => {
  const findings = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 1,
    signals: [{ key: "press", direction: "output", type: "digital" }],
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "numeric-control-requires-analog-signal");
});

run("evaluateComponentRequirementRules requires BOTH analog directions for an interactive numeric control (a slider you can drag)", () => {
  const onlyInput = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 1,
    interactiveNumericElementCount: 1,
    signals: [{ key: "feedback", direction: "input", type: "analog" }],
  });
  assert.equal(onlyInput.length, 1, "an input alone isn't enough for something a person can actually adjust");

  const both = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 1,
    interactiveNumericElementCount: 1,
    signals: [
      { key: "feedback", direction: "input", type: "analog" },
      { key: "set", direction: "output", type: "analog" },
    ],
  });
  assert.equal(both.length, 0);
});

run("evaluateComponentRequirementRules only requires an analog input for a read-only numeric display (meter/progress)", () => {
  const findings = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 1,
    interactiveNumericElementCount: 0,
    signals: [{ key: "feedback", direction: "input", type: "analog" }],
  });
  assert.equal(findings.length, 0, "a read-only meter/progress display has nothing to adjust, so no output signal should be required");
});

run("evaluateComponentRequirementRules blocks a text-entry field with no serial output", () => {
  const blocked = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 0,
    textEntryElementCount: 1,
    signals: [{ key: "name", direction: "input", type: "serial" }],
  });
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].code, "text-entry-requires-serial-output");

  const satisfied = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 0,
    textEntryElementCount: 1,
    signals: [{ key: "typed", direction: "output", type: "serial" }],
  });
  assert.equal(satisfied.length, 0);
});

run("evaluateComponentRequirementRules stays quiet for a component with no detected controls", () => {
  const findings = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 0,
    signals: [],
  });
  assert.equal(findings.length, 0);
});

run("inferSnippetBehaviors assigns the conventional 'press'/'release' keys so the standard Held mechanism recognizes them", () => {
  const javascript = `
    var button = document.getElementById("bluetooth-button");
    button.addEventListener("pointerdown", function () {});
    button.addEventListener("pointerup", function () {});
  `,
    inferred = inferSnippetBehaviors(javascript, ""),
    press = inferred.find((entry) => entry.action === "press"),
    release = inferred.find((entry) => entry.action === "release");
  assert.equal(press.key, "press", "component-runtime.js only auto-adds Held for a signal keyed exactly 'press'");
  assert.equal(release.key, "release");
});

run("inferSnippetBehaviors keys a pressed/selected class toggle as 'selected'", () => {
  const javascript = `
    var trigger = document.getElementById("go");
    trigger.addEventListener("click", function () {
      trigger.classList.toggle("selected");
    });
  `,
    inferred = inferSnippetBehaviors(javascript, ""),
    selected = inferred.find((entry) => entry.action === "classToggle");
  assert.equal(selected.key, "selected");
});

run("inferSnippetBehaviors leaves an unrelated class toggle with its derived key (not forced to 'selected')", () => {
  const javascript = `
    var trigger = document.getElementById("go");
    trigger.addEventListener("click", function () {
      trigger.classList.toggle("dark-mode");
    });
  `,
    inferred = inferSnippetBehaviors(javascript, ""),
    toggled = inferred.find((entry) => entry.action === "classToggle");
  assert.notEqual(toggled.key, "selected");
});

run("detectStateFamilies promotes the resting state to index 0 even when it isn't first in the CSS (real bluetooth-button.html shape)", () => {
  // This is the actual rule order from the real file: the "pairing" state
  // is mentioned first, inside an unrelated LED-orbit override grouped
  // near the top of the stylesheet, well before the main .state-idle
  // block further down. Naive first-appearance order would put "pairing"
  // at index 0 — this exact case is what surfaced the bug in real testing.
  const styles = `
    .bluetooth-button-ring { transition: background .55s ease; }
    .bluetooth-led-orbit { opacity: 0; }
    .bluetooth-button.state-pairing .bluetooth-led-orbit { opacity: 1; }
    .bluetooth-button.state-idle .bluetooth-button-ring { background: rgba(37,99,235,.78); }
    .bluetooth-button.state-idle .bluetooth-status-pill { background: rgb(37,99,235); }
    .bluetooth-button.state-pairing .bluetooth-button-ring { background: rgba(59,130,246,.55); }
    .bluetooth-button.state-paired .bluetooth-button-ring { animation: pulse 1.15s ease-in-out infinite; }
    .bluetooth-button.state-paired .bluetooth-status-pill { background: rgb(14,165,233); }
  `,
    family = detectStateFamilies(styles);
  assert.ok(family, "a 3-state family must be detected");
  assert.equal(family.prefix, "state-");
  assert.equal(family.baseSelector, "bluetooth-button");
  assert.deepEqual(
    family.states,
    ["state-idle", "state-pairing", "state-paired"],
    "idle must be analog value 0 regardless of CSS text order, since that's what a SIMPL programmer expects the resting state to be",
  );
});

run("detectStateFamilies leaves CSS order alone when no state name matches a resting keyword", () => {
  const family = detectStateFamilies(`
    .widget.mode-red .face { background: red; }
    .widget.mode-green .face { background: green; }
    .widget.mode-blue .face { background: blue; }
  `);
  assert.deepEqual(family.states, ["mode-red", "mode-green", "mode-blue"]);
});

run("detectStateFamilies recognizes mode- and is- prefixes too", () => {
  const modeFamily = detectStateFamilies(`
    .widget.mode-off .face { opacity: .3; }
    .widget.mode-warming .face { opacity: .6; }
    .widget.mode-ready .face { opacity: 1; }
  `);
  assert.ok(modeFamily);
  assert.equal(modeFamily.prefix, "mode-");
  assert.deepEqual(modeFamily.states, ["mode-off", "mode-warming", "mode-ready"]);
  const isFamily = detectStateFamilies(`
    .card.is-loading .spinner { display: block; }
    .card.is-empty .placeholder { display: block; }
    .card.is-ready .content { display: block; }
  `);
  assert.ok(isFamily);
  assert.equal(isFamily.prefix, "is-");
});

run("detectStateFamilies does not fire for an ordinary 2-state toggle", () => {
  const family = detectStateFamilies(`
    .switch.state-on .track { background: teal; }
    .switch.state-off .track { background: gray; }
  `);
  assert.equal(family, null, "2 states is a binary toggle, not a multi-state widget");
});

run("detectStateFamilies ignores unrelated classes and non-prefixed selectors", () => {
  const family = detectStateFamilies(`
    .card { padding: 10px; }
    .card.active { border-color: teal; }
    .card .header { font-weight: bold; }
  `);
  assert.equal(family, null);
});

run("evaluateComponentRequirementRules blocks a detected multi-state component with no analog signal pair", () => {
  const stateFamily = { prefix: "state-", baseSelector: "bluetooth-button", states: ["state-idle", "state-pairing", "state-paired"] },
    blocked = evaluateComponentRequirementRules({
      interactiveElementCount: 0,
      numericElementCount: 0,
      stateFamily,
      signals: [],
    });
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].code, "multi-state-requires-analog-signal-pair");
  assert.ok(blocked[0].message.includes("state-pairing"));

  const onlyInput = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 0,
    stateFamily,
    signals: [{ key: "state", type: "analog", direction: "input" }],
  });
  assert.equal(onlyInput.length, 1, "an input alone is not enough; feedback output is required too");

  const satisfied = evaluateComponentRequirementRules({
    interactiveElementCount: 0,
    numericElementCount: 0,
    stateFamily,
    signals: [
      { key: "state", type: "analog", direction: "input" },
      { key: "stateFeedback", type: "analog", direction: "output" },
    ],
  });
  assert.equal(satisfied.length, 0);
});

run("translatedStateFamilyRuntime returns nothing without a detected family", () => {
  assert.equal(translatedStateFamilyRuntime(null), "");
});

run("translatedStateFamilyRuntime wires the state input, feedback output, and class swap", () => {
  const family = { prefix: "state-", baseSelector: "bluetooth-button", states: ["state-idle", "state-pairing", "state-paired"] },
    script = translatedStateFamilyRuntime(family);
  assert.ok(script.includes('querySelector(".bluetooth-button")'));
  assert.ok(script.includes("ComposerSignals.subscribe('state',applyState)"));
  assert.ok(script.includes("ComposerSignals.publish('stateFeedback',currentIndex)"));
  assert.ok(script.includes('["state-idle","state-pairing","state-paired"]'));
  assert.ok(!script.includes("subscribe('stateText"), "no textSelector was passed, so per-state text wiring must not be generated");
  assert.ok(
    script.includes("/* composer-generated-runtime */") && script.includes("/* /composer-generated-runtime */"),
    "must be wrapped in the marker auditCustomSource() strips out, or the ResizeObserver/API compatibility checks would fire on every single translated component regardless of the widget's own code",
  );
});

run("translatedStateFamilyRuntime adds per-state text subscriptions when a text selector is given", () => {
  const family = { prefix: "state-", baseSelector: "bluetooth-button", states: ["state-idle", "state-pairing", "state-paired"] },
    script = translatedStateFamilyRuntime(family, '[data-translated-text="text"]');
  assert.ok(
    script.includes(JSON.stringify('[data-translated-text="text"]')),
    "the text selector must be embedded so the runtime can find the label element",
  );
  assert.ok(
    script.includes("subscribe('stateText'+index"),
    "one subscription per state, keyed stateText0/stateText1/stateText2 at runtime via the loop index",
  );
  assert.ok(script.includes("states.forEach(function(name,index)"));
});

run("translatedResponsiveFitRuntime is wrapped in the composer-generated-runtime marker, since it's unconditionally appended to every translated component's JavaScript", () => {
  const script = translatedResponsiveFitRuntime();
  assert.ok(script.includes("ResizeObserver"), "sanity check: this is the function that uses ResizeObserver");
  assert.ok(
    script.includes("/* composer-generated-runtime */") && script.includes("/* /composer-generated-runtime */"),
    "unmarked, its own unconditional ResizeObserver usage would make the modern-browser-apis compatibility finding fire on every single import regardless of the widget's own code, with no way for the user to act on it",
  );
});

run("filterNaturalContentRects excludes a full-bleed wrapper (real bluetooth-button.html shape) and keeps the actual button size", () => {
  // .bluetooth-button-container is position:fixed;inset:0 in the real
  // file, so it reports its own rect as the full 900x600 measurement
  // viewport regardless of the button's actual ~360px visual size.
  const rects = [
      { width: 900, height: 600 }, // .bluetooth-button-container (fills the viewport)
      { width: 360, height: 360 }, // .bluetooth-button (the real content)
      { width: 360, height: 360 }, // .bluetooth-button-ring
      { width: 79, height: 79 }, // .bluetooth-button-face
    ],
    filtered = filterNaturalContentRects(rects, 900, 600),
    widths = filtered.map((rect) => rect.width);
  assert.ok(!widths.includes(900), "the full-bleed wrapper must be excluded");
  assert.ok(widths.includes(360), "the actual button content must remain");
});

run("filterNaturalContentRects falls back to the unfiltered set rather than returning nothing", () => {
  const rects = [{ width: 900, height: 600 }, { width: 900, height: 590 }],
    filtered = filterNaturalContentRects(rects, 900, 600);
  assert.equal(filtered.length, 2, "excluding everything would make measurement fail outright, so nothing is excluded here");
});

run("filterNaturalContentRects keeps ordinary content untouched when nothing is viewport-sized", () => {
  const rects = [{ width: 68, height: 34 }, { width: 28, height: 28 }],
    filtered = filterNaturalContentRects(rects, 900, 600);
  assert.deepEqual(filtered, rects);
});

run("normalizeFullBleedRootWrapper converts a body-direct-child's fixed+inset:0 to a normal-flow fill (real bluetooth-button.html shape)", () => {
  const styles = `.bluetooth-button-container { position: fixed; inset: 0; display: flex; align-items: center; padding: 5vw; }`,
    body = mockBody([".bluetooth-button-container"]),
    result = normalizeFullBleedRootWrapper(body, styles);
  assert.ok(!/position\s*:\s*fixed/i.test(result), "fixed positioning must be removed");
  assert.ok(!/inset\s*:/i.test(result), "inset must be removed, since it's what bypasses ancestor padding");
  assert.ok(/position\s*:\s*static/i.test(result));
  assert.ok(/width\s*:\s*100%/i.test(result));
  assert.ok(/height\s*:\s*100%/i.test(result));
  assert.ok(/display\s*:\s*flex/i.test(result), "unrelated declarations must be preserved");
  assert.ok(/align-items\s*:\s*center/i.test(result));
  assert.ok(/padding\s*:\s*5vw/i.test(result));
});

run("normalizeFullBleedRootWrapper handles longhand top/right/bottom/left:0 the same as inset:0", () => {
  const styles = `.container { position: absolute; top:0;right:0;bottom:0;left:0; }`,
    body = mockBody([".container"]),
    result = normalizeFullBleedRootWrapper(body, styles);
  assert.ok(/position\s*:\s*static/i.test(result));
  assert.ok(!/top\s*:\s*0/i.test(result));
});

run("normalizeFullBleedRootWrapper leaves a nested overlay (e.g. an inner ring) untouched — only body's direct children qualify", () => {
  const styles = `.bluetooth-button-ring { position: absolute; inset: 0; border-radius: 50%; }`,
    body = mockBody([]); // .bluetooth-button-ring is nested inside .bluetooth-button, not a direct child of body
  assert.equal(normalizeFullBleedRootWrapper(body, styles), styles);
});

run("normalizeFullBleedRootWrapper leaves a partial inset untouched, since it doesn't fully cover the box", () => {
  const styles = `.container { position: fixed; top: 0; }`,
    body = mockBody([".container"]);
  assert.equal(normalizeFullBleedRootWrapper(body, styles), styles);
});

run("normalizeFullBleedRootWrapper leaves ordinary static/relative positioning untouched", () => {
  const styles = `.container { position: relative; width: 100%; height: 100%; }`,
    body = mockBody([".container"]);
  assert.equal(normalizeFullBleedRootWrapper(body, styles), styles);
});

run("detectTranslatedOptionalContent maps a detected primary label to a 'Show label' checkbox target", () => {
  const html = '<div><span data-translated-text="text">Label</span></div>';
  assert.deepEqual(detectTranslatedOptionalContent(html), {
    showLabel: '[data-translated-text="text"]',
  });
});

run("detectTranslatedOptionalContent covers the rule-8 auto-injected generic label the same way, since it shares the same marker", () => {
  const html =
    '<div><span data-translated-generic-label data-translated-text="text">Label</span></div>';
  assert.deepEqual(detectTranslatedOptionalContent(html), {
    showLabel: '[data-translated-text="text"]',
  });
});

run("detectTranslatedOptionalContent stays empty when there is no primary 'text' key (e.g. only a secondary text2 label, or none at all)", () => {
  assert.deepEqual(
    detectTranslatedOptionalContent(
      '<div><span data-translated-text="text2">Extra</span></div>',
    ),
    {},
  );
  assert.deepEqual(detectTranslatedOptionalContent("<div>plain</div>"), {});
  assert.deepEqual(detectTranslatedOptionalContent(""), {});
});

run("detectLoopingAnimation finds an infinite animation referencing a real @keyframes name (shorthand form)", () => {
  const styles = `
    @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .ring { animation: orbit 2s linear infinite; }
  `;
  assert.equal(detectLoopingAnimation(styles), true);
});

run("detectLoopingAnimation finds an infinite animation declared via longhand animation-name/animation-iteration-count", () => {
  const styles = `
    @keyframes pulse { 0% { opacity: .5; } 100% { opacity: 1; } }
    .glow { animation-name: pulse; animation-duration: 1.5s; animation-iteration-count: infinite; }
  `;
  assert.equal(detectLoopingAnimation(styles), true);
});

run("detectLoopingAnimation stays false for a one-shot animation (no infinite) and does not false-positive on unrelated 'infinite' text", () => {
  assert.equal(
    detectLoopingAnimation(
      `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .card { animation: fadeIn .3s ease; }`,
    ),
    false,
  );
  assert.equal(
    detectLoopingAnimation(
      `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .card { animation: fadeIn .3s ease; } .note::after { content: "infinite possibilities"; }`,
    ),
    false,
  );
  assert.equal(detectLoopingAnimation(""), false);
  assert.equal(detectLoopingAnimation(".card { color: red; }"), false);
});

run("customBehaviorRuntime emits a working 'speed' action, not just the older manual-wizard-only code path", () => {
  const script = customBehaviorRuntime([
    {
      source: "signal-input",
      key: "speed",
      selector: "body",
      action: "speed",
      mapping: { enabled: true, inputMin: 0, inputMax: 65535, outputMin: 0, outputMax: 100, unit: "" },
    },
  ]);
  assert.ok(script.includes("case'speed':"), "the generic behavior runtime (used by translated/imported components) must implement the speed action itself");
  assert.ok(script.includes("animationDuration=scaleDurations"));
  assert.ok(script.includes("transitionDuration=scaleDurations"));
  assert.ok(script.includes("ComposerSignals.subscribe"));
});

run("every action the runtime dispatcher's apply() switch implements is also a selectable option in the manual behavior-row editor's dropdown", () => {
  // Real bug this catches: a behavior whose action isn't in
  // customBehaviorActions.value renders with no matching <option>, so the
  // browser silently defaults that row's <select> to its FIRST option
  // instead — collectCustomBehaviorRow() then reports the wrong action
  // entirely (no error, no warning). This exact gap turned an auto-
  // suggested "speed" behavior targeting `body` into a "text" behavior
  // targeting `body`, which the self-test's own analog test values then
  // used to overwrite the entire component body with the literal text
  // "100" — destroying the button being tested for, right before trying
  // to click it.
  const script = customBehaviorRuntime([{ source: "signal-input", key: "probe", selector: "body", action: "text" }]),
    applyBody = script.slice(script.indexOf("function apply("), script.indexOf("function pulse(")),
    dispatchedActions = [...applyBody.matchAll(/case'([a-zA-Z]+)':/g)].map((match) => match[1]),
    registeredValueActions = new Set(customBehaviorActions.value.map(([key]) => key)),
    missing = dispatchedActions.filter((action) => !registeredValueActions.has(action));
  assert.ok(dispatchedActions.length > 20, "sanity check: the apply() switch should have been found and parsed");
  assert.deepEqual(missing, []);
});

run("buildCustomWorkbenchPartTree nests parts by DOM containment (Container > Track > Handle, Container > Label)", () => {
  const containerNode = mockWorkbenchNode(".container"),
    trackNode = mockWorkbenchNode(".track", containerNode),
    handleNode = mockWorkbenchNode(".handle", trackNode),
    labelNode = mockWorkbenchNode(".label", containerNode),
    frameDocument = mockWorkbenchFrameDocument({
      ".container": containerNode,
      ".track": trackNode,
      ".handle": handleNode,
      ".label": labelNode,
    }),
    parts = [
      { id: "p-container", selector: ".container" },
      { id: "p-track", selector: ".track" },
      { id: "p-handle", selector: ".handle" },
      { id: "p-label", selector: ".label" },
    ],
    tree = buildCustomWorkbenchPartTree(parts, frameDocument);
  assert.equal(tree.length, 1, "only the container should be a root — track/handle/label all nest under something");
  assert.equal(tree[0].part.id, "p-container");
  const containerChildren = tree[0].children.map((entry) => entry.part.id).sort();
  assert.deepEqual(containerChildren, ["p-label", "p-track"]);
  const trackEntry = tree[0].children.find((entry) => entry.part.id === "p-track");
  assert.equal(trackEntry.children.length, 1, "handle must nest under track, not directly under container, even though container also contains it");
  assert.equal(trackEntry.children[0].part.id, "p-handle");
});

run("buildCustomWorkbenchPartTree floats a part whose selector doesn't currently resolve to the top level, rather than dropping it", () => {
  const containerNode = mockWorkbenchNode(".container"),
    frameDocument = mockWorkbenchFrameDocument({ ".container": containerNode }),
    parts = [
      { id: "p-container", selector: ".container" },
      { id: "p-missing", selector: ".not-there-yet" },
    ],
    tree = buildCustomWorkbenchPartTree(parts, frameDocument);
  assert.equal(tree.length, 2, "an unresolved part (e.g. JS-generated later) must still appear, not disappear from the map");
  assert.ok(tree.some((entry) => entry.part.id === "p-missing"));
});

run("findCustomWorkbenchPartForElement resolves to the deepest matching part, not the outermost container", () => {
  const containerNode = mockWorkbenchNode(".container"),
    trackNode = mockWorkbenchNode(".track", containerNode),
    handleNode = mockWorkbenchNode(".handle", trackNode);
  global.customWorkbenchDraft = {
    parts: [
      { id: "p-container", selector: ".container" },
      { id: "p-track", selector: ".track" },
      { id: "p-handle", selector: ".handle" },
    ],
  };
  assert.equal(findCustomWorkbenchPartForElement(handleNode).id, "p-handle");
  assert.equal(findCustomWorkbenchPartForElement(trackNode).id, "p-track");
  assert.equal(findCustomWorkbenchPartForElement(containerNode).id, "p-container");
});

run("findCustomWorkbenchPartForElement returns null when no known part contains the hovered element", () => {
  const orphanNode = mockWorkbenchNode(".orphan");
  global.customWorkbenchDraft = { parts: [{ id: "p-container", selector: ".container" }] };
  assert.equal(findCustomWorkbenchPartForElement(orphanNode), null);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("All preview runtime checks passed.");
