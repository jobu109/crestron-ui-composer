"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  root = path.resolve(__dirname, "..");

global.window = global;
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}
vm.runInThisContext(read("component-runtime.js"), { filename: "component-runtime.js" });

const editorHtml = read("editor.html"),
  componentScripts = [...editorHtml.matchAll(/<script src="([^"]+\.js)"/g)]
    .map((match) => match[1])
    .filter((name) => !["project-migrations.js", "component-runtime.js", "exporter.js", "editor.js"].includes(name)),
  externalHelpers = new Map();
componentScripts.forEach((file) => {
  const source = read(file),
    id = source.match(/\bid\s*:\s*["']([^"']+)["']/)?.[1],
    registerIndex = source.search(/(?:ComposerRuntime|runtime)\.register\s*\(/),
    prefix = source.slice(0, registerIndex < 0 ? 0 : registerIndex),
    names = [...prefix.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)].map((match) => match[1]);
  if (id && names.length) externalHelpers.set(id, names);
});
componentScripts.forEach((file) =>
  vm.runInThisContext(read(file), { filename: file }),
);
const desktopProject = read("CrestronUiComposer/CrestronUiComposer.csproj");
componentScripts.forEach((file) =>
  assert.match(
    desktopProject,
    new RegExp(
      `Content Include="\\.\\.\\\\${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
      "i",
    ),
    `Desktop package does not include ${file}`,
  ),
);

const manifest = JSON.parse(read("components.manifest.json")),
  manifestIds = new Set(manifest.components.map((entry) => entry.componentId)),
  definitions = ComposerRuntime.definitions;
assert.equal(definitions.size, manifestIds.size, "Manifest and runtime component counts differ");
manifestIds.forEach((id) => assert.ok(definitions.has(id), `Manifest component ${id} was not registered`));
assert.equal(
  definitions.get("lighting-control").rangeBindings.find((binding) => binding.baseKey === "feedbackBase")?.type,
  "analog",
  "Lighting Control feedback range must compile as analog contract feedback",
);
assert.doesNotMatch(
  definitions.get("folding-menu").styles,
  /(?:^|})\s*\.(?:primary|pbtn|sbtn|panel|inside|title|submenu|pi|pl|si|sl)\b/,
  "Folding Menu styles must not leak into the editor document",
);

const validTypes = new Set(["digital", "analog", "serial"]),
  validDirections = new Set(["input", "output"]),
  errors = [];
function problem(id, message) {
  errors.push(`${id}: ${message}`);
}

for (const [id, definition] of definitions) {
  const properties = new Map((definition.properties || []).map((entry) => [entry.key, entry])),
    signals = new Map(),
    mountSource = String(definition.mount || "");
  if (/\bglobal\./.test(mountSource))
    problem(id, "exported mount references editor-only global variable");
  for (const helper of externalHelpers.get(id) || [])
    if (new RegExp(`\\b${helper}\\s*\\(`).test(mountSource))
      problem(id, `exported mount references non-serialized helper ${helper}`);
  (definition.signals || []).forEach((signal) => {
    if (!signal.key) problem(id, "signal is missing a key");
    if (signals.has(signal.key)) problem(id, `duplicate signal key ${signal.key}`);
    signals.set(signal.key, signal);
    if (!validTypes.has(signal.type)) problem(id, `${signal.key} has invalid type ${signal.type}`);
    if (!validDirections.has(signal.direction)) problem(id, `${signal.key} has invalid direction ${signal.direction}`);
    if (signal.defaultValue) {
      const resolved = ComposerRuntime.resolveAddress(
        signal.defaultValue,
        signal.type,
        signal.direction,
        `Audit.${id.replace(/[^A-Za-z0-9_]/g, "_")}`,
      );
      if (!resolved) problem(id, `${signal.key} resolves to an empty address`);
    }
    const method = signal.direction === "input" ? "subscribe" : "publish",
      usage = new RegExp(`signals\\.${method}\\(\\s*["']${signal.key}["']`),
      dynamicUsage = new RegExp(`signals\\.${method}\\(\\s*[A-Za-z_$][\\w$]*`);
    if (!usage.test(mountSource) && !dynamicUsage.test(mountSource) && !signal.optionalProperty)
      problem(id, `${signal.direction} signal ${signal.key} is declared but never used by the runtime`);
  });
  for (const match of mountSource.matchAll(/signals\.(?:subscribe|publish)\(\s*["']([^"']+)["']/g))
    if (!signals.has(match[1])) problem(id, `runtime uses undeclared direct signal ${match[1]}`);

  const bindings = [
    ...(definition.addressBindings || []).map((entry) => ({ ...entry, bindingKind: "address", propertyKey: entry.key })),
    ...(definition.rangeBindings || []).map((entry) => ({ ...entry, bindingKind: "range", propertyKey: entry.baseKey })),
  ];
  bindings.forEach((binding) => {
    const property = properties.get(binding.propertyKey);
    if (!property) problem(id, `${binding.bindingKind} binding references missing property ${binding.propertyKey}`);
    if (binding.incrementKey && !properties.has(binding.incrementKey))
      problem(id, `range binding references missing increment ${binding.incrementKey}`);
    if (!validTypes.has(binding.type)) problem(id, `${binding.propertyKey} has invalid type ${binding.type}`);
    if (!validDirections.has(binding.direction)) problem(id, `${binding.propertyKey} has invalid direction ${binding.direction}`);
    const value = String(property?.defaultValue || "");
    if (!value) problem(id, `${binding.propertyKey} has no default address`);
    if (binding.bindingKind === "range" && !/^\d+$/.test(value) && !/\{n\}|\{index\}/.test(value))
      problem(id, `${binding.propertyKey} range has no zero-based placeholder`);
    const sample = value.replace(/\{n\}/g, "3").replace(/\{index\}/g, "2"),
      resolved = ComposerRuntime.resolveAddress(
        sample,
        binding.type,
        binding.direction,
        `Audit.${id.replace(/[^A-Za-z0-9_]/g, "_")}`,
      );
    if (!resolved) problem(id, `${binding.propertyKey} resolves to an empty address`);
    if (/\{n\}|\{index\}/.test(resolved)) problem(id, `${binding.propertyKey} leaves an unresolved item placeholder`);
    if (binding.bindingKind === "range" && !/^\d+$/.test(value) && !resolved.includes("[2]"))
      problem(id, `${binding.propertyKey} does not preserve zero-based item 2`);
  });

  for (const match of mountSource.matchAll(/signals\.(?:subscribeAddress|publishAddress)\([^,]+,\s*p\.([A-Za-z_$][\w$]*)/g)) {
    const key = match[1];
    if (!bindings.some((binding) => binding.propertyKey === key))
      problem(id, `runtime address property ${key} is not declared as a binding`);
  }
  for (const match of mountSource.matchAll(/address\(p\.([A-Za-z_$][\w$]*)/g)) {
    const key = match[1];
    if (!(definition.rangeBindings || []).some((binding) => binding.baseKey === key))
      problem(id, `runtime range property ${key} is not declared as a range binding`);
  }

  const resolvedBindings = new Map();
  [...(definition.signals || []).map((signal) => ({
    owner: `signal ${signal.key}`, value: signal.defaultValue, type: signal.type, direction: signal.direction,
  })), ...bindings.map((binding) => ({
    owner: `${binding.bindingKind} ${binding.propertyKey}`,
    value: properties.get(binding.propertyKey)?.defaultValue,
    type: binding.type,
    direction: binding.direction,
  }))].forEach((binding) => {
    if (!binding.value) return;
    const sample = String(binding.value).replace(/\{n\}/g, "1").replace(/\{index\}/g, "0"),
      resolved = ComposerRuntime.resolveAddress(sample, binding.type, binding.direction, `Audit.${id}`),
      collisionKey = `${binding.type}:${binding.direction}:${resolved}`;
    if (resolvedBindings.has(collisionKey))
      problem(id, `${binding.owner} collides with ${resolvedBindings.get(collisionKey)} at ${resolved}`);
    else resolvedBindings.set(collisionKey, binding.owner);
  });
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`PASS audited ${definitions.size} widget definitions and ${componentScripts.length} component scripts`);

vm.runInThisContext(read("exporter.js"), { filename: "exporter.js" });
const allWidgetItems = [...definitions.values()].map((definition, index) => ({
    id: `audit-${index}`,
    pageId: "audit-page",
    name: definition.name,
    componentId: definition.id,
    x: (index % 8) * 220,
    y: Math.floor(index / 8) * 180,
    w: definition.defaultSize?.width || 200,
    h: definition.defaultSize?.height || 120,
    z: index + 1,
    properties: Object.fromEntries((definition.properties || []).map((property) => [property.key, property.defaultValue])),
    signalBindings: Object.fromEntries((definition.signals || []).map((signal) => [
      signal.key,
      { mode: /^\d+$/.test(String(signal.defaultValue || "")) ? "join" : "contract", value: signal.defaultValue || "" },
    ])),
  })),
  exportedHtml = ComposerExporter.exportProject({
    version: 4,
    width: 1920,
    height: 1200,
    pages: [{ id: "audit-page", name: "Audit", background: "#000", bindingMode: "none" }],
    items: allWidgetItems,
  }),
  runtimeStart = exportedHtml.lastIndexOf("<script>") + 8,
  runtimeEnd = exportedHtml.lastIndexOf("</script>");
assert.ok(exportedHtml.includes("weather-card"));
assert.ok(exportedHtml.includes("rolling-menu"));
new Function(exportedHtml.slice(runtimeStart, runtimeEnd));
console.log(`PASS exported and compiled a catalog project containing all ${allWidgetItems.length} widgets`);
