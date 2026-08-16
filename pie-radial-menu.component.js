(function (runtime) {
  "use strict";

  const defaultLabels = "Home|Movies|Music|Sports|News|Settings";
  const defaultIcons = "home|movie|music|sports|news|settings";
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/>',
    movie: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    sports: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5 15 10l-1.2 3.8H10.2L9 10z"/><path d="M12 3v4.5M5 9l4.2 1M5 15l4.2-2.9M19 9l-4.2 1M19 15l-4.2-2.9M9.5 21l1-4M14.5 21l-1-4"/>',
    news: '<path d="M4 5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M16 20a2 2 0 0 0 2-2V9"/><path d="M7 8h6M7 11h6M7 14h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 5.6a1.65 1.65 0 0 0 1-1.51V4a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 5.6a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    power: '<path d="M12 2v9"/><path d="M18.4 6.6a8 8 0 1 1-12.8 0"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3M8 21h8"/>',
    phone: '<path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/>',
    none: "",
  };

  runtime.register({
    id: "pie-radial-menu",
    name: "Pie Radial Menu",
    category: "Navigation & Menus",
    defaultSize: { width: 400, height: 400 },
    signals: [],
    rangeBindings: [
      { name: "Digital item press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital item selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Serial item label range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement" },
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "itemCount", name: "Menu items", type: "select", options: [3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) })), defaultValue: "6", affectsProperties: true },
      { key: "itemLabels", name: "Local item labels", type: "text-list", countKey: "itemCount", itemName: "Item", defaultValue: defaultLabels },
      { key: "itemIcons", name: "Item icons (| separated)", type: "text", defaultValue: defaultIcons, description: "home, movie, music, sports, news, settings, power, lock, camera, mic, phone, bell, info, none" },
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "PieRadialMenu.Items.{index}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Selected base / pattern", type: "text", defaultValue: "PieRadialMenu.Items.{index}.Selected", signalSetting: true },
      { key: "labelBase", name: "Label base / pattern", type: "text", defaultValue: "PieRadialMenu.Items.{index}.Label", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "ringColor", name: "Ring background color", type: "color", defaultValue: "#20242c" },
      { key: "borderColor", name: "Border / divider color", type: "color", defaultValue: "#3a4048" },
      { key: "fillColor", name: "Sector idle fill", type: "color", defaultValue: "#20242c" },
      { key: "activeFillColor", name: "Sector hover / press / selected fill", type: "color", defaultValue: "#04aa8e" },
      { key: "itemColor", name: "Icon / label idle color", type: "color", defaultValue: "#aab2bd" },
      { key: "activeColor", name: "Icon / label active color", type: "color", defaultValue: "#ffffff" },
      { key: "hubColor", name: "Center hub color", type: "color", defaultValue: "#ffffff" },
      { key: "hubIconColor", name: "Center hub icon color", type: "color", defaultValue: "#151a24" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 60, defaultValue: 14 },
      { key: "iconSize", name: "Icon size", type: "number", min: 10, max: 60, defaultValue: 26 },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 28, defaultValue: 12 },
      { key: "hubSize", name: "Center hub size", type: "number", min: 30, max: 160, defaultValue: 70 },
      { key: "labelOffset", name: "Label distance (% of radius)", type: "number", min: 40, max: 95, defaultValue: 70 },
    ],
    template: '<div class="prm-wheel"><div class="prm-sectors"></div><div class="prm-hub"><svg class="prm-hub-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></div></div>',
    styles: '[data-component="pie-radial-menu"],[data-component="pie-radial-menu"] *{box-sizing:border-box}[data-component="pie-radial-menu"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="pie-radial-menu"] .prm-wheel{position:relative;width:100%;height:100%;border-radius:50%;overflow:hidden;background:radial-gradient(55% 55% at 70% 35%,rgba(255,255,255,.16),transparent 100%),var(--ring-color);border:2px solid var(--border-color);box-shadow:inset 2px 2px 3px rgba(255,255,255,.35),inset -1px -1px 2px rgba(0,0,0,.25)}[data-component="pie-radial-menu"] .prm-sectors{position:absolute;inset:0}[data-component="pie-radial-menu"] .prm-item{position:absolute;top:50%;left:50%;width:0;height:0;padding:0;margin:0;border:0;background:transparent;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}[data-component="pie-radial-menu"] .prm-slice{position:absolute;top:0;left:0;width:var(--r);height:var(--r);margin-top:calc(var(--r) * -1);transform-origin:0 100%;background:var(--fill-color);border:1px solid var(--border-color);transition:background .15s ease}[data-component="pie-radial-menu"] .prm-item:hover .prm-slice,[data-component="pie-radial-menu"] .prm-item.pressed .prm-slice,[data-component="pie-radial-menu"] .prm-item.selected .prm-slice{background:var(--active-fill);box-shadow:0 0 var(--glow-px) color-mix(in srgb,var(--glow-color) 60%,transparent)}[data-component="pie-radial-menu"] .prm-option{position:absolute;top:0;left:0;width:100px;height:60px;margin-left:-50px;margin-top:-30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;pointer-events:none;color:var(--item-color)}[data-component="pie-radial-menu"] .prm-item:hover .prm-option,[data-component="pie-radial-menu"] .prm-item.pressed .prm-option,[data-component="pie-radial-menu"] .prm-item.selected .prm-option{color:var(--active-color)}[data-component="pie-radial-menu"] .prm-icon{width:var(--icon-size-px);height:var(--icon-size-px);flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}[data-component="pie-radial-menu"] .prm-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-size-px);font-weight:600;color:currentColor;text-align:center}[data-component="pie-radial-menu"] .prm-hub{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:var(--hub-size-px);height:var(--hub-size-px);border-radius:50%;background:var(--hub-color);display:flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.3)}[data-component="pie-radial-menu"] .prm-hub-icon{width:46%;height:46%;fill:none;stroke:var(--hub-icon-color);stroke-width:2.4;stroke-linecap:round}',
    mount(root, context) {
      const p = context.options.properties || {};
      const wheel = root.querySelector(".prm-wheel"), sectorsHost = root.querySelector(".prm-sectors");
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      wheel.style.setProperty("--ring-color", p.ringColor || "#20242c");
      wheel.style.setProperty("--border-color", p.borderColor || "#3a4048");
      wheel.style.setProperty("--fill-color", p.fillColor || "#20242c");
      wheel.style.setProperty("--active-fill", p.activeFillColor || "#04aa8e");
      wheel.style.setProperty("--item-color", p.itemColor || "#aab2bd");
      wheel.style.setProperty("--active-color", p.activeColor || "#ffffff");
      wheel.style.setProperty("--hub-color", p.hubColor || "#ffffff");
      wheel.style.setProperty("--hub-icon-color", p.hubIconColor || "#151a24");
      wheel.style.setProperty("--glow-color", p.glowColor || "#04aa8e");
      wheel.style.setProperty("--glow-px", `${Number(p.glowStrength ?? 14)}px`);
      wheel.style.setProperty("--icon-size-px", `${Number(p.iconSize ?? 26)}px`);
      wheel.style.setProperty("--text-size-px", `${Number(p.textSize ?? 12)}px`);
      wheel.style.setProperty("--hub-size-px", `${Number(p.hubSize ?? 70)}px`);
      wheel.style.setProperty("--label-offset", String(Number(p.labelOffset ?? 70)));

      const count = Math.max(3, Math.min(8, Number(p.itemCount) || 6));
      const labels = String(p.itemLabels || defaultLabels).split("|");
      const iconKeys = String(p.itemIcons || defaultIcons).split("|");
      const address = (base, index) => p.bindingMode === "join"
        ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1))
        : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);

      const skewVal = 360 / count - 90;
      const deviation = (count / 2) % 2 !== 0 ? 360 / count / 2 : 0;
      sectorsHost.innerHTML = "";
      const cleanups = [];

      for (let index = 0; index < count; index++) {
        const angle = (360 / count) * (index + 1) - deviation;
        const optionAngle = angle + Math.abs(skewVal) + (90 - Math.abs(skewVal)) / 2;

        const item = document.createElement("button");
        item.type = "button"; item.className = "prm-item";

        const slice = document.createElement("span");
        slice.className = "prm-slice";
        slice.style.transform = `rotate(${angle}deg) skew(${skewVal}deg)`;

        const option = document.createElement("span");
        option.className = "prm-option";
        option.style.transform = `rotate(${optionAngle}deg) translateY(calc(var(--r) * var(--label-offset) / -100)) rotate(${-optionAngle}deg)`;

        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("class", "prm-icon");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = ICONS[(iconKeys[index] || "").trim()] || "";

        const label = document.createElement("span");
        label.className = "prm-label";
        label.textContent = labels[index] ?? "";

        option.append(icon, label);
        item.append(slice, option);
        sectorsHost.appendChild(item);

        const signal = address(p.pressBase, index);
        const down = event => { item.classList.add("pressed"); context.signals.publishAddress("digital", signal, true); event.preventDefault(); };
        const up = () => { item.classList.remove("pressed"); context.signals.publishAddress("digital", signal, false); };
        item.addEventListener("pointerdown", down);
        ["pointerup", "pointerleave", "pointercancel"].forEach(name => item.addEventListener(name, up));
        cleanups.push(() => { item.removeEventListener("pointerdown", down); ["pointerup", "pointerleave", "pointercancel"].forEach(name => item.removeEventListener(name, up)); });

        context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => item.classList.toggle("selected", truthy(value)));
        context.signals.subscribeAddress("serial", address(p.labelBase, index), value => { if (value !== undefined && value !== null && String(value) !== "") label.textContent = String(value); });
      }

      const updateRadius = () => {
        const size = Math.min(root.clientWidth || 0, root.clientHeight || 0);
        wheel.style.setProperty("--r", `${size / 2}px`);
      };
      updateRadius();
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(updateRadius) : null;
      observer?.observe(root);

      return () => { cleanups.forEach(fn => fn()); observer?.disconnect(); };
    },
  });
})(window.ComposerRuntime);
