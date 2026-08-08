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
  enclosingSelectorAt = extractFunction(editorSource, "enclosingSelectorAt"),
  detectLoopingAnimation = extractFunction(
    editorSource,
    "detectLoopingAnimation",
  ),
  customBehaviorRuntime = extractFunction(editorSource, "customBehaviorRuntime"),
  detectLiteralColorEditables = extractFunction(
    editorSource,
    "detectLiteralColorEditables",
  ),
  detectLiteralNumericEditables = extractFunction(
    editorSource,
    "detectLiteralNumericEditables",
  ),
  translatorKey = extractFunction(editorSource, "translatorKey"),
  domLookupToSelector = extractFunction(editorSource, "domLookupToSelector");

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
global.enclosingSelectorAt = enclosingSelectorAt;
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
  assert.deepEqual(labels, ["Idle border color", "Paired border color", "Pairing border color"]);
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

if (process.exitCode) process.exit(process.exitCode);
console.log("All preview runtime checks passed.");
