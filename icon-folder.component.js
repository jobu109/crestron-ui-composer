(function (runtime) {
  "use strict";

  const REFERENCE_SIZE = 400;
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>',
    map: '<path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    video: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.7-8.94A5.5 5.5 0 0 1 17 8.5 4 4 0 0 1 17.5 18H7z"/><path d="M12 12v6M9.5 15.5 12 18l2.5-2.5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    store: '<path d="M4 9l1-5h14l1 5"/><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/><path d="M5 9v10h14V9"/><path d="M10 19v-6h4v6"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
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
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5.5-5.5L9 17"/>',
    note: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    game: '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z"/>',
    folder: '<path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    none: "",
  };
  const ICON_OPTIONS = [
    ["home", "Home"], ["mail", "Mail"], ["map", "Map / Location"], ["video", "Video / Play"],
    ["cloud", "Cloud"], ["music", "Music"], ["store", "Store"], ["card", "Payment / Card"],
    ["tv", "TV"], ["camera", "Camera"], ["phone", "Phone"], ["message", "Message"],
    ["calendar", "Calendar"], ["weather", "Weather"], ["settings", "Settings"], ["power", "Power"],
    ["lock", "Lock"], ["bell", "Bell"], ["info", "Info"], ["photo", "Photo"], ["note", "Note"],
    ["game", "Game"], ["book", "Book"], ["folder", "Folder"], ["none", "None"],
  ].map(([value, label]) => ({ value, label }));
  const defaultItems = [
    ["Home", "home"], ["Mail", "mail"], ["Maps", "map"], ["Video", "video"], ["Cloud", "cloud"],
    ["Music", "music"], ["Store", "store"], ["Pay", "card"], ["TV", "tv"],
  ];

  const itemProperties = [];
  for (let index = 0; index < 9; index++) {
    const visibleWhen = { key: "itemCount", gte: index + 1 }, [label, icon] = defaultItems[index];
    itemProperties.push(
      { key: `item${index}Label`, name: `Item ${index + 1} label`, type: "text", defaultValue: label, visibleWhen, group: `Item ${index + 1}` },
      { key: `item${index}Icon`, name: `Item ${index + 1} icon`, type: "select", options: ICON_OPTIONS, defaultValue: icon, visibleWhen, group: `Item ${index + 1}` },
      { key: `item${index}Asset`, name: `Item ${index + 1} asset (overrides icon)`, type: "asset", defaultValue: "", visibleWhen, group: `Item ${index + 1}` },
    );
  }

  runtime.register({
    id: "icon-folder",
    name: "Icon Folder",
    category: "Navigation & Menus",
    defaultSize: { width: 400, height: 400 },
    signals: [
      { key: "press", name: "Folder press", type: "digital", direction: "output", defaultValue: "IconFolder.Press" },
      { key: "selected", name: "Folder open (selected)", type: "digital", direction: "input", defaultValue: "IconFolder.Selected" },
    ],
    itemSelector: ".fld-item",
    data: { ICONS, REFERENCE_SIZE },
    rangeBindings: [
      { name: "Digital item press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital item selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Serial item label range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement" },
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "folderTitle", name: "Folder title", type: "text", defaultValue: "My Folder" },
      { key: "defaultOpen", name: "Default open", type: "checkbox", defaultValue: false },
      { key: "itemCount", name: "Number of items", type: "select", options: Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), defaultValue: "9", affectsProperties: true },
      ...itemProperties,
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "IconFolder.Items.{index}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Selected base / pattern", type: "text", defaultValue: "IconFolder.Items.{index}.Selected", signalSetting: true },
      { key: "labelBase", name: "Label base / pattern", type: "text", defaultValue: "IconFolder.Items.{index}.Label", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "cardColor", name: "Card color", type: "color", defaultValue: "#2c2f35" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#ffffff" },
      { key: "titleColor", name: "Title color", type: "color", defaultValue: "#ffffff" },
      { key: "circleColor", name: "Icon circle color", type: "color", defaultValue: "#34373c" },
      { key: "iconColor", name: "Icon color", type: "color", defaultValue: "#ffffff" },
      { key: "labelColor", name: "Item label color", type: "color", defaultValue: "#ffffff" },
      { key: "dotColor", name: "Closed preview dot color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedColor", name: "Item selected circle color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowColor", name: "Press / selected glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowStrength", name: "Press / selected glow strength", type: "number", min: 0, max: 60, defaultValue: 16 },
      { key: "circleSize", name: "Icon circle size", type: "number", min: 24, max: 120, defaultValue: 55 },
      { key: "iconSize", name: "Icon size", type: "number", min: 10, max: 60, defaultValue: 24 },
      { key: "textSize", name: "Item label size", type: "number", min: 8, max: 28, defaultValue: 14 },
      { key: "titleSize", name: "Title size", type: "number", min: 10, max: 40, defaultValue: 20 },
      { key: "cornerRadius", name: "Card corner radius", type: "number", min: 0, max: 80, defaultValue: 36 },
      { key: "toggleDuration", name: "Open / close animation (ms)", type: "number", min: 100, max: 2000, defaultValue: 350 },
      { key: "closedScale", name: "Closed size (% of open)", type: "number", min: 10, max: 90, defaultValue: 25 },
    ],
    template: '<div class="fld-card"><button type="button" class="fld-preview" aria-label="Open folder"><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span><span class="fld-dot"></span></button><div class="fld-title"></div><div class="fld-grid"></div></div>',
    styles: '[data-component="icon-folder"],[data-component="icon-folder"] *{box-sizing:border-box}[data-component="icon-folder"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="icon-folder"] .fld-card{position:relative;width:100%;height:100%;container-type:size;border-radius:var(--corner-radius-px);border:1px solid color-mix(in srgb,var(--border-color) 30%,transparent);background:color-mix(in srgb,var(--card-color) 82%,transparent);backdrop-filter:blur(10px) saturate(0);-webkit-backdrop-filter:blur(10px) saturate(0);box-shadow:0 20px 30px -10px rgba(0,0,0,.5);overflow:hidden;transform-origin:center;transform:scale(1);transition:transform var(--toggle-duration) cubic-bezier(.34,1.1,.34,1)}[data-component="icon-folder"] .fld-card:not(.open){transform:scale(var(--closed-scale,.25))}[data-component="icon-folder"] .fld-preview{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);place-items:center;width:100%;height:100%;padding:18%;margin:0;border:0;background:transparent;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:opacity var(--toggle-duration) ease,transform var(--toggle-duration) ease}[data-component="icon-folder"] .fld-dot{width:22%;height:22%;border-radius:50%;background:var(--dot-color)}[data-component="icon-folder"] .fld-preview.pressed{transform:scale(.94)}[data-component="icon-folder"] .fld-card.open .fld-preview{opacity:0;pointer-events:none}[data-component="icon-folder"] .fld-title{position:absolute;left:0;right:0;top:6%;padding:0 8%;color:var(--title-color);font-size:var(--title-size-px);font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transform:scale(.92);pointer-events:none;transition:opacity var(--toggle-duration) ease,transform var(--toggle-duration) ease}[data-component="icon-folder"] .fld-grid{position:absolute;left:0;right:0;bottom:0;top:18%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);place-items:center;padding:4%;opacity:0;transform:scale(.92);pointer-events:none;transition:opacity var(--toggle-duration) ease,transform var(--toggle-duration) ease}[data-component="icon-folder"] .fld-card.open .fld-title,[data-component="icon-folder"] .fld-card.open .fld-grid{opacity:1;transform:scale(1);pointer-events:auto}[data-component="icon-folder"] .fld-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(2px,1.5cqmin,8px);width:100%;height:100%;padding:4px;border:0;background:transparent;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}[data-component="icon-folder"] .fld-item.pressed{transform:scale(.92)}[data-component="icon-folder"] .fld-icon-circle{position:relative;width:var(--circle-size-px);height:var(--circle-size-px);flex:none;border-radius:50%;background:var(--circle-color);display:flex;align-items:center;justify-content:center;overflow:hidden;transition:box-shadow .15s ease}[data-component="icon-folder"] .fld-item.pressed .fld-icon-circle,[data-component="icon-folder"] .fld-item.selected .fld-icon-circle{box-shadow:0 0 var(--glow-px) color-mix(in srgb,var(--glow-color) 70%,transparent)}[data-component="icon-folder"] .fld-item.selected .fld-icon-circle{background:var(--selected-color)}[data-component="icon-folder"] .fld-icon-circle svg{width:var(--icon-size-px);height:var(--icon-size-px);fill:none;stroke:var(--icon-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}[data-component="icon-folder"] .fld-icon-circle img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}[data-component="icon-folder"] .fld-item-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--label-color);font-size:var(--text-size-px);text-align:center}',
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {}, icons = data.ICONS || {}, referenceSize = data.REFERENCE_SIZE || 400;
      const card = root.querySelector(".fld-card"), preview = root.querySelector(".fld-preview"), title = root.querySelector(".fld-title"), grid = root.querySelector(".fld-grid");
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      const toResponsiveSize = (px, min, max) => `clamp(${min}px, ${((Number(px) || 0) / referenceSize) * 100}cqmin, ${max}px)`;

      card.style.setProperty("--card-color", p.cardColor || "#2c2f35");
      card.style.setProperty("--border-color", p.borderColor || "#ffffff");
      card.style.setProperty("--title-color", p.titleColor || "#ffffff");
      card.style.setProperty("--circle-color", p.circleColor || "#34373c");
      card.style.setProperty("--icon-color", p.iconColor || "#ffffff");
      card.style.setProperty("--label-color", p.labelColor || "#ffffff");
      card.style.setProperty("--dot-color", p.dotColor || "#ffffff");
      card.style.setProperty("--selected-color", p.selectedColor || "#04aa8e");
      card.style.setProperty("--glow-color", p.glowColor || "#04aa8e");
      card.style.setProperty("--glow-px", `${Number(p.glowStrength ?? 16)}px`);
      card.style.setProperty("--circle-size-px", toResponsiveSize(p.circleSize ?? 55, 16, 160));
      card.style.setProperty("--icon-size-px", toResponsiveSize(p.iconSize ?? 24, 8, 72));
      card.style.setProperty("--text-size-px", toResponsiveSize(p.textSize ?? 14, 7, 34));
      card.style.setProperty("--title-size-px", toResponsiveSize(p.titleSize ?? 20, 10, 48));
      card.style.setProperty("--corner-radius-px", `${Number(p.cornerRadius ?? 36)}px`);
      card.style.setProperty("--toggle-duration", `${Math.max(0, Number(p.toggleDuration ?? 350))}ms`);
      card.style.setProperty("--closed-scale", String(Math.max(0.1, Math.min(0.9, Number(p.closedScale ?? 25) / 100))));
      title.textContent = p.folderTitle || "My Folder";

      const count = Math.max(1, Math.min(9, Number(p.itemCount) || 9));
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
        item.type = "button"; item.className = "fld-item";

        const circle = document.createElement("span");
        circle.className = "fld-icon-circle";
        const assetData = p[`item${index}AssetData`];
        if (assetData) {
          const img = document.createElement("img");
          img.src = assetData; img.alt = "";
          circle.appendChild(img);
        } else {
          circle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[p[`item${index}Icon`]] || ""}</svg>`;
        }

        const label = document.createElement("span");
        label.className = "fld-item-label";
        label.textContent = p[`item${index}Label`] || `Item ${index + 1}`;

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

      let open = p.defaultOpen == null ? false : truthy(p.defaultOpen);
      const applyOpenState = () => card.classList.toggle("open", open);
      applyOpenState();

      let previewPressed = false;
      const previewDown = event => { previewPressed = true; preview.classList.add("pressed"); event.preventDefault(); };
      const previewUp = () => {
        if (!previewPressed) return;
        previewPressed = false;
        preview.classList.remove("pressed");
        context.signals.publish("press", true);
        schedulePulseEnd(() => context.signals.publish("press", false));
        open = true;
        applyOpenState();
      };
      const previewCancel = () => { previewPressed = false; preview.classList.remove("pressed"); };
      preview.addEventListener("pointerdown", previewDown);
      preview.addEventListener("pointerup", previewUp);
      preview.addEventListener("pointerleave", previewCancel);
      preview.addEventListener("pointercancel", previewCancel);
      cleanups.push(() => {
        preview.removeEventListener("pointerdown", previewDown);
        preview.removeEventListener("pointerup", previewUp);
        preview.removeEventListener("pointerleave", previewCancel);
        preview.removeEventListener("pointercancel", previewCancel);
      });

      const closeOnBackgroundTap = event => {
        if (!open || event.target.closest(".fld-item")) return;
        open = false;
        applyOpenState();
      };
      card.addEventListener("pointerdown", closeOnBackgroundTap);
      cleanups.push(() => card.removeEventListener("pointerdown", closeOnBackgroundTap));

      context.signals.subscribe("selected", value => { open = truthy(value); applyOpenState(); });

      return () => {
        pulseTimers.forEach(timer => clearTimeout(timer));
        pulseTimers.clear();
        cleanups.forEach(fn => fn());
      };
    },
  });
})(window.ComposerRuntime);
