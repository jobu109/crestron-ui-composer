(function (runtime) {
  "use strict";
  const high = (value) => value === true || value === 1 || value === "1";
  runtime.register({
    id: "power-rocker",
    name: "Power Rocker",
    category: "Buttons",
    defaultSize: { width: 220, height: 260 },
    properties: [
      { key: "text", name: "Default name", type: "text", defaultValue: "POWER" },
      { key: "faceColor", name: "Rocker face color", type: "color", defaultValue: "#25292a" },
      { key: "rimColor", name: "Outer rim color", type: "color", defaultValue: "#101313" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#454c4c" },
      { key: "onLedColor", name: "On LED color", type: "color", defaultValue: "#00e65c" },
      { key: "offLedColor", name: "Off LED color", type: "color", defaultValue: "#e32636" },
      { key: "textColor", name: "Name color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Rocker glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "textSize", name: "Name size", type: "number", min: 8, max: 72, step: 1, defaultValue: 20 },
      { key: "ledSize", name: "LED size", type: "number", min: 6, max: 42, step: 1, defaultValue: 20 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, step: 1, defaultValue: 12 },
      { key: "showLabel", name: "Show name", type: "checkbox", defaultValue: true },
    ],
    signals: [
      { key: "onPress", name: "On Press", type: "digital", direction: "output", defaultValue: "PowerRocker.OnPress" },
      { key: "offPress", name: "Off Press", type: "digital", direction: "output", defaultValue: "PowerRocker.OffPress" },
      { key: "onSelected", name: "On Selected", type: "digital", direction: "input", defaultValue: "PowerRocker.OnSelected" },
      { key: "offSelected", name: "Off Selected", type: "digital", direction: "input", defaultValue: "PowerRocker.OffSelected" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "PowerRocker.Name" },
    ],
    template:
      '<div class="power-rocker-root"><button class="power-rocker" type="button" aria-label="Power"><span class="rocker-well"><span class="rocker-face"><span class="rocker-half rocker-top"></span><span class="rocker-hinge"></span><span class="rocker-half rocker-bottom"><span class="rocker-led"></span></span></span></span></button><span class="rocker-name">POWER</span></div>',
    styles:
      '[data-component="power-rocker"]{display:block;width:100%;height:100%;padding:7%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="power-rocker"] *{box-sizing:border-box}[data-component="power-rocker"] .power-rocker-root{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;width:100%;height:100%;align-items:center;justify-items:center}[data-component="power-rocker"] .power-rocker{position:relative;width:min(100%,100vh);height:min(100%,100vw);max-width:100%;max-height:100%;aspect-ratio:1;padding:7%;border:1px solid var(--border-color);border-radius:50%;appearance:none;background:radial-gradient(circle at 42% 35%,color-mix(in srgb,var(--rim-color) 74%,#fff),var(--rim-color) 58%,#050606 100%);box-shadow:inset 0 3px 6px rgba(255,255,255,.12),inset 0 -8px 14px rgba(0,0,0,.75),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 45%,transparent),0 8px 16px rgba(0,0,0,.4);cursor:pointer;touch-action:none}[data-component="power-rocker"] .rocker-well{display:block;width:100%;height:100%;padding:6%;overflow:hidden;border:2px solid #050606;border-radius:50%;background:#050606;box-shadow:inset 0 12px 18px #000,inset 0 -10px 15px rgba(255,255,255,.12)}[data-component="power-rocker"] .rocker-face{position:relative;display:block;width:100%;height:100%;overflow:hidden;border:2px solid color-mix(in srgb,var(--border-color) 72%,#000);border-radius:48%;background:var(--face-color);box-shadow:0 0 0 2px rgba(0,0,0,.8)}[data-component="power-rocker"] .rocker-half{position:absolute;left:0;width:100%;height:52%;transition:transform .22s,filter .22s,box-shadow .22s}[data-component="power-rocker"] .rocker-top{top:0;border-radius:50% 50% 8% 8%/90% 90% 12% 12%;background:linear-gradient(#121515,color-mix(in srgb,var(--face-color) 85%,#fff) 62%,var(--face-color));box-shadow:inset 0 8px 9px rgba(255,255,255,.16),0 10px 12px rgba(0,0,0,.85);transform:translateY(-4%) scaleX(.98)}[data-component="power-rocker"] .rocker-bottom{bottom:0;border-radius:8% 8% 50% 50%/12% 12% 90% 90%;background:linear-gradient(var(--face-color),color-mix(in srgb,var(--face-color) 58%,#000) 72%,#090b0b);box-shadow:inset 0 -9px 12px rgba(0,0,0,.7);transform:translateY(6%) scaleX(.94)}[data-component="power-rocker"] .rocker-hinge{position:absolute;z-index:3;left:5%;top:50%;width:90%;height:8%;transform:translateY(-50%);border-radius:50%;background:linear-gradient(rgba(255,255,255,.28),#070808 45%,#000);box-shadow:0 -4px 7px rgba(255,255,255,.08),0 5px 8px #000}[data-component="power-rocker"] .power-rocker.on .rocker-top{filter:brightness(.55);box-shadow:inset 0 15px 17px rgba(0,0,0,.92);transform:translateY(6%) scaleX(.94)}[data-component="power-rocker"] .power-rocker.on .rocker-bottom{filter:brightness(1.28);box-shadow:inset 0 -7px 9px rgba(255,255,255,.18),0 -11px 12px rgba(0,0,0,.9);transform:translateY(-4%) scaleX(.98)}[data-component="power-rocker"] .rocker-led{position:absolute;z-index:4;left:50%;bottom:25%;width:var(--led-size-px);height:var(--led-size-px);transform:translateX(-50%);border:2px solid rgba(0,0,0,.65);border-radius:50%;background:var(--off-led-color);box-shadow:inset 2px 2px 3px rgba(255,255,255,.4),inset -2px -3px 4px rgba(0,0,0,.48),0 0 calc(var(--glow-strength-px) * .8) var(--off-led-color);transition:background .25s,box-shadow .25s}[data-component="power-rocker"] .power-rocker.on .rocker-led{background:var(--on-led-color);box-shadow:inset 2px 2px 3px rgba(255,255,255,.5),inset -2px -3px 4px rgba(0,0,0,.42),0 0 var(--glow-strength-px) var(--on-led-color)}[data-component="power-rocker"] .power-rocker.pressed .rocker-face{filter:brightness(1.12)}[data-component="power-rocker"] .rocker-name{max-width:100%;overflow:hidden;color:var(--text-color);font:800 var(--text-size-px)/1.1 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 4px rgba(0,0,0,.8),0 0 calc(var(--glow-strength-px) * .45) var(--glow-color);white-space:nowrap}',
    mount(root, context) {
      const button = root.querySelector(".power-rocker"),
        label = root.querySelector(".rocker-name"),
        properties = context.options.properties || {},
        defaultName = properties.text || "POWER";
      let state = false,
        pressedKey = "";
      label.textContent = defaultName;
      label.hidden =
        properties.showLabel === false ||
        String(properties.showLabel).toLowerCase() === "false";
      function display(next) {
        state = !!next;
        button.classList.toggle("on", state);
        button.setAttribute("aria-pressed", state ? "true" : "false");
      }
      function release() {
        button.classList.remove("pressed");
        if (pressedKey) context.signals.publish(pressedKey, false);
        pressedKey = "";
      }
      function press(event) {
        const rect = button.getBoundingClientRect(),
          onHalf = event.clientY < rect.top + rect.height / 2;
        release();
        pressedKey = onHalf ? "onPress" : "offPress";
        button.classList.add("pressed");
        context.signals.publish(pressedKey, true);
        event.preventDefault();
      }
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
      context.signals.subscribe("onSelected", (value) => {
        if (high(value)) display(true);
      });
      context.signals.subscribe("offSelected", (value) => {
        if (high(value)) display(false);
      });
      context.signals.subscribe("name", (value) => {
        label.textContent = value == null || value === "" ? defaultName : String(value);
      });
      display(false);
      return () => {
        button.removeEventListener("pointerdown", press);
        button.removeEventListener("pointerup", release);
        button.removeEventListener("pointerleave", release);
        button.removeEventListener("pointercancel", release);
      };
    },
  });
})(window.ComposerRuntime);
