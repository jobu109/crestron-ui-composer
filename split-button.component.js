(function (global) {
  "use strict";

  const defaultLabels = "Run on all zones|Schedule…|Edit scene";

  global.ComposerRuntime.register({
    id: "split-button",
    name: "Split Button",
    category: "Navigation & Menus",
    defaultSize: { width: 360, height: 220 },
    itemSelector: ".split-item",
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "SplitButton.Press", simulatorSelector: ".split-main" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "SplitButton.Selected" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "SplitButton.Label" },
      { key: "itemCount", name: "Number of sub-items", type: "analog", direction: "input", defaultValue: "SplitButton.Feedback" },
    ],
    rangeBindings: [
      { name: "Digital sub-item press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital sub-item selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Serial sub-item name range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement" },
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "text", name: "Standard state — text", type: "text", defaultValue: "Run Scene" },
      { key: "selectedText", name: "Selected state — text", type: "text", defaultValue: "Run Scene" },
      { key: "defaultCount", name: "Default sub-items", type: "select", options: Array.from({ length: 20 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })), defaultValue: "3", affectsProperties: true },
      { key: "submenuLabels", name: "Local sub-item labels", type: "text-list", countKey: "defaultCount", itemName: "Sub-item", defaultValue: defaultLabels },
      { key: "menuDirection", name: "Submenu direction", type: "select", options: [{ value: "down", label: "Down" }, { value: "up", label: "Up" }], defaultValue: "down" },
      { key: "pressBase", name: "Digital sub-item press base / pattern", type: "text", defaultValue: "SplitButton.Items[{index}].Press", signalSetting: true },
      { key: "feedbackBase", name: "Digital sub-item selected base / pattern", type: "text", defaultValue: "SplitButton.Items[{index}].Selected", signalSetting: true },
      { key: "labelBase", name: "Serial sub-item name base / pattern", type: "text", defaultValue: "SplitButton.Items[{index}].Label", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "faceColor", name: "Standard state — button color", type: "color", defaultValue: "#04aa8e" },
      { key: "selectedFaceColor", name: "Selected state — button color", type: "color", defaultValue: "#078f7d" },
      { key: "textColor", name: "Standard state — text color", type: "color", defaultValue: "#071210" },
      { key: "selectedTextColor", name: "Selected state — text color", type: "color", defaultValue: "#ffffff" },
      { key: "menuColor", name: "Menu background color", type: "color", defaultValue: "#1b2030" },
      { key: "itemColor", name: "Sub-item color", type: "color", defaultValue: "#1b2030" },
      { key: "selectedItemColor", name: "Selected sub-item color", type: "color", defaultValue: "#078f7d" },
      { key: "itemTextColor", name: "Sub-item text color", type: "color", defaultValue: "#ffffff" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 10 },
      { key: "textSize", name: "Main text size", type: "number", defaultValue: 18 },
      { key: "itemTextSize", name: "Sub-item text size", type: "number", defaultValue: 15 },
      { key: "cornerRadius", name: "Corner radius", type: "number", defaultValue: 10 },
      { key: "menuGap", name: "Menu gap", type: "number", defaultValue: 8 },
    ],
    data: { defaultLabels },
    template: '<div class="split-root"><div class="split-control"><button class="split-main" type="button"><span class="split-label"></span></button><button class="split-caret" type="button" aria-label="Open submenu" aria-expanded="false"><span>▾</span></button><div class="split-menu"></div></div></div>',
    styles: `[data-component="split-button"],[data-component="split-button"] *{box-sizing:border-box}
[data-component="split-button"]{display:block;width:100%;height:100%;overflow:visible;font-family:"Segoe UI",sans-serif}
[data-component="split-button"] .split-root{position:relative;width:100%;height:100%;padding:calc(var(--glow-strength-px) + 4px);display:flex;align-items:flex-start;justify-content:center;overflow:visible}
[data-component="split-button"] .split-root.menu-up{align-items:flex-end}
[data-component="split-button"] .split-control{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;width:100%;filter:drop-shadow(0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 68%,transparent));z-index:2}
[data-component="split-button"] button{font-family:inherit;cursor:pointer;outline:none;transition:background .16s ease,color .16s ease,transform .12s ease,box-shadow .16s ease}
[data-component="split-button"] .split-main,[data-component="split-button"] .split-caret{min-height:54px;background:var(--face-color);color:var(--text-color);border:1px solid var(--border-color);font-weight:700}
[data-component="split-button"] .split-main{min-width:0;padding:10px 20px;border-radius:var(--corner-radius-px) 0 0 var(--corner-radius-px);font-size:var(--text-size-px);overflow:hidden}
[data-component="split-button"] .split-label{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-component="split-button"] .split-caret{width:58px;border-left-color:color-mix(in srgb,var(--text-color) 28%,transparent);border-radius:0 var(--corner-radius-px) var(--corner-radius-px) 0;font-size:20px}
[data-component="split-button"] .split-main.active{background:var(--selected-face-color);color:var(--selected-text-color);box-shadow:inset 0 0 16px color-mix(in srgb,var(--glow-color) 48%,transparent)}
[data-component="split-button"] .split-main.pressed,[data-component="split-button"] .split-caret.pressed{transform:scale(.97);filter:brightness(1.14)}
[data-component="split-button"] .split-caret span{display:inline-block;transition:transform .2s ease}
[data-component="split-button"] .split-caret.open span{transform:rotate(180deg)}
[data-component="split-button"] .split-root.menu-up .split-caret span{transform:rotate(180deg)}
[data-component="split-button"] .split-root.menu-up .split-caret.open span{transform:rotate(0)}
[data-component="split-button"] .split-menu{position:absolute;top:calc(100% + var(--menu-gap-px));right:0;width:max(170px,72%);padding:4px;background:var(--menu-color);border:1px solid var(--border-color);border-radius:var(--corner-radius-px);box-shadow:0 12px 28px rgba(0,0,0,.48),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 45%,transparent);opacity:0;transform:translateY(-7px) scale(.98);transform-origin:top right;pointer-events:none;transition:opacity .16s ease,transform .16s ease;overflow:hidden;z-index:20}
[data-component="split-button"] .split-menu.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
[data-component="split-button"] .split-root.menu-up .split-menu{top:auto;bottom:calc(100% + var(--menu-gap-px));transform:translateY(7px) scale(.98);transform-origin:bottom right}
[data-component="split-button"] .split-root.menu-up .split-menu.open{transform:translateY(0) scale(1)}
[data-component="split-button"] .split-item{display:none;width:100%;min-height:42px;padding:9px 14px;border:0;border-radius:calc(var(--corner-radius-px) * .65);background:var(--item-color);color:var(--item-text-color);font-size:var(--item-text-size-px);text-align:left}
[data-component="split-button"] .split-item.visible{display:block}
[data-component="split-button"] .split-item+.split-item.visible{border-top:1px solid color-mix(in srgb,var(--border-color) 24%,transparent)}
[data-component="split-button"] .split-item:hover,[data-component="split-button"] .split-item.pressed{background:color-mix(in srgb,var(--selected-item-color) 55%,var(--item-color));box-shadow:inset 0 0 12px color-mix(in srgb,var(--glow-color) 30%,transparent)}
[data-component="split-button"] .split-item.active{background:var(--selected-item-color);color:var(--selected-text-color);box-shadow:inset 0 0 14px color-mix(in srgb,var(--glow-color) 55%,transparent)}`,
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {}, frame = root.querySelector(".split-root"), menu = root.querySelector(".split-menu"), main = root.querySelector(".split-main"), label = root.querySelector(".split-label"), caret = root.querySelector(".split-caret"), labels = String(p.submenuLabels || data.defaultLabels || defaultLabels).split("|"), active = value => value === true || value === 1 || value === "1", address = (base, index) => p.bindingMode === "join" ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1)) : String(base || "").replace(/\{index\}/g, index).replace(/\{n\}/g, index);
      frame.classList.toggle("menu-up", p.menuDirection === "up");
      let selected = false, localName = String(p.text || "Run Scene"), visibleCount = Math.max(1, Math.min(20, Number(p.defaultCount) || 3));
      const renderMain = () => { label.textContent = selected ? String(p.selectedText || localName) : localName; main.classList.toggle("active", selected); };
      const setOpen = open => { menu.classList.toggle("open", open); caret.classList.toggle("open", open); caret.setAttribute("aria-expanded", String(open)); };
      const bindPress = (button, publish) => { let pressing = false; const release = () => { if (!pressing) return; pressing = false; button.classList.remove("pressed"); publish(false); }; button.addEventListener("pointerdown", event => { pressing = true; button.classList.add("pressed"); publish(true); event.preventDefault(); }); ["pointerup", "pointerleave", "pointercancel"].forEach(name => button.addEventListener(name, release)); };
      bindPress(main, value => context.signals.publish("press", value));
      const caretRelease = () => caret.classList.remove("pressed");
      caret.addEventListener("pointerdown", event => { event.stopPropagation(); caret.classList.add("pressed"); setOpen(!menu.classList.contains("open")); event.preventDefault(); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(name => caret.addEventListener(name, caretRelease));
      for (let index = 0; index < 20; index++) {
        const button = document.createElement("button"), text = labels[index] || `Item ${index + 1}`;
        button.type = "button"; button.className = "split-item"; button.textContent = text; menu.appendChild(button);
        bindPress(button, value => { context.signals.publishAddress("digital", address(p.pressBase, index), value); if (!value) setOpen(false); });
        context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => button.classList.toggle("active", active(value)));
        context.signals.subscribeAddress("serial", address(p.labelBase, index), value => { if (value !== undefined && value !== null && value !== "") button.textContent = String(value); });
      }
      const applyCount = value => { visibleCount = Math.max(1, Math.min(20, Math.round(Number(value) || Number(p.defaultCount) || 3))); [...menu.children].forEach((button, index) => button.classList.toggle("visible", index < visibleCount)); };
      context.signals.subscribe("selected", value => { selected = active(value); renderMain(); });
      context.signals.subscribe("name", value => { if (value !== undefined && value !== null && value !== "") { localName = String(value); renderMain(); } });
      context.signals.subscribe("itemCount", applyCount);
      const outside = event => { if (!root.contains(event.target)) setOpen(false); };
      root.ownerDocument.addEventListener("pointerdown", outside);
      applyCount(visibleCount); renderMain();
      return () => root.ownerDocument.removeEventListener("pointerdown", outside);
    },
  });
})(window);
