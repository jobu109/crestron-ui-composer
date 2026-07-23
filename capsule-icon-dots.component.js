(function (runtime) {
  "use strict";

  runtime.register({
    id: "capsule-icon-dots",
    name: "Capsule Icon + Dots",
    category: "Status & Information",
    defaultSize: { width: 130, height: 220 },
    properties: [
      { key: "localLabel", name: "Default label", type: "text", defaultValue: "" },
      { key: "icon", name: "Icon", type: "select", options: [
        { value: "sun", label: "Sun" }, { value: "moon", label: "Moon" },
        { value: "power", label: "Power" }, { value: "bell", label: "Bell" },
        { value: "none", label: "None" }
      ], defaultValue: "sun" },
      { key: "showIcon", name: "Show icon", type: "checkbox", defaultValue: true },
      { key: "showLabel", name: "Show label", type: "checkbox", defaultValue: true },
      { key: "showDots", name: "Show dots", type: "checkbox", defaultValue: true },
      { key: "dotLayout", name: "Dot layout (per row, separated by |)", type: "text", defaultValue: "2|3|3" },
      { key: "dotSize", name: "Dot size", type: "number", min: 4, max: 20, step: 1, defaultValue: 7 },
      { key: "dotGap", name: "Dot gap", type: "number", min: 2, max: 24, step: 1, defaultValue: 12 },
      { key: "labelSize", name: "Label size", type: "number", min: 8, max: 32, step: 1, defaultValue: 13 },
      { key: "iconSize", name: "Icon button size", type: "number", min: 30, max: 120, step: 1, defaultValue: 56 },
      { key: "surfaceColor", name: "Surface color", type: "color", defaultValue: "#2c3038" },
      { key: "shadowColor", name: "Dark shadow", type: "color", defaultValue: "#1a1c21" },
      { key: "highlightColor", name: "Light shadow", type: "color", defaultValue: "#3e444f" },
      { key: "accentColor", name: "Accent / glow color", type: "color", defaultValue: "#4fc7ff" },
      { key: "labelColor", name: "Label color", type: "color", defaultValue: "#aab2bd" },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 70, step: 1, defaultValue: 52 },
      { key: "shadowSize", name: "Shadow size", type: "number", min: 0, max: 24, step: 1, defaultValue: 8 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 30, step: 1, defaultValue: 8 }
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "CapsuleIconDots.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "CapsuleIconDots.Selected" },
      { key: "label", name: "Label", type: "serial", direction: "input", defaultValue: "CapsuleIconDots.Label" }
    ],
    template: '<div class="cid-capsule"><button class="cid-icon-btn" type="button"><svg class="cid-icon" viewBox="0 0 24 24" aria-hidden="true"></svg></button><span class="cid-label"></span><div class="cid-dots"></div></div>',
    styles: '[data-component="capsule-icon-dots"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="capsule-icon-dots"] *{box-sizing:border-box}[data-component="capsule-icon-dots"] .cid-capsule{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;width:100%;height:100%;padding:12% 8%;overflow:hidden;border-radius:var(--corner);background:var(--surface);box-shadow:var(--shadow-size) var(--shadow-size) calc(var(--shadow-size) * 2) var(--shadow),calc(var(--shadow-size) * -1) calc(var(--shadow-size) * -1) calc(var(--shadow-size) * 2) var(--highlight)}[data-component="capsule-icon-dots"] .cid-icon-btn{flex:0 0 auto;width:var(--icon-btn-size);height:var(--icon-btn-size);border:0;border-radius:50%;padding:0;background:var(--surface);color:var(--label);display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;box-shadow:calc(var(--shadow-size) * .75) calc(var(--shadow-size) * .75) calc(var(--shadow-size) * 1.5) var(--shadow),calc(var(--shadow-size) * -.75) calc(var(--shadow-size) * -.75) calc(var(--shadow-size) * 1.5) var(--highlight);transition:transform .1s,box-shadow .18s,color .18s}[data-component="capsule-icon-dots"] .cid-icon{width:42%;height:42%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:stroke .18s,filter .18s}[data-component="capsule-icon-dots"] .cid-icon-btn.pressed,[data-component="capsule-icon-dots"] .cid-icon-btn.active{color:var(--accent);box-shadow:inset calc(var(--shadow-size) * .6) calc(var(--shadow-size) * .6) calc(var(--shadow-size) * 1.3) var(--shadow),inset calc(var(--shadow-size) * -.6) calc(var(--shadow-size) * -.6) calc(var(--shadow-size) * 1.3) var(--highlight),0 0 var(--glow) color-mix(in srgb,var(--accent) 65%,transparent)}[data-component="capsule-icon-dots"] .cid-icon-btn.pressed{transform:scale(.94)}[data-component="capsule-icon-dots"] .cid-icon-btn.active .cid-icon{filter:drop-shadow(0 0 calc(var(--glow) * .5) var(--accent))}[data-component="capsule-icon-dots"] .cid-label{display:block;max-width:100%;overflow:hidden;color:var(--label);font-size:var(--label-size);letter-spacing:.04em;text-align:center;text-overflow:ellipsis;white-space:nowrap}[data-component="capsule-icon-dots"] .cid-dots{display:flex;flex-direction:column;align-items:center;gap:var(--dot-gap)}[data-component="capsule-icon-dots"] .cid-dot-row{display:flex;gap:var(--dot-gap);justify-content:center}[data-component="capsule-icon-dots"] .cid-dot{width:var(--dot-size);height:var(--dot-size);border-radius:50%;background:var(--highlight);box-shadow:inset 1px 1px 2px var(--shadow);transition:background .15s,box-shadow .15s}[data-component="capsule-icon-dots"] .cid-dot.lit{background:var(--accent);box-shadow:0 0 calc(var(--glow) * .6) var(--accent)}',
    mount(root, context) {
      const p = context.options.properties || {}, button = root.querySelector(".cid-icon-btn"), icon = root.querySelector(".cid-icon"), label = root.querySelector(".cid-label"), dotsHost = root.querySelector(".cid-dots"), truthy = (value, fallback) => value == null ? fallback : value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true", paths = { sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', power: '<path d="M12 2v9"/><path d="M18.4 6.6a8 8 0 1 1-12.8 0"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>', none: "" };
      root.style.setProperty("--surface", p.surfaceColor || "#2c3038"); root.style.setProperty("--shadow", p.shadowColor || "#1a1c21"); root.style.setProperty("--highlight", p.highlightColor || "#3e444f"); root.style.setProperty("--accent", p.accentColor || "#4fc7ff"); root.style.setProperty("--label", p.labelColor || "#aab2bd"); root.style.setProperty("--corner", `${Number(p.cornerRadius ?? 52)}px`); root.style.setProperty("--shadow-size", `${Number(p.shadowSize ?? 8)}px`); root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`); root.style.setProperty("--icon-btn-size", `${Number(p.iconSize ?? 56)}px`); root.style.setProperty("--label-size", `${Number(p.labelSize ?? 13)}px`); root.style.setProperty("--dot-size", `${Number(p.dotSize ?? 7)}px`); root.style.setProperty("--dot-gap", `${Number(p.dotGap ?? 12)}px`);
      icon.innerHTML = paths[p.icon || "sun"] || ""; button.style.display = truthy(p.showIcon, true) && p.icon !== "none" ? "" : "none"; label.textContent = String(p.localLabel ?? ""); label.style.display = truthy(p.showLabel, true) ? "" : "none"; dotsHost.style.display = truthy(p.showDots, true) ? "" : "none";
      const dots = []; String(p.dotLayout ?? "2|3|3").split("|").map(value => Math.max(0, Math.min(12, parseInt(value, 10) || 0))).forEach(count => { const row = document.createElement("div"); row.className = "cid-dot-row"; for (let index = 0; index < count; index++) { const dot = document.createElement("i"); dot.className = "cid-dot"; row.appendChild(dot); dots.push(dot); } dotsHost.appendChild(row); });
      function setLit(on) { dots.forEach(dot => dot.classList.toggle("lit", on)); }
      const down = event => { button.classList.add("pressed"); context.signals.publish("press", true); event.preventDefault(); }, up = () => { button.classList.remove("pressed"); context.signals.publish("press", false); }; button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up); button.addEventListener("pointerleave", up); button.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", value => { const selected = truthy(value, false); button.classList.toggle("active", selected); if (!selected) button.classList.remove("pressed"); setLit(selected); }); context.signals.subscribe("label", value => { if (value != null) label.textContent = String(value); });
      return () => { button.removeEventListener("pointerdown", down); button.removeEventListener("pointerup", up); button.removeEventListener("pointerleave", up); button.removeEventListener("pointercancel", up); };
    }
  });
})(window.ComposerRuntime);
