"use strict";
const assert = require("node:assert/strict"),
  childProcess = require("node:child_process"),
  fs = require("node:fs"),
  os = require("node:os"),
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
  definitions = ComposerRuntime.definitions,
  // Registered components that are intentionally not palette-listed: they're only ever
  // auto-created as a hidden system item (see ensureToastQueueItem() in editor.js), never
  // dragged onto a page by hand.
  internalOnlyComponents = new Set(["toast-queue"]);
assert.equal(
  definitions.size,
  manifestIds.size + internalOnlyComponents.size,
  "Manifest and runtime component counts differ",
);
manifestIds.forEach((id) => assert.ok(definitions.has(id), `Manifest component ${id} was not registered`));
internalOnlyComponents.forEach((id) =>
  assert.ok(definitions.has(id), `Internal-only component ${id} was not registered`),
);
for (const id of definitions.keys())
  assert.ok(
    manifestIds.has(id) || internalOnlyComponents.has(id),
    `Registered component ${id} is neither palette-listed nor declared internal-only`,
  );
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
    properties: Object.fromEntries((definition.properties || []).map((property) => [
      property.key,
      property.key === "fontAsset" ? "ComposerFont_audit_font" : property.defaultValue,
    ])),
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
    assets: [{
      id: "audit-font",
      name: "Audit Font.woff2",
      type: "font/woff2",
      size: 4,
      dataUrl: "data:font/woff2;base64,d09GMg==",
    }],
  }),
  runtimeStart = exportedHtml.lastIndexOf("<script>") + 8,
  runtimeEnd = exportedHtml.lastIndexOf("</script>");
assert.ok(exportedHtml.includes("weather-card"));
assert.ok(exportedHtml.includes("rolling-menu"));
assert.ok(exportedHtml.includes('@font-face{font-family:"ComposerFont_audit_font"'));
assert.ok(exportedHtml.includes("data:font/woff2;base64,d09GMg=="));
assert.ok(
  [...definitions.values()].filter((definition) =>
    definition.properties.some((property) => property.key === "fontAsset"),
  ).length > 20,
  "Expected shared font selection on text-capable widgets",
);
new Function(exportedHtml.slice(runtimeStart, runtimeEnd));
console.log(`PASS exported and compiled a catalog project containing all ${allWidgetItems.length} widgets`);

const widgetListDefinition = definitions.get("widget-list"),
  widgetTypeProperty = widgetListDefinition?.properties?.find((property) => property.key === "widgetType"),
  widgetListChoices = (widgetTypeProperty?.options || []).map((option) => String(option.value));
assert.ok(widgetListDefinition, "Widget List definition was not registered");
assert.ok(widgetListChoices.length > 0, "Widget List has no selectable included widgets");
widgetListChoices.forEach((id) => {
  assert.ok(definitions.has(id), `Widget List references missing included widget ${id}`);
  assert.notEqual(id, "widget-list", "Widget List cannot recursively include itself");
});
const widgetListDefaults = Object.fromEntries((widgetListDefinition.properties || []).map((property) => [property.key, property.defaultValue])),
  nestedWidgetListItems = widgetListChoices.map((id, index) => {
    const nested = definitions.get(id), properties = { ...widgetListDefaults, widgetType: id, defaultCount: "2" };
    (nested.properties || []).forEach((property) => {
      properties[`includedWidget__${property.key}`] = property.key === "iconSize" ? 61
        : property.key === "textSize" ? 23
        : property.key === "glowStrength" ? 7
        : property.defaultValue;
    });
    return {
      id: `nested-audit-${index}`, pageId: "nested-audit-page", name: `Widget List — ${nested.name}`,
      componentId: "widget-list", x: (index % 4) * 460, y: Math.floor(index / 4) * 300,
      w: 440, h: 280, z: index + 1, properties,
      signalBindings: { count: { mode: "contract", value: `NestedAudit.List${index}.Feedback` } },
    };
  }),
  nestedExportedHtml = ComposerExporter.exportProject({
    version: 4, width: 1920, height: 1200,
    pages: [{ id: "nested-audit-page", name: "Nested Audit", background: "#000", bindingMode: "none" }],
    items: nestedWidgetListItems, assets: [],
  }),
  nestedRuntimeStart = nestedExportedHtml.lastIndexOf("<script>") + 8,
  nestedRuntimeEnd = nestedExportedHtml.lastIndexOf("</script>");
widgetListChoices.forEach((id) => assert.ok(nestedExportedHtml.includes(`&quot;widgetType&quot;:&quot;${id}&quot;`) || nestedExportedHtml.includes(`"widgetType":"${id}"`), `Nested catalog did not export ${id}`));
new Function(nestedExportedHtml.slice(nestedRuntimeStart, nestedRuntimeEnd));
console.log(`PASS exported and compiled Widget List compatibility catalog containing ${widgetListChoices.length} included widget types`);

const chromeCandidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean),
  chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (chromePath) {
  const smokeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "composer-widget-list-smoke-")),
    smokeFile = path.join(smokeDirectory, "index.html"),
    chromeProfile = path.join(smokeDirectory, "chrome-profile"),
    signalMock = `<script>window.__smokeErrors=[];window.addEventListener('error',function(event){window.__smokeErrors.push(String(event.error&&event.error.message||event.message))});window.addEventListener('unhandledrejection',function(event){window.__smokeErrors.push(String(event.reason&&event.reason.message||event.reason))});window.__smokePublished=[];window.__smokeSubscriptions=[];window.CrComLib={publishEvent:function(type,address,value){window.__smokePublished.push([type,address,value])},subscribeState:function(type,address,callback){window.__smokeSubscriptions.push({type:type,address:address,callback:callback});return callback},unsubscribeState:function(){}};<\/script>`,
    interactionProbe = `<script>setTimeout(function(){var widgets=Array.from(document.querySelectorAll('.wl-widget'));widgets.forEach(function(widget){var target=widget.querySelector('button,[role="button"],input')||widget;target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:10,clientY:10}));target.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,clientX:10,clientY:10}))});var projectSubscriptions=window.__smokeSubscriptions.filter(function(subscription){return String(subscription.address).indexOf('Nested_Audit.')===0}),serials=projectSubscriptions.filter(function(subscription){return subscription.type==='s'}),analogs=projectSubscriptions.filter(function(subscription){return subscription.type==='n'}),digitals=projectSubscriptions.filter(function(subscription){return subscription.type==='b'}),invoke=function(subscription,value){try{subscription.callback(value)}catch(error){window.__smokeErrors.push(subscription.address+': '+String(error&&error.message||error))}};serials.forEach(function(subscription){invoke(subscription,'SmokeName')});var namedWidgets=widgets.filter(function(widget){return widget.textContent.indexOf('SmokeName')>=0}),namedText=namedWidgets.length;analogs.forEach(function(subscription){invoke(subscription,32768)});var analogText=(document.body.textContent.match(/(?:50|32768)%?/g)||[]).length;digitals.forEach(function(subscription){invoke(subscription,true)});var selectedVisuals=document.querySelectorAll('.wl-widget .active,.wl-widget .selected,.wl-widget .on,.wl-widget [aria-pressed="true"]').length,iconSizeVariables=widgets.filter(function(widget){return widget.style.getPropertyValue('--icon-size-percent')==='61%'}).length,textSizeVariables=widgets.filter(function(widget){return widget.style.getPropertyValue('--text-size-px')==='23px'}).length,glowVariables=widgets.filter(function(widget){return widget.style.getPropertyValue('--glow-strength-px')==='7px'}).length,missingTextSize=widgets.filter(function(widget){return widget.style.getPropertyValue('--text-size')&&widget.style.getPropertyValue('--text-size-px')!=='23px'}).map(function(widget){return widget.dataset.component+':'+widget.style.getPropertyValue('--text-size-px')});projectSubscriptions.forEach(function(subscription){invoke(subscription,subscription.type==='b'?false:subscription.type==='n'?0:'')});document.body.dataset.smokePublished=String(window.__smokePublished.length);document.body.dataset.smokeSubscriptions=String(projectSubscriptions.length);document.body.dataset.smokeSerialSubscriptions=String(serials.length);document.body.dataset.smokeSelectedVisuals=String(selectedVisuals);document.body.dataset.smokeNamedText=String(namedText);document.body.dataset.smokeNamedComponents=namedWidgets.map(function(widget){return widget.dataset.component}).join(',');document.body.dataset.smokeAnalogText=String(analogText);document.body.dataset.smokeIconSizeVariables=String(iconSizeVariables);document.body.dataset.smokeTextSizeVariables=String(textSizeVariables);document.body.dataset.smokeMissingTextSize=missingTextSize.join(',');document.body.dataset.smokeGlowVariables=String(glowVariables);document.body.dataset.smokeErrors=window.__smokeErrors.join(' | ');document.body.dataset.smokeComplete='true'},800);<\/script>`,
    instrumentedHtml = nestedExportedHtml.replace("</head>", signalMock + "</head>").replace("</body>", interactionProbe + "</body>");
  try {
    fs.writeFileSync(smokeFile, instrumentedHtml, "utf8");
    const result = childProcess.spawnSync(chromePath, [
      "--headless=new", "--disable-gpu", "--disable-gpu-compositing", "--disable-software-rasterizer",
      "--disable-dev-shm-usage", "--no-sandbox", "--no-first-run", "--no-default-browser-check",
      `--user-data-dir=${chromeProfile}`, "--virtual-time-budget=3000", "--dump-dom",
      new URL(`file:///${smokeFile.replace(/\\/g, "/")}`).href,
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 30000 });
    assert.equal(result.status, 0, `Chrome Widget List smoke test failed: ${result.stderr || result.error || "unknown error"}`);
    const mounted = (result.stdout.match(/class="[^"]*\bwl-widget\b[^"]*"/g) || []).length;
    assert.equal(mounted, widgetListChoices.length * 2, `Expected ${widgetListChoices.length * 2} mounted included widgets, found ${mounted}`);
    assert.doesNotMatch(result.stdout, /Component error:/i, "Widget List compatibility catalog rendered a component error");
    assert.match(result.stdout, /data-smoke-complete="true"/, "Widget List interaction probe did not complete");
    const published = Number(result.stdout.match(/data-smoke-published="(\d+)"/)?.[1] || 0),
      subscriptions = Number(result.stdout.match(/data-smoke-subscriptions="(\d+)"/)?.[1] || 0),
      serialSubscriptions = Number(result.stdout.match(/data-smoke-serial-subscriptions="(\d+)"/)?.[1] || 0),
      selectedVisuals = Number(result.stdout.match(/data-smoke-selected-visuals="(\d+)"/)?.[1] || 0),
      namedText = Number(result.stdout.match(/data-smoke-named-text="(\d+)"/)?.[1] || 0),
      namedComponents = result.stdout.match(/data-smoke-named-components="([^"]*)"/)?.[1] || "",
      analogText = Number(result.stdout.match(/data-smoke-analog-text="(\d+)"/)?.[1] || 0),
      iconSizeVariables = Number(result.stdout.match(/data-smoke-icon-size-variables="(\d+)"/)?.[1] || 0),
      textSizeVariables = Number(result.stdout.match(/data-smoke-text-size-variables="(\d+)"/)?.[1] || 0),
      missingTextSize = result.stdout.match(/data-smoke-missing-text-size="([^"]*)"/)?.[1] || "",
      glowVariables = Number(result.stdout.match(/data-smoke-glow-variables="(\d+)"/)?.[1] || 0),
      interactionErrors = result.stdout.match(/data-smoke-errors="([^"]*)"/)?.[1] || "";
    assert.ok(published > 10, `Widget List interaction probe published only ${published} signal events`);
    assert.ok(subscriptions > 10, `Widget List interaction probe created only ${subscriptions} feedback subscriptions`);
    assert.ok(selectedVisuals > 10, `Widget List feedback activated only ${selectedVisuals} visible selected states`);
    assert.ok(namedText > 10, `Widget List serial feedback updated only ${namedText} of ${serialSubscriptions} subscriptions (${namedComponents || "none"}); verify serial callbacks independently of the final DOM reset`);
    assert.ok(analogText > 5, `Widget List analog feedback updated only ${analogText} visible values`);
    const expectedPropertyWidgets = key => widgetListChoices.filter((id) => definitions.get(id).properties.some((property) => property.key === key)).length * 2;
    const signalOverriddenPropertyWidgets = key => widgetListChoices.filter((id) => {
      const definition = definitions.get(id);
      return definition.properties.some((property) => property.key === key)
        && (definition.addressBindings || []).some((binding) => new RegExp(key, "i").test(`${binding.key} ${binding.name}`));
    }).length * 2;
    assert.equal(iconSizeVariables, expectedPropertyWidgets("iconSize"), "Widget List did not propagate every included Icon Size percentage variable");
    assert.equal(textSizeVariables, expectedPropertyWidgets("textSize") - signalOverriddenPropertyWidgets("textSize"), `Widget List did not propagate included Text Size variables that were not superseded by feedback (${missingTextSize || "unknown"})`);
    assert.equal(glowVariables, expectedPropertyWidgets("glowStrength"), "Widget List did not propagate every included Glow Strength pixel variable");
    assert.equal(interactionErrors, "", `Widget List interaction/feedback error: ${interactionErrors}`);
    console.log(`PASS mounted ${mounted} included widgets; exercised ${published} publishes / ${subscriptions} feedback subscriptions; verified ${selectedVisuals} selected visuals, ${namedText} labels, ${analogText} analog displays, and ${iconSizeVariables + textSizeVariables + glowVariables} included style variables`);
  } finally {
    fs.rmSync(smokeDirectory, { recursive: true, force: true });
  }
} else console.log("SKIP Widget List browser smoke test (Google Chrome not installed)");
