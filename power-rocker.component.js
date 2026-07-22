(function (runtime) {
  "use strict";
  runtime.register({
    id: "power-rocker",
    name: "Power Rocker",
    category: "Advanced Buttons",
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
      '<div class="power-rocker-root"><button class="power-rocker" type="button" aria-label="Power"><span class="rocker-well"><span class="rocker-paddle"><span class="rocker-led"></span></span></span></button><span class="rocker-name">POWER</span></div>',
    styles:
      '[data-component="power-rocker"]{display:block;width:100%;height:100%;padding:7%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="power-rocker"] *{box-sizing:border-box}[data-component="power-rocker"] .power-rocker-root{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;width:100%;height:100%;align-items:center;justify-items:center}[data-component="power-rocker"] .power-rocker{position:relative;width:min(100%,100vh);height:min(100%,100vw);max-width:100%;max-height:100%;aspect-ratio:1;padding:8%;border:1px solid var(--border-color);border-radius:50%;appearance:none;background:radial-gradient(circle at 40% 32%,color-mix(in srgb,var(--rim-color) 62%,#fff),var(--rim-color) 58%,#030404 100%);box-shadow:inset 0 4px 7px rgba(255,255,255,.13),inset 0 -10px 16px #000,0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 45%,transparent),0 9px 17px rgba(0,0,0,.48);cursor:pointer;perspective:260px;touch-action:none}[data-component="power-rocker"] .rocker-well{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;border:3px solid #020303;border-radius:50%;background:radial-gradient(ellipse at center,#171a1a 0%,#080909 63%,#000 100%);box-shadow:inset 0 12px 17px #000,inset 0 -9px 12px rgba(255,255,255,.08)}[data-component="power-rocker"] .rocker-paddle{position:relative;display:block;width:64%;height:84%;border:2px solid color-mix(in srgb,var(--border-color) 70%,#000);border-radius:42% 42% 35% 35%/20% 20% 18% 18%;background:linear-gradient(to bottom,color-mix(in srgb,var(--face-color) 76%,#fff) 0%,var(--face-color) 42%,color-mix(in srgb,var(--face-color) 48%,#000) 100%);box-shadow:inset 0 11px 12px rgba(255,255,255,.16),inset 0 -18px 19px rgba(0,0,0,.7),0 13px 10px #000;transform:rotateX(-22deg) translateY(-7%);transform-origin:center;transition:transform .24s,background .24s,box-shadow .24s}[data-component="power-rocker"] .rocker-paddle:before{content:"";position:absolute;left:8%;right:8%;top:48%;height:4%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.24),transparent);box-shadow:0 3px 5px #000}[data-component="power-rocker"] .rocker-paddle:after{content:"";position:absolute;left:12%;right:12%;bottom:-9%;height:14%;border-radius:0 0 50% 50%;background:color-mix(in srgb,var(--face-color) 35%,#000);box-shadow:0 4px 5px #000}[data-component="power-rocker"] .power-rocker.on .rocker-paddle{border-radius:35% 35% 42% 42%/18% 18% 20% 20%;background:linear-gradient(to bottom,color-mix(in srgb,var(--face-color) 45%,#000) 0%,var(--face-color) 58%,color-mix(in srgb,var(--face-color) 76%,#fff) 100%);box-shadow:inset 0 18px 19px rgba(0,0,0,.72),inset 0 -11px 12px rgba(255,255,255,.15),0 -13px 10px #000;transform:rotateX(22deg) translateY(7%)}[data-component="power-rocker"] .power-rocker.on .rocker-paddle:after{top:-9%;bottom:auto;border-radius:50% 50% 0 0}[data-component="power-rocker"] .rocker-led{position:absolute;z-index:4;left:50%;bottom:15%;width:var(--led-size-px);height:var(--led-size-px);transform:translateX(-50%);border:2px solid rgba(0,0,0,.7);border-radius:50%;background:var(--off-led-color);box-shadow:inset 2px 2px 3px rgba(255,255,255,.4),inset -2px -3px 4px rgba(0,0,0,.48),0 0 calc(var(--glow-strength-px) * .8) var(--off-led-color);transition:background .25s,box-shadow .25s}[data-component="power-rocker"] .power-rocker.on .rocker-led{background:var(--on-led-color);box-shadow:inset 2px 2px 3px rgba(255,255,255,.5),inset -2px -3px 4px rgba(0,0,0,.42),0 0 var(--glow-strength-px) var(--on-led-color)}[data-component="power-rocker"] .power-rocker.pressed .rocker-paddle{filter:brightness(1.13)}[data-component="power-rocker"] .rocker-name{max-width:100%;overflow:hidden;color:var(--text-color);font:800 var(--text-size-px)/1.1 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 4px rgba(0,0,0,.8),0 0 calc(var(--glow-strength-px) * .45) var(--glow-color);white-space:nowrap}',
    mount(root, context) {
      const high = (value) => value === true || value === 1 || value === "1";
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
