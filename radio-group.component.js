(function (runtime) {
  "use strict";
  const defaults = ["1080p", "4K", "8K"].concat(Array.from({ length: 17 }, (_, i) => `Option ${i + 4}`)).join("|");
  runtime.register({
    id: "radio-group",
    name: "Radio Group",
    category: "Lists & Selectors",
    defaultSize: { width: 280, height: 220 },
    signals: [
      { key: "count", name: "Number of options", type: "analog", direction: "input", defaultValue: "RadioGroup.Feedback" },
    ],
    rangeBindings: [
      { name: "Digital option press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital option selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Serial option name range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement" },
    ],
    data: { defaults },
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "defaultCount", name: "Default options", type: "select", options: Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), defaultValue: "3", affectsProperties: true },
      { key: "optionLabels", name: "Local option labels", type: "text-list", countKey: "defaultCount", itemName: "Option", defaultValue: defaults },
      { key: "defaultSelected", name: "Default selected option (0 based)", type: "number", min: 0, max: 19, defaultValue: 0 },
      { key: "layout", name: "Layout", type: "select", options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }], defaultValue: "vertical" },
      { key: "itemGap", name: "Option spacing", type: "number", min: 0, max: 60, defaultValue: 12 },
      { key: "dotSize", name: "Radio dot size", type: "number", min: 10, max: 80, defaultValue: 24 },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 80, defaultValue: 22 },
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "RadioGroup.Items.{index}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Selected base / pattern", type: "text", defaultValue: "RadioGroup.Items.{index}.Selected", signalSetting: true },
      { key: "labelBase", name: "Name base / pattern", type: "text", defaultValue: "RadioGroup.Items.{index}.Name", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "panelColor", name: "Panel color", type: "color", defaultValue: "#203332" },
      { key: "itemColor", name: "Option background color", type: "color", defaultValue: "#151a24" },
      { key: "selectedColor", name: "Selected color", type: "color", defaultValue: "#04aa8e" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#50615f" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 100, defaultValue: 14 },
    ],
    template: '<div class="radio-root"><div class="radio-list"></div></div>',
    styles: '[data-component="radio-group"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="radio-group"] *{box-sizing:border-box}[data-component="radio-group"] .radio-root{width:100%;height:100%;padding:10px;border:1px solid color-mix(in srgb,var(--border-color) 65%,transparent);border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.1),color-mix(in srgb,var(--panel-color) 55%,transparent));box-shadow:inset 0 1px rgba(255,255,255,.16),0 0 var(--glow-strength-px,14px) color-mix(in srgb,var(--glow-color) 28%,transparent);overflow:auto}[data-component="radio-group"] .radio-list{display:flex;flex-direction:column;gap:var(--item-gap-px,12px);min-width:100%;min-height:100%;align-items:stretch;justify-content:center}[data-component="radio-group"] .radio-list.horizontal{flex-direction:row;align-items:center;justify-content:center}[data-component="radio-group"] .radio-item{display:flex;align-items:center;gap:10px;min-width:0;padding:8px 10px;border:1px solid color-mix(in srgb,var(--border-color) 46%,transparent);border-radius:10px;background:color-mix(in srgb,var(--item-color) 74%,transparent);color:color-mix(in srgb,var(--text-color) 72%,transparent);font:600 var(--text-size-px,22px)/1.15 "Segoe UI",sans-serif;cursor:pointer;touch-action:manipulation}[data-component="radio-group"] .radio-list.horizontal .radio-item{flex:1 1 0;justify-content:flex-start;padding-left:8px}[data-component="radio-group"] .radio-item.pressed{transform:scale(.98)}[data-component="radio-group"] .radio-item.selected{border-color:var(--selected-color);color:var(--text-color);box-shadow:0 0 var(--glow-strength-px,14px) color-mix(in srgb,var(--glow-color) 54%,transparent)}[data-component="radio-group"] .radio-dot{position:relative;width:var(--dot-size-px,24px);height:var(--dot-size-px,24px);flex:none;border:2px solid var(--border-color);border-radius:50%;transition:border-color .15s ease,box-shadow .15s ease}[data-component="radio-group"] .radio-dot:after{content:"";position:absolute;inset:20%;border-radius:50%;background:var(--selected-color);box-shadow:0 0 calc(var(--glow-strength-px,14px)*.7) var(--glow-color);transform:scale(0);transition:transform .2s cubic-bezier(.34,1.56,.64,1)}[data-component="radio-group"] .radio-item.selected .radio-dot{border-color:var(--selected-color)}[data-component="radio-group"] .radio-item.selected .radio-dot:after{transform:scale(1)}[data-component="radio-group"] .radio-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    mount(root, context) {
      const p = context.options.properties || {}, list = root.querySelector(".radio-list"), labels = String(p.optionLabels || defaults).split("|");
      let count = Math.max(1, Math.min(20, Number(p.defaultCount) || 3)), selected = Math.max(0, Math.min(count - 1, Number(p.defaultSelected) || 0)), rows = [];
      list.classList.toggle("horizontal", p.layout === "horizontal");
      const address = (base, index) => p.bindingMode === "join" ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1)) : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);
      function select(index, publish) {
        selected = Math.max(0, Math.min(count - 1, index));
        rows.forEach((row, i) => row.classList.toggle("selected", i === selected));
        if (publish) {
          const signal = address(p.pressBase, selected);
          context.signals.publishAddress("digital", signal, true);
          setTimeout(() => context.signals.publishAddress("digital", signal, false), 100);
        }
      }
      function build(nextCount) {
        count = Math.max(1, Math.min(20, Number(nextCount) || 1));
        selected = Math.min(selected, count - 1); list.innerHTML = ""; rows = [];
        for (let index = 0; index < count; index += 1) {
          const row = document.createElement("button"), dot = document.createElement("span"), text = document.createElement("span");
          row.type = "button"; row.className = "radio-item"; dot.className = "radio-dot"; text.className = "radio-label"; text.textContent = labels[index] ?? "";
          row.append(dot, text); row.addEventListener("pointerdown", () => row.classList.add("pressed")); ["pointerup", "pointerleave", "pointercancel"].forEach(name => row.addEventListener(name, () => row.classList.remove("pressed"))); row.addEventListener("click", () => select(index, true));
          context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => { if (value === true || value === 1 || value === "1") select(index, false); });
          context.signals.subscribeAddress("serial", address(p.labelBase, index), value => { if (value !== undefined && value !== null && String(value) !== "") text.textContent = String(value); });
          list.appendChild(row); rows.push(row);
        }
        select(selected, false);
      }
      context.signals.subscribe("count", value => build(Number(value) || Number(p.defaultCount) || 3));
      build(count);
    },
  });
})(window.ComposerRuntime);
