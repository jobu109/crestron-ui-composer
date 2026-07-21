(function (runtime) {
  "use strict";
  function mountGauge(root, context) {
    const properties = context.options.properties || {},
      kind = context.options.definitionData.kind,
      label = root.querySelector(".signal-label"),
      output = root.querySelector(".signal-value"),
      segments = [...root.querySelectorAll(".signal-segment")],
      fallbackName = String(properties.localName || (kind === "wifi" ? "Wi-Fi" : "Cell Signal"));
    label.textContent = fallbackName;
    root.querySelector(".signal-gauge").classList.toggle(
      "panel-off",
      properties.showPanel !== "yes",
    );
    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
    function percent(value) {
      const number = Number(value) || 0;
      return clamp(Math.round(number > 100 ? (number / 65535) * 100 : number), 0, 100);
    }
    function parse(color) {
      const value = String(color || "#000000").replace("#", "");
      return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) || 0);
    }
    function mix(first, second, ratio) {
      const a = parse(first), b = parse(second), amount = clamp(ratio, 0, 1);
      return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount)).join(",")})`;
    }
    function gaugeColor(amount) {
      if (amount <= 65)
        return mix(properties.lowColor || "#04dcb9", properties.middleColor || "#ffdb3b", amount / 65);
      return mix(properties.middleColor || "#ffdb3b", properties.highColor || "#f44336", (amount - 65) / 35);
    }
    function update(value) {
      const amount = percent(value),
        activeCount = amount === 0 ? 0 : Math.max(1, Math.ceil((amount / 100) * segments.length)),
        color = gaugeColor(amount);
      root.style.setProperty("--signal-color", color);
      const orderedSegments = kind === "wifi" ? [...segments].reverse() : segments;
      orderedSegments.forEach((segment, index) =>
        segment.classList.toggle("active", index < activeCount),
      );
      output.textContent = `${amount}%`;
    }
    context.signals.subscribe("feedback", update);
    context.signals.subscribe("name", (value) => {
      label.textContent = String(value == null || value === "" ? fallbackName : value);
    });
    update(clamp(Number(properties.defaultPercent) || 0, 0, 100));
  }
  const commonProperties = (name) => [
    { key: "localName", name: "Local text", type: "text", defaultValue: name },
    {
      key: "showPanel",
      name: "Show glass panel",
      type: "select",
      options: [
        { value: "no", label: "No — transparent" },
        { value: "yes", label: "Yes — glass panel" },
      ],
      defaultValue: "no",
    },
    { key: "defaultPercent", name: "Default percentage", type: "number", defaultValue: 0, min: 0, max: 100, step: 1 },
    { key: "lowColor", name: "Low color", type: "color", defaultValue: "#04dcb9" },
    { key: "middleColor", name: "Middle color", type: "color", defaultValue: "#ffdb3b" },
    { key: "highColor", name: "High color", type: "color", defaultValue: "#f44336" },
    { key: "inactiveColor", name: "Inactive color", type: "color", defaultValue: "#314442" },
    { key: "glowColor", name: "Panel glow color", type: "color", defaultValue: "#04dcb9" },
    { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
    { key: "textSize", name: "Label size", type: "number", defaultValue: 18, min: 1, max: 100 },
    { key: "valueTextSize", name: "Percentage size", type: "number", defaultValue: 25, min: 1, max: 100 },
    { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 14, min: 0, max: 100 },
  ];
  const signals = (prefix) => [
    { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: `${prefix}.Feedback` },
    { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: `${prefix}.Name` },
  ];
  const commonStyles = (scope) =>
    `${scope} .signal-gauge{display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:100%;height:100%;gap:7px;place-items:center;padding:12px;border:1px solid color-mix(in srgb,var(--glow-color) 52%,transparent);border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(4,170,142,.12) 45%,rgba(9,24,24,.58));box-shadow:inset 0 1px rgba(255,255,255,.25),inset 0 -18px 30px rgba(4,170,142,.08),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 42%,transparent);box-sizing:border-box}` +
    `${scope} .signal-gauge.panel-off{padding:4px;border-color:transparent;background:transparent;box-shadow:none}` +
    `${scope} .signal-label{max-width:100%;overflow:hidden;color:var(--text-color);font-size:var(--text-size-px);font-weight:800;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px rgba(0,0,0,.75),0 0 8px var(--glow-color);white-space:nowrap}` +
    `${scope} .signal-value{color:var(--text-color);font-size:var(--value-text-size-px);font-weight:900;line-height:1;text-shadow:0 2px 5px rgba(0,0,0,.75),0 0 9px var(--signal-color)}` +
    `${scope} .signal-segment{color:var(--inactive-color);transition:color .18s,fill .18s,filter .18s,background .18s}${scope} .signal-segment.active{color:var(--signal-color);filter:drop-shadow(0 0 4px var(--signal-color)) drop-shadow(0 0 9px var(--signal-color))}`;
  runtime.register({
    id: "wifi-gauge",
    name: "Wi-Fi Gauge",
    category: "Status & Information",
    defaultSize: { width: 220, height: 220 },
    properties: commonProperties("Wi-Fi"),
    signals: signals("WiFiGauge"),
    data: { kind: "wifi" },
    template:
      '<div class="signal-gauge"><div class="signal-label">Wi-Fi</div><svg class="wifi-display" viewBox="0 0 200 145" aria-hidden="true"><path class="signal-segment" d="M20 58 Q100 -5 180 58"/><path class="signal-segment" d="M47 84 Q100 42 153 84"/><path class="signal-segment" d="M73 109 Q100 87 127 109"/><circle class="signal-segment" cx="100" cy="130" r="10"/></svg><output class="signal-value">0%</output></div>',
    styles:
      '[data-component="wifi-gauge"]{display:block;width:100%;height:100%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}' +
      commonStyles('[data-component="wifi-gauge"]') +
      '[data-component="wifi-gauge"] .wifi-display{width:100%;height:100%;overflow:visible}[data-component="wifi-gauge"] path{fill:none;stroke:currentColor;stroke-width:15;stroke-linecap:round}[data-component="wifi-gauge"] circle{fill:currentColor}',
    mount: mountGauge,
  });
  runtime.register({
    id: "cell-bar-gauge",
    name: "Cell Bar Gauge",
    category: "Status & Information",
    defaultSize: { width: 220, height: 220 },
    properties: commonProperties("Cell Signal"),
    signals: signals("CellBarGauge"),
    data: { kind: "cell" },
    template:
      '<div class="signal-gauge"><div class="signal-label">Cell Signal</div><div class="cell-display"><i class="signal-segment"></i><i class="signal-segment"></i><i class="signal-segment"></i><i class="signal-segment"></i><i class="signal-segment"></i></div><output class="signal-value">0%</output></div>',
    styles:
      '[data-component="cell-bar-gauge"]{display:block;width:100%;height:100%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}' +
      commonStyles('[data-component="cell-bar-gauge"]') +
      '[data-component="cell-bar-gauge"] .cell-display{display:flex;align-items:flex-end;justify-content:center;width:88%;height:100%;gap:8%}[data-component="cell-bar-gauge"] .cell-display i{display:block;flex:1;border:1px solid color-mix(in srgb,currentColor 70%,white);border-radius:5px 5px 2px 2px;background:currentColor;box-shadow:inset 0 1px rgba(255,255,255,.34)}[data-component="cell-bar-gauge"] .cell-display i:nth-child(1){height:22%}[data-component="cell-bar-gauge"] .cell-display i:nth-child(2){height:40%}[data-component="cell-bar-gauge"] .cell-display i:nth-child(3){height:58%}[data-component="cell-bar-gauge"] .cell-display i:nth-child(4){height:76%}[data-component="cell-bar-gauge"] .cell-display i:nth-child(5){height:94%}',
    mount: mountGauge,
  });
  runtime.register({
    id: "battery-gauge",
    name: "Battery Gauge",
    category: "Status & Information",
    defaultSize: { width: 250, height: 220 },
    properties: [
      ...commonProperties("Battery"),
      { key: "chargingColor", name: "Charging color", type: "color", defaultValue: "#26a7ff" },
    ],
    signals: [
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "BatteryGauge.Feedback" },
      { key: "charging", name: "Charging", type: "digital", direction: "input", defaultValue: "BatteryGauge.Charging" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "BatteryGauge.Name" },
    ],
    template:
      '<div class="signal-gauge battery-panel"><div class="signal-label">Battery</div><div class="battery-display"><div class="battery-shell"><div class="battery-empty"></div><div class="battery-level"></div><div class="battery-bolt" aria-hidden="true"></div></div></div><output class="signal-value">0%</output></div>',
    styles:
      '[data-component="battery-gauge"]{display:block;width:100%;height:100%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}' +
      commonStyles('[data-component="battery-gauge"]') +
      '[data-component="battery-gauge"] .battery-display{display:grid;place-items:center;width:92%;height:100%;padding-right:8%;box-sizing:border-box}' +
      '[data-component="battery-gauge"] .battery-shell{position:relative;width:100%;height:68%;min-height:58px;border:7px solid color-mix(in srgb,var(--inactive-color) 78%,white);border-radius:13px;background:#091011;box-shadow:inset 0 0 12px rgba(0,0,0,.9);box-sizing:border-box}' +
      '[data-component="battery-gauge"] .battery-shell:after{content:"";position:absolute;top:25%;left:100%;width:9%;height:50%;border-radius:0 6px 6px 0;background:color-mix(in srgb,var(--inactive-color) 78%,white)}' +
      '[data-component="battery-gauge"] .battery-empty{position:absolute;inset:5px;border-radius:5px;background:linear-gradient(135deg,color-mix(in srgb,var(--inactive-color) 72%,black),#111);box-shadow:inset 0 0 7px rgba(255,255,255,.1)}' +
      '[data-component="battery-gauge"] .battery-level{position:absolute;z-index:1;top:5px;bottom:5px;left:5px;width:0;border-radius:5px;background:linear-gradient(90deg,color-mix(in srgb,var(--signal-color) 68%,black),var(--signal-color),color-mix(in srgb,var(--signal-color) 72%,white));box-shadow:inset 0 1px rgba(255,255,255,.45),0 0 8px var(--signal-color);transition:width .2s,background .2s}' +
      '[data-component="battery-gauge"] .battery-bolt{position:absolute;z-index:2;top:50%;left:50%;display:none;width:24%;height:72%;background:linear-gradient(135deg,#fff 0 24%,#bdeaff 42%,var(--charging-color) 100%);clip-path:polygon(56% 0,14% 48%,43% 48%,27% 100%,86% 39%,57% 39%,76% 0);filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 8px var(--charging-color)) drop-shadow(0 0 16px var(--charging-color));transform:translate(-50%,-50%)}' +
      '[data-component="battery-gauge"] .battery-shell.charging{border-color:var(--charging-color);box-shadow:inset 0 0 14px color-mix(in srgb,var(--charging-color) 40%,transparent),0 0 10px var(--charging-color),0 0 24px color-mix(in srgb,var(--charging-color) 75%,transparent);animation:battery-charge-halo 1.35s ease-in-out infinite}' +
      '[data-component="battery-gauge"] .battery-shell.low:not(.charging){border-color:var(--low-color);filter:brightness(1.12);box-shadow:inset 0 0 15px color-mix(in srgb,var(--low-color) 52%,transparent),0 0 11px var(--low-color),0 0 25px color-mix(in srgb,var(--low-color) 82%,transparent)}' +
      '[data-component="battery-gauge"] .battery-shell.critical:not(.charging){animation:battery-critical-pulse .8s ease-in-out infinite}' +
      '[data-component="battery-gauge"] .battery-shell.full:not(.charging){border-color:var(--high-color);filter:brightness(1.12);box-shadow:inset 0 0 15px color-mix(in srgb,var(--high-color) 52%,transparent),0 0 11px var(--high-color),0 0 25px color-mix(in srgb,var(--high-color) 82%,transparent)}' +
      '[data-component="battery-gauge"] .battery-shell.charging:after{background:var(--charging-color);box-shadow:0 0 12px var(--charging-color)}' +
      '[data-component="battery-gauge"] .battery-shell.charging .battery-level{background:linear-gradient(90deg,#075b91,var(--charging-color),#9cddff);box-shadow:inset 0 1px rgba(255,255,255,.58),0 0 13px var(--charging-color)}' +
      '[data-component="battery-gauge"] .battery-shell.charging .battery-bolt{display:block;animation:battery-bolt-pulse .85s ease-in-out infinite}' +
      '@keyframes battery-charge-halo{0%,100%{filter:brightness(.92)}50%{filter:brightness(1.3)}}@keyframes battery-critical-pulse{0%,100%{filter:brightness(.88);box-shadow:inset 0 0 11px color-mix(in srgb,var(--low-color) 42%,transparent),0 0 7px var(--low-color),0 0 17px color-mix(in srgb,var(--low-color) 65%,transparent)}50%{filter:brightness(1.28);box-shadow:inset 0 0 15px color-mix(in srgb,var(--low-color) 52%,transparent),0 0 11px var(--low-color),0 0 25px color-mix(in srgb,var(--low-color) 82%,transparent)}}@keyframes battery-bolt-pulse{0%,100%{opacity:.48;transform:translate(-50%,-50%) scale(.88)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}',
    mount(root, context) {
      const properties = context.options.properties || {},
        panel = root.querySelector(".signal-gauge"),
        shell = root.querySelector(".battery-shell"),
        level = root.querySelector(".battery-level"),
        label = root.querySelector(".signal-label"),
        output = root.querySelector(".signal-value"),
        fallbackName = String(properties.localName || "Battery");
      panel.classList.toggle("panel-off", properties.showPanel !== "yes");
      label.textContent = fallbackName;
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function percent(value) {
        const number = Number(value) || 0;
        return clamp(Math.round(number > 100 ? (number / 65535) * 100 : number), 0, 100);
      }
      function parse(color) {
        const value = String(color || "#000000").replace("#", "");
        return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) || 0);
      }
      function mix(first, second, ratio) {
        const a = parse(first), b = parse(second), amount = clamp(ratio, 0, 1);
        return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount)).join(",")})`;
      }
      function color(amount) {
        if (amount <= 65)
          return mix(properties.lowColor || "#04dcb9", properties.middleColor || "#ffdb3b", amount / 65);
        return mix(properties.middleColor || "#ffdb3b", properties.highColor || "#f44336", (amount - 65) / 35);
      }
      function update(value) {
        const amount = percent(value);
        root.style.setProperty("--signal-color", color(amount));
        level.style.width = `max(0px, calc(${amount}% - ${amount / 10}px))`;
        shell.classList.toggle("low", amount < 20);
        shell.classList.toggle("critical", amount < 10);
        shell.classList.toggle("full", amount >= 100);
        output.textContent = `${amount}%`;
      }
      context.signals.subscribe("feedback", update);
      context.signals.subscribe("charging", (value) =>
        shell.classList.toggle("charging", value === true || value === 1 || value === "1"),
      );
      context.signals.subscribe("name", (value) => {
        label.textContent = String(value == null || value === "" ? fallbackName : value);
      });
      update(clamp(Number(properties.defaultPercent) || 0, 0, 100));
    },
  });
})(window.ComposerRuntime);
