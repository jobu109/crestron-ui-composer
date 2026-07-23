(function (global) {
  "use strict";

  const choices = [
    ["Home", '<path d="M3 11.5L12 4l9 7.5M5.5 10.5V20h13v-9.5M10 20v-5h4v5"/>'],
    ["Video", '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2"/>'],
    ["Displays", '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>'],
    ["Mics", '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8"/>'],
    ["Camera", '<path d="M4 7h4l2-2h4l2 2h4v12H4z"/><circle cx="12" cy="13" r="3.5"/>'],
    ["Call", '<path d="M7 3l3 4-2 2c1.4 2.8 3.2 4.6 6 6l2-2 4 3-2 4C10.5 19.5 4.5 13.5 3 6z"/>'],
    ["Settings", '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9L7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>']
  ];
  const defaults = "Home|Video|Displays|Mics|Camera";

  global.ComposerRuntime.register({
    id: "menu-item",
    name: "Menu Item",
    category: "Navigation & Menus",
    defaultSize: { width: 340, height: 120 },
    signals: [], data: { choices, defaults },
    addressBindings: [
      { name: "Text size override", type: "analog", direction: "input", key: "textSizeSignal" },
      { name: "Icon size override", type: "analog", direction: "input", key: "iconSizeSignal" }
    ],
    rangeBindings: [
      { name: "Digital press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital feedback range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Analog display-choice range", type: "analog", direction: "input", baseKey: "choiceBase", incrementKey: "signalIncrement" }
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "defaultCount", name: "Default menu items", type: "select", options: [1,2,3,4,5,6,7].map(n => ({ value: String(n), label: String(n) })), defaultValue: "5", affectsProperties: true },
      { key: "menuLabels", name: "Local menu labels", type: "text-list", countKey: "defaultCount", itemName: "Menu item", defaultValue: defaults },
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "MenuItem.Items.{n}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Feedback base / pattern", type: "text", defaultValue: "MenuItem.Items.{n}.Selected", signalSetting: true },
      { key: "choiceBase", name: "Display choice base / pattern", type: "text", defaultValue: "MenuItem.Items.{n}.DisplayChoice", signalSetting: true },
      { key: "textSizeSignal", name: "Text size override signal", type: "text", defaultValue: "MenuItem.TextSize", signalSetting: true },
      { key: "iconSizeSignal", name: "Icon size override signal", type: "text", defaultValue: "MenuItem.IconSize", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "accentColor", name: "Accent color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "activeTextColor", name: "Active text/icon color", type: "color", defaultValue: "#ffffff" },
      { key: "iconSize", name: "Icon size (px)", type: "number", defaultValue: 40 },
      { key: "textSize", name: "Text size (px)", type: "number", defaultValue: 22 }
    ],
    template: '<div class="mi-root"><div class="mi-list"></div><div class="mi-scroll"><i></i></div></div>',
    styles: '[data-component="menu-item"],[data-component="menu-item"] *{box-sizing:border-box}[data-component="menu-item"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="menu-item"] .mi-root{width:100%;height:100%;padding:6px;overflow:hidden}[data-component="menu-item"] .mi-list{width:100%;height:100%;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(96px,1fr);gap:10px;overflow-x:auto;overflow-y:hidden}[data-component="menu-item"] .mi-button{min-width:96px;border:1px solid rgba(255,255,255,.13);border-radius:5px;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.02)),rgba(102,102,102,.16);color:var(--accent-color);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:6px;overflow:hidden;font-family:inherit}[data-component="menu-item"] .mi-button.pressed{transform:scale(.96)}[data-component="menu-item"] .mi-button.active{color:var(--active-text-color);background:linear-gradient(135deg,rgba(255,255,255,.24),color-mix(in srgb,var(--accent-color) 78%,transparent)),var(--accent-color);box-shadow:0 0 20px color-mix(in srgb,var(--glow-color) 92%,transparent)}[data-component="menu-item"] .mi-icon{width:var(--icon-size-px);height:var(--icon-size-px);flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}[data-component="menu-item"] .mi-label{width:100%;font-size:var(--text-size-px);font-weight:600;line-height:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    mount(root, context) {
      const data = context.options.definitionData || {}, choices = data.choices || [], defaults = data.defaults || "Home|Video|Displays|Mics|Camera";
      const p = context.options.properties || {};
      const host = root.querySelector(".mi-list");
      const scroll = root.querySelector(".mi-scroll");
      const thumb = scroll.querySelector("i");
      const localLabels = String(p.menuLabels ?? defaults).split("|");
      const count = Number(p.defaultCount) || 5;
      const applyScale = (key, base, value) => { const percent = Number(value); const scale = !Number.isFinite(percent) || percent <= 0 ? 1 : Math.max(25, Math.min(250, percent)) / 100; root.style.setProperty(key, Math.round(base * scale) + "px"); };
      const address = (base, index) => p.bindingMode === "join"
        ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1))
        : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);
      const renderChoice = (button, choiceIndex, localLabel) => {
        const choice = choices[Math.max(0, Math.min(choices.length - 1, choiceIndex))];
        button.innerHTML = '<svg class="mi-icon" viewBox="0 0 24 24" aria-hidden="true">' + choice[1] + '</svg><span class="mi-label"></span>';
        button.querySelector(".mi-label").textContent = localLabel ?? "";
      };
      for (let index = 0; index < count; index++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mi-button";
        renderChoice(button, index, localLabels[index]);
        const press = address(p.pressBase, index);
        button.addEventListener("pointerdown", event => { button.classList.add("pressed"); context.signals.publishAddress("digital", press, true); event.preventDefault(); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(name => button.addEventListener(name, () => { button.classList.remove("pressed"); context.signals.publishAddress("digital", press, false); }));
        context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => button.classList.toggle("active", value === true || value === 1 || value === "1"));
        context.signals.subscribeAddress("analog", address(p.choiceBase, index), value => renderChoice(button, (Number(value) || 1) - 1, ""));
        host.appendChild(button);
      }
      context.signals.subscribeAddress("analog", p.textSizeSignal, value => applyScale("--text-size-px", Number(p.textSize) || 22, value));
      context.signals.subscribeAddress("analog", p.iconSizeSignal, value => applyScale("--icon-size-px", Number(p.iconSize) || 40, value));
      const updateScroll = () => { const max = host.scrollWidth - host.clientWidth; if (max <= 1) { scroll.classList.remove("visible"); return; } const width = Math.max(28, scroll.clientWidth * host.clientWidth / host.scrollWidth); thumb.style.width = width + "px"; thumb.style.transform = "translateX(" + ((scroll.clientWidth - width) * host.scrollLeft / max) + "px)"; scroll.classList.add("visible"); };
      let dragX = 0, dragScroll = 0;
      thumb.addEventListener("pointerdown", event => { dragX = event.clientX; dragScroll = host.scrollLeft; thumb.setPointerCapture && thumb.setPointerCapture(event.pointerId); event.preventDefault(); });
      thumb.addEventListener("pointermove", event => { if (!thumb.hasPointerCapture || !thumb.hasPointerCapture(event.pointerId)) return; const max = host.scrollWidth - host.clientWidth, travel = Math.max(1, scroll.clientWidth - thumb.offsetWidth); host.scrollLeft = dragScroll + (event.clientX - dragX) / travel * max; });
      host.addEventListener("scroll", updateScroll, { passive: true });
      const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScroll) : null; if (observer) { observer.observe(root); observer.observe(host); }
      requestAnimationFrame(updateScroll);
      return () => { if (observer) observer.disconnect(); };
    }
  });
})(window);
