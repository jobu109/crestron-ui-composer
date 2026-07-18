(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "shutdown-progress", name: "Shutdown Progress", category: "Status & Information", defaultSize: { width: 420, height: 180 },
    signals: [
      { key: "progress", name: "Progress", type: "analog", direction: "input", defaultValue: "Shutdown.Progress" },
      { key: "note", name: "Status note", type: "serial", direction: "input", defaultValue: "Shutdown.Note" },
      { key: "title", name: "Title", type: "serial", direction: "input", defaultValue: "Shutdown.Title" },
      { key: "visible", name: "Visible feedback", type: "digital", direction: "input", defaultValue: "Shutdown.Visible" }
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "localTitle", name: "Local title", type: "text", defaultValue: "System Shutdown in Progress" },
      { key: "localNote", name: "Local status note", type: "text", defaultValue: "Estimated 0 Seconds Remaining..." },
      { key: "completeText", name: "Completion suffix", type: "text", defaultValue: "Complete" },
      { key: "defaultProgress", name: "Default progress (%)", type: "number", defaultValue: 0 },
      { key: "analogScale", name: "Analog input scale", type: "select", options: [{ value: "percent", label: "0–100" }, { value: "crestron", label: "0–65535" }], defaultValue: "percent" },
      { key: "panelColor", name: "Panel color", type: "color", defaultValue: "#1c1c1c" },
      { key: "trackColor", name: "Progress track color", type: "color", defaultValue: "#444444" },
      { key: "fillStartColor", name: "Fill start color", type: "color", defaultValue: "#04aa8e" },
      { key: "fillEndColor", name: "Fill end color", type: "color", defaultValue: "#03c383" },
      { key: "textColor", name: "Title text color", type: "color", defaultValue: "#ffffff" },
      { key: "percentageColor", name: "Percentage color", type: "color", defaultValue: "#04aa8e" },
      { key: "noteColor", name: "Note color", type: "color", defaultValue: "#cccccc" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "titleTextSize", name: "Title size (px)", type: "number", defaultValue: 28 },
      { key: "percentageTextSize", name: "Percentage size (px)", type: "number", defaultValue: 24 },
      { key: "noteTextSize", name: "Note size (px)", type: "number", defaultValue: 17 },
      { key: "barHeight", name: "Progress bar height (px)", type: "number", defaultValue: 20 },
      { key: "cornerRadius", name: "Panel corner radius (px)", type: "number", defaultValue: 12 },
      { key: "transitionSpeed", name: "Progress transition (seconds)", type: "number", defaultValue: 0.3 }
    ],
    template: '<div class="sp-root"><div class="sp-center"><div class="sp-box"><div class="sp-title"></div><div class="sp-details"><strong class="sp-value"></strong> <span class="sp-complete"></span></div><div class="sp-track"><div class="sp-fill"></div></div><div class="sp-note"></div></div></div></div>',
    styles: '[data-component="shutdown-progress"],[data-component="shutdown-progress"] *{box-sizing:border-box}[data-component="shutdown-progress"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.sp-root{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:6%;overflow:hidden;transition:opacity .2s}.sp-root.hidden{opacity:0;pointer-events:none}.sp-center{width:100%;max-width:700px}.sp-box{display:flex;flex-direction:column;gap:clamp(10px,4%,18px);padding:clamp(14px,5%,28px);border-radius:var(--corner-radius-px);background:var(--panel-color);box-shadow:0 0 25px color-mix(in srgb,var(--glow-color) 50%,transparent)}.sp-title{color:var(--text-color);font-size:var(--title-text-size-px);font-weight:600;line-height:1.1}.sp-details{color:var(--text-color);font-size:var(--percentage-text-size-px);font-weight:500}.sp-value{color:var(--percentage-color);font-weight:500}.sp-track{position:relative;height:var(--bar-height-px);overflow:hidden;border-radius:999px;background:var(--track-color);box-shadow:inset 0 2px 5px rgba(0,0,0,.4)}.sp-fill{height:100%;width:0;background:linear-gradient(to right,var(--fill-start-color),var(--fill-end-color));box-shadow:0 0 12px color-mix(in srgb,var(--glow-color) 55%,transparent);transition:width calc(var(--transition-speed)*1s) ease}.sp-note{color:var(--note-color);font-size:var(--note-text-size-px);line-height:1.2;text-align:center}',
    mount(root, context) {
      const p = context.options.properties || {}, host = root.querySelector(".sp-root"), title = root.querySelector(".sp-title"), note = root.querySelector(".sp-note"), value = root.querySelector(".sp-value"), fill = root.querySelector(".sp-fill");
      root.querySelector(".sp-complete").textContent = p.completeText || "Complete"; title.textContent = p.localTitle || "System Shutdown in Progress"; note.textContent = p.localNote || "Estimated 0 Seconds Remaining...";
      function setProgress(input) { const raw = Number(input) || 0, percent = Math.max(0, Math.min(100, Math.round(p.analogScale === "crestron" ? raw / 65535 * 100 : raw))); value.textContent = `${percent}%`; fill.style.width = `${percent}%`; }
      setProgress(p.defaultProgress); context.signals.subscribe("progress", setProgress); context.signals.subscribe("note", input => { note.textContent = input || p.localNote || "Estimated 0 Seconds Remaining..."; }); context.signals.subscribe("title", input => { title.textContent = input || p.localTitle || "System Shutdown in Progress"; }); context.signals.subscribe("visible", input => host.classList.toggle("hidden", !(input === true || input === 1 || input === "1")));
    }
  });
})(window);
