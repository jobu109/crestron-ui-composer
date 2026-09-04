"use strict";
// Drives the ACTUAL running Crestron UI Composer desktop app (WPF +
// WebView2) over the Chrome DevTools Protocol and hand-authors real
// components through all 5 Part-First wizard steps, the same way a person
// would with a mouse and keyboard. Two scenarios: a hand-authored toggle
// pasted directly into Source & preview, and a snippet run through Import &
// Translate (a separate code path with its own tokenizing/boilerplate
// pipeline that has broken the part-first capability scanner before —
// see Phase E in PART_FIRST_COMPONENT_AUTHORING_PLAN.md).
//
// This exists because editor.js is a single browser-loaded IIFE with
// document/window baked into its top-level scope (see the note at the top
// of preview-runtime.test.js) — it cannot be required or driven headlessly
// in Node the way a normal module can, and jsdom is not a dependency of
// this project. Every other test in this suite therefore verifies *shape*
// (extracted pure functions, string presence in the source) rather than
// the actual running wizard. That gap is exactly what let the Part-First
// authoring flow ship broken — see PART_FIRST_COMPONENT_AUTHORING_PLAN.md's
// "Phase 0 results" and the normalizeCssSelector crash found there. This
// script is the replacement: it does not import editor.js at all, it talks
// to the real process the user actually runs.
//
// Not part of `npm test` — it launches and stops a real desktop process and
// takes several seconds, which doesn't belong in a fast hermetic suite.
// Run it manually after any change to the custom-component wizard:
//   node tests/part-first-live-app-acceptance.js
//
// Requires Windows with the app already built/installed at the path below
// (override with COMPOSER_APP_DIR). Leaves the app running normally
// afterward, with no debug port open.

const { spawn, spawnSync, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = process.env.COMPOSER_APP_DIR || "C:\\Users\\mfloyd\\AppData\\Local\\Crestron UI Composer";
const EXE = path.join(APP_DIR, "CrestronUiComposer.exe");
const WEB_DIR = path.join(APP_DIR, "Web");
const WEBVIEW_CACHE_DIR = process.env.COMPOSER_WEBVIEW_DIR || "C:\\Users\\mfloyd\\AppData\\Local\\CrestronUiComposer\\WebView2\\EBWebView\\Default";
const DEBUG_PORT = Number(process.env.COMPOSER_DEBUG_PORT) || 9333;

function powershell(command) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8" });
  if (result.status !== 0 && result.status != null)
    throw new Error(`PowerShell failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout;
}

function syncWebFiles() {
  const csproj = fs.readFileSync(path.join(ROOT, "CrestronUiComposer", "CrestronUiComposer.csproj"), "utf8"),
    links = [...csproj.matchAll(/Link="Web\\([^"]+)"/g)].map((match) => match[1]).filter((name) => !name.includes("%")),
    copied = [];
  links.forEach((name) => {
    const source = path.join(ROOT, name), destination = path.join(WEB_DIR, name);
    if (!fs.existsSync(source)) return;
    if (fs.existsSync(destination) && Buffer.compare(fs.readFileSync(source), fs.readFileSync(destination)) === 0) return;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    copied.push(name);
  });
  return copied;
}

function stopApp() {
  powershell('Stop-Process -Name CrestronUiComposer -Force -ErrorAction SilentlyContinue');
}

function clearWebViewCache() {
  ["Cache", "Code Cache"].forEach((sub) =>
    powershell(`Remove-Item -Recurse -Force '${path.join(WEBVIEW_CACHE_DIR, sub)}' -ErrorAction SilentlyContinue`));
}

function startApp({ debug }) {
  const env = { ...process.env };
  if (debug) env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = `--remote-debugging-port=${DEBUG_PORT}`;
  else delete env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS;
  const child = spawn(EXE, [], { detached: true, stdio: "ignore", env });
  child.unref();
}

async function waitFor(predicate, { timeoutMs = 15000, intervalMs = 300, description = "condition" } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${description}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function findEditorTarget() {
  return waitFor(async () => {
    try {
      const response = await fetch(`http://localhost:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      return targets.find((target) => target.url === "https://composer.local/editor.html") || null;
    } catch (_) {
      return null;
    }
  }, { description: "CDP editor.html target to appear" });
}

class CdpClient {
  constructor(webSocketDebuggerUrl) {
    this.ws = new WebSocket(webSocketDebuggerUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id != null && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
  }
  async send(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails)
      throw new Error(`Evaluation failed: ${result.exceptionDetails.text}\n${expression}`);
    return result.result.value;
  }
  close() {
    this.ws.close();
  }
}

const HTML = '<label class="switch"><input id="toggle" type="checkbox"><span class="track"></span><span class="label">Off</span></label>';
const CSS = '.switch{display:inline-flex;align-items:center;gap:8px}.track{width:40px;height:20px;background-color:#4a4f5c;border-radius:10px;display:inline-block}input:checked + .track{background-color:#14b8a6}.label{color:#ffffff;font-size:14px}';

// Plain background-color/color are role properties Import & Translate
// tokenizes as part of building its own mappings; border-radius is not, so
// it stays a literal value and is the one real capability the part-first
// scanner should still surface after Import & Translate has run.
const IMPORT_SAMPLE_HTML = '<button class="my-btn" id="myButton">Click me</button><style>.my-btn{background-color:#3366ff;color:#ffffff;border-radius:6px;padding:10px 20px}.my-btn:active{background-color:#1a3fa0}</style>';

const checks = [];
function check(description, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ description, pass, actual, expected });
  if (!pass) console.error(`FAIL: ${description}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  else console.log(`PASS: ${description}`);
}

async function runImportScenario(cdp) {
  // Reproduces PART_FIRST_COMPONENT_AUTHORING_PLAN.md's Phase D/E finding:
  // Import & Translate tokenizes the source and injects its own generic
  // multi-selector boilerplate CSS before the part-first capability scanner
  // ever sees it. Without the materializePartCapabilities fix, this showed
  // a literal "{{text}}" token as a part's name and duplicated the same
  // capability up to 8 times.
  await cdp.evaluate(`(function(){
    const input = document.getElementById('translate-snippet-file');
    const file = new File([${JSON.stringify(IMPORT_SAMPLE_HTML)}], 'sample.html', { type: 'text/html' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await waitFor(() => cdp.evaluate("document.getElementById('translate-snippet-dialog').open"),
    { description: "translate-snippet-dialog to open" });
  check("Import: translate dialog opened without a crash", await cdp.evaluate("window.__err"), null);

  await cdp.evaluate(`document.getElementById('translate-select-all').click(); true`);
  await cdp.evaluate(`document.getElementById('translate-continue').click(); true`);
  await waitFor(() => cdp.evaluate("document.getElementById('custom-component-dialog').open"),
    { description: "custom-component-dialog to open after Import & Translate" });

  await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 900));
  await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 900));

  const rows = await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('#part-first-properties-list .part-first-property')].map((r) => r.querySelector('strong').textContent))`);
  check("Import: properties list has exactly the one real, untokenized capability — no {{token}} labels, no duplicates",
    JSON.parse(rows), ["Component — Corner radius"]);

  await cdp.evaluate(`(function(){
    const row = document.querySelector('#part-first-properties-list .part-first-property');
    row.querySelector('input[type=checkbox]').click();
    return true;
  })()`);
  await waitFor(() => cdp.evaluate(`(function(){
      const row = document.querySelector('#part-first-properties-list .part-first-property');
      return !!row && !!row.querySelector('.part-first-property-test input');
    })()`),
    { description: "imported Corner radius live-test control to render" });
  check("Import: accepting the capability does not immediately flag it unresolved (the materializePartCapabilities regression this test caught once already)",
    await cdp.evaluate("document.querySelector('#part-first-properties-list .part-first-property').classList.contains('needs-attention')"),
    false);

  await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 900));
  await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
  await new Promise((resolve) => setTimeout(resolve, 900));
  await cdp.evaluate(`document.getElementById('custom-self-test').click(); true`);
  const selfTestReport = await waitFor(
    () => cdp.evaluate(`(function(){ const t = document.getElementById('custom-self-test-report').textContent; return /PASSED|FAILED/.test(t) ? t : null; })()`),
    { description: "import self-test report to settle", timeoutMs: 10000 },
  );
  check("Import: self-test passes for the imported-plus-accepted component", selfTestReport.includes("COMPONENT READINESS — PASSED"), true);
  check("Import: no uncaught error occurred anywhere in this scenario", await cdp.evaluate("window.__err"), null);

  await cdp.evaluate(`document.querySelector('#custom-component-dialog .dialog-close').click(); true`);
}

async function main() {
  console.log("Syncing Web/ from repo...");
  const copied = syncWebFiles();
  if (copied.length) console.log(`  updated: ${copied.join(", ")}`);
  else console.log("  already up to date");

  console.log("Restarting app with remote debugging...");
  stopApp();
  await new Promise((resolve) => setTimeout(resolve, 800));
  clearWebViewCache();
  startApp({ debug: true });

  const target = await findEditorTarget();
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");

  try {
    // The CDP target can appear the moment WebView2 registers it, before
    // editor.html has finished loading and wiring up its click handlers —
    // wait for the actual entry point to exist, not just a fixed delay.
    await waitFor(
      () => cdp.evaluate(`document.readyState === 'complete' && !!document.getElementById('new-custom-component-menu')`),
      { description: "editor.html to finish loading" },
    );
    await cdp.evaluate(`window.__err = null; window.addEventListener('error', (e) => { window.__err = e.message + ' @ ' + e.filename + ':' + e.lineno; }); true`);

    await cdp.evaluate(`document.getElementById('new-custom-component-menu').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await cdp.evaluate(`document.querySelector('[data-creator-template=blank]').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    check("Blank Component opened without a crash", await cdp.evaluate("window.__err"), null);
    check("Custom component dialog is open", await cdp.evaluate("document.getElementById('custom-component-dialog').open"), true);

    await cdp.evaluate(`(function(){
      const setValue = (el, value) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setValue(document.getElementById('custom-source-html'), ${JSON.stringify(HTML)});
      setValue(document.getElementById('custom-source-css'), ${JSON.stringify(CSS)});
      document.getElementById('custom-preview-refresh').click();
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const trackBg = await cdp.evaluate(`(function(){
      const doc = document.getElementById('custom-component-preview').contentDocument;
      const track = doc && doc.querySelector('.track');
      return track ? getComputedStyle(track).backgroundColor : null;
    })()`);
    check("Step 0: preview renders the authored track color", trackBg, "rgb(74, 79, 92)");

    await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const parts = await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('#part-first-parts-list .part-first-part')].map((r) => r.querySelector('code').textContent))`);
    check("Step 1: Parts step found exactly the 4 authored parts",
      JSON.parse(parts).sort(),
      ["#toggle", ".label", ".track", "label.switch"].sort());

    await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const radiusRowTitle = await cdp.evaluate(`(function(){
      const rows = [...document.querySelectorAll('#part-first-properties-list .part-first-property')];
      const row = rows.find((r) => r.querySelector('strong').textContent.includes('Corner radius'));
      return row ? row.querySelector('strong').textContent : null;
    })()`);
    check("Step 2: Corner radius capability attributes to the Track part, not a generic fallback", radiusRowTitle, "Track — Corner radius");

    await cdp.evaluate(`(function(){
      const rows = [...document.querySelectorAll('#part-first-properties-list .part-first-property')];
      const row = rows.find((r) => r.querySelector('strong').textContent.includes('Corner radius'));
      row.querySelector('input[type=checkbox]').click();
      return true;
    })()`);
    await waitFor(
      () => cdp.evaluate(`(function(){
        const rows = [...document.querySelectorAll('#part-first-properties-list .part-first-property')];
        const row = rows.find((r) => r.querySelector('strong').textContent.includes('Corner radius'));
        return !!row && !!row.querySelector('.part-first-property-test input');
      })()`),
      { description: "Corner radius live-test control to render" },
    );

    await cdp.evaluate(`(function(){
      const rows = [...document.querySelectorAll('#part-first-properties-list .part-first-property')];
      const row = rows.find((r) => r.querySelector('strong').textContent.includes('Corner radius'));
      const input = row.querySelector('.part-first-property-test input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '2');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const testedRadius = await cdp.evaluate(`getComputedStyle(document.getElementById('custom-component-preview').contentDocument.querySelector('.track')).borderRadius`);
    check("Step 2: live-test control changes the preview before committing further", testedRadius, "2px");

    await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));

    await cdp.evaluate(`(function(){
      const rows = [...document.querySelectorAll('#custom-authored-connection-list .custom-authored-connection-row')];
      rows.find((r) => r.querySelector('code').textContent.includes('selected')).querySelector('input').click();
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    check("Step 3: connections recommendation opened the configure form (no crash)", await cdp.evaluate("window.__err"), null);
    check("Step 3: configure form is showing", await cdp.evaluate("document.getElementById('custom-signal-creator').hidden"), false);
    await cdp.evaluate(`document.getElementById('custom-signal-create').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));

    await cdp.evaluate(`(function(){
      const rows = [...document.querySelectorAll('#custom-authored-connection-list .custom-authored-connection-row')];
      rows.find((r) => r.querySelector('code').textContent.includes('Press')).querySelector('input').click();
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await cdp.evaluate(`document.getElementById('custom-signal-create').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));

    await cdp.evaluate(`document.getElementById('custom-wizard-next').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await cdp.evaluate(`document.getElementById('custom-self-test').click(); true`);
    const selfTestReport = await waitFor(
      () => cdp.evaluate(`(function(){ const t = document.getElementById('custom-self-test-report').textContent; return /PASSED|FAILED/.test(t) ? t : null; })()`),
      { description: "self-test report to settle", timeoutMs: 10000 },
    );
    check("Step 4: self-test passes for a fully-configured component", selfTestReport.includes("COMPONENT READINESS — PASSED"), true);
    check("No uncaught error occurred anywhere in the run", await cdp.evaluate("window.__err"), null);

    await cdp.evaluate(`document.querySelector('#custom-component-dialog .dialog-close').click(); true`);
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Reset the error listener for the second scenario so its check isn't
    // reporting a stale (or absent) error from the first one.
    await cdp.evaluate(`window.__err = null; true`);
    await runImportScenario(cdp);
  } finally {
    cdp.close();
    stopApp();
    await new Promise((resolve) => setTimeout(resolve, 900));
    startApp({ debug: false });
  }

  const failed = checks.filter((entry) => !entry.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length) {
    console.error(`${failed.length} check(s) failed.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
