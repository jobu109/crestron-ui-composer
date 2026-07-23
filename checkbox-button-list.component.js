(function (global) {
  "use strict";
  const defaults = Array.from({ length: 20 }, (_, i) => "Item " + i).join("|");
  global.ComposerRuntime.register({
    id: "checkbox-button-list",
    name: "Checkbox Button List",
    category: "Lists & Selectors",
    defaultSize: { width: 360, height: 420 },
    signals: [],
    addressBindings: [
      {
        name: "Number of items (overrides local count)",
        type: "analog",
        direction: "input",
        key: "countSignal",
      },
    ],
    rangeBindings: [
      {
        name: "Digital checked-state output range",
        type: "digital",
        direction: "output",
        baseKey: "checkedBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Digital checked feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Serial label range",
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
        name: "Default items",
        type: "select",
        options: Array.from({ length: 20 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        })),
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "itemLabels",
        name: "Local item labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Item",
        defaultValue: defaults,
      },
      {
        key: "countSignal",
        name: "Item count signal",
        type: "text",
        defaultValue: "Checklist.Count",
        signalSetting: true,
      },
      {
        key: "checkedBase",
        name: "Checked output base / pattern",
        type: "text",
        defaultValue: "Checklist.Items.{n}.Checked",
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Feedback base / pattern",
        type: "text",
        defaultValue: "Checklist.Items.{n}.Feedback",
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Label base / pattern",
        type: "text",
        defaultValue: "Checklist.Items.{n}.Label",
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
        key: "panelColor",
        name: "Panel tint",
        type: "color",
        defaultValue: "#344444",
      },
      {
        key: "itemColor",
        name: "Item tint",
        type: "color",
        defaultValue: "#787878",
      },
      {
        key: "checkedColor",
        name: "Checked color",
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
        key: "iconSize",
        name: "Checkbox size (px)",
        type: "number",
        defaultValue: 42,
      },
      {
        key: "textSize",
        name: "Text size (px)",
        type: "number",
        defaultValue: 24,
      },
    ],
    template: '<div class="cb-root"><div class="cb-list"></div></div>',
    styles:
      '[data-component="checkbox-button-list"],[data-component="checkbox-button-list"] *{box-sizing:border-box}[data-component="checkbox-button-list"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="checkbox-button-list"] .cb-root{width:100%;height:100%;padding:4%;overflow:hidden}[data-component="checkbox-button-list"] .cb-list{width:100%;height:100%;padding:12px;overflow-y:auto;border-radius:10px;background:linear-gradient(145deg,rgba(255,255,255,.18),color-mix(in srgb,var(--panel-color) 42%,transparent),color-mix(in srgb,var(--checked-color) 10%,transparent));border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 1px rgba(255,255,255,.34),0 0 12px color-mix(in srgb,var(--glow-color) 32%,transparent)}.cb-item{width:100%;min-height:58px;margin-bottom:8px;padding:8px 12px;display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:color-mix(in srgb,var(--item-color) 28%,transparent);color:color-mix(in srgb,var(--text-color) 78%,transparent);cursor:pointer}.cb-item.pressed{transform:scale(.985)}.cb-item.checked{background:color-mix(in srgb,var(--checked-color) 24%,transparent);border-color:color-mix(in srgb,var(--checked-color) 72%,transparent);box-shadow:inset 0 0 16px color-mix(in srgb,var(--checked-color) 18%,transparent),0 0 14px color-mix(in srgb,var(--glow-color) 36%,transparent);color:var(--text-color)}.cb-disc{width:var(--icon-size-px);height:var(--icon-size-px);flex:none;position:relative;perspective:800px}.cb-flip{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.7,0,.2,1)}.cb-face{position:absolute;inset:0;border-radius:6px;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,rgba(28,28,28,.92),rgba(80,80,80,.52));border:1px solid rgba(255,255,255,.16)}.cb-back{transform:rotateX(180deg);background:radial-gradient(circle,color-mix(in srgb,var(--checked-color) 80%,white),var(--checked-color));box-shadow:0 0 14px var(--glow-color)}.cb-back svg{width:62%;height:62%;fill:none;stroke:var(--text-color);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.cb-item.checked .cb-flip{transform:rotateX(-180deg)}.cb-label{min-width:0;flex:1;font-size:var(--text-size-px);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cb-item.checked .cb-label{text-shadow:0 0 12px var(--glow-color)}',
    mount(root, context) {
      const p = context.options.properties || {},
        host = root.querySelector(".cb-list"),
        labels = String(p.itemLabels || defaults).split("|");
      let count = Math.max(1, Math.min(20, Number(p.defaultCount) || 5)),
        states = [];
      const addr = (base, i) =>
        p.bindingMode === "join"
          ? String((Number(base) || 0) + i * (Number(p.signalIncrement) || 1))
          : String(base || "")
              .replace(/\{n\}/g, i + 1)
              .replace(/\{index\}/g, i);
      function draw() {
        host.innerHTML = "";
        for (let i = 0; i < count; i++) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "cb-item";
          item.innerHTML =
            '<span class="cb-disc"><span class="cb-flip"><span class="cb-face"></span><span class="cb-face cb-back"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span></span></span><span class="cb-label">' +
            (labels[i] ?? "") +
            "</span>";
          const set = (value, publish) => {
            states[i] = !!value;
            item.classList.toggle("checked", states[i]);
            if (publish)
              context.signals.publishAddress(
                "digital",
                addr(p.checkedBase, i),
                states[i],
              );
          };
          item.addEventListener("pointerdown", (e) => {
            item.classList.add("pressed");
            e.preventDefault();
          });
          ["pointerup", "pointerleave", "pointercancel"].forEach((n) =>
            item.addEventListener(n, () => item.classList.remove("pressed")),
          );
          item.addEventListener("click", () => set(!states[i], true));
          context.signals.subscribeAddress(
            "digital",
            addr(p.feedbackBase, i),
            (v) => set(v === true || v === 1 || v === "1", false),
          );
          context.signals.subscribeAddress(
            "serial",
            addr(p.labelBase, i),
            (v) => {
              if (v) item.querySelector(".cb-label").textContent = v;
            },
          );
          host.appendChild(item);
        }
      }
      context.signals.subscribeAddress("analog", p.countSignal, (v) => {
        const n = Math.round(Number(v));
        if (n > 0) {
          count = Math.min(20, n);
          draw();
        }
      });
      draw();
    },
  });
})(window);
