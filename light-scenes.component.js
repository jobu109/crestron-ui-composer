(function (runtime) {
  "use strict";

  const defaults = ["All Off", "Scene 1", "Scene 2", "Scene 3", "Scene 4"]
    .concat(Array.from({ length: 15 }, (_, index) => `Scene ${index + 5}`))
    .join("|");
  const defaultIcons = ["bulb", "scene-grid", "scene-grid", "scene-grid", "scene-grid"]
    .concat(Array(15).fill("scene-grid"))
    .join("|");
  const sceneIconOptions = [
    ["blank", "Blank"], ["bulb", "Light bulb"], ["scene-grid", "Scene grid"],
    ["sun", "Sun"], ["moon", "Moon"], ["home", "Home"], ["meeting", "Meeting"],
    ["presentation", "Presentation"], ["video", "Video"], ["music", "Music"],
    ["power", "Power"], ["star", "Star"], ["check", "Check"],
  ].map(([value, label]) => ({ value, label }));

  runtime.register({
    id: "light-scenes",
    name: "Light Scenes",
    category: "Lists & Selectors",
    defaultSize: { width: 220, height: 520 },
    signals: [
      { key: "count", name: "Number of scenes", type: "analog", direction: "input", defaultValue: "LightScenes.Feedback" },
    ],
    rangeBindings: [
      { name: "Digital scene press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Digital scene selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Serial scene name range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Per-scene Visibility range", type: "digital", direction: "input", baseKey: "visibilityBase", incrementKey: "visibilityIncrement", countKey: "defaultCount", visibilitySelector: ".ls-item", optionalProperty: "itemVisibilityEnabled" },
    ],
    itemSelector: ".ls-item",
    data: { defaults },
    properties: [
      { key: "defaultCount", name: "Default scenes", type: "select", options: Array.from({ length: 20 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })), defaultValue: "5", affectsProperties: true },
      { key: "sceneLabels", name: "Local scene names", type: "text-list", countKey: "defaultCount", itemName: "Scene", defaultValue: defaults },
      { key: "sceneIcons", name: "Standard state scene icons", type: "select-list", countKey: "defaultCount", itemName: "Scene", options: sceneIconOptions, defaultItemValue: "scene-grid", defaultValue: defaultIcons },
      { key: "sceneSelectedIcons", name: "Selected state scene icons", type: "select-list", countKey: "defaultCount", itemName: "Scene", options: sceneIconOptions, defaultItemValue: "scene-grid", defaultValue: defaultIcons, disabledWhen: { key: "selectedSameAsStandard", value: true } },
      { key: "defaultSelected", name: "Default selected scene (0 based)", type: "number", min: 0, max: 19, defaultValue: 0 },
      { key: "showLabels", name: "Show scene names", type: "checkbox", defaultValue: true },
      { key: "showFirstLabelOnly", name: "Show only the first scene name", type: "checkbox", defaultValue: false },
      { key: "itemGap", name: "Scene spacing", type: "number", min: 0, max: 40, defaultValue: 4 },
      { key: "panelColor", name: "Panel color", type: "color", defaultValue: "#181818" },
      { key: "itemColor", name: "Standard scene color", type: "color", defaultValue: "#282828" },
      { key: "selectedColor", name: "Selected scene color", type: "color", defaultValue: "#314b46" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#101010" },
      { key: "iconColor", name: "Standard icon color", type: "color", defaultValue: "#525252" },
      { key: "selectedIconColor", name: "Selected icon color", type: "color", defaultValue: "#ffffff" },
      { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#bfc2c3" },
      { key: "selectedTextColor", name: "Selected text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Standard glow color", type: "color", defaultValue: "#000000" },
      { key: "selectedGlowColor", name: "Selected glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 48, defaultValue: 16 },
      { key: "iconSize", name: "Icon size", type: "number", min: 12, max: 80, defaultValue: 34 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, defaultValue: 10 },
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "LightScenes.Items.{index}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Selected base / pattern", type: "text", defaultValue: "LightScenes.Items.{index}.Selected", signalSetting: true },
      { key: "labelBase", name: "Name base / pattern", type: "text", defaultValue: "LightScenes.Items.{index}.Name", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", min: 1, defaultValue: 1, signalSetting: true },
      { key: "itemVisibilityEnabled", name: "Enable per-scene visibility signals", type: "checkbox", defaultValue: false, signalSetting: true },
      { key: "visibilityBase", name: "Per-scene Visibility base / pattern", type: "text", defaultValue: "LightScenes.Items.{index}.Visibility", signalSetting: true },
      { key: "visibilityIncrement", name: "Per-scene visibility join increment", type: "number", min: 1, defaultValue: 1, signalSetting: true },
      { key: "wrapText", name: "Wrap text", type: "checkbox", defaultValue: false },
    ],
    template: '<div class="ls-panel"><div class="ls-list"></div></div>',
    styles: '[data-component="light-scenes"]{display:block;width:100%;height:100%;padding:7%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="light-scenes"] *{box-sizing:border-box}[data-component="light-scenes"] .ls-panel{width:100%;height:100%;padding:7px;border:1px solid #090909;border-radius:3px;background:linear-gradient(90deg,#111,var(--panel-color) 12%,var(--panel-color) 88%,#101010);box-shadow:inset 2px 0 5px rgba(255,255,255,.04),0 5px 14px rgba(0,0,0,.55);overflow:auto}[data-component="light-scenes"] .ls-list{display:grid;grid-auto-rows:minmax(64px,1fr);gap:var(--item-gap-px);width:100%;min-height:100%}[data-component="light-scenes"] .ls-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:0;padding:7px;border:1px solid var(--border-color);border-radius:2px;background:linear-gradient(145deg,#303030,var(--item-color) 58%,#1d1d1d);box-shadow:inset 0 1px rgba(255,255,255,.07),0 2px 4px rgba(0,0,0,.62),0 0 calc(var(--glow-strength-px) * .25) var(--glow-color);color:var(--text-color);cursor:pointer;touch-action:none;transition:filter .12s,transform .12s,background .18s,box-shadow .18s}[data-component="light-scenes"] .ls-item.pressed{filter:brightness(1.2);transform:scale(.975)}[data-component="light-scenes"] .ls-item.selected{border-color:var(--selected-glow-color);background:linear-gradient(145deg,#40534f,var(--selected-color) 60%,#1d2c29);box-shadow:inset 0 1px rgba(255,255,255,.12),0 0 var(--glow-strength-px) var(--selected-glow-color);color:var(--selected-text-color)}[data-component="light-scenes"] .ls-icon{display:grid;width:var(--icon-size-px);height:var(--icon-size-px);place-items:center;color:var(--icon-color);filter:drop-shadow(0 1px 1px #000);pointer-events:none}[data-component="light-scenes"] .ls-icon-selected{display:none}[data-component="light-scenes"] .ls-item.selected .ls-icon-standard{display:none}[data-component="light-scenes"] .ls-item.selected .ls-icon-selected{display:grid}[data-component="light-scenes"] .ls-item.selected .ls-icon{color:var(--selected-icon-color);filter:drop-shadow(0 0 calc(var(--glow-strength-px) * .55) var(--selected-glow-color))}[data-component="light-scenes"] .ls-icon svg{display:block;width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}[data-component="light-scenes"] .ls-dots{display:grid;grid-template-columns:repeat(3,1fr);gap:14%;width:72%;height:72%}[data-component="light-scenes"] .ls-dots i{border-radius:50%;background:currentColor;box-shadow:inset 0 1px rgba(255,255,255,.12)}[data-component="light-scenes"] .ls-label{max-width:100%;overflow:hidden;font-size:var(--text-size-px);font-weight:650;line-height:1.05;text-align:center;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}[data-component="light-scenes"].wrap-text .ls-label{overflow-wrap:anywhere;text-overflow:clip;white-space:normal}',
    mount(root, context) {
      const p = context.options.properties || {}, list = root.querySelector(".ls-list"), labels = String(p.sceneLabels || defaults).split("|"), icons = String(p.sceneIcons || defaultIcons).split("|"), selectedIcons = String(p.sceneSelectedIcons || defaultIcons).split("|");
      let count = Math.max(1, Math.min(20, Number(p.defaultCount) || 5)), selected = Math.max(0, Math.min(count - 1, Number(p.defaultSelected) || 0)), rows = [];
      function address(base, index, incrementKey) {
        const increment = Math.max(1, Number(p[incrementKey || "signalIncrement"]) || 1);
        return p.bindingMode === "join"
          ? String((Number(base) || 0) + index * increment)
          : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);
      }
      function choose(index) {
        selected = Math.max(0, Math.min(count - 1, index));
        rows.forEach((row, rowIndex) => row.classList.toggle("selected", rowIndex === selected));
      }
      function icon(key, className) {
        const paths = {
          bulb: '<path d="M8.2 14.5a6 6 0 1 1 7.6 0c-1 .8-1.3 1.4-1.3 2.5h-5c0-1.1-.3-1.7-1.3-2.5Z"></path><path d="M9.5 20h5M10 17h4"></path>',
          sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"></path>',
          moon: '<path d="M20 15.2A8 8 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"></path>',
          home: '<path d="m3 11 9-8 9 8v9H6v-9M9 20v-6h6v6"></path>',
          meeting: '<circle cx="8" cy="8" r="3"></circle><circle cx="17" cy="9" r="2.5"></circle><path d="M2.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M14 15c3.8-.8 6.3 1 7 5"></path>',
          presentation: '<path d="M3 4h18v12H3zM8 20l4-4 4 4M8 9l3 3 5-5"></path>',
          video: '<rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3"></path>',
          music: '<path d="M9 18V5l10-2v13M9 9l10-2"></path><circle cx="6" cy="18" r="3"></circle><circle cx="16" cy="16" r="3"></circle>',
          power: '<path d="M12 2v10M6.3 5.7a8 8 0 1 0 11.4 0"></path>',
          star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1Z"></path>',
          check: '<path d="m4 12 5 5L20 6"></path>',
        };
        if (key === "blank") return '<span class="ls-icon ' + className + '"></span>';
        if (key === "scene-grid") return '<span class="ls-icon ' + className + '"><span class="ls-dots">' + "<i></i>".repeat(9) + "</span></span>";
        return '<span class="ls-icon ' + className + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[key] || paths.bulb) + "</svg></span>";
      }
      function build(nextCount) {
        count = Math.max(1, Math.min(20, Number(nextCount) || Number(p.defaultCount) || 5));
        selected = Math.min(selected, count - 1);
        list.innerHTML = "";
        rows = [];
        for (let index = 0; index < count; index += 1) {
          const row = document.createElement("button"), text = document.createElement("span");
          row.type = "button";
          row.className = "ls-item";
          const standardIcon = icons[index] || (index === 0 ? "bulb" : "scene-grid");
          const inheritSelected = p.selectedSameAsStandard !== false && p.selectedSameAsStandard !== "false";
          const selectedIcon = inheritSelected ? standardIcon : (selectedIcons[index] || standardIcon);
          row.innerHTML = icon(standardIcon, "ls-icon-standard") + icon(selectedIcon, "ls-icon-selected");
          text.className = "ls-label";
          text.textContent = labels[index] || "";
          text.hidden = p.showLabels === false || p.showLabels === "false" || (p.showFirstLabelOnly === true || p.showFirstLabelOnly === "true") && index > 0;
          row.appendChild(text);
          let unbind;
          const down = (event) => {
            row.classList.add("pressed");
            context.signals.publishAddress("digital", address(p.pressBase, index), true);
            event.preventDefault();
          };
          const up = () => {
            row.classList.remove("pressed");
            context.signals.publishAddress("digital", address(p.pressBase, index), false);
          };
          if (context.interactions && context.interactions.bindPrimaryPointer)
            unbind = context.interactions.bindPrimaryPointer(row, { down, up, cancel: up });
          else {
            row.addEventListener("pointerdown", down);
            row.addEventListener("pointerup", up);
            row.addEventListener("pointercancel", up);
            row.addEventListener("lostpointercapture", up);
            unbind = () => {};
          }
          context.signals.subscribeAddress("digital", address(p.feedbackBase, index), (value) => {
            if (value === true || value === 1 || value === "1") choose(index);
            else if (selected === index) row.classList.remove("selected");
          });
          context.signals.subscribeAddress("serial", address(p.labelBase, index), (value) => {
            if (value !== undefined && value !== null && String(value) !== "") text.textContent = String(value);
          });
          if (p.itemVisibilityEnabled === true || p.itemVisibilityEnabled === "true")
            context.signals.subscribeAddress("digital", address(p.visibilityBase, index, "visibilityIncrement"), (value) => {
              row.style.display = value === true || value === 1 || value === "1" ? "" : "none";
            });
          list.appendChild(row);
          rows.push(row);
          if (typeof unbind === "function") row._composerUnbind = unbind;
        }
        choose(selected);
      }
      context.signals.subscribe("count", build);
      build(count);
      return () => rows.forEach((row) => row._composerUnbind && row._composerUnbind());
    },
  });
})(window.ComposerRuntime);
