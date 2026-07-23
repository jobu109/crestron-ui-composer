(function (global) {
  "use strict";
  const defaults = Array.from(
    { length: 20 },
    (_, i) => "Preset " + (i + 1),
  ).join("|");
  global.ComposerRuntime.register({
    id: "vertical-button-list",
    name: "Vertical Button List",
    category: "Lists & Selectors",
    defaultSize: { width: 300, height: 420 },
    signals: [],
    rangeBindings: [
      {
        name: "Digital button press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Digital selection feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Serial button label range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "signalIncrement",
      },
    ],
    data: { defaults },
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
        key: "defaultCount",
        name: "Default buttons",
        type: "select",
        options: Array.from({ length: 20 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        })),
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "buttonLabels",
        name: "Local button labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Button",
        defaultValue: defaults,
      },
      {
        key: "defaultSelected",
        name: "Default selected item (0 based)",
        type: "number",
        defaultValue: 0,
      },
      {
        key: "pressBase",
        name: "Press base / pattern",
        type: "text",
        defaultValue: "VerticalButtonList.Items.{n}.Press",
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Feedback base / pattern",
        type: "text",
        defaultValue: "VerticalButtonList.Items.{n}.Selected",
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Label base / pattern",
        type: "text",
        defaultValue: "VerticalButtonList.Items.{n}.Label",
        signalSetting: true,
      },
      {
        key: "signalIncrement",
        name: "Join increment",
        type: "number",
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "trackColor",
        name: "Track color",
        type: "color",
        defaultValue: "#f0f0f0",
      },
      {
        key: "selectedColor",
        name: "Selected color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "glowColor",
        name: "Glow color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "textSize",
        name: "Text size (px)",
        type: "number",
        defaultValue: 24,
      },
    ],
    template:
      '<div class="vbl-root"><div class="vbl-track"><span class="vbl-slider"></span></div></div>',
    styles:
      '[data-component="vertical-button-list"],[data-component="vertical-button-list"] *{box-sizing:border-box}[data-component="vertical-button-list"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="vertical-button-list"] .vbl-root{width:100%;height:100%;padding:6%;display:flex;align-items:center;justify-content:center}[data-component="vertical-button-list"] .vbl-track{--count:5;--selected:0;position:relative;display:grid;grid-template-rows:repeat(var(--count),1fr);width:100%;height:100%;min-width:120px;min-height:140px;max-width:260px;padding:4px;background:color-mix(in srgb,var(--track-color) 10%,transparent);border-radius:8px;overflow:hidden}.vbl-slider{position:absolute;left:4px;top:calc(4px + ((100% - 8px)/var(--count))*var(--selected));width:calc(100% - 8px);height:calc((100% - 8px)/var(--count));background:var(--selected-color);border-radius:6px;box-shadow:0 0 15px var(--glow-color);transition:top .25s ease;animation:vbl-glow 1.5s infinite}.vbl-button{position:relative;z-index:1;border:0;background:transparent;color:var(--text-color);padding:0 8px;font:600 var(--text-size-px)/1 "Segoe UI",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.vbl-button.selected{text-shadow:0 0 12px var(--text-color)}@keyframes vbl-glow{0%,100%{box-shadow:0 0 10px color-mix(in srgb,var(--glow-color) 40%,transparent)}50%{box-shadow:0 0 24px color-mix(in srgb,var(--glow-color) 85%,transparent)}}',
    mount(root, context) {
      const p = context.options.properties || {},
        track = root.querySelector(".vbl-track"),
        labels = String(p.buttonLabels || defaults).split("|"),
        count = Math.max(1, Math.min(20, Number(p.defaultCount) || 5)),
        buttons = [];
      let selected = Math.max(
        0,
        Math.min(count - 1, Number(p.defaultSelected) || 0),
      );
      const addr = (base, i) =>
        p.bindingMode === "join"
          ? String((Number(base) || 0) + i * (Number(p.signalIncrement) || 1))
          : String(base || "")
              .replace(/\{n\}/g, i + 1)
              .replace(/\{index\}/g, i);
      function choose(i, publish) {
        selected = i;
        track.style.setProperty("--selected", i);
        buttons.forEach((b, n) => b.classList.toggle("selected", n === i));
        if (publish) {
          const a = addr(p.pressBase, i);
          context.signals.publishAddress("digital", a, true);
          setTimeout(
            () => context.signals.publishAddress("digital", a, false),
            100,
          );
        }
      }
      track.style.setProperty("--count", count);
      for (let i = 0; i < count; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "vbl-button";
        b.textContent = labels[i] ?? "";
        b.addEventListener("click", () => choose(i, true));
        context.signals.subscribeAddress(
          "digital",
          addr(p.feedbackBase, i),
          (v) => {
            if (v === true || v === 1 || v === "1") choose(i, false);
          },
        );
        context.signals.subscribeAddress(
          "serial",
          addr(p.labelBase, i),
          (v) => {
            if (v) b.textContent = v;
          },
        );
        track.appendChild(b);
        buttons.push(b);
      }
      choose(selected, false);
    },
  });
})(window);
