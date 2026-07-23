(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "preset-led",
    name: "Preset with LED",
    category: "Advanced Buttons",
    defaultSize: { width: 260, height: 100 },
    signals: [
      {
        key: "press",
        name: "Press",
        type: "digital",
        direction: "output",
        defaultValue: "PresetLed.Press",
      },
      {
        key: "feedback",
        name: "Selected feedback",
        type: "digital",
        direction: "input",
        defaultValue: "PresetLed.Selected",
      },
      {
        key: "label",
        name: "Label",
        type: "serial",
        direction: "input",
        defaultValue: "PresetLed.Label",
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
        key: "text",
        name: "Local text",
        type: "text",
        defaultValue: "Preset 1",
      },
      {
        key: "buttonColor",
        name: "Button color",
        type: "color",
        defaultValue: "#e4e4e4",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#555555",
      },
      {
        key: "pressedTextColor",
        name: "Pressed text color",
        type: "color",
        defaultValue: "#40bfaa",
      },
      {
        key: "ledColor",
        name: "LED color",
        type: "color",
        defaultValue: "#00ffaa",
      },
      {
        key: "glowColor",
        name: "Glow color",
        type: "color",
        defaultValue: "#00ffaa",
      },
      {
        key: "textSize",
        name: "Text size (px)",
        type: "number",
        defaultValue: 24,
      },
      {
        key: "ledSize",
        name: "LED size (px)",
        type: "number",
        defaultValue: 9,
      },
      {
        key: "cornerRadius",
        name: "Corner radius (px)",
        type: "number",
        defaultValue: 24,
      },
    ],
    template:
      '<div class="pl-root"><div class="pl-wrap"><button class="pl-button" type="button"><span class="pl-text"></span><span class="pl-led"></span></button></div></div>',
    styles:
      '[data-component="preset-led"],[data-component="preset-led"] *{box-sizing:border-box}[data-component="preset-led"]{display:block;width:100%;height:100%;font-family:"Montserrat","Segoe UI",sans-serif}.pl-root{width:100%;height:100%;padding:6%;display:flex;align-items:center;justify-content:center}.pl-wrap{--pad:8px;position:relative;width:100%;height:100%;min-width:90px;min-height:44px;padding:var(--pad);border-radius:var(--corner-radius-px);background:rgba(0,0,0,.04);box-shadow:1px 1px 2px rgba(255,255,255,.86),2px 2px 8px rgba(0,0,0,.06) inset;perspective:150px}.pl-button{position:relative;width:100%;height:100%;min-height:34px;border:0;border-radius:calc(var(--corner-radius-px) - var(--pad));padding:0 clamp(34px,20vmin,70px) 0 16px;display:flex;align-items:center;justify-content:flex-start;background:linear-gradient(rgba(255,255,255,.13),rgba(0,0,0,.07)),var(--button-color);box-shadow:1px 1px 2px -1px white inset,0 2px 1px rgba(0,0,0,.06),0 8px 4px rgba(0,0,0,.06),0 16px 8px rgba(0,0,0,.06);cursor:pointer;transition:.25s}.pl-text{width:100%;font-size:var(--text-size-px);font-weight:600;line-height:1;color:var(--text-color);text-shadow:0 1px white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pl-led{position:absolute;right:24px;top:50%;width:var(--led-size-px);height:var(--led-size-px);transform:translateY(-50%);border-radius:50%;background:rgba(128,128,128,.12);border:1px solid rgba(150,150,150,.6);box-shadow:inset 1px 1px 2px rgba(255,255,255,.9)}.pl-wrap.pressed .pl-button{transform:translateZ(-4px);filter:drop-shadow(8px 0 8px var(--glow-color))}.pl-wrap.pressed .pl-text{color:var(--pressed-text-color)}.pl-wrap.selected .pl-led,.pl-wrap.pressed .pl-led{background:var(--led-color);border-color:color-mix(in srgb,var(--led-color) 70%,white);box-shadow:0 0 10px 2px var(--glow-color),0 0 20px 10px color-mix(in srgb,var(--glow-color) 50%,transparent),inset 0 0 8px white}.pl-wrap.selected .pl-button{box-shadow:1px 1px 2px -1px white inset,0 8px 4px rgba(0,0,0,.06),0 0 18px color-mix(in srgb,var(--glow-color) 42%,transparent)}',
    mount(root, context) {
      const p = context.options.properties || {},
        wrap = root.querySelector(".pl-wrap"),
        button = root.querySelector(".pl-button"),
        label = root.querySelector(".pl-text");
      label.textContent = p.text ?? "Preset 1";
      function setPress(value) {
        wrap.classList.toggle("pressed", value);
        context.signals.publish("press", value);
      }
      button.addEventListener("pointerdown", (e) => {
        setPress(true);
        button.setPointerCapture && button.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((n) =>
        button.addEventListener(n, () => setPress(false)),
      );
      context.signals.subscribe("feedback", (v) =>
        wrap.classList.toggle("selected", v === true || v === 1 || v === "1"),
      );
      context.signals.subscribe("label", (v) => {
        label.textContent = v == null ? (p.text ?? "Preset 1") : String(v);
      });
    },
  });
})(window);
