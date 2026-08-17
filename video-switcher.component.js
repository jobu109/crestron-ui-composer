(function (runtime) {
  "use strict";
  const counts = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  const icons = [
    "none",
    "video",
    "display",
    "camera",
    "laptop",
    "desktop",
    "hdmi",
    "stream",
    "home",
    "play",
    "power",
  ].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
  const sourceDefaults = Array.from(
    { length: 20 },
    (_, index) => `Source ${index + 1}`,
  ).join("|");
  const tvDefaults = Array.from(
    { length: 20 },
    (_, index) => `TV ${index + 1}`,
  ).join("|");
  const sourceIconPattern = [
    "camera",
    "laptop",
    "desktop",
    "hdmi",
    "stream",
    "play",
  ];
  const iconDefaults = Array.from(
    { length: 20 },
    (_, index) => sourceIconPattern[index % sourceIconPattern.length],
  ).join("|");
  runtime.register({
    id: "video-switcher",
    name: "Video Switcher",
    category: "Multi-Devices",
    defaultSize: { width: 900, height: 520 },
    signals: [],
    addressBindings: [
      {
        name: "Number of sources",
        type: "analog",
        direction: "input",
        key: "sourceCountSignal",
      },
      {
        name: "Number of TVs",
        type: "analog",
        direction: "input",
        key: "tvCountSignal",
      },
    ],
    rangeBindings: [
      {
        name: "Source Press range",
        type: "digital",
        direction: "output",
        baseKey: "sourcePressBase",
        incrementKey: "sourceIncrement",
        countKey: "defaultSourceCount",
      },
      {
        name: "Source Selected range",
        type: "digital",
        direction: "input",
        baseKey: "sourceSelectedBase",
        incrementKey: "sourceIncrement",
        countKey: "defaultSourceCount",
      },
      {
        name: "Source Name range",
        type: "serial",
        direction: "input",
        baseKey: "sourceNameBase",
        incrementKey: "sourceIncrement",
        countKey: "defaultSourceCount",
      },
      {
        name: "TV Source Value Set range",
        type: "analog",
        direction: "output",
        baseKey: "tvValueSetBase",
        incrementKey: "tvIncrement",
        countKey: "defaultTvCount",
      },
      {
        name: "TV Source Feedback range",
        type: "analog",
        direction: "input",
        baseKey: "tvFeedbackBase",
        incrementKey: "tvIncrement",
        countKey: "defaultTvCount",
      },
      {
        name: "TV Press range",
        type: "digital",
        direction: "output",
        baseKey: "tvPressBase",
        incrementKey: "tvIncrement",
        countKey: "defaultTvCount",
      },
      {
        name: "TV Selected range",
        type: "digital",
        direction: "input",
        baseKey: "tvSelectedBase",
        incrementKey: "tvIncrement",
        countKey: "defaultTvCount",
      },
      {
        name: "TV Name range",
        type: "serial",
        direction: "input",
        baseKey: "tvNameBase",
        incrementKey: "tvIncrement",
        countKey: "defaultTvCount",
      },
    ],
    properties: [
      {
        key: "bindingMode",
        name: "Crestron binding mode",
        type: "select",
        options: [
          { value: "contract", label: "Contract names" },
          { value: "join", label: "Join numbers" },
        ],
        defaultValue: "contract",
        affectsBindings: true,
      },
      {
        key: "defaultSourceCount",
        name: "Default sources",
        type: "select",
        options: counts,
        defaultValue: "6",
        affectsProperties: true,
        group: "Sources",
      },
      {
        key: "sourcePosition",
        name: "Source position",
        type: "select",
        options: [
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
        defaultValue: "bottom",
        group: "Sources",
      },
      {
        key: "sourceLayout",
        name: "Source arrangement",
        type: "select",
        options: [
          { value: "auto", label: "Automatic for position" },
          { value: "row", label: "Horizontal row" },
          { value: "column", label: "Vertical column" },
          { value: "grid", label: "Grid" },
        ],
        defaultValue: "grid",
        group: "Sources",
      },
      {
        key: "sourceColumns",
        name: "Source grid columns",
        type: "number",
        min: 1,
        max: 20,
        defaultValue: 3,
        visibleWhen: { key: "sourceLayout", equals: "grid" },
        group: "Sources",
      },
      {
        key: "sourceDisplayMode",
        name: "Source display",
        type: "select",
        options: [
          { value: "card", label: "Card / box" },
          { value: "content", label: "Icon or asset + text (no box)" },
          { value: "visual", label: "Icon or asset only (no box)" },
          { value: "text", label: "Text only (no box)" },
        ],
        defaultValue: "card",
        group: "Sources",
      },
      {
        key: "sourceLabels",
        name: "Local source names",
        type: "text-list",
        countKey: "defaultSourceCount",
        itemName: "Source",
        defaultValue: sourceDefaults,
        group: "Sources",
      },
      {
        key: "sourceIcons",
        name: "Source icons",
        type: "select-list",
        countKey: "defaultSourceCount",
        itemName: "Source",
        options: icons,
        defaultItemValue: "video",
        defaultValue: iconDefaults,
        group: "Sources",
      },
      {
        key: "sourceAssets",
        name: "Standard source asset",
        type: "asset-list",
        countKey: "defaultSourceCount",
        itemName: "Source",
        assetSelector: ".vs-source",
        group: "Sources",
      },
      {
        key: "sourceSelectedAssets",
        name: "Selected source asset",
        type: "asset-list",
        countKey: "defaultSourceCount",
        itemName: "Source",
        assetSelector: ".vs-source",
        assetStateSelector: ".active",
        group: "Sources",
      },
      {
        key: "defaultTvCount",
        name: "Default TVs",
        type: "select",
        options: counts,
        defaultValue: "4",
        affectsProperties: true,
        group: "TVs",
      },
      {
        key: "tvLayout",
        name: "TV arrangement",
        type: "select",
        options: [
          { value: "grid", label: "Grid" },
          { value: "row", label: "Horizontal row" },
          { value: "column", label: "Vertical column" },
        ],
        defaultValue: "grid",
        group: "TVs",
      },
      {
        key: "tvColumns",
        name: "TV grid columns",
        type: "number",
        min: 1,
        max: 20,
        defaultValue: 2,
        visibleWhen: { key: "tvLayout", equals: "grid" },
        group: "TVs",
      },
      {
        key: "tvLabels",
        name: "Local TV names",
        type: "text-list",
        countKey: "defaultTvCount",
        itemName: "TV",
        defaultValue: tvDefaults,
        group: "TVs",
      },
      {
        key: "tvNamePosition",
        name: "Display name position",
        type: "select",
        options: [
          { value: "top-left", label: "Top left" },
          { value: "top-center", label: "Top center" },
          { value: "top-right", label: "Top right" },
          { value: "middle-left", label: "Middle left" },
          { value: "middle-center", label: "Middle center" },
          { value: "middle-right", label: "Middle right" },
          { value: "bottom-left", label: "Bottom left" },
          { value: "bottom-center", label: "Bottom center" },
          { value: "bottom-right", label: "Bottom right" },
        ],
        defaultValue: "top-center",
        group: "TVs",
      },
      {
        key: "tvAssets",
        name: "Standard TV asset",
        type: "asset-list",
        countKey: "defaultTvCount",
        itemName: "TV",
        assetSelector: ".vs-tv",
        group: "TVs",
      },
      {
        key: "tvSelectedAssets",
        name: "Assigned/selected TV asset",
        type: "asset-list",
        countKey: "defaultTvCount",
        itemName: "TV",
        assetSelector: ".vs-tv",
        assetStateSelector: ".assigned,.selected",
        group: "TVs",
      },
      {
        key: "noSourceText",
        name: "No Source text",
        type: "text",
        defaultValue: "NO SOURCE",
        group: "TVs",
      },
      {
        key: "noSourceValue",
        name: "No Source analog value",
        type: "number",
        min: 0,
        max: 65535,
        defaultValue: 65535,
        group: "TVs",
      },
      {
        key: "showSourceIcons",
        name: "Show source icons/assets",
        type: "checkbox",
        defaultValue: true,
        group: "Appearance",
      },
      {
        key: "showSourceNames",
        name: "Show source names",
        type: "checkbox",
        defaultValue: true,
        group: "Appearance",
      },
      {
        key: "showTvNames",
        name: "Show TV names",
        type: "checkbox",
        defaultValue: true,
        group: "Appearance",
      },
      {
        key: "showAssignedSource",
        name: "Show assigned source on TV",
        type: "checkbox",
        defaultValue: true,
        group: "Appearance",
      },
      {
        key: "sourceColor",
        name: "Source background",
        type: "color",
        defaultValue: "#263b3c",
        group: "Appearance",
      },
      {
        key: "sourceSelectedColor",
        name: "Selected source background",
        type: "color",
        defaultValue: "#087c6c",
        group: "Appearance",
      },
      {
        key: "tvColor",
        name: "TV background",
        type: "color",
        defaultValue: "#1f2b31",
        group: "Appearance",
      },
      {
        key: "tvAssignedColor",
        name: "Assigned TV background",
        type: "color",
        defaultValue: "#315a57",
        group: "Appearance",
      },
      {
        key: "textColor",
        name: "Standard text color",
        type: "color",
        defaultValue: "#ffffff",
        group: "Appearance",
      },
      {
        key: "selectedTextColor",
        name: "Selected text color",
        type: "color",
        defaultValue: "#ffffff",
        group: "Appearance",
      },
      {
        key: "accentColor",
        name: "Border / glow color",
        type: "color",
        defaultValue: "#04dcb9",
        group: "Appearance",
      },
      {
        key: "sourceTextSize",
        name: "Source text size",
        type: "number",
        min: 8,
        max: 72,
        defaultValue: 18,
        group: "Appearance",
      },
      {
        key: "tvTextSize",
        name: "TV text size",
        type: "number",
        min: 8,
        max: 72,
        defaultValue: 20,
        group: "Appearance",
      },
      {
        key: "iconSize",
        name: "Icon size",
        type: "number",
        min: 8,
        max: 120,
        defaultValue: 38,
        group: "Appearance",
      },
      {
        key: "assignedIconSize",
        name: "Assigned source icon size",
        type: "number",
        min: 8,
        max: 240,
        defaultValue: 72,
        group: "Appearance",
      },
      {
        key: "assignedLabelSize",
        name: "Assigned source label size",
        type: "number",
        min: 8,
        max: 96,
        defaultValue: 24,
        group: "Appearance",
      },
      {
        key: "cornerRadius",
        name: "Corner radius",
        type: "number",
        min: 0,
        max: 60,
        defaultValue: 14,
        group: "Appearance",
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        min: 0,
        max: 40,
        defaultValue: 12,
        group: "Appearance",
      },
      {
        key: "sourceCountSignal",
        name: "Source count feedback",
        type: "text",
        defaultValue: "VideoSwitcher.SourceCount.Feedback",
        signalSetting: true,
      },
      {
        key: "tvCountSignal",
        name: "TV count feedback",
        type: "text",
        defaultValue: "VideoSwitcher.TVCount.Feedback",
        signalSetting: true,
      },
      {
        key: "sourcePressBase",
        name: "Source Press pattern",
        type: "text",
        defaultValue: "VideoSwitcher.Sources[{index}].Press",
        signalSetting: true,
      },
      {
        key: "sourceSelectedBase",
        name: "Source Selected pattern",
        type: "text",
        defaultValue: "VideoSwitcher.Sources[{index}].Selected",
        signalSetting: true,
      },
      {
        key: "sourceNameBase",
        name: "Source Name pattern",
        type: "text",
        defaultValue: "VideoSwitcher.Sources[{index}].Label",
        signalSetting: true,
      },
      {
        key: "sourceIncrement",
        name: "Source join increment",
        type: "number",
        min: 1,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "tvValueSetBase",
        name: "TV Value Set pattern",
        type: "text",
        defaultValue: "VideoSwitcher.TVs[{index}].ValueSet",
        signalSetting: true,
      },
      {
        key: "tvFeedbackBase",
        name: "TV Feedback pattern",
        type: "text",
        defaultValue: "VideoSwitcher.TVs[{index}].Feedback",
        signalSetting: true,
      },
      {
        key: "tvPressBase",
        name: "TV Press pattern",
        type: "text",
        defaultValue: "VideoSwitcher.TVs[{index}].Press",
        signalSetting: true,
      },
      {
        key: "tvSelectedBase",
        name: "TV Selected pattern",
        type: "text",
        defaultValue: "VideoSwitcher.TVs[{index}].Selected",
        signalSetting: true,
      },
      {
        key: "tvNameBase",
        name: "TV Name pattern",
        type: "text",
        defaultValue: "VideoSwitcher.TVs[{index}].Label",
        signalSetting: true,
      },
      {
        key: "tvIncrement",
        name: "TV join increment",
        type: "number",
        min: 1,
        defaultValue: 1,
        signalSetting: true,
      },
    ],
    template:
      '<div class="vs-root"><section class="vs-sources"><div class="vs-heading">SOURCES</div><div class="vs-source-list"></div></section><section class="vs-destinations"><div class="vs-heading">DISPLAYS</div><div class="vs-tv-list"></div></section></div>',
    styles:
      '[data-component="video-switcher"]{display:block;width:100%;height:100%;overflow:hidden;box-sizing:border-box;color:var(--text-color);font-family:"Segoe UI",sans-serif;touch-action:none}[data-component="video-switcher"] *{box-sizing:border-box}[data-component="video-switcher"] .vs-root{display:grid;grid-template-columns:minmax(170px,30%) 1fr;gap:16px;width:100%;height:100%;padding:14px;background:rgba(8,18,20,.48);border:1px solid color-mix(in srgb,var(--accent-color) 45%,transparent);border-radius:var(--corner-radius);overflow:hidden}[data-component="video-switcher"][data-source-position="right"] .vs-root{grid-template-columns:1fr minmax(170px,30%)}[data-component="video-switcher"][data-source-position="right"] .vs-sources{order:2}[data-component="video-switcher"][data-source-position="top"] .vs-root{grid-template-columns:1fr;grid-template-rows:minmax(110px,30%) minmax(0,1fr)}[data-component="video-switcher"][data-source-position="bottom"] .vs-root{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) minmax(110px,30%)}[data-component="video-switcher"][data-source-position="bottom"] .vs-sources{order:2}[data-component="video-switcher"][data-source-position="top"] .vs-source-list,[data-component="video-switcher"][data-source-position="bottom"] .vs-source-list{flex-direction:row;overflow:auto}[data-component="video-switcher"][data-source-position="top"] .vs-source,[data-component="video-switcher"][data-source-position="bottom"] .vs-source{min-width:150px}[data-component="video-switcher"] section{min-width:0;min-height:0;display:flex;flex-direction:column;gap:10px}[data-component="video-switcher"] .vs-heading{flex:0 0 auto;color:var(--accent-color);font-size:13px;font-weight:900;letter-spacing:.16em}[data-component="video-switcher"] .vs-source-list{min-height:0;display:flex;flex-direction:column;gap:9px;overflow:auto;padding:6px}[data-component="video-switcher"] .vs-tv-list{min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));grid-auto-rows:minmax(140px,1fr);gap:12px;overflow:auto;padding:6px}[data-component="video-switcher"] .vs-source,[data-component="video-switcher"] .vs-tv{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:70px;padding:12px;border:1px solid color-mix(in srgb,var(--accent-color) 52%,white 10%);border-radius:var(--corner-radius);background-color:var(--source-color);background-image:linear-gradient(145deg,rgba(255,255,255,.14),transparent 52%);background-size:contain;background-position:center;background-repeat:no-repeat;color:var(--text-color);font-weight:800;cursor:grab;user-select:none;overflow:hidden;box-shadow:inset 0 0 14px rgba(255,255,255,.06),0 5px 12px rgba(0,0,0,.28);transition:transform .14s,background-color .18s,box-shadow .18s,border-color .18s,filter .18s}[data-component="video-switcher"] .vs-source{font-size:var(--source-text-size)}[data-component="video-switcher"]:not([data-source-display="card"]) .vs-source{border-color:transparent;background-color:transparent;background-image:none;box-shadow:none}[data-component="video-switcher"] .vs-source.active{background-color:var(--source-selected-color);color:var(--selected-text-color);box-shadow:0 0 var(--glow-strength) var(--accent-color),inset 0 0 16px rgba(255,255,255,.12)}[data-component="video-switcher"]:not([data-source-display="card"]) .vs-source.active{background-color:transparent;box-shadow:none;filter:drop-shadow(0 0 calc(var(--glow-strength) * .45) var(--accent-color))}[data-component="video-switcher"] .vs-source.dragging{transform:scale(.96);opacity:.72;cursor:grabbing}[data-component="video-switcher"] .vs-tv{min-height:140px;flex-direction:column;background-color:var(--tv-color);font-size:var(--tv-text-size);cursor:pointer}[data-component="video-switcher"] .vs-tv.drop-target{transform:scale(1.025);border-color:white;box-shadow:0 0 calc(var(--glow-strength) * 1.4) var(--accent-color)}[data-component="video-switcher"] .vs-tv.assigned,[data-component="video-switcher"] .vs-tv.selected{background-color:var(--tv-assigned-color);color:var(--selected-text-color);box-shadow:0 0 var(--glow-strength) var(--accent-color),inset 0 0 18px rgba(255,255,255,.1)}[data-component="video-switcher"] .vs-icon{display:grid;place-items:center;width:var(--icon-size);height:var(--icon-size);font-size:var(--icon-size);line-height:1;text-shadow:0 0 8px var(--accent-color);pointer-events:none}[data-component="video-switcher"] .vs-label,[data-component="video-switcher"] .vs-assigned{position:relative;z-index:2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none}[data-component="video-switcher"] .vs-assigned{font-size:.72em;color:var(--accent-color)}[data-component="video-switcher"] .vs-drag-ghost{position:absolute;z-index:2147483000;pointer-events:none;min-width:0;max-width:none;opacity:.92;transform:none;box-shadow:0 0 24px var(--accent-color)!important}@media(max-width:620px){[data-component="video-switcher"] .vs-root{grid-template-columns:1fr;grid-template-rows:minmax(120px,35%) minmax(0,1fr)}[data-component="video-switcher"][data-source-position="bottom"] .vs-root{grid-template-rows:minmax(0,1fr) minmax(120px,35%)}[data-component="video-switcher"] .vs-source-list{flex-direction:row;overflow:auto}[data-component="video-switcher"] .vs-source{min-width:150px}}',
    mount(root, context) {
      const p = context.options.properties || {},
        sourceHost = root.querySelector(".vs-source-list"),
        tvHost = root.querySelector(".vs-tv-list"),
        clamp = (value, max = 20) =>
          Math.max(1, Math.min(max, Math.round(Number(value) || 1))),
        truthy = (value) =>
          value === true ||
          value === 1 ||
          value === "1" ||
          String(value).toLowerCase() === "true";
      const layoutStyle = document.createElement("style");
      layoutStyle.textContent =
        '[data-component="video-switcher"][data-source-layout="row"] .vs-source-list{display:flex;flex-direction:row;overflow:auto}' +
        '[data-component="video-switcher"][data-source-layout="row"] .vs-source{min-width:150px}' +
        '[data-component="video-switcher"][data-source-layout="column"] .vs-source-list{display:flex;flex-direction:column}' +
        '[data-component="video-switcher"][data-source-layout="grid"] .vs-source-list{display:grid;grid-template-columns:repeat(var(--source-columns),minmax(0,1fr));align-content:start}' +
        '[data-component="video-switcher"][data-tv-layout="grid"] .vs-tv-list{display:grid;grid-template-columns:repeat(var(--tv-columns),minmax(0,1fr));grid-auto-rows:auto;align-content:start}' +
        '[data-component="video-switcher"][data-tv-layout="row"] .vs-tv-list{display:flex;flex-direction:row;align-items:center}' +
        '[data-component="video-switcher"][data-tv-layout="row"] .vs-tv{min-width:260px;flex:1 0 260px}' +
        '[data-component="video-switcher"][data-tv-layout="column"] .vs-tv-list{display:flex;flex-direction:column;align-items:center}' +
        '[data-component="video-switcher"] .vs-tv{display:block!important;position:relative;width:100%;height:auto!important;min-height:0!important;aspect-ratio:16/9;padding:0!important}' +
        '[data-component="video-switcher"] .vs-tv-header{position:absolute;z-index:5;display:block;width:auto;min-height:0;max-width:55%;padding:7px 10px;overflow:hidden;pointer-events:none}' +
        '[data-component="video-switcher"][data-tv-name-position="top-left"] .vs-tv-header{left:0;top:0;text-align:left}' +
        '[data-component="video-switcher"][data-tv-name-position="top-center"] .vs-tv-header{left:50%;top:0;transform:translateX(-50%);text-align:center}' +
        '[data-component="video-switcher"][data-tv-name-position="top-right"] .vs-tv-header{right:0;top:0;text-align:right}' +
        '[data-component="video-switcher"][data-tv-name-position="middle-left"] .vs-tv-header{left:0;top:50%;transform:translateY(-50%);text-align:left}' +
        '[data-component="video-switcher"][data-tv-name-position="middle-center"] .vs-tv-header{left:50%;top:50%;transform:translate(-50%,-50%);text-align:center}' +
        '[data-component="video-switcher"][data-tv-name-position="middle-right"] .vs-tv-header{right:0;top:50%;transform:translateY(-50%);text-align:right}' +
        '[data-component="video-switcher"][data-tv-name-position="bottom-left"] .vs-tv-header{left:0;bottom:0;text-align:left}' +
        '[data-component="video-switcher"][data-tv-name-position="bottom-center"] .vs-tv-header{left:50%;bottom:0;transform:translateX(-50%);text-align:center}' +
        '[data-component="video-switcher"][data-tv-name-position="bottom-right"] .vs-tv-header{right:0;bottom:0;text-align:right}' +
        '[data-component="video-switcher"] .vs-program{position:absolute;z-index:3;inset:8%;display:flex;min-width:0;min-height:0;align-items:center;justify-content:center;gap:clamp(10px,4%,28px);padding:6px;border:0;background-position:center;background-size:contain;background-repeat:no-repeat;background-color:transparent;box-shadow:none;overflow:hidden;cursor:grab}' +
        '[data-component="video-switcher"] .vs-program[hidden]{display:none}' +
        '[data-component="video-switcher"] .vs-program.dragging{opacity:.55;cursor:grabbing}' +
        '[data-component="video-switcher"] .vs-empty{position:absolute;inset:0;display:grid;place-items:center;color:color-mix(in srgb,var(--text-color) 55%,transparent);font-size:.72em;letter-spacing:.12em}' +
        '[data-component="video-switcher"] .vs-program-icon{flex:0 0 auto;font-size:var(--assigned-icon-size);width:var(--assigned-icon-size);height:var(--assigned-icon-size)}' +
        '[data-component="video-switcher"] .vs-program-label{font-size:var(--assigned-label-size);line-height:1.05;max-width:58%}';
      layoutStyle.textContent +=
        '[data-component="video-switcher"] .vs-icon svg{display:block;width:100%;height:100%;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 4px var(--accent-color))}' +
        '[data-component="video-switcher"] .vs-icon[hidden],[data-component="video-switcher"] .vs-label[hidden],[data-component="video-switcher"] .vs-empty[hidden]{display:none!important}' +
        '[data-component="video-switcher"] .vs-source-list{display:grid!important;flex:1 1 0;width:100%;height:auto;grid-template-columns:repeat(var(--source-fit-columns),minmax(0,1fr))!important;grid-template-rows:repeat(var(--source-fit-rows),minmax(0,1fr))!important;overflow:hidden!important}' +
        '[data-component="video-switcher"] .vs-source{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;padding:clamp(3px,2%,12px)!important}' +
        '[data-component="video-switcher"] .vs-tv-list{display:grid!important;flex:1 1 0;width:100%;height:auto;grid-template-columns:repeat(var(--tv-fit-columns),minmax(0,1fr))!important;grid-template-rows:repeat(var(--tv-fit-rows),minmax(0,1fr))!important;grid-auto-rows:unset!important;align-content:stretch!important;overflow:hidden!important}' +
        '[data-component="video-switcher"] .vs-tv{width:var(--tv-card-width)!important;height:var(--tv-card-height)!important;min-width:0!important;flex:none!important;justify-self:center;align-self:center}';
      root.appendChild(layoutStyle);
      const iconPaths = {
        video:
          '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
        display:
          '<rect x="2.5" y="4" width="19" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>',
        camera:
          '<path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="4"/>',
        laptop:
          '<rect x="4" y="4" width="16" height="12" rx="1.5"/><path d="M2 19h20l-2 2H4z"/>',
        desktop:
          '<rect x="2.5" y="3" width="14" height="11" rx="1.5"/><path d="M6 18h7M9.5 14v4"/><rect x="18.5" y="4" width="3" height="15" rx="1"/>',
        hdmi:
          '<path d="M4 8h16v8l-3 3H7l-3-3zM8 8V5m3 3V5m3 3V5m3 3V5"/><path d="M8 14h8"/>',
        stream:
          '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 6 3-6 3z"/>',
        home: '<path d="m3 11 9-8 9 8v10h-6v-6H9v6H3z"/>',
        play: '<path d="m7 4 13 8L7 20z"/>',
        power: '<path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1 0 11.2 0"/>',
      };
      const address = (base, increment, index) =>
        p.bindingMode === "join"
          ? String((Number(base) || 0) + index * (Number(increment) || 1))
          : String(base || "")
              .replace(/\{index\}/g, String(index))
              .replace(/\{n\}/g, String(index + 1));
      let sourceCount = clamp(p.defaultSourceCount || 6),
        tvCount = clamp(p.defaultTvCount || 4),
        sourceLabels = String(p.sourceLabels || sourceDefaults).split("|"),
        tvLabels = String(p.tvLabels || tvDefaults).split("|"),
        sourceIcons = String(p.sourceIcons || iconDefaults).split("|"),
        sourceSelected = Array(20).fill(false),
        tvSelected = Array(20).fill(false),
        assignments = Array(20).fill(-1),
        cleanups = [];
      const show = (value) =>
        value !== false &&
        value !== 0 &&
        value !== "0" &&
        String(value).toLowerCase() !== "false";
      root.dataset.sourcePosition = p.sourcePosition || "left";
      root.dataset.sourceDisplay = p.sourceDisplayMode || "card";
      root.dataset.sourceLayout = p.sourceLayout || "auto";
      root.dataset.tvLayout = p.tvLayout || "grid";
      root.dataset.tvNamePosition = p.tvNamePosition || "top-center";
      root.style.position = "relative";
      root.style.setProperty(
        "--source-columns",
        String(Math.max(1, Number(p.sourceColumns) || 3)),
      );
      root.style.setProperty(
        "--tv-columns",
        String(Math.max(1, Number(p.tvColumns) || 2)),
      );
      root.style.setProperty("--source-fit-columns", "1");
      root.style.setProperty("--source-fit-rows", String(sourceCount));
      root.style.setProperty("--tv-fit-columns", "1");
      root.style.setProperty("--tv-fit-rows", String(tvCount));
      root.style.setProperty("--tv-card-width", "180px");
      root.style.setProperty("--tv-card-height", "101px");
      root.style.setProperty("--source-color", p.sourceColor || "#263b3c");
      root.style.setProperty(
        "--source-selected-color",
        p.sourceSelectedColor || "#087c6c",
      );
      root.style.setProperty("--tv-color", p.tvColor || "#1f2b31");
      root.style.setProperty(
        "--tv-assigned-color",
        p.tvAssignedColor || "#315a57",
      );
      root.style.setProperty("--text-color", p.textColor || "#fff");
      root.style.setProperty(
        "--selected-text-color",
        p.selectedTextColor || "#fff",
      );
      root.style.setProperty("--accent-color", p.accentColor || "#04dcb9");
      root.style.setProperty(
        "--source-text-size",
        `${Number(p.sourceTextSize) || 18}px`,
      );
      root.style.setProperty(
        "--tv-text-size",
        `${Number(p.tvTextSize) || 20}px`,
      );
      root.style.setProperty("--icon-size", `${Number(p.iconSize) || 38}px`);
      root.style.setProperty(
        "--assigned-icon-size",
        `${Math.max(8, Math.min(240, Number(p.assignedIconSize) || 72))}px`,
      );
      root.style.setProperty(
        "--assigned-label-size",
        `${Math.max(8, Math.min(96, Number(p.assignedLabelSize) || 24))}px`,
      );
      root.style.setProperty(
        "--corner-radius",
        `${Number(p.cornerRadius) || 14}px`,
      );
      root.style.setProperty(
        "--glow-strength",
        `${Number(p.glowStrength) || 12}px`,
      );
      function icon(name) {
        const paths = iconPaths[name];
        return paths
          ? `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`
          : "";
      }
      function updateTv(index) {
        const target = tvHost.children[index];
        if (!target) return;
        const source = assignments[index],
          program = target.querySelector(".vs-program"),
          empty = target.querySelector(".vs-empty"),
          sourceElement = sourceHost.children[source];
        target.classList.toggle("assigned", source >= 0);
        target.classList.toggle("selected", tvSelected[index]);
        target.querySelector(".vs-tv-name").textContent = tvLabels[index] ?? "";
        program.hidden = source < 0;
        empty.hidden = source >= 0;
        empty.textContent = p.noSourceText || "NO SOURCE";
        if (source >= 0) {
          const computed = sourceElement
              ? getComputedStyle(sourceElement)
              : null,
            sourceAsset = computed
              ?.getPropertyValue("--composer-item-asset")
              .trim(),
            hasAsset = !!sourceAsset && sourceAsset !== "none";
          program.style.backgroundImage = hasAsset ? sourceAsset : "none";
          program.style.backgroundColor = "transparent";
          program.querySelector(".vs-program-icon").innerHTML = icon(
            sourceIcons[source],
          );
          program.querySelector(".vs-program-icon").hidden =
            hasAsset ||
            !show(p.showSourceIcons) ||
            (p.sourceDisplayMode || "card") === "text";
          program.querySelector(".vs-program-label").textContent = show(
            p.showAssignedSource,
          )
            ? (sourceLabels[source] ?? `Source ${source + 1}`)
            : "";
          program.querySelector(".vs-program-label").hidden =
            !program.querySelector(".vs-program-label").textContent;
        }
      }
      function updateSource(index) {
        const target = sourceHost.children[index];
        if (!target) return;
        target.classList.toggle("active", sourceSelected[index]);
        target.querySelector(".vs-icon").innerHTML = icon(sourceIcons[index]);
        target.querySelector(".vs-label").textContent =
          sourceLabels[index] ?? "";
      }
      function assign(tvIndex, sourceIndex, publish) {
        if (
          tvIndex < 0 ||
          tvIndex >= tvCount ||
          sourceIndex < 0 ||
          sourceIndex >= sourceCount
        )
          return;
        assignments[tvIndex] = sourceIndex;
        updateTv(tvIndex);
        if (publish) {
          context.signals.publishAddress(
            "analog",
            address(p.tvValueSetBase, p.tvIncrement, tvIndex),
            sourceIndex,
          );
          context.signals.publishAddress(
            "digital",
            address(p.tvPressBase, p.tvIncrement, tvIndex),
            true,
          );
          setTimeout(
            () =>
              context.signals.publishAddress(
                "digital",
                address(p.tvPressBase, p.tvIncrement, tvIndex),
                false,
              ),
            90,
          );
        }
      }
      function clearAssignment(tvIndex, publish) {
        if (tvIndex < 0 || tvIndex >= tvCount) return;
        assignments[tvIndex] = -1;
        updateTv(tvIndex);
        if (publish) {
          context.signals.publishAddress(
            "analog",
            address(p.tvValueSetBase, p.tvIncrement, tvIndex),
            Math.max(0, Math.min(65535, Number(p.noSourceValue ?? 65535))),
          );
          context.signals.publishAddress(
            "digital",
            address(p.tvPressBase, p.tvIncrement, tvIndex),
            true,
          );
          setTimeout(
            () =>
              context.signals.publishAddress(
                "digital",
                address(p.tvPressBase, p.tvIncrement, tvIndex),
                false,
              ),
            90,
          );
        }
      }
      function clearTargets() {
        tvHost
          .querySelectorAll(".drop-target")
          .forEach((element) => element.classList.remove("drop-target"));
      }
      function targetAt(x, y) {
        return Array.from(tvHost.children).find((target) => {
          const rect = target.getBoundingClientRect();
          return (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          );
        });
      }
      function wireSource(element, index) {
        let ghost = null,
          moved = false,
          startX = 0,
          startY = 0,
          grabX = 0,
          grabY = 0;
        const placeGhost = (event) => {
          const rect = root.getBoundingClientRect(),
            scaleX = root.offsetWidth / Math.max(1, rect.width),
            scaleY = root.offsetHeight / Math.max(1, rect.height);
          ghost.style.left = `${(event.clientX - rect.left) * scaleX - grabX}px`;
          ghost.style.top = `${(event.clientY - rect.top) * scaleY - grabY}px`;
        };
        const down = (event) => {
          if (event.button != null && event.button !== 0) return;
          startX = event.clientX;
          startY = event.clientY;
          moved = false;
          element.classList.add("dragging");
          element.setPointerCapture?.(event.pointerId);
          context.signals.publishAddress(
            "digital",
            address(p.sourcePressBase, p.sourceIncrement, index),
            true,
          );
          const computed = getComputedStyle(element),
            rect = element.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          grabX = (event.clientX - rect.left) * root.offsetWidth / Math.max(1, rootRect.width);
          grabY = (event.clientY - rect.top) * root.offsetHeight / Math.max(1, rootRect.height);
          ghost = element.cloneNode(true);
          ghost.classList.add("vs-drag-ghost");
          ghost.style.setProperty("width", `${rect.width}px`, "important");
          ghost.style.setProperty("height", `${rect.height}px`, "important");
          ghost.style.setProperty("min-width", "0", "important");
          ghost.style.setProperty("min-height", "0", "important");
          ghost.style.backgroundImage = computed.backgroundImage;
          ghost.style.backgroundColor = computed.backgroundColor;
          ghost.style.color = computed.color;
          ghost.style.borderRadius = computed.borderRadius;
          root.appendChild(ghost);
          placeGhost(event);
          event.preventDefault();
          event.stopPropagation();
        };
        const move = (event) => {
          if (!ghost) return;
          moved ||=
            Math.hypot(event.clientX - startX, event.clientY - startY) > 4;
          placeGhost(event);
          clearTargets();
          const target = targetAt(event.clientX, event.clientY);
          target?.classList.add("drop-target");
          event.preventDefault();
        };
        const finish = (event) => {
          if (!ghost) return;
          const target = targetAt(event.clientX, event.clientY);
          if (target && moved)
            assign(Number(target.dataset.index), index, true);
          ghost.remove();
          ghost = null;
          element.classList.remove("dragging");
          clearTargets();
          context.signals.publishAddress(
            "digital",
            address(p.sourcePressBase, p.sourceIncrement, index),
            false,
          );
          event.preventDefault();
        };
        element.addEventListener("pointerdown", down);
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerup", finish);
        element.addEventListener("pointercancel", finish);
        cleanups.push(() => {
          element.removeEventListener("pointerdown", down);
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerup", finish);
          element.removeEventListener("pointercancel", finish);
          ghost?.remove();
        });
      }
      function wireAssigned(program, tvIndex) {
        let ghost = null,
          moved = false,
          startX = 0,
          startY = 0,
          grabX = 0,
          grabY = 0,
          sourceIndex = -1;
        const placeGhost = (event) => {
          const rect = root.getBoundingClientRect(),
            scaleX = root.offsetWidth / Math.max(1, rect.width),
            scaleY = root.offsetHeight / Math.max(1, rect.height);
          ghost.style.left = `${(event.clientX - rect.left) * scaleX - grabX}px`;
          ghost.style.top = `${(event.clientY - rect.top) * scaleY - grabY}px`;
        };
        const down = (event) => {
          sourceIndex = assignments[tvIndex];
          if (sourceIndex < 0 || (event.button != null && event.button !== 0))
            return;
          startX = event.clientX;
          startY = event.clientY;
          moved = false;
          program.classList.add("dragging");
          program.setPointerCapture?.(event.pointerId);
          ghost = program.cloneNode(true);
          ghost.hidden = false;
          ghost.classList.add("vs-drag-ghost");
          const rect = program.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          grabX = (event.clientX - rect.left) * root.offsetWidth / Math.max(1, rootRect.width);
          grabY = (event.clientY - rect.top) * root.offsetHeight / Math.max(1, rootRect.height);
          ghost.style.setProperty("width", `${rect.width}px`, "important");
          ghost.style.setProperty("height", `${rect.height}px`, "important");
          ghost.style.setProperty("inset", "auto", "important");
          ghost.style.backgroundImage = program.style.backgroundImage;
          root.appendChild(ghost);
          placeGhost(event);
          event.preventDefault();
          event.stopPropagation();
        };
        const move = (event) => {
          if (!ghost) return;
          moved ||=
            Math.hypot(event.clientX - startX, event.clientY - startY) > 4;
          placeGhost(event);
          clearTargets();
          targetAt(event.clientX, event.clientY)?.classList.add("drop-target");
          event.preventDefault();
        };
        const finish = (event) => {
          if (!ghost) return;
          const target = targetAt(event.clientX, event.clientY);
          if (moved && target)
            assign(Number(target.dataset.index), sourceIndex, true);
          else if (moved) clearAssignment(tvIndex, true);
          ghost.remove();
          ghost = null;
          program.classList.remove("dragging");
          clearTargets();
          event.preventDefault();
        };
        const cancel = (event) => {
          if (!ghost) return;
          ghost.remove();
          ghost = null;
          program.classList.remove("dragging");
          clearTargets();
          event.preventDefault();
        };
        program.addEventListener("pointerdown", down);
        program.addEventListener("pointermove", move);
        program.addEventListener("pointerup", finish);
        program.addEventListener("pointercancel", cancel);
        cleanups.push(() => {
          program.removeEventListener("pointerdown", down);
          program.removeEventListener("pointermove", move);
          program.removeEventListener("pointerup", finish);
          program.removeEventListener("pointercancel", cancel);
          ghost?.remove();
        });
      }
      function applyFitLayout() {
        const sourceLayout = p.sourceLayout || "auto",
          sourcePosition = p.sourcePosition || "left",
          sourceColumns = sourceLayout === "row"
            ? sourceCount
            : sourceLayout === "column"
              ? 1
              : sourceLayout === "grid"
                ? Math.min(sourceCount, Math.max(1, Number(p.sourceColumns) || 3))
                : /top|bottom/.test(sourcePosition)
                  ? sourceCount
                  : 1,
          sourceRows = Math.max(1, Math.ceil(sourceCount / sourceColumns)),
          tvLayout = p.tvLayout || "grid",
          tvColumns = tvLayout === "row"
            ? tvCount
            : tvLayout === "column"
              ? 1
              : Math.min(tvCount, Math.max(1, Number(p.tvColumns) || 2)),
          tvRows = Math.max(1, Math.ceil(tvCount / tvColumns));
        root.style.setProperty("--source-fit-columns", String(sourceColumns));
        root.style.setProperty("--source-fit-rows", String(sourceRows));
        root.style.setProperty("--tv-fit-columns", String(tvColumns));
        root.style.setProperty("--tv-fit-rows", String(tvRows));
        requestAnimationFrame(() => {
          const gap = 12,
            horizontalPadding = 12,
            verticalPadding = 12,
            cellWidth = Math.max(1, (tvHost.clientWidth - horizontalPadding - gap * (tvColumns - 1)) / tvColumns),
            cellHeight = Math.max(1, (tvHost.clientHeight - verticalPadding - gap * (tvRows - 1)) / tvRows),
            cardWidth = Math.max(1, Math.min(cellWidth, cellHeight * 16 / 9)),
            cardHeight = Math.max(1, cardWidth * 9 / 16);
          root.style.setProperty("--tv-card-width", `${Math.floor(cardWidth)}px`);
          root.style.setProperty("--tv-card-height", `${Math.floor(cardHeight)}px`);
        });
      }
      function render() {
        cleanups.forEach((cleanup) => cleanup());
        cleanups = [];
        sourceHost.innerHTML = "";
        tvHost.innerHTML = "";
        const sourceMode = p.sourceDisplayMode || "card";
        for (let index = 0; index < sourceCount; index++) {
          const source = document.createElement("button");
          source.type = "button";
          source.className = "vs-source";
          source.dataset.index = index;
          source.innerHTML = `<span class="vs-icon"></span><span class="vs-label"></span>`;
          source.querySelector(".vs-icon").hidden =
            !show(p.showSourceIcons) || sourceMode === "text";
          source.querySelector(".vs-label").hidden =
            !show(p.showSourceNames) || sourceMode === "visual";
          sourceHost.appendChild(source);
          updateSource(index);
          wireSource(source, index);
        }
        for (let index = 0; index < tvCount; index++) {
          const tv = document.createElement("button");
          tv.type = "button";
          tv.className = "vs-tv";
          tv.dataset.index = index;
          tv.innerHTML = `<span class="vs-tv-header"><span class="vs-label vs-tv-name"></span></span><span class="vs-program" hidden><span class="vs-icon vs-program-icon"></span><span class="vs-label vs-program-label"></span></span><span class="vs-empty"></span>`;
          tv.querySelector(".vs-tv-name").hidden = !show(p.showTvNames);
          tvHost.appendChild(tv);
          updateTv(index);
          wireAssigned(tv.querySelector(".vs-program"), index);
        }
        applyFitLayout();
      }
      context.signals.subscribeAddress(
        "analog",
        p.sourceCountSignal,
        (value) => {
          const next = Math.round(Number(value));
          if (next > 0) {
            sourceCount = clamp(next);
            render();
          }
        },
      );
      context.signals.subscribeAddress("analog", p.tvCountSignal, (value) => {
        const next = Math.round(Number(value));
        if (next > 0) {
          tvCount = clamp(next);
          render();
        }
      });
      for (let index = 0; index < 20; index++) {
        context.signals.subscribeAddress(
          "serial",
          address(p.sourceNameBase, p.sourceIncrement, index),
          (value) => {
            if (value != null && String(value) !== "")
              sourceLabels[index] = String(value);
            updateSource(index);
            tvHost
              .querySelectorAll(".vs-tv")
              .forEach((_, tvIndex) => updateTv(tvIndex));
          },
        );
        context.signals.subscribeAddress(
          "digital",
          address(p.sourceSelectedBase, p.sourceIncrement, index),
          (value) => {
            sourceSelected[index] = truthy(value);
            updateSource(index);
            tvHost.querySelectorAll(".vs-tv").forEach((_, tvIndex) => {
              if (assignments[tvIndex] === index) updateTv(tvIndex);
            });
          },
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.tvNameBase, p.tvIncrement, index),
          (value) => {
            if (value != null && String(value) !== "")
              tvLabels[index] = String(value);
            updateTv(index);
          },
        );
        context.signals.subscribeAddress(
          "digital",
          address(p.tvSelectedBase, p.tvIncrement, index),
          (value) => {
            tvSelected[index] = truthy(value);
            updateTv(index);
          },
        );
        context.signals.subscribeAddress(
          "analog",
          address(p.tvFeedbackBase, p.tvIncrement, index),
          (value) => {
            const source = Math.round(Number(value));
            const noSource = Math.max(
              0,
              Math.min(65535, Math.round(Number(p.noSourceValue ?? 65535))),
            );
            if (source === noSource) {
              assignments[index] = -1;
              updateTv(index);
            } else if (source >= 0 && source < sourceCount) {
              assignments[index] = source;
              updateTv(index);
            }
          },
        );
      }
      render();
      const fitObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(applyFitLayout)
        : null;
      fitObserver?.observe(root);
      fitObserver?.observe(sourceHost);
      fitObserver?.observe(tvHost);
      return () => {
        fitObserver?.disconnect();
        cleanups.forEach((cleanup) => cleanup());
      };
    },
  });
})(window.ComposerRuntime);
