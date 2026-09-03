"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  editor = fs.readFileSync(path.join(root, "editor.js"), "utf8"),
  html = fs.readFileSync(path.join(root, "editor.html"), "utf8"),
  fixtureRoot = path.join(__dirname, "fixtures", "component-workbench"),
  manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "fixture-manifest.json"), "utf8"));

for (const role of ["blank", "button", "toggle", "gauge", "state-family", "text-input", "analog-control", "pseudo-element", "repeated-list"])
  assert.ok(manifest.fixtures.some((fixture) => fixture.role === role), `source-first ${role} fixture is missing`);

for (const persistenceMarker of [
  "writeComponentLibrary",
  "readComponentLibrary",
  "persistComponentLibrary",
  "scheduleComponentLibrarySave",
  "workbench: entry?.workbench || null",
  "generatedAdapter: entry?.generatedAdapter || null",
]) assert.ok(editor.includes(persistenceMarker), `${persistenceMarker} persistence is missing`);

for (const assetMarker of [
  "entry.workbench?.properties",
  "entry.workbench?.states",
  "mapping.defaultValue = idMap.get(mapping.defaultValue)",
  "stateDefinition.appearance.asset = idMap.get(stateDefinition.appearance.asset)",
]) assert.ok(editor.includes(assetMarker), `${assetMarker} package asset handling is missing`);

assert.ok(editor.includes("ComposerComponentWorkbench.migrate(entry)"));
assert.ok(editor.includes("ComposerComponentWorkbench.validate(entry.workbench)"));
assert.ok(editor.includes("migratedLegacyMappings: !importedWorkbenchVersion"));

for (const manualText of [
  "Component Workbench, packages, and reusable designs",
  "Button with Press",
  "Selected toggle",
  "Serial label",
  "Analog gauge or slider",
  "Repeated list",
  "Older packages:",
  ".cuicomponents",
]) assert.ok(html.includes(manualText), `Manual is missing ${manualText}`);

for (const fixture of manifest.fixtures) {
  const source = fs.readFileSync(path.join(fixtureRoot, fixture.file), "utf8"),
    ids = [...source.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]),
    scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${fixture.file} has duplicate IDs`);
  assert.ok(!/\b(?:100vw|100vh)\b/i.test(source), `${fixture.file} escapes its component viewport`);
  scripts.forEach((script, index) => {
    assert.doesNotThrow(() => new Function(script), `${fixture.file} script ${index + 1} is invalid`);
  });
  fixture.requires.forEach((token) => assert.ok(source.includes(token), `${fixture.file} lost ${token}`));
}

console.log(`component-workbench-packaging.test.js passed (${manifest.fixtures.length} fixtures)`);
