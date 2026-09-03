"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  fixtureRoot = path.join(__dirname, "fixtures", "component-workbench");
const workbench = require("../component-workbench.js");

function run(name, test) {
  try { test(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}\n${error.stack}`); process.exitCode = 1; }
}

run("advanced workbench fixtures cover every baseline component role", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "fixture-manifest.json"), "utf8")),
    expectedRoles = new Set(["blank", "button", "toggle", "gauge", "state-family", "animated-button", "analog-control", "pseudo-element", "text-input", "repeated-list", "advanced-javascript", "dynamic-elements"]);
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(new Set(manifest.fixtures.map((fixture) => fixture.role)), expectedRoles);
  manifest.fixtures.forEach((fixture) => {
    const source = fs.readFileSync(path.join(fixtureRoot, fixture.file), "utf8");
    assert.match(source, /<!doctype html>/i);
    fixture.requires.forEach((token) => assert.ok(source.includes(token), `${fixture.file} must retain ${token}`));
  });
});

run("legacy v3 component package survives a JSON round trip", () => {
  const source = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "legacy-component-v3.cuicomponent"), "utf8")),
    reopened = JSON.parse(JSON.stringify(source));
  assert.deepEqual(reopened, source);
  assert.equal(source.format, "crestron-ui-composer-component");
  assert.equal(source.version, 3);
  assert.ok(Array.isArray(source.component.properties));
  assert.ok(Array.isArray(source.component.signals));
  assert.ok(Array.isArray(source.component.behaviors));
  assert.ok(source.component.stateStyles);
  assert.ok(Array.isArray(source.component.elementRoles));
  assert.ok(Array.isArray(source.component.repeatedItems));
});

run("current package parser and exporter retain v3 compatibility", () => {
  const editor = fs.readFileSync(path.join(root, "editor.js"), "utf8");
  assert.ok(editor.includes('format: "crestron-ui-composer-component"'));
  assert.ok(editor.includes("version: 3"));
  assert.ok(editor.includes("![1, 2, 3].includes(packageValue.version)"));
  ["properties", "signals", "behaviors", "stateStyles", "elementRoles", "repeatedItems"].forEach((field) =>
    assert.ok(editor.includes(field), `current implementation must retain ${field}`),
  );
});

run("legacy component fields migrate into the versioned workbench schema", () => {
  const packageValue = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "legacy-component-v3.cuicomponent"), "utf8")),
    migrated = workbench.migrate(packageValue.component),
    validation = workbench.validate(migrated);
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.properties.length, packageValue.component.properties.length);
  assert.equal(migrated.connections.length, packageValue.component.signals.length);
  assert.equal(migrated.states.length, 2);
  assert.deepEqual(migrated.adapter.rules, packageValue.component.behaviors);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.ok(validation.warnings.some((warning) => warning.includes("target mapping")));
});

run("workbench validation rejects broken references and duplicate IDs", () => {
  const value = workbench.empty();
  value.parts.push({ id: "part-face", name: "Face", selector: ".face" });
  value.parts.push({ id: "part-face", name: "Duplicate", selector: ".other" });
  value.properties.push({ id: "property-color", key: "color", label: "Color", type: "color", target: { kind: "css-property", partId: "missing-part" } });
  const result = workbench.validate(value);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate part ID")));
  assert.ok(result.errors.some((error) => error.includes("missing part")));
});

run("workbench normalization preserves unknown future fields", () => {
  const future = workbench.empty();
  future.schemaVersion = 27;
  future.futureCapability = { mode: "not-yet-known", values: [1, 2, 3] };
  future.adapter.futureAdapterOption = { enabled: true };
  const normalized = workbench.normalize(future),
    validation = workbench.validate(normalized);
  assert.deepEqual(normalized.futureCapability, future.futureCapability);
  assert.deepEqual(normalized.adapter.futureAdapterOption, future.adapter.futureAdapterOption);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("Unsupported workbench schema version")));
});

run("workbench data survives component package and project JSON round trips", () => {
  const legacyPackage = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "legacy-component-v3.cuicomponent"), "utf8")),
    component = structuredClone(legacyPackage.component);
  component.workbench = workbench.migrate(component);
  component.workbench.extensionFixture = { retained: true };
  const packageRoundTrip = JSON.parse(JSON.stringify({ ...legacyPackage, component })),
    projectRoundTrip = JSON.parse(JSON.stringify({ customComponents: [component] }));
  assert.deepEqual(packageRoundTrip.component.workbench, component.workbench);
  assert.deepEqual(projectRoundTrip.customComponents[0].workbench, component.workbench);
  assert.equal(workbench.validate(packageRoundTrip.component.workbench).valid, true);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("All Advanced Component Workbench baseline checks passed.");
