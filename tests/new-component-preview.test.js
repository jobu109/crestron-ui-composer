"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

global.window = global;
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
vm.runInThisContext(read("component-runtime.js"), { filename: "component-runtime.js" });
vm.runInThisContext(read("image.component.js"), { filename: "image.component.js" });
vm.runInThisContext(read("favorites.component.js"), { filename: "favorites.component.js" });
vm.runInThisContext(read("exporter.js"), { filename: "exporter.js" });

const defaults = (definition) =>
  Object.fromEntries((definition.properties || []).map((property) => [property.key, property.defaultValue]));
const item = (id, index, properties = {}) => {
  const definition = ComposerRuntime.get(id);
  return {
    id: `preview-${id}`,
    pageId: "page",
    name: definition.name,
    componentId: id,
    x: 30 + index * 360,
    y: 30,
    w: definition.defaultSize.width,
    h: definition.defaultSize.height,
    z: index + 1,
    properties: { ...defaults(definition), ...properties },
    signalBindings: {},
  };
};

const project = {
  version: 4,
  width: 900,
  height: 500,
  pages: [{ id: "page", name: "Page", background: "#101820", bindingMode: "none" }],
  items: [
    item("image", 0, { asset: "image-asset" }),
    item("favorites", 1),
  ],
  assets: [
    {
      id: "image-asset",
      name: "Preview.svg",
      type: "image/svg+xml",
      size: 1,
      dataUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%2304aa8e'/%3E%3C/svg%3E",
    },
  ],
};

const html = ComposerExporter.exportProject(project);
const runtimeStart = html.lastIndexOf("<script>") + 8;
const runtimeEnd = html.lastIndexOf("</script>");
new Function(html.slice(runtimeStart, runtimeEnd));

const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => candidate && fs.existsSync(candidate));

if (chrome) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "composer-new-preview-"));
  const file = path.join(directory, "index.html");
  const profile = path.join(directory, "chrome-profile");
  const errorProbe = `<script>window.__previewErrors=[];window.addEventListener('error',function(event){window.__previewErrors.push(String(event.error&&event.error.stack||event.error&&event.error.message||event.message))});<\/script>`,
    resultProbe = `<script>setTimeout(function(){var favorites=Array.from(document.querySelectorAll('[data-component="favorites"] .fav-item')),first=favorites[0]&&favorites[0].getBoundingClientRect(),second=favorites[1]&&favorites[1].getBoundingClientRect();document.body.dataset.previewError=window.__previewErrors.join(' | ');document.body.dataset.previewActive=String(!!document.querySelector('.page.active'));document.body.dataset.previewImage=String(!!document.querySelector('[data-component="image"] .image-picture[src^="data:image/"]'));document.body.dataset.previewFavorites=String(favorites.length);document.body.dataset.previewFavoriteSquare=String(!!first&&Math.abs(first.width-first.height)<1);document.body.dataset.previewFavoritesTouch=String(!!first&&!!second&&Math.abs(first.right-second.left)<1);document.body.dataset.previewReady='true'},250);<\/script>`;
  fs.writeFileSync(file, html.replace("<head>", "<head>" + errorProbe).replace("</body>", resultProbe + "</body>"), "utf8");
  try {
    const result = childProcess.spawnSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${profile}`,
      "--virtual-time-budget=1000",
      "--dump-dom",
      `file:///${file.replace(/\\/g, "/")}`,
    ], { encoding: "utf8", timeout: 20000 });
    const dom = result.stdout || "";
    const value = (key) => dom.match(new RegExp(`data-${key}="([^"]*)"`))?.[1];
    assert.equal(value("preview-ready"), "true");
    assert.equal(value("preview-error"), "", value("preview-error"));
    assert.equal(value("preview-active"), "true");
    assert.equal(value("preview-image"), "true");
    assert.equal(value("preview-favorites"), "6");
    assert.equal(value("preview-favorite-square"), "true");
    assert.equal(value("preview-favorites-touch"), "true");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

console.log("PASS Image and Favorites mount in standalone Preview");
