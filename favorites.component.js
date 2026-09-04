(function (runtime) {
  "use strict";

  const REFERENCE_SIZE = 400;
  const ICONS = {
    star: '<path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-10-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 10 5.5c-2.5 4.4-10 9-10 9z"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>',
    map: '<path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    video: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.7-8.94A5.5 5.5 0 0 1 17 8.5 4 4 0 0 1 17.5 18H7z"/><path d="M12 12v6M9.5 15.5 12 18l2.5-2.5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    phone: '<path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    message: '<path d="M4 5h16v11H8l-4 4z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    weather: '<circle cx="8" cy="9" r="3.2"/><path d="M8 2.5v2M3 9H1M4 4l1.4 1.4M12 4l-1.4 1.4"/><path d="M9 20a4.5 4.5 0 0 1-.7-8.94A5.5 5.5 0 0 1 19 12.5 4 4 0 0 1 19.5 20H9z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 5.6a1.65 1.65 0 0 0 1-1.51V4a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 5.6a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    power: '<path d="M12 2v9"/><path d="M18.4 6.6a8 8 0 1 1-12.8 0"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5.5-5.5L9 17"/>',
    game: '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/>',
    folder: '<path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    none: "",
  };
  const ICON_OPTIONS = [
    ["star", "Star"], ["heart", "Heart"], ["home", "Home"], ["mail", "Mail"], ["map", "Map / Location"],
    ["video", "Video / Play"], ["cloud", "Cloud"], ["music", "Music"], ["tv", "TV"], ["camera", "Camera"],
    ["phone", "Phone"], ["message", "Message"], ["calendar", "Calendar"], ["weather", "Weather"],
    ["settings", "Settings"], ["power", "Power"], ["lock", "Lock"], ["bell", "Bell"], ["photo", "Photo"],
    ["game", "Game"], ["folder", "Folder"], ["none", "None"],
  ].map(([value, label]) => ({ value, label }));
  const defaultItems = [
    ["Favorite 1", "star"], ["Favorite 2", "star"], ["Favorite 3", "star"], ["Favorite 4", "star"],
    ["Favorite 5", "star"], ["Favorite 6", "star"], ["Favorite 7", "star"], ["Favorite 8", "star"],
    ["Favorite 9", "star"], ["Favorite 10", "star"], ["Favorite 11", "star"], ["Favorite 12", "star"],
  ];
  const MAX_ITEMS = 12;

  const itemProperties = [];
  for (let index = 0; index < MAX_ITEMS; index++) {
    const visibleWhen = { key: "itemCount", gte: index + 1 }, [label, icon] = defaultItems[index];
    itemProperties.push(
      { key: `item${index}Label`, name: `Item ${index + 1} label`, type: "text", defaultValue: label, visibleWhen, group: `Item ${index + 1}` },
      { key: `item${index}Icon`, name: `Item ${index + 1} icon`, type: "select", options: ICON_OPTIONS, defaultValue: icon, visibleWhen, group: `Item ${index + 1}` },
      { key: `item${index}Asset`, name: `Item ${index + 1} asset (overrides icon)`, type: "asset", defaultValue: "", visibleWhen, group: `Item ${index + 1}` },
    );
  }

  runtime.register({
    id: "favorites",
    name: "Favorites",
    category: "Lists & Selectors",
    defaultSize: { width: 480, height: 320 },
    signals: [],
    itemSelector: ".fav-item",
    // mount() is serialized into the standalone Preview/CH5 runtime. Every
    // closure value it uses must therefore travel through definitionData.
    data: { ICONS, REFERENCE_SIZE, MAX_ITEMS },
    rangeBindings: [
      { name: "Digital item press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital item selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Serial item label range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement" },
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "layout", name: "Layout", type: "select", options: [{ value: "grid", label: "Grid (rows and columns)" }, { value: "row", label: "Single scrolling row" }], defaultValue: "grid", affectsProperties: true },
      { key: "columns", name: "Grid columns", type: "number", min: 1, max: 6, defaultValue: 3, visibleWhen: { key: "layout", equals: "grid" } },
      { key: "itemCount", name: "Number of favorites", type: "select", options: Array.from({ length: MAX_ITEMS }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), defaultValue: "6", affectsProperties: true },
      ...itemProperties,
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "Favorites.Items.{index}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Selected base / pattern", type: "text", defaultValue: "Favorites.Items.{index}.Selected", signalSetting: true },
      { key: "labelBase", name: "Label base / pattern", type: "text", defaultValue: "Favorites.Items.{index}.Label", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "transparent" },
      { key: "itemColor", name: "Grid tile color", type: "color", defaultValue: "#2c2f35" },
      { key: "selectedColor", name: "Selected grid tile color", type: "color", defaultValue: "#04aa8e" },
      { key: "iconColor", name: "Icon color", type: "color", defaultValue: "#ffffff" },
      { key: "labelColor", name: "Item label color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Press / selected glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowStrength", name: "Press / selected glow strength", type: "number", min: 0, max: 60, defaultValue: 16 },
      { key: "circleSize", name: "Icon circle size", type: "number", min: 24, max: 160, defaultValue: 64 },
      { key: "iconSize", name: "Icon size", type: "number", min: 10, max: 80, defaultValue: 28 },
      { key: "textSize", name: "Item label size", type: "number", min: 8, max: 32, defaultValue: 14 },
      { key: "gap", name: "Row item spacing", type: "number", min: 0, max: 60, defaultValue: 16, visibleWhen: { key: "layout", equals: "row" } },
      { key: "cornerRadius", name: "Background corner radius", type: "number", min: 0, max: 80, defaultValue: 0 },
    ],
    template: '<div class="fav-card"><div class="fav-grid"></div></div>',
    styles:
      '[data-component="favorites"],[data-component="favorites"] *{box-sizing:border-box}' +
      '[data-component="favorites"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}' +
      '[data-component="favorites"] .fav-card{position:relative;width:100%;height:100%;container-type:size;border-radius:var(--corner-radius-px);background:var(--background-color);overflow:auto}' +
      '[data-component="favorites"] .fav-grid{width:100%;min-height:100%;padding:0;display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:0;align-content:start}' +
      '[data-component="favorites"] .fav-grid.fav-row{display:flex;height:100%;min-height:0;padding:var(--gap-px);gap:var(--gap-px);flex-direction:row;align-items:center;overflow-x:auto;overflow-y:hidden}' +
      '[data-component="favorites"] .fav-item{display:flex;min-width:0;aspect-ratio:1;flex-direction:column;align-items:center;justify-content:center;gap:clamp(2px,1.5cqmin,8px);width:100%;height:auto;padding:clamp(4px,2cqmin,12px);border:0;border-radius:0;background:var(--item-color);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background-color .15s ease,transform .15s ease,box-shadow .15s ease}' +
      '[data-component="favorites"] .fav-grid.fav-row .fav-item{flex:none;width:auto;height:min(100%,var(--circle-size-px));padding:2px;border-radius:50%;background:transparent}' +
      '[data-component="favorites"] .fav-item.pressed{transform:scale(.94);box-shadow:inset 0 0 var(--glow-px) var(--glow-color)}' +
      '[data-component="favorites"] .fav-item.selected{background:var(--selected-color);box-shadow:inset 0 0 var(--glow-px) var(--glow-color)}' +
      '[data-component="favorites"] .fav-icon-circle{position:relative;width:var(--circle-size-px);height:var(--circle-size-px);max-width:70%;max-height:70%;flex:none;border-radius:0;background:transparent;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      '[data-component="favorites"] .fav-grid.fav-row .fav-icon-circle{max-width:none;max-height:none;border-radius:50%;background:var(--item-color)}' +
      '[data-component="favorites"] .fav-grid.fav-row .fav-item.pressed .fav-icon-circle,[data-component="favorites"] .fav-grid.fav-row .fav-item.selected .fav-icon-circle{box-shadow:0 0 var(--glow-px) color-mix(in srgb,var(--glow-color) 70%,transparent)}' +
      '[data-component="favorites"] .fav-grid.fav-row .fav-item.selected{background:transparent;box-shadow:none}' +
      '[data-component="favorites"] .fav-grid.fav-row .fav-item.selected .fav-icon-circle{background:var(--selected-color)}' +
      '[data-component="favorites"] .fav-icon-circle svg{width:var(--icon-size-px);height:var(--icon-size-px);fill:none;stroke:var(--icon-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '[data-component="favorites"] .fav-icon-circle img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '[data-component="favorites"] .fav-item-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--label-color);font-size:var(--text-size-px);text-align:center}',
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {}, icons = data.ICONS || {}, referenceSize = data.REFERENCE_SIZE || 400, maxItems = data.MAX_ITEMS || 12;
      const card = root.querySelector(".fav-card"), grid = root.querySelector(".fav-grid");
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      const toResponsiveSize = (px, min, max) => `clamp(${min}px, ${((Number(px) || 0) / referenceSize) * 100}cqmin, ${max}px)`;

      card.style.setProperty("--background-color", p.backgroundColor || "transparent");
      card.style.setProperty("--item-color", p.itemColor || "#2c2f35");
      card.style.setProperty("--icon-color", p.iconColor || "#ffffff");
      card.style.setProperty("--label-color", p.labelColor || "#ffffff");
      card.style.setProperty("--selected-color", p.selectedColor || "#04aa8e");
      card.style.setProperty("--glow-color", p.glowColor || "#04aa8e");
      card.style.setProperty("--glow-px", `${Number(p.glowStrength ?? 16)}px`);
      card.style.setProperty("--circle-size-px", toResponsiveSize(p.circleSize ?? 64, 16, 200));
      card.style.setProperty("--icon-size-px", toResponsiveSize(p.iconSize ?? 28, 8, 96));
      card.style.setProperty("--text-size-px", toResponsiveSize(p.textSize ?? 14, 7, 36));
      card.style.setProperty("--gap-px", `${Number(p.gap ?? 16)}px`);
      card.style.setProperty("--corner-radius-px", `${Number(p.cornerRadius ?? 0)}px`);
      card.style.setProperty("--columns", String(Math.max(1, Math.min(6, Number(p.columns) || 3))));
      const isRow = p.layout === "row";
      grid.classList.toggle("fav-row", isRow);

      const count = Math.max(1, Math.min(maxItems, Number(p.itemCount) || 6));
      const address = (base, index) => p.bindingMode === "join"
        ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1))
        : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);

      grid.innerHTML = "";
      const cleanups = [], pulseTimers = new Set();
      const schedulePulseEnd = callback => {
        const timer = setTimeout(() => {
          pulseTimers.delete(timer);
          callback();
        }, 100);
        pulseTimers.add(timer);
      };
      for (let index = 0; index < count; index++) {
        const item = document.createElement("button");
        item.type = "button"; item.className = "fav-item";

        const circle = document.createElement("span");
        circle.className = "fav-icon-circle";
        const assetData = p[`item${index}AssetData`];
        if (assetData) {
          const img = document.createElement("img");
          img.src = assetData; img.alt = "";
          circle.appendChild(img);
        } else {
          circle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[p[`item${index}Icon`]] || ""}</svg>`;
        }

        const label = document.createElement("span");
        label.className = "fav-item-label";
        label.textContent = p[`item${index}Label`] || `Favorite ${index + 1}`;

        item.append(circle, label);
        grid.appendChild(item);

        const signal = address(p.pressBase, index);
        const down = event => { item.classList.add("pressed"); event.preventDefault(); };
        const up = () => {
          if (!item.classList.contains("pressed")) return;
          item.classList.remove("pressed");
          context.signals.publishAddress("digital", signal, true);
          schedulePulseEnd(() => context.signals.publishAddress("digital", signal, false));
        };
        const cancel = () => item.classList.remove("pressed");
        item.addEventListener("pointerdown", down);
        item.addEventListener("pointerup", up);
        item.addEventListener("pointerleave", cancel);
        item.addEventListener("pointercancel", cancel);
        cleanups.push(() => {
          item.removeEventListener("pointerdown", down);
          item.removeEventListener("pointerup", up);
          item.removeEventListener("pointerleave", cancel);
          item.removeEventListener("pointercancel", cancel);
        });

        context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => item.classList.toggle("selected", truthy(value)));
        context.signals.subscribeAddress("serial", address(p.labelBase, index), value => { if (value !== undefined && value !== null && String(value) !== "") label.textContent = String(value); });
      }

      return () => {
        pulseTimers.forEach(timer => clearTimeout(timer));
        pulseTimers.clear();
        cleanups.forEach(fn => fn());
      };
    },
  });
})(window.ComposerRuntime);
