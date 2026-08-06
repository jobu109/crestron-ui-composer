(function (runtime) {
  "use strict";

  runtime.register({
    id: "wall-dimmer-light-load",
    name: "Wall Dimmer Light Load",
    category: "Sliders & Levels",
    defaultSize: { width: 150, height: 330 },
    properties: [
      { key: "text", name: "Default name", type: "text", defaultValue: "Light Load" },
      { key: "selectedText", name: "Selected name", type: "text", defaultValue: "" },
      { key: "outputScale", name: "Outgoing analog scale", type: "select", options: [{ value: "65535", label: "0–65535" }, { value: "100", label: "0–100" }], defaultValue: "65535" },
      { key: "faceColor", name: "Standard face color", type: "color", defaultValue: "#242424" },
      { key: "selectedFaceColor", name: "Selected face color", type: "color", defaultValue: "#293d39" },
      { key: "borderColor", name: "Standard border color", type: "color", defaultValue: "#555555" },
      { key: "selectedBorderColor", name: "Selected border color", type: "color", defaultValue: "#04aa8e" },
      { key: "iconColor", name: "Icon color", type: "color", defaultValue: "#a9adae" },
      { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedTextColor", name: "Selected text color", type: "color", defaultValue: "#ffffff" },
      { key: "ledTrackColor", name: "LED track color", type: "color", defaultValue: "#454545" },
      { key: "ledColor", name: "LED level color", type: "color", defaultValue: "#f2f5f7" },
      { key: "selectedLedColor", name: "Selected LED level color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowColor", name: "Standard glow color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedGlowColor", name: "Selected glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "showSliderMarker", name: "Show slider marker on LED bar", type: "checkbox", defaultValue: true },
      { key: "textSize", name: "Name text size", type: "number", min: 8, max: 48, step: 1, defaultValue: 15 },
      { key: "valueTextSize", name: "Value text size", type: "number", min: 8, max: 48, step: 1, defaultValue: 16 },
      { key: "iconSize", name: "Icon size", type: "number", min: 12, max: 72, step: 1, defaultValue: 28 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, step: 1, defaultValue: 10 },
      { key: "wrapText", name: "Wrap text", type: "checkbox", defaultValue: false },
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "WallDimmerLightLoad.Press" },
      { key: "onPress", name: "On Press", type: "digital", direction: "output", defaultValue: "WallDimmerLightLoad.OnPress" },
      { key: "offPress", name: "Off Press", type: "digital", direction: "output", defaultValue: "WallDimmerLightLoad.OffPress" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "WallDimmerLightLoad.Selected" },
      { key: "valueSet", name: "Value Set", type: "analog", direction: "output", defaultValue: "WallDimmerLightLoad.ValueSet" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "WallDimmerLightLoad.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "WallDimmerLightLoad.Name" },
    ],
    template: '<button class="wdl-load" type="button"><span class="wdl-recess"><span class="wdl-sun" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"></path></svg></span><span class="wdl-name">Light Load</span><span class="wdl-value">0%</span><span class="wdl-bulb" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.2 14.5a6 6 0 1 1 7.6 0c-1 .8-1.3 1.4-1.3 2.5h-5c0-1.1-.3-1.7-1.3-2.5Z"></path><path d="M9.5 20h5M10 17h4"></path></svg></span><span class="wdl-track"><span class="wdl-led"></span><span class="wdl-thumb"></span></span></span></button>',
    styles: '[data-component="wall-dimmer-light-load"]{display:block;width:100%;height:100%;padding:8%;box-sizing:border-box;font-family:"Segoe UI",sans-serif;touch-action:none}[data-component="wall-dimmer-light-load"] *{box-sizing:border-box}[data-component="wall-dimmer-light-load"] .wdl-load{position:relative;width:100%;height:100%;padding:5px;border:2px solid #111;border-radius:7px;background:linear-gradient(90deg,#171717,#3a3a3a 12%,#171717 88%,#050505);box-shadow:inset 0 0 4px rgba(255,255,255,.28),0 4px 10px rgba(0,0,0,.65);color:var(--text-color);cursor:pointer;touch-action:none}[data-component="wall-dimmer-light-load"] .wdl-recess{position:absolute;inset:6px;overflow:hidden;border:1px solid var(--border-color);border-radius:3px;background:linear-gradient(100deg,#1b1b1b,var(--face-color) 32%,var(--face-color) 78%,#111);box-shadow:inset 2px 0 5px rgba(255,255,255,.08),inset -4px 0 7px #050505,0 0 calc(var(--glow-strength-px) * .35) var(--glow-color);transition:background .2s,border-color .2s,box-shadow .2s}[data-component="wall-dimmer-light-load"] .wdl-sun,[data-component="wall-dimmer-light-load"] .wdl-bulb{position:absolute;left:12%;z-index:2;width:var(--icon-size-px);height:var(--icon-size-px);color:var(--icon-color);opacity:.86;pointer-events:none}[data-component="wall-dimmer-light-load"] .wdl-sun{top:7%}[data-component="wall-dimmer-light-load"] .wdl-bulb{bottom:7%}[data-component="wall-dimmer-light-load"] svg{display:block;width:100%;height:100%;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}[data-component="wall-dimmer-light-load"] .wdl-name,[data-component="wall-dimmer-light-load"] .wdl-value{position:absolute;right:25%;left:8%;z-index:2;overflow:hidden;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 4px #000;white-space:nowrap;pointer-events:none}[data-component="wall-dimmer-light-load"] .wdl-name{top:42%;font-size:var(--text-size-px);font-weight:700}[data-component="wall-dimmer-light-load"] .wdl-value{top:52%;font-size:var(--value-text-size-px);font-weight:800}[data-component="wall-dimmer-light-load"].wrap-text .wdl-name{overflow-wrap:anywhere;text-overflow:clip;white-space:normal}[data-component="wall-dimmer-light-load"] .wdl-track{position:absolute;top:17%;right:8%;bottom:10%;width:10%;min-width:5px;overflow:visible;border-radius:999px;background:var(--led-track-color);box-shadow:inset 1px 0 3px #000,inset -1px 0 2px rgba(255,255,255,.2);pointer-events:none}[data-component="wall-dimmer-light-load"] .wdl-led{position:absolute;right:0;bottom:0;left:0;height:0;border-radius:999px;background:var(--led-color);box-shadow:0 0 calc(var(--glow-strength-px) * .8) var(--led-color),0 0 calc(var(--glow-strength-px) * 1.4) var(--led-color);transition:height .12s linear}[data-component="wall-dimmer-light-load"] .wdl-thumb{position:absolute;right:50%;bottom:0;width:190%;height:4px;border-radius:4px;background:#fff;box-shadow:0 0 5px #fff;transform:translate(50%,50%);transition:bottom .12s linear}[data-component="wall-dimmer-light-load"] .wdl-load.pressed .wdl-recess{filter:brightness(1.16);transform:scale(.985)}[data-component="wall-dimmer-light-load"].state-selected .wdl-recess{border-color:var(--selected-border-color);background:linear-gradient(100deg,#1b1b1b,var(--selected-face-color) 32%,var(--selected-face-color) 78%,#111);box-shadow:inset 2px 0 5px rgba(255,255,255,.08),inset -4px 0 7px #050505,0 0 var(--glow-strength-px) var(--selected-glow-color)}[data-component="wall-dimmer-light-load"].state-selected .wdl-name,[data-component="wall-dimmer-light-load"].state-selected .wdl-value{color:var(--selected-text-color)}[data-component="wall-dimmer-light-load"].state-selected .wdl-led{background:var(--selected-led-color);box-shadow:0 0 calc(var(--glow-strength-px) * .8) var(--selected-led-color),0 0 calc(var(--glow-strength-px) * 1.4) var(--selected-led-color)}',
    mount(root, context) {
      const p = context.options.properties || {},
        button = root.querySelector(".wdl-load"),
        label = root.querySelector(".wdl-name"),
        valueNode = root.querySelector(".wdl-value"),
        led = root.querySelector(".wdl-led"),
        thumb = root.querySelector(".wdl-thumb"),
        track = root.querySelector(".wdl-track"),
        fallback = p.text || "Light Load";
      let active = false, activeSignal = "", selected = false, remoteName = "";
      thumb.hidden = p.showSliderMarker === false || p.showSliderMarker === 0 || p.showSliderMarker === "0" || String(p.showSliderMarker).toLowerCase() === "false";
      function percent(value) {
        const number = Number(value) || 0;
        return Math.max(0, Math.min(100, Math.round(number > 100 ? number / 65535 * 100 : number)));
      }
      function output(value) {
        return p.outputScale === "100" ? value : Math.round(value / 100 * 65535);
      }
      function truthy(value) {
        return value === true || value === 1 || value === "1";
      }
      function renderName() {
        label.textContent = remoteName || (selected && p.selectedText ? p.selectedText : fallback);
      }
      function update(value) {
        const level = percent(value);
        led.style.height = `${level}%`;
        thumb.style.bottom = `${level}%`;
        valueNode.textContent = `${level}%`;
      }
      function publish(event) {
        const rect = track.getBoundingClientRect(),
          level = Math.round(100 - Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)));
        update(level);
        context.signals.publish("valueSet", output(level));
      }
      function down(event) {
        const rect = button.getBoundingClientRect(), position = (event.clientY - rect.top) / rect.height;
        active = true;
        button.classList.add("pressed");
        activeSignal = position <= .28 ? "onPress" : position >= .72 ? "offPress" : "press";
        context.signals.publish(activeSignal, true);
        if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        if (activeSignal === "press") publish(event);
        event.preventDefault();
      }
      function move(event) {
        if (active && activeSignal === "press") publish(event);
      }
      function up() {
        if (!active) return;
        active = false;
        button.classList.remove("pressed");
        if (activeSignal) context.signals.publish(activeSignal, false);
        activeSignal = "";
      }
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointermove", move);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("lostpointercapture", up);
      context.signals.subscribe("selected", (value) => {
        selected = truthy(value);
        root.classList.toggle("state-selected", selected);
        renderName();
      });
      context.signals.subscribe("feedback", update);
      context.signals.subscribe("name", (value) => {
        remoteName = value == null || value === "" ? "" : String(value);
        renderName();
      });
      renderName();
      update(0);
      return () => {
        button.removeEventListener("pointerdown", down);
        button.removeEventListener("pointermove", move);
        button.removeEventListener("pointerup", up);
        button.removeEventListener("pointercancel", up);
        button.removeEventListener("lostpointercapture", up);
      };
    },
  });
})(window.ComposerRuntime);
