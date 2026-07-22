(function (runtime) {
  "use strict";
  runtime.register({
    id: "blank-button",
    name: "Blank Button",
    category: "Standard Buttons",
    defaultSize: { width: 120, height: 120 },
    properties: [],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "BlankButton.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "BlankButton.Selected" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "BlankButton.Name" },
      { key: "visibility", name: "Visibility", type: "digital", direction: "input", defaultValue: "BlankButton.Visibility", optionalProperty: "visibilityEnabled" },
    ],
    template: '<button class="blank-button" type="button" aria-label="Blank Button"></button>',
    styles:
      '[data-component="blank-button"]{display:block;width:100%;height:100%}[data-component="blank-button"] .blank-button{display:block;width:100%;height:100%;margin:0;padding:0;border:0;appearance:none;background:transparent;cursor:pointer;touch-action:none}[data-component="blank-button"] .blank-button.pressed{filter:brightness(1.15)}',
    mount(root, context) {
      const button = root.querySelector(".blank-button");
      function press(event) {
        button.classList.add("pressed");
        context.signals.publish("press", true);
        event.preventDefault();
      }
      function release() {
        button.classList.remove("pressed");
        context.signals.publish("press", false);
      }
      function navigate() {
        if (context.options.targetPage) context.navigate(context.options.targetPage);
      }
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerup", navigate);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
      context.signals.subscribe("selected", function () {});
      context.signals.subscribe("name", (value) =>
        button.setAttribute("aria-label", String(value || "Blank Button")),
      );
      return () => {
        button.removeEventListener("pointerdown", press);
        button.removeEventListener("pointerup", release);
        button.removeEventListener("pointerup", navigate);
        button.removeEventListener("pointerleave", release);
        button.removeEventListener("pointercancel", release);
      };
    },
  });
  runtime.register({
    id: "power-button",
    name: "Power Button",
    category: "Standard Buttons",
    defaultSize: { width: 120, height: 120 },
    properties: [
      {
        key: "offColor",
        name: "Power off color",
        type: "color",
        defaultValue: "#dc2d2d",
      },
      {
        key: "onColor",
        name: "Power on color",
        type: "color",
        defaultValue: "#04dc78",
      },
      {
        key: "glowColor",
        name: "Glow color",
        type: "color",
        defaultValue: "#04aa8e",
      },
    ],
    signals: [
      {
        key: "press",
        name: "Press",
        type: "digital",
        direction: "output",
        defaultValue: "81",
      },
      {
        key: "selected",
        name: "Power On",
        type: "digital",
        direction: "input",
        defaultValue: "91",
      },
    ],
    template:
      '<style>[data-component="power-button"] .power{color:var(--off-color);box-shadow:inset 0 1px rgba(255,255,255,.34),inset 0 -10px 18px rgba(0,0,0,.24),0 0 5px var(--glow-color)}[data-component="power-button"] .power.active{color:var(--on-color)}</style><button class="power" type="button" aria-label="Power"><svg viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M7.05 6.75a7 7 0 1 0 9.9 0"/></svg></button>',
    styles:
      '[data-component="power-button"]{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:3%;box-sizing:border-box}[data-component="power-button"] .power{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:16%;overflow:hidden;border:1px solid rgba(255,255,255,.28);border-radius:50%;appearance:none;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.28),rgba(255,255,255,.08) 36%,rgba(80,80,80,.32) 68%,rgba(20,20,20,.42));box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 -10px 18px rgba(0,0,0,.24),0 0 5px rgba(4,170,142,.45);color:#dc2d2d;cursor:pointer;touch-action:none}[data-component="power-button"] svg{width:82%;height:82%;filter:drop-shadow(0 0 6px currentColor)}[data-component="power-button"] path{fill:none;stroke:currentColor;stroke-width:2.7;stroke-linecap:round}[data-component="power-button"] .power.pressed{transform:scale(.96)}[data-component="power-button"] .power.active{color:#04dc78}',
    mount(root, context) {
      const button = root.querySelector(".power");
      function down(e) {
        button.classList.add("pressed");
        context.signals.publish("press", true);
        e.preventDefault();
      }
      function up() {
        button.classList.remove("pressed");
        context.signals.publish("press", false);
      }
      function navigate() {
        if (context.options.targetPage)
          context.navigate(context.options.targetPage);
      }
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointerup", navigate);
      button.addEventListener("pointerleave", up);
      button.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", (value) =>
        button.classList.toggle(
          "active",
          value === true || value === 1 || value === "1",
        ),
      );
      return () => {
        button.removeEventListener("pointerdown", down);
        button.removeEventListener("pointerup", up);
        button.removeEventListener("pointerup", navigate);
        button.removeEventListener("pointerleave", up);
        button.removeEventListener("pointercancel", up);
      };
    },
  });
  function registerToggle(def) {
    const theme =
      def.id === "rolling-toggle"
        ? '[data-component="rolling-toggle"] .track{box-shadow:0 0 10px var(--glow-color)}[data-component="rolling-toggle"] .thumb{background:var(--off-color)}[data-component="rolling-toggle"] .state:checked+.thumb{background:var(--on-color);box-shadow:0 0 18px 3px var(--glow-color)}'
        : '[data-component="tsw-toggle"] .state:not(:checked)~.mode:nth-of-type(1){color:var(--off-color)}[data-component="tsw-toggle"] .state:checked~.mode:nth-of-type(2){color:var(--on-color)}[data-component="tsw-toggle"] .switch{position:relative;filter:drop-shadow(0 0 5px var(--glow-color))}[data-component="tsw-toggle"] .indicator{position:absolute;top:50%;height:calc(100% - 18px);width:0;z-index:-1;background:linear-gradient(to right,#999899,#545354);transition:width .25s}[data-component="tsw-toggle"] .indicator.left{left:5px;transform:translateY(-50%) rotateY(-65deg);transform-origin:left}[data-component="tsw-toggle"] .indicator.right{right:5px;transform:translateY(-50%) rotateY(65deg);transform-origin:right}[data-component="tsw-toggle"] .state:not(:checked)~.indicator.left,[data-component="tsw-toggle"] .state:checked~.indicator.right{width:50%}';
    runtime.register({
      id: def.id,
      name: def.name,
      category: "Toggle Buttons",
      defaultSize: def.size,
      properties: [
        {
          key: "offText",
          name: "Off label",
          type: "text",
          defaultValue: "OFF",
        },
        { key: "onText", name: "On label", type: "text", defaultValue: "ON" },
        {
          key: "offColor",
          name: "Off color",
          type: "color",
          defaultValue: def.id === "tsw-toggle" ? "#ff0000" : "#203332",
        },
        {
          key: "onColor",
          name: "On color",
          type: "color",
          defaultValue: def.id === "tsw-toggle" ? "#ff0000" : "#982f36",
        },
        {
          key: "glowColor",
          name: "Glow color",
          type: "color",
          defaultValue: "#04aa8e",
        },
      ],
      signals: [
        {
          key: "press",
          name: "Toggle Press",
          type: "digital",
          direction: "output",
          defaultValue: def.press,
        },
        {
          key: "selected",
          name: "Selected",
          type: "digital",
          direction: "input",
          defaultValue: def.feedback,
        },
      ],
      template: def.template,
      styles: def.styles + theme,
      mount(root, context) {
        const input = root.querySelector("input"),
          labels = root.querySelectorAll("[data-mode-label]"),
          properties = context.options.properties || {};
        if (labels[0]) labels[0].textContent = properties.offText || "OFF";
        if (labels[1]) labels[1].textContent = properties.onText || "ON";
        function change() {
          context.signals.publish("press", true);
          setTimeout(() => context.signals.publish("press", false), 100);
          if (context.options.targetPage)
            context.navigate(context.options.targetPage);
        }
        input.addEventListener("change", change);
        context.signals.subscribe(
          "selected",
          (value) =>
            (input.checked = value === true || value === 1 || value === "1"),
        );
        return () => input.removeEventListener("change", change);
      },
    });
  }
  registerToggle({
    id: "rolling-toggle",
    name: "Rolling Toggle",
    size: { width: 220, height: 100 },
    press: "41",
    feedback: "51",
    template:
      '<label class="track"><input class="state" type="checkbox"><span class="thumb"><span data-mode-label>OFF</span><span data-mode-label>ON</span></span></label>',
    styles:
      '[data-component="rolling-toggle"]{position:relative;display:flex;align-items:center;width:100%;height:100%;padding:8%;box-sizing:border-box}[data-component="rolling-toggle"] .state{position:absolute;opacity:0}[data-component="rolling-toggle"] .track{position:relative;width:100%;height:100%;overflow:hidden;border-radius:999px;background:#7a7676;box-shadow:0 0 10px #04aa8e;cursor:pointer}[data-component="rolling-toggle"] .thumb{position:absolute;top:5%;left:2%;display:flex;align-items:center;justify-content:center;width:48%;height:90%;overflow:hidden;border-radius:999px;background:#203332;color:#fff;font:700 12px Segoe UI;transition:left .35s,background .35s}[data-component="rolling-toggle"] .thumb span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;transition:opacity .25s,transform .35s}[data-component="rolling-toggle"] .thumb span:nth-child(2){opacity:0;transform:translateX(-25%)}[data-component="rolling-toggle"] .state:checked+.thumb{left:50%;background:#982f36;box-shadow:0 0 18px 3px rgba(236,8,8,.6)}[data-component="rolling-toggle"] .state:checked+.thumb span:first-child{opacity:0;transform:translateX(25%)}[data-component="rolling-toggle"] .state:checked+.thumb span:nth-child(2){opacity:1;transform:translateX(0)}',
  });
  runtime.register({
    id: "hole-toggle",
    name: "Hole Toggle",
    category: "Toggle Buttons",
    defaultSize: { width: 220, height: 100 },
    properties: [
      { key: "offText", name: "Off label", type: "text", defaultValue: "OFF" },
      { key: "onText", name: "On label", type: "text", defaultValue: "ON" },
      { key: "offColor", name: "Off color", type: "color", defaultValue: "#55605f" },
      { key: "onColor", name: "On color", type: "color", defaultValue: "#04aa8e" },
      { key: "trackColor", name: "Track color", type: "color", defaultValue: "#192322" },
      { key: "offHoleColor", name: "Off hole color", type: "color", defaultValue: "#dc2d2d" },
      { key: "onHoleColor", name: "On hole color", type: "color", defaultValue: "#04dc78" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "textSize", name: "Label size", type: "number", min: 8, max: 72, step: 1, defaultValue: 14 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 50, step: 1, defaultValue: 14 },
    ],
    signals: [
      { key: "press", name: "Toggle Press", type: "digital", direction: "output", defaultValue: "HoleToggle.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "HoleToggle.Selected" },
    ],
    template: '<label class="hole-switch"><input class="state" type="checkbox"><span class="track"><span class="label off" data-mode-label>OFF</span><span class="label on" data-mode-label>ON</span><span class="slider"><span class="hole"></span></span></span></label>',
    styles: '[data-component="hole-toggle"]{position:relative;display:flex;align-items:center;width:100%;height:100%;padding:8%;box-sizing:border-box}[data-component="hole-toggle"] *{box-sizing:border-box}[data-component="hole-toggle"] .hole-switch{position:relative;display:block;width:100%;height:100%;cursor:pointer;touch-action:none}[data-component="hole-toggle"] .state{position:absolute;width:1px;height:1px;opacity:0}[data-component="hole-toggle"] .track{position:relative;display:block;width:100%;height:100%;overflow:hidden;border:1px solid color-mix(in srgb,var(--glow-color) 45%,#fff);border-radius:999px;background:linear-gradient(145deg,color-mix(in srgb,var(--track-color) 72%,#fff),var(--track-color) 42%,color-mix(in srgb,var(--track-color) 72%,#000));box-shadow:inset 0 5px 12px rgba(0,0,0,.58),inset 0 -2px 5px rgba(255,255,255,.12),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 55%,transparent);transition:border-color .35s,box-shadow .35s}[data-component="hole-toggle"] .label{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;width:50%;z-index:1;color:var(--text-color);font:800 var(--text-size-px)/1 Segoe UI,sans-serif;letter-spacing:.06em;text-shadow:0 2px 4px rgba(0,0,0,.8);transition:opacity .35s,transform .35s}[data-component="hole-toggle"] .label.off{right:0}[data-component="hole-toggle"] .label.on{left:0;opacity:.28}[data-component="hole-toggle"] .slider{position:absolute;top:7%;left:3%;width:44%;height:86%;z-index:2;border-radius:999px;background:radial-gradient(circle at 36% 28%,color-mix(in srgb,var(--off-color) 55%,#fff),var(--off-color) 48%,color-mix(in srgb,var(--off-color) 75%,#000));box-shadow:inset 0 2px 2px rgba(255,255,255,.35),inset 0 -5px 8px rgba(0,0,0,.42),0 5px 10px rgba(0,0,0,.45),0 0 calc(var(--glow-strength-px) * .45) color-mix(in srgb,var(--glow-color) 35%,transparent);transition:left .42s cubic-bezier(.65,-.2,.25,1.2),background .35s,box-shadow .35s}[data-component="hole-toggle"] .hole{position:absolute;top:50%;left:50%;width:45%;aspect-ratio:1;transform:translate(-50%,-50%);border:clamp(3px,1.5vmin,7px) solid color-mix(in srgb,var(--off-hole-color,#dc2d2d) 58%,#fff);border-radius:50%;background:var(--off-hole-color,#dc2d2d);box-shadow:inset 0 2px 4px rgba(0,0,0,.35),0 0 calc(var(--glow-strength-px) * .7) var(--off-hole-color,#dc2d2d);transition:background .35s,border-color .35s,box-shadow .35s}[data-component="hole-toggle"] .state:checked+.track{border-color:var(--glow-color);box-shadow:inset 0 5px 12px rgba(0,0,0,.58),inset 0 -2px 5px rgba(255,255,255,.12),0 0 calc(var(--glow-strength-px) * 1.25) var(--glow-color)}[data-component="hole-toggle"] .state:checked+.track .slider{left:53%;background:radial-gradient(circle at 36% 28%,color-mix(in srgb,var(--on-color) 50%,#fff),var(--on-color) 48%,color-mix(in srgb,var(--on-color) 72%,#000));box-shadow:inset 0 2px 2px rgba(255,255,255,.38),inset 0 -5px 8px rgba(0,0,0,.38),0 5px 10px rgba(0,0,0,.45),0 0 var(--glow-strength-px) var(--glow-color)}[data-component="hole-toggle"] .state:checked+.track .hole{border-color:color-mix(in srgb,var(--on-hole-color,#04dc78) 58%,#fff);background:var(--on-hole-color,#04dc78);box-shadow:inset 0 2px 4px rgba(0,0,0,.35),0 0 calc(var(--glow-strength-px) * .85) var(--on-hole-color,#04dc78)}[data-component="hole-toggle"] .state:checked+.track .label.off{opacity:.28}[data-component="hole-toggle"] .state:checked+.track .label.on{opacity:1}[data-component="hole-toggle"] .hole-switch:active .slider{transform:scale(.95)}',
    mount(root, context) {
      const input = root.querySelector("input"), labels = root.querySelectorAll("[data-mode-label]"), properties = context.options.properties || {};
      if (labels[0]) labels[0].textContent = properties.offText || "OFF";
      if (labels[1]) labels[1].textContent = properties.onText || "ON";
      function change() {
        context.signals.publish("press", true);
        setTimeout(() => context.signals.publish("press", false), 100);
        if (context.options.targetPage) context.navigate(context.options.targetPage);
      }
      input.addEventListener("change", change);
      context.signals.subscribe("selected", (value) => { input.checked = value === true || value === 1 || value === "1"; });
      return () => input.removeEventListener("change", change);
    },
  });
  {
    const source = runtime.get("hole-toggle"),
      propertyDefaults = {
        offText: "UNMUTED",
        onText: "MUTED",
        offColor: "#087e6c",
        onColor: "#982f36",
        offHoleColor: "#04dc78",
        onHoleColor: "#dc2d2d",
      },
      signalDefaults = {
        press: "MicHoleToggle.Press",
        selected: "MicHoleToggle.Selected",
        visibility: "MicHoleToggle.Visibility",
      };
    runtime.register({
      ...source,
      id: "mic-hole-toggle",
      name: "Mic Hole Toggle",
      properties: source.properties.map((property) => ({
        ...property,
        defaultValue:
          property.key in propertyDefaults
            ? propertyDefaults[property.key]
            : property.defaultValue,
      })),
      signals: source.signals.map((signal) => ({
        ...signal,
        defaultValue: signalDefaults[signal.key] || signal.defaultValue,
      })),
      template: source.template
        .replace(">OFF<", ">UNMUTED<")
        .replace(">ON<", ">MUTED<"),
      styles: source.styles.replaceAll("hole-toggle", "mic-hole-toggle"),
    });
  }
  registerToggle({
    id: "tsw-toggle",
    name: "TSW Toggle Switch",
    size: { width: 300, height: 110 },
    press: "101",
    feedback: "111",
    template:
      '<label class="switch"><input class="state" type="checkbox"><span class="mode" data-mode-label>OFF</span><span class="mode" data-mode-label>ON</span><span class="indicator left"></span><span class="indicator right"></span></label>',
    styles:
      '[data-component="tsw-toggle"]{position:relative;display:flex;align-items:center;width:100%;height:100%;padding:7%;box-sizing:border-box}[data-component="tsw-toggle"] .state{position:absolute;opacity:0}[data-component="tsw-toggle"] .switch{display:flex;width:100%;height:100%;padding:5px;cursor:pointer;perspective:300px}[data-component="tsw-toggle"] .mode{display:flex;align-items:center;justify-content:center;flex:1;background:linear-gradient(#f5f4f6,#ccc9ca);color:green;font:800 clamp(16px,4vmin,34px) Segoe UI;transition:transform .25s,color .25s}[data-component="tsw-toggle"] .mode:nth-of-type(1){border-radius:8px 0 0 8px;transform-origin:right}[data-component="tsw-toggle"] .mode:nth-of-type(2){border-radius:0 8px 8px 0;transform-origin:left}[data-component="tsw-toggle"] .state:not(:checked)~.mode:nth-of-type(1){transform:rotateY(50deg);color:red}[data-component="tsw-toggle"] .state:checked~.mode:nth-of-type(2){transform:rotateY(-50deg);color:red}',
  });
})(window.ComposerRuntime);
