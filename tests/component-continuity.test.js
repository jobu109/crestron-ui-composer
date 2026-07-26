"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  root = path.resolve(__dirname, "..");

global.window = global;
global.ResizeObserver = class { observe() {} disconnect() {} };
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
vm.runInThisContext(read("component-runtime.js"), { filename: "component-runtime.js" });
const editorHtml = read("editor.html");
for (const match of editorHtml.matchAll(/<script src="([^"]+\.js)"/g)) {
  const file = match[1];
  if (["project-migrations.js", "component-runtime.js", "exporter.js", "editor.js"].includes(file)) continue;
  vm.runInThisContext(read(file), { filename: file });
}

const definitions = ComposerRuntime.definitions;
for (const definition of definitions.values()) {
  const keys = definition.properties.map((property) => property.key),
    hasEditableText = keys.some((key) =>
      /(text|label|name|title|artist|placeholder)/i.test(key) &&
      !/(signal|base|enabled|mode|show|position|source)/i.test(key),
    );
  if (!hasEditableText) continue;
  assert.ok(keys.some((key) => /size/i.test(key)), `${definition.id} lacks text sizing`);
  assert.ok(keys.some((key) => /color/i.test(key)), `${definition.id} lacks text/color styling`);
}

const counterpartPairs = [
  ["rolling-toggle", "rolling-toggle-vertical"],
  ["hole-toggle", "hole-toggle-vertical"],
  ["mic-hole-toggle", "mic-hole-toggle-vertical"],
  ["neumorphic-pill-toggle", "neumorphic-pill-toggle-vertical"],
  ["neumorphic-rocker-horizontal", "neumorphic-rocker-vertical"],
  ["neumorphic-rocker-v2-horizontal", "neumorphic-rocker-v2-vertical"],
  ["neumorphic-icon-nav", "neumorphic-icon-nav-vertical"],
  ["neumorphic-glass-nav", "neumorphic-glass-nav-vertical"],
  ["horizontal-button-list", "vertical-button-list"],
  ["neumorphic-horizontal-volume", "neumorphic-vertical-volume"],
  ["neumorphic-horizontal-volume-segmented", "neumorphic-vertical-volume-segmented"],
];
for (const [first, second] of counterpartPairs)
  assert.deepEqual(
    definitions.get(first).properties.map((property) => property.key).sort(),
    definitions.get(second).properties.map((property) => property.key).sort(),
    `${first} and ${second} expose different editor controls`,
  );

for (const id of ["single-light-control", "single-shade-control", "single-mic-control"])
  for (const key of ["showLabel", "showPercentage", "textSize", "valueTextSize", "textColor", "glowColor", "glowStrength"])
    assert.ok(definitions.get(id).properties.some((property) => property.key === key), `${id} lacks ${key}`);
assert.ok(definitions.get("single-mic-control").properties.some((property) => property.key === "showToggle"));
const hamburgerDirection = definitions.get("hamburger-popup").properties.find(
  (property) => property.key === "submenuDirection",
);
assert.deepEqual(
  hamburgerDirection.options.map((option) => option.value),
  ["above", "above-right", "right", "below-right", "below", "below-left", "left", "above-left"],
  "Hamburger Menu must expose all eight submenu directions",
);

const directStateComponents = [...definitions.values()].filter((definition) =>
  (definition.signals || []).some((signal) =>
    signal.type === "digital" && signal.direction === "input" && /selected$/i.test(signal.key),
  ),
);
const semanticStatePairs = [
  ["text", "selectedText", ["offText", "onText"], ["startText", "stopText"]],
  ["icon", "selectedIcon", ["offIcon", "onIcon"], ["symbol", "contentMode"]],
];
for (const definition of directStateComponents) {
  const keys = new Set(definition.properties.map((property) => property.key));
  const inheritance = definition.properties.find((property) => property.key === "selectedSameAsStandard");
  assert.ok(inheritance, `${definition.id} lacks the selected-state inheritance control`);
  assert.equal(inheritance.defaultValue, true, `${definition.id} must inherit its Standard state by default`);
  for (const [standard, selected, ...alternatives] of semanticStatePairs) {
    if (!keys.has(standard)) continue;
    assert.ok(
      keys.has(selected) || alternatives.some((pair) => pair.every((key) => keys.has(key))),
      `${definition.id} has ${standard} but no selected-state equivalent`,
    );
  }
}
for (const definition of directStateComponents)
  for (const selectedKey of Object.keys(definition.selectedStatePairs || {})) {
    const property = definition.properties.find((entry) => entry.key === selectedKey);
    if (!property) continue;
    assert.match(property.name, /^Selected state — /, `${definition.id}.${selectedKey} uses inconsistent state wording`);
    assert.deepEqual(
      property.disabledWhen,
      { key: "selectedSameAsStandard", value: true },
      `${definition.id}.${selectedKey} is editable while inheriting Standard state`,
    );
  }
for (const definition of directStateComponents) {
  const inherited = Object.keys(definition.selectedStatePairs || {});
  assert.ok(
    inherited.every((key) => !/(color|shadow|glow|border|surface)/i.test(key)),
    `${definition.id} inherits selected-state appearance styling`,
  );
  for (const property of definition.properties.filter((entry) =>
    /^selected/i.test(entry.key) && /(color|shadow|glow|border|surface)/i.test(entry.key),
  ))
    assert.equal(property.disabledWhen, undefined, `${definition.id}.${property.key} is disabled by content inheritance`);
}
for (const id of [
  "standard-button", "volume-up-button", "volume-down-button", "mute-button", "wave-button",
  "neumorphic-circle-button", "neumorphic-square-button", "music-card", "capsule-icon-dots",
]) {
  const keys = new Set(definitions.get(id).properties.map((property) => property.key));
  assert.ok(
    keys.has("selectedText") || keys.has("selectedTitle") || keys.has("selectedLabel"),
    `${id} lacks selected-state text`,
  );
}
for (const id of ["neumorphic-circle-button", "neumorphic-square-button", "music-card", "capsule-icon-dots"])
  assert.ok(definitions.get(id).properties.some((property) => property.key === "selectedIcon"), `${id} lacks selected-state icon`);

console.log(`PASS continuity profiles across ${definitions.size} components`);
