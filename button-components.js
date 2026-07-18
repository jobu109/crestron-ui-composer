(function (runtime) {
  "use strict";
  runtime.register({
    id: "power-button",
    name: "Power Button",
    category: "Buttons",
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
      category: "Buttons",
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
      '[data-component="rolling-toggle"]{position:relative;display:flex;align-items:center;width:100%;height:100%;padding:8%;box-sizing:border-box}[data-component="rolling-toggle"] .state{position:absolute;opacity:0}[data-component="rolling-toggle"] .track{position:relative;width:100%;height:100%;overflow:hidden;border-radius:999px;background:#7a7676;box-shadow:0 0 10px #04aa8e;cursor:pointer}[data-component="rolling-toggle"] .thumb{position:absolute;top:5%;left:2%;display:flex;align-items:center;justify-content:space-around;width:48%;height:90%;overflow:hidden;border-radius:999px;background:#203332;color:#fff;font:700 12px Segoe UI;transition:left .35s,background .35s}[data-component="rolling-toggle"] .thumb span{min-width:100%;text-align:center}[data-component="rolling-toggle"] .state:checked+.thumb{left:50%;background:#982f36;box-shadow:0 0 18px 3px rgba(236,8,8,.6)}',
  });
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
