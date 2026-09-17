"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

global.window = global;
require(path.join(root, "font-awesome-free-icons.js"));
require(path.join(root, "component-runtime.js"));
require(path.join(root, "favorites.component.js"));
require(path.join(root, "exporter.js"));

assert.equal(ComposerIcons.version, "7.3.1");
assert.equal(ComposerIcons.options().length, 1591);
assert.ok(ComposerIcons.get("fa-solid:house"));
assert.ok(ComposerIcons.get("fa-regular:star"));
assert.match(
  ComposerIcons.svg("fa-solid:house", { className: "test-icon" }),
  /^<svg class="test-icon" viewBox="0 0 \d+ \d+"[^>]*><path /,
);
assert.match(
  ComposerIcons.svg("legacy", {
    legacy: { legacy: '<circle cx="12" cy="12" r="4"/>' },
  }),
  /<circle cx="12"/,
);
assert.deepEqual(Object.keys(ComposerIcons.pick(["fa-solid:house", "missing"])), [
  "fa-solid:house",
]);

ComposerRuntime.register({
  id: "font-awesome-test",
  properties: [
    { key: "icon", name: "Icon", type: "select" },
    { key: "buttonIcons", name: "Icons", type: "select-list" },
    { key: "iconColor", name: "Icon color", type: "color" },
    { key: "iconSize", name: "Icon size", type: "number" },
  ],
});
const properties = ComposerRuntime.get("font-awesome-test").properties;
const property = (key) => properties.find((entry) => entry.key === key);
assert.equal(property("icon").iconPicker, true);
assert.equal(property("buttonIcons").iconPicker, true);
assert.equal(property("iconColor").iconPicker, undefined);
assert.equal(property("iconSize").iconPicker, undefined);

const html = read("editor.html");
assert.ok(
  html.indexOf('src="font-awesome-free-icons.js"') <
    html.indexOf('src="component-runtime.js"'),
  "the icon catalog must load before the component runtime",
);
assert.match(read("editor.js"), /createIconPickerControl/);
assert.match(read("editor.css"), /icon-picker-results/);
assert.match(read("CrestronUiComposer/CrestronUiComposer.csproj"), /font-awesome-free-icons\.js/);
assert.match(read("CrestronUiComposer/CrestronUiComposer.csproj"), /FONT-AWESOME-FREE-LICENSE\.txt/);

const exporter = read("exporter.js");
assert.match(exporter, /ComposerIcons\?\.pick/);
assert.match(exporter, /icons:window\.ComposerIcons/);
assert.match(exporter, /Font Awesome Free .*CC BY 4\.0/);

const favorites = ComposerRuntime.get("favorites");
const exported = ComposerExporter.exportProject({
  version: 4,
  width: 800,
  height: 480,
  pages: [{ id: "page", name: "Page", background: "#000", bindingMode: "none" }],
  items: [
    {
      id: "favorite-icons",
      pageId: "page",
      componentId: "favorites",
      x: 0,
      y: 0,
      w: favorites.defaultSize.width,
      h: favorites.defaultSize.height,
      z: 1,
      properties: {
        ...Object.fromEntries(
          favorites.properties.map((entry) => [entry.key, entry.defaultValue]),
        ),
        itemCount: 1,
        item0Icon: "fa-solid:house",
      },
      signalBindings: {},
    },
  ],
  assets: [],
});
assert.match(exported, /"fa-solid:house"/);
assert.doesNotMatch(exported, /"fa-solid:car"/);
assert.match(exported, /Font Awesome Free 7\.3\.1 by Fonticons/);
const runtimeStart = exported.lastIndexOf("<script>") + 8;
const runtimeEnd = exported.lastIndexOf("</script>");
new Function(exported.slice(runtimeStart, runtimeEnd));

[
  "capsule-icon-dots.component.js",
  "directional-pad.component.js",
  "favorites.component.js",
  "icon-folder.component.js",
  "light-scenes.component.js",
  "music-card.component.js",
  "neumorphic-components.js",
  "neumorphic-kit-components.js",
  "pie-radial-menu.component.js",
  "video-switcher.component.js",
].forEach((file) =>
  assert.match(read(file), /context\.icons\.svg/, `${file} must use the shared icon renderer`),
);

console.log("Font Awesome icon catalog and component integration checks passed.");
