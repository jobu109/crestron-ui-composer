(function (runtime) {
  "use strict";
  runtime.register({
    id: "rotary-knob",
    name: "Rotary Knob",
    category: "Sliders & Levels",
    defaultSize: { width: 220, height: 270 },
    properties: [
      { key: "localName", name: "Local name", type: "text", defaultValue: "Rotary Knob" },
      { key: "defaultPercent", name: "Default percentage", type: "number", defaultValue: 0, min: 0, max: 100, step: 1 },
      {
        key: "outputScale",
        name: "Outgoing analog scale",
        type: "select",
        options: [
          { value: "65535", label: "0–65535" },
          { value: "100", label: "0–100" },
        ],
        defaultValue: "65535",
      },
      { key: "knobColor", name: "Knob color", type: "color", defaultValue: "#d2d2d2" },
      { key: "knobShadowColor", name: "Knob shadow color", type: "color", defaultValue: "#555555" },
      { key: "ringColor", name: "Ring color", type: "color", defaultValue: "#dadada" },
      { key: "lowColor", name: "Gauge low color", type: "color", defaultValue: "#4caf50" },
      { key: "middleColor", name: "Gauge middle color", type: "color", defaultValue: "#ffeb3b" },
      { key: "highColor", name: "Gauge high color", type: "color", defaultValue: "#f44336" },
      { key: "markerColor", name: "Position marker color", type: "color", defaultValue: "#202428" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04dcb9" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "nameTextSize", name: "Name size", type: "number", defaultValue: 18 },
      { key: "valueTextSize", name: "Percentage size", type: "number", defaultValue: 26 },
      { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 12 },
    ],
    signals: [
      { key: "set", name: "Value Set", type: "analog", direction: "output", defaultValue: "RotaryKnob.ValueSet" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "RotaryKnob.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "RotaryKnob.Name" },
    ],
    template:
      '<div class="rotary-control"><div class="rotary-name">Rotary Knob</div><div class="rotary-knob" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="rotary-face"><span class="rotary-marker"></span></div></div><output class="rotary-value">0%</output></div>',
    styles:
      '[data-component="rotary-knob"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box;font-family:"Segoe UI",sans-serif;touch-action:none}' +
      '[data-component="rotary-knob"] .rotary-control{display:grid;grid-template-rows:auto minmax(0,1fr) auto;place-items:center;width:100%;height:100%;gap:7px}' +
      '[data-component="rotary-knob"] .rotary-name{max-width:100%;overflow:hidden;color:var(--text-color);font-size:var(--name-text-size-px);font-weight:800;text-align:center;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 2px 5px rgba(0,0,0,.72),0 0 8px var(--glow-color)}' +
      '[data-component="rotary-knob"] .rotary-knob{--gauge-progress:0%;--gauge-color:var(--low-color);position:relative;height:100%;max-height:100%;aspect-ratio:1;border:5px solid var(--ring-color);border-radius:50%;background:conic-gradient(from 225deg,color-mix(in srgb,var(--gauge-color) 72%,white) 0,var(--gauge-color) var(--gauge-progress),#111 var(--gauge-progress) 75%,#111 75% 100%);box-shadow:inset 0 0 0 2px rgba(0,0,0,.88),inset 0 0 calc(var(--glow-strength-px) * .7) color-mix(in srgb,var(--gauge-color) 70%,transparent),0 0 var(--glow-strength-px) color-mix(in srgb,var(--gauge-color) 85%,transparent),0 0 calc(var(--glow-strength-px) * 1.7) color-mix(in srgb,var(--glow-color) 55%,transparent);cursor:pointer;outline:none;touch-action:none}' +
      '[data-component="rotary-knob"] .rotary-knob:before{content:"";position:absolute;z-index:0;inset:-1px;border-radius:50%;background:conic-gradient(from 225deg,var(--gauge-color) 0 var(--gauge-progress),transparent var(--gauge-progress) 100%);filter:blur(calc(var(--glow-strength-px) * .45));opacity:.9;pointer-events:none}' +
      '[data-component="rotary-knob"] .rotary-face{position:absolute;z-index:1;inset:5%;border:2px solid rgba(255,255,255,.8);border-radius:50%;background:radial-gradient(circle at 48% 38%,color-mix(in srgb,var(--knob-color) 96%,white),var(--knob-color) 57%,var(--knob-shadow-color) 100%);box-shadow:inset 0 -12px 9px color-mix(in srgb,var(--knob-shadow-color) 45%,transparent),inset 0 5px 8px rgba(255,255,255,.62),0 3px 4px rgba(0,0,0,.68);transform:rotate(-135deg)}' +
      '[data-component="rotary-knob"] .rotary-marker{position:absolute;top:7%;left:50%;width:10%;aspect-ratio:1;border:2px solid var(--marker-color);border-radius:50%;background:linear-gradient(#fff,var(--knob-shadow-color));box-shadow:0 1px 2px rgba(0,0,0,.75);transform:translateX(-50%)}' +
      '[data-component="rotary-knob"] .rotary-value{display:block;color:var(--text-color);font-size:var(--value-text-size-px);font-weight:900;line-height:1;text-align:center;text-shadow:0 2px 5px rgba(0,0,0,.75),0 0 9px var(--glow-color)}',
    mount(root, context) {
      const knob = root.querySelector(".rotary-knob"),
        face = root.querySelector(".rotary-face"),
        output = root.querySelector(".rotary-value"),
        label = root.querySelector(".rotary-name"),
        properties = context.options.properties || {},
        fallbackName = String(properties.localName || "Rotary Knob");
      let dragging = false;
      label.textContent = fallbackName;
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function percent(value) {
        const number = Number(value) || 0;
        return clamp(Math.round(number > 100 ? (number / 65535) * 100 : number), 0, 100);
      }
      function mix(first, second, ratio) {
        const parse = (color) => {
          const value = String(color || "#000000").replace("#", "");
          return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) || 0);
        },
          a = parse(first), b = parse(second), amount = clamp(ratio, 0, 1);
        return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount)).join(",")})`;
      }
      function gaugeColor(amount) {
        if (amount <= 65)
          return mix(properties.lowColor || "#4caf50", properties.middleColor || "#ffeb3b", amount / 65);
        return mix(properties.middleColor || "#ffeb3b", properties.highColor || "#f44336", (amount - 65) / 35);
      }
      function update(value) {
        const amount = percent(value), angle = amount * 2.7 - 135;
        face.style.transform = `rotate(${angle}deg)`;
        knob.style.setProperty("--gauge-progress", `${amount * 0.75}%`);
        knob.style.setProperty("--gauge-color", gaugeColor(amount));
        output.textContent = `${amount}%`;
        knob.setAttribute("aria-valuenow", String(amount));
      }
      function publishFromPointer(event) {
        const rect = knob.getBoundingClientRect(),
          degrees = Math.atan2(
            event.clientY - rect.top - rect.height / 2,
            event.clientX - rect.left - rect.width / 2,
          ) * 180 / Math.PI,
          rotation = (degrees - 135 + 360) % 360;
        if (rotation > 270) return;
        const amount = Math.round((rotation / 270) * 100);
        update(amount);
        context.signals.publish(
          "set",
          properties.outputScale === "100"
            ? amount
            : Math.round((amount / 100) * 65535),
        );
      }
      function down(event) {
        dragging = true;
        knob.setPointerCapture?.(event.pointerId);
        publishFromPointer(event);
        event.preventDefault();
      }
      function move(event) {
        if (dragging) publishFromPointer(event);
      }
      function up() {
        dragging = false;
      }
      knob.addEventListener("pointerdown", down);
      knob.addEventListener("pointermove", move);
      knob.addEventListener("pointerup", up);
      knob.addEventListener("pointercancel", up);
      knob.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowRight" && event.key !== "ArrowDown" && event.key !== "ArrowLeft") return;
        const next = clamp(Number(knob.getAttribute("aria-valuenow")) + (/Up|Right/.test(event.key) ? 1 : -1), 0, 100);
        update(next);
        context.signals.publish("set", properties.outputScale === "100" ? next : Math.round((next / 100) * 65535));
        event.preventDefault();
      });
      context.signals.subscribe("feedback", update);
      context.signals.subscribe("name", (value) => {
        label.textContent = String(value == null || value === "" ? fallbackName : value);
      });
      update(clamp(Number(properties.defaultPercent) || 0, 0, 100));
      return () => {
        knob.removeEventListener("pointerdown", down);
        knob.removeEventListener("pointermove", move);
        knob.removeEventListener("pointerup", up);
        knob.removeEventListener("pointercancel", up);
      };
    },
  });
})(window.ComposerRuntime);
