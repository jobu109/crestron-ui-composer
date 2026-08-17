(function (runtime) {
  "use strict";

  const defaultLabels = "Home|Movies|Music|Sports|News|Settings";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const REFERENCE_SIZE = 400;
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
  const ICON_OPTIONS = [
    ["home", "Home"], ["movie", "Movie / Play"], ["music", "Music"], ["sports", "Sports"],
    ["news", "News"], ["settings", "Settings"], ["power", "Power"], ["lock", "Lock"],
    ["camera", "Camera"], ["mic", "Microphone"], ["phone", "Phone"], ["bell", "Bell"],
    ["info", "Info"], ["none", "None"],
  ].map(([value, label]) => ({ value, label }));
  const defaultIconKeys = ["home", "movie", "music", "sports", "news", "settings", "power", "lock"];

  const itemProperties = [];
  for (let index = 0; index < 8; index++) {
    const visibleWhen = { key: "itemCount", gte: index + 1 };
    itemProperties.push(
      { key: `item${index}Icon`, name: `Item ${index + 1} icon`, type: "select", options: ICON_OPTIONS, defaultValue: defaultIconKeys[index] || "home", visibleWhen, group: `Item ${index + 1}` },
      { key: `item${index}Asset`, name: `Item ${index + 1} asset (overrides icon)`, type: "asset", defaultValue: "", visibleWhen, group: `Item ${index + 1}` },
    );
  }

  runtime.register({
    id: "pie-radial-menu",
    name: "Pie Radial Menu",
    category: "Navigation & Menus",
    defaultSize: { width: 400, height: 400 },
    signals: [
      { key: "hubPress", name: "Menu button press", type: "digital", direction: "output", defaultValue: "PieRadialMenu.Hub.Press" },
      { key: "hubSelected", name: "Menu button selected (open)", type: "digital", direction: "input", defaultValue: "PieRadialMenu.Hub.Selected" },
    ],
    itemSelector: ".prm-wedge",
    data: { defaultLabels, SVG_NS, REFERENCE_SIZE, ICONS },
    rangeBindings: [
      { name: "Digital item press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement" },
      { name: "Digital item selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement" },
      { name: "Serial item label range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement" },
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "itemCount", name: "Menu items", type: "select", options: [3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) })), defaultValue: "6", affectsProperties: true },
      { key: "itemLabels", name: "Local item labels", type: "text-list", countKey: "itemCount", itemName: "Item", defaultValue: defaultLabels },
      ...itemProperties,
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
      { key: "defaultOpen", name: "Default open", type: "checkbox", defaultValue: true },
      { key: "spiralDuration", name: "Open / close animation (ms)", type: "number", min: 200, max: 3000, defaultValue: 650 },
      { key: "spiralTurns", name: "Spiral turns", type: "number", min: 0.5, max: 4, step: 0.25, defaultValue: 1.25 },
    ],
    template: '<div class="prm-wheel"><button type="button" class="prm-hub" aria-label="Toggle menu"><svg class="prm-hub-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><div class="prm-dial"><svg class="prm-wedges" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"></svg><div class="prm-options"></div></div></div>',
    styles: '[data-component="pie-radial-menu"],[data-component="pie-radial-menu"] *{box-sizing:border-box}[data-component="pie-radial-menu"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="pie-radial-menu"] .prm-wheel{position:relative;width:100%;height:100%;container-type:size}[data-component="pie-radial-menu"] .prm-dial{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:radial-gradient(55% 55% at 70% 35%,rgba(255,255,255,.16),transparent 100%),var(--ring-color);border:2px solid var(--border-color);box-shadow:inset 2px 2px 3px rgba(255,255,255,.35),inset -1px -1px 2px rgba(0,0,0,.25);transform-origin:50% 50%;transform:scale(1) rotate(0deg);opacity:1;transition:transform var(--toggle-duration) cubic-bezier(.67,.17,.4,.83),opacity var(--toggle-duration) cubic-bezier(.67,.17,.4,.83)}[data-component="pie-radial-menu"] .prm-wheel.closed .prm-dial{transform:scale(.001) rotate(calc(var(--spiral-deg) * -1));opacity:0;pointer-events:none}[data-component="pie-radial-menu"] .prm-wedges{position:absolute;inset:0;width:100%;height:100%;display:block}[data-component="pie-radial-menu"] .prm-wedge{fill:var(--fill-color);stroke:var(--border-color);stroke-width:1;cursor:pointer;touch-action:manipulation;transition:fill .15s ease}[data-component="pie-radial-menu"] .prm-wedge.active{fill:var(--active-fill);filter:drop-shadow(0 0 var(--glow-px) color-mix(in srgb,var(--glow-color) 60%,transparent))}[data-component="pie-radial-menu"] .prm-options{position:absolute;inset:0;pointer-events:none}[data-component="pie-radial-menu"] .prm-option{position:absolute;width:clamp(50px,25cqmin,170px);height:clamp(32px,15cqmin,100px);transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,4cqmin,18px);color:var(--item-color)}[data-component="pie-radial-menu"] .prm-option.active{color:var(--active-color)}[data-component="pie-radial-menu"] .prm-icon{width:var(--icon-size-px);height:var(--icon-size-px);flex:none}[data-component="pie-radial-menu"] svg.prm-icon{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}[data-component="pie-radial-menu"] img.prm-icon{object-fit:contain}[data-component="pie-radial-menu"] .prm-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-size-px);font-weight:600;color:currentColor;text-align:center}[data-component="pie-radial-menu"] .prm-hub{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:var(--hub-size-px);height:var(--hub-size-px);margin:0;padding:0;border:0;border-radius:50%;background:var(--hub-color);display:flex;align-items:center;justify-content:center;z-index:2;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;box-shadow:0 2px 6px rgba(0,0,0,.3);transition:transform .12s ease}[data-component="pie-radial-menu"] .prm-hub.pressed{transform:translate(-50%,-50%) scale(.92)}[data-component="pie-radial-menu"] .prm-hub-icon{width:46%;height:46%;fill:none;stroke:var(--hub-icon-color);stroke-width:2.4;stroke-linecap:round}',
    mount(root, context) {
      const p = context.options.properties || {};
      const wheel = root.querySelector(".prm-wheel"), wedgesHost = root.querySelector(".prm-wedges"), optionsHost = root.querySelector(".prm-options"), hub = root.querySelector(".prm-hub");
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      wheel.style.setProperty("--toggle-duration", `${Math.max(0, Number(p.spiralDuration ?? 650))}ms`);
      wheel.style.setProperty("--spiral-deg", `${Math.max(0, Number(p.spiralTurns ?? 1.25)) * 360}deg`);
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
      const toResponsiveSize = (px, min, max) => `clamp(${min}px, ${((Number(px) || 0) / REFERENCE_SIZE) * 100}cqmin, ${max}px)`;
      wheel.style.setProperty("--icon-size-px", toResponsiveSize(p.iconSize ?? 26, 8, 90));
      wheel.style.setProperty("--text-size-px", toResponsiveSize(p.textSize ?? 12, 7, 40));
      wheel.style.setProperty("--hub-size-px", toResponsiveSize(p.hubSize ?? 70, 22, 220));

      const count = Math.max(3, Math.min(8, Number(p.itemCount) || 6));
      const labels = String(p.itemLabels || defaultLabels).split("|");
      const labelOffset = Math.max(40, Math.min(95, Number(p.labelOffset) || 70));
      const address = (base, index) => p.bindingMode === "join"
        ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1))
        : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);

      wedgesHost.innerHTML = ""; optionsHost.innerHTML = "";
      const cleanups = [];
      const theta = 360 / count;
      const pointOnCircle = angleDeg => {
        const rad = (angleDeg * Math.PI) / 180;
        return { x: 50 + 49 * Math.sin(rad), y: 50 - 49 * Math.cos(rad) };
      };

      for (let index = 0; index < count; index++) {
        const start = index * theta, end = start + theta, mid = start + theta / 2;
        const p0 = pointOnCircle(start), p1 = pointOnCircle(end);

        const wedge = document.createElementNS(SVG_NS, "path");
        wedge.setAttribute("d", `M50,50 L${p0.x.toFixed(3)},${p0.y.toFixed(3)} A49,49 0 0 1 ${p1.x.toFixed(3)},${p1.y.toFixed(3)} Z`);
        wedge.setAttribute("class", "prm-wedge");
        wedge.setAttribute("vector-effect", "non-scaling-stroke");
        wedge.setAttribute("role", "button");
        wedge.setAttribute("tabindex", "0");
        wedge.setAttribute("aria-label", labels[index] ?? `Item ${index + 1}`);
        wedgesHost.appendChild(wedge);

        const option = document.createElement("div");
        option.className = "prm-option";
        const midRad = (mid * Math.PI) / 180;
        option.style.left = `${(50 + (labelOffset / 100) * 50 * Math.sin(midRad)).toFixed(3)}%`;
        option.style.top = `${(50 - (labelOffset / 100) * 50 * Math.cos(midRad)).toFixed(3)}%`;

        const assetData = p[`item${index}AssetData`];
        let icon;
        if (assetData) {
          icon = document.createElement("img");
          icon.className = "prm-icon";
          icon.alt = "";
          icon.src = assetData;
        } else {
          icon = document.createElementNS(SVG_NS, "svg");
          icon.setAttribute("class", "prm-icon");
          icon.setAttribute("viewBox", "0 0 24 24");
          icon.setAttribute("aria-hidden", "true");
          icon.innerHTML = ICONS[p[`item${index}Icon`]] || "";
        }

        const label = document.createElement("span");
        label.className = "prm-label";
        label.textContent = labels[index] ?? "";

        option.append(icon, label);
        optionsHost.appendChild(option);

        let hovered = false, pressed = false, selected = false;
        const sync = () => { const active = hovered || pressed || selected; wedge.classList.toggle("active", active); option.classList.toggle("active", active); };
        const signal = address(p.pressBase, index);
        const enter = () => { hovered = true; sync(); };
        const leave = () => { hovered = false; if (pressed) { pressed = false; sync(); context.signals.publishAddress("digital", signal, false); } else sync(); };
        const down = event => { pressed = true; sync(); context.signals.publishAddress("digital", signal, true); event.preventDefault(); };
        const up = () => { if (pressed) { pressed = false; sync(); context.signals.publishAddress("digital", signal, false); } };
        wedge.addEventListener("pointerenter", enter);
        wedge.addEventListener("pointerleave", leave);
        wedge.addEventListener("pointerdown", down);
        wedge.addEventListener("pointerup", up);
        wedge.addEventListener("pointercancel", up);
        cleanups.push(() => {
          wedge.removeEventListener("pointerenter", enter);
          wedge.removeEventListener("pointerleave", leave);
          wedge.removeEventListener("pointerdown", down);
          wedge.removeEventListener("pointerup", up);
          wedge.removeEventListener("pointercancel", up);
        });

        context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => { selected = truthy(value); sync(); });
        context.signals.subscribeAddress("serial", address(p.labelBase, index), value => { if (value !== undefined && value !== null && String(value) !== "") label.textContent = String(value); });
      }

      let open = p.defaultOpen == null ? true : truthy(p.defaultOpen);
      const applyOpenState = () => { wheel.classList.toggle("closed", !open); hub.setAttribute("aria-expanded", open ? "true" : "false"); };
      applyOpenState();

      let hubPressed = false;
      const hubDown = event => { hubPressed = true; hub.classList.add("pressed"); context.signals.publish("hubPress", true); event.preventDefault(); };
      const hubUp = () => { if (hubPressed) { hubPressed = false; hub.classList.remove("pressed"); context.signals.publish("hubPress", false); } };
      hub.addEventListener("pointerdown", hubDown);
      hub.addEventListener("pointerup", hubUp);
      hub.addEventListener("pointerleave", hubUp);
      hub.addEventListener("pointercancel", hubUp);
      cleanups.push(() => {
        hub.removeEventListener("pointerdown", hubDown);
        hub.removeEventListener("pointerup", hubUp);
        hub.removeEventListener("pointerleave", hubUp);
        hub.removeEventListener("pointercancel", hubUp);
      });

      context.signals.subscribe("hubSelected", value => { open = truthy(value); applyOpenState(); });

      return () => cleanups.forEach(fn => fn());
    },
  });
})(window.ComposerRuntime);
