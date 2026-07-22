(function (runtime) {
  "use strict";
  const active = (value) => value === true || value === 1 || value === "1";
  runtime.register({
    id: "illuminated-power-button",
    name: "Illuminated Power Button",
    category: "Buttons",
    defaultSize: { width: 210, height: 230 },
    properties: [
      { key: "text", name: "Default text", type: "text", defaultValue: "POWER" },
      { key: "contentMode", name: "Face content", type: "select", options: [{ value: "symbol", label: "Symbol" }, { value: "text", label: "Text" }, { value: "both", label: "Symbol and text" }], defaultValue: "symbol" },
      { key: "symbol", name: "Symbol", type: "select", options: [{ value: "⏻", label: "Power" }, { value: "⏼", label: "Standby" }, { value: "▶", label: "Play" }, { value: "■", label: "Stop" }, { value: "●", label: "Circle" }], defaultValue: "⏻" },
      { key: "offColor", name: "Off background / ring color", type: "color", defaultValue: "#e32636" },
      { key: "onColor", name: "On background / ring color", type: "color", defaultValue: "#00c853" },
      { key: "faceColor", name: "Center face color", type: "color", defaultValue: "#171b1d" },
      { key: "rimColor", name: "Outer rim color", type: "color", defaultValue: "#161a1c" },
      { key: "offContentColor", name: "Off symbol / text color", type: "color", defaultValue: "#ff6673" },
      { key: "onContentColor", name: "On symbol / text color", type: "color", defaultValue: "#8affad" },
      { key: "nameColor", name: "Name color", type: "color", defaultValue: "#ffffff" },
      { key: "symbolSize", name: "Symbol size", type: "number", min: 12, max: 120, step: 1, defaultValue: 60 },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 72, step: 1, defaultValue: 18 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 45, step: 1, defaultValue: 18 },
      { key: "showName", name: "Show name below button", type: "checkbox", defaultValue: false },
      { key: "defaultSelected", name: "Default ON state", type: "checkbox", defaultValue: false },
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "IlluminatedPowerButton.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "IlluminatedPowerButton.Selected" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "IlluminatedPowerButton.Name" },
    ],
    template: '<div class="ipb-root"><button class="ipb-button" type="button" aria-label="Power"><span class="ipb-ring"><span class="ipb-face"><span class="ipb-symbol">⏻</span><span class="ipb-text">POWER</span></span></span></button><span class="ipb-name">POWER</span></div>',
    styles: '[data-component="illuminated-power-button"]{display:block;width:100%;height:100%;padding:6%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="illuminated-power-button"] *{box-sizing:border-box}[data-component="illuminated-power-button"] .ipb-root{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:7px;width:100%;height:100%;align-items:center;justify-items:center}[data-component="illuminated-power-button"] .ipb-button{width:min(100%,100vh);height:min(100%,100vw);max-width:100%;max-height:100%;aspect-ratio:1;padding:7%;border:0;border-radius:50%;appearance:none;background:conic-gradient(from 25deg,#060707,#3d4346 12%,#0b0d0e 27%,#4b5255 42%,#080909 60%,#303538 76%,#050606 100%);box-shadow:inset 0 4px 7px rgba(255,255,255,.2),inset 0 -9px 14px #000,0 9px 16px rgba(0,0,0,.55);cursor:pointer;touch-action:none}[data-component="illuminated-power-button"] .ipb-ring{display:flex;width:100%;height:100%;padding:11%;border:2px solid #090b0c;border-radius:50%;background:radial-gradient(circle at 35% 28%,#454b4e,#111416 52%,#020303 100%);box-shadow:inset 0 4px 7px rgba(255,255,255,.2),inset 0 -7px 11px #000,0 0 calc(var(--glow-strength-px) * .35) var(--off-color);transition:box-shadow .22s}[data-component="illuminated-power-button"] .ipb-face{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2%;width:100%;height:100%;overflow:hidden;border:clamp(4px,5%,10px) solid var(--off-color);border-radius:50%;background:radial-gradient(circle at 40% 32%,color-mix(in srgb,var(--face-color) 82%,#fff),var(--face-color) 62%,color-mix(in srgb,var(--face-color) 58%,#000));box-shadow:0 0 var(--glow-strength-px) var(--off-color),inset 0 7px 11px rgba(255,255,255,.1),inset 0 -10px 16px rgba(0,0,0,.65);color:var(--off-content-color);transition:color .22s,border-color .22s,box-shadow .22s,transform .12s}[data-component="illuminated-power-button"] .ipb-symbol{display:flex;align-items:center;justify-content:center;font:700 var(--symbol-size-px)/1 "Segoe UI Symbol","Arial Unicode MS",sans-serif;text-align:center;text-shadow:0 0 calc(var(--glow-strength-px) * .75) currentColor}[data-component="illuminated-power-button"] .ipb-face.mode-symbol .ipb-symbol{position:absolute;inset:0;width:100%;height:100%;padding-bottom:3%}[data-component="illuminated-power-button"] .ipb-text{max-width:82%;overflow:hidden;font:800 var(--text-size-px)/1.1 "Segoe UI",sans-serif;text-overflow:ellipsis;text-shadow:0 0 calc(var(--glow-strength-px) * .55) currentColor;white-space:nowrap}[data-component="illuminated-power-button"] .ipb-button.on .ipb-ring{box-shadow:inset 0 4px 7px rgba(255,255,255,.2),inset 0 -7px 11px #000,0 0 calc(var(--glow-strength-px) * .35) var(--on-color)}[data-component="illuminated-power-button"] .ipb-button.on .ipb-face{border-color:var(--on-color);box-shadow:0 0 var(--glow-strength-px) var(--on-color),inset 0 7px 11px rgba(255,255,255,.1),inset 0 -10px 16px rgba(0,0,0,.65);color:var(--on-content-color)}[data-component="illuminated-power-button"] .ipb-button.pressed .ipb-face{transform:scale(.94);filter:brightness(1.2)}[data-component="illuminated-power-button"] .ipb-name{max-width:100%;overflow:hidden;color:var(--name-color);font:800 var(--text-size-px)/1.1 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 4px #000;white-space:nowrap}',
    mount(root, context) {
      const button = root.querySelector(".ipb-button"), ring = root.querySelector(".ipb-ring"), face = root.querySelector(".ipb-face"), symbol = root.querySelector(".ipb-symbol"), text = root.querySelector(".ipb-text"), name = root.querySelector(".ipb-name"), p = context.options.properties || {}, fallback = p.text || "POWER";
      const mode = p.contentMode || "symbol";
      ring.style.overflow = "hidden";
      ring.style.boxShadow = "inset 0 4px 7px rgba(255,255,255,.2), inset 0 -7px 11px #000";
      face.classList.add("mode-" + mode);
      symbol.textContent = p.symbol || "⏻";
      symbol.hidden = mode === "text";
      symbol.style.display = mode === "text" ? "none" : "";
      text.hidden = mode === "symbol";
      text.style.display = mode === "symbol" ? "none" : "";
      text.textContent = fallback;
      name.textContent = fallback;
      name.hidden = !(p.showName === true || String(p.showName).toLowerCase() === "true");
      function display(value) {
        const on = active(value), color = on ? "var(--on-color)" : "var(--off-color)";
        button.classList.toggle("on", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
        face.style.boxShadow = "0 0 calc(var(--glow-strength-px) * .55) " + color + ", 0 0 var(--glow-strength-px) " + color + ", inset 0 7px 11px rgba(255,255,255,.1), inset 0 -10px 16px rgba(0,0,0,.65)";
      }
      function down(event) { button.classList.add("pressed"); context.signals.publish("press", true); event.preventDefault(); }
      function up() { button.classList.remove("pressed"); context.signals.publish("press", false); }
      button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up); button.addEventListener("pointerleave", up); button.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", display);
      context.signals.subscribe("name", (value) => { const next = value == null || value === "" ? fallback : String(value); text.textContent = next; name.textContent = next; });
      display(p.defaultSelected === true || String(p.defaultSelected).toLowerCase() === "true");
      return () => { button.removeEventListener("pointerdown", down); button.removeEventListener("pointerup", up); button.removeEventListener("pointerleave", up); button.removeEventListener("pointercancel", up); };
    },
  });
})(window.ComposerRuntime);
