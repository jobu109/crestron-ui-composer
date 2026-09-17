(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "date-time",
    name: "Date / Time",
    category: "Status & Information",
    defaultSize: { width: 380, height: 170 },
    signals: [
      { key: "date", name: "Date label", type: "serial", direction: "input", defaultValue: "DateTime.Date", optionalProperty: "useContractTime" },
      { key: "time", name: "Time label", type: "serial", direction: "input", defaultValue: "DateTime.Time", optionalProperty: "useContractTime" }
    ],
    properties: [
      { key: "displayMode", name: "Display", type: "select", options: [{ value: "date-time", label: "Date and time" }, { value: "time", label: "Time only" }, { value: "date", label: "Date only" }], defaultValue: "date-time" },
      { key: "useContractTime", name: "Use contract date/time labels", type: "checkbox", defaultValue: false },
      { key: "dateText", name: "Contract date fallback", type: "text", defaultValue: "Monday, January 1, 2026", optionalProperty: "useContractTime" },
      { key: "timeText", name: "Contract time fallback", type: "text", defaultValue: "12:00 PM", optionalProperty: "useContractTime" },
      { key: "locale", name: "Locale", type: "text", defaultValue: "en-US" },
      { key: "dateFormat", name: "Date format", type: "select", options: [{ value: "full", label: "Full" }, { value: "long", label: "Long" }, { value: "medium", label: "Medium" }, { value: "short", label: "Short" }], defaultValue: "long" },
      { key: "hourFormat", name: "Time format", type: "select", options: [{ value: "12", label: "12-hour" }, { value: "24", label: "24-hour" }], defaultValue: "12" },
      { key: "showSeconds", name: "Show seconds", type: "checkbox", defaultValue: true },
      { key: "timeZone", name: "Time zone (optional)", type: "text", defaultValue: "" },
      { key: "dateColor", name: "Date color", type: "color", defaultValue: "#b8cfcc" },
      { key: "timeColor", name: "Time color", type: "color", defaultValue: "#ffffff" },
      { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "#172225" },
      { key: "backgroundOpacity", name: "Background opacity (%)", type: "number", min: 0, max: 100, defaultValue: 92 },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#04aa8e" },
      { key: "borderWidth", name: "Border width (px)", type: "number", min: 0, max: 12, defaultValue: 1 },
      { key: "cornerRadius", name: "Corner radius (px)", type: "number", min: 0, max: 80, defaultValue: 14 },
      { key: "dateFontSize", name: "Date size (px)", type: "number", min: 8, max: 120, defaultValue: 22 },
      { key: "timeFontSize", name: "Time size (px)", type: "number", min: 8, max: 160, defaultValue: 52 },
      { key: "fontWeight", name: "Font weight", type: "select", options: [{ value: "400", label: "Regular" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }, { value: "800", label: "Extra bold" }], defaultValue: "600" },
      { key: "horizontalAlignment", name: "Horizontal alignment", type: "select", options: [{ value: "flex-start", label: "Left" }, { value: "center", label: "Center" }, { value: "flex-end", label: "Right" }], defaultValue: "center" },
      { key: "verticalAlignment", name: "Vertical alignment", type: "select", options: [{ value: "flex-start", label: "Top" }, { value: "center", label: "Center" }, { value: "flex-end", label: "Bottom" }], defaultValue: "center" }
    ],
    template: '<div class="dt-root"><div class="dt-date"></div><div class="dt-time"></div></div>',
    styles: '[data-component="date-time"],[data-component="date-time"] *{box-sizing:border-box}[data-component="date-time"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.dt-root{width:100%;height:100%;display:flex;flex-direction:column;align-items:var(--horizontal-alignment);justify-content:var(--vertical-alignment);gap:clamp(2px,4%,12px);padding:clamp(10px,6%,28px);overflow:hidden;border:var(--border-width-px) solid var(--border-color);border-radius:var(--corner-radius-px);background:var(--date-time-background);box-shadow:inset 0 1px rgba(255,255,255,.12),0 0 18px color-mix(in srgb,var(--border-color) 18%,transparent)}.dt-date,.dt-time{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.05;font-weight:var(--font-weight);text-align:inherit}.dt-date{color:var(--date-color);font-size:var(--date-font-size-px)}.dt-time{color:var(--time-color);font-size:var(--time-font-size-px);letter-spacing:.02em}',
    mount(root, context) {
      const p = context.options.properties || {}, date = root.querySelector(".dt-date"), time = root.querySelector(".dt-time"), container = root.querySelector(".dt-root");
      function rgba(hex, opacity) { const match = String(hex || "").match(/^#([0-9a-f]{6})$/i), alpha = Math.max(0, Math.min(100, Number(opacity) || 0)) / 100; return match ? `rgba(${parseInt(match[1].slice(0, 2), 16)},${parseInt(match[1].slice(2, 4), 16)},${parseInt(match[1].slice(4, 6), 16)},${alpha})` : (hex || "transparent"); }
      root.style.setProperty("--date-time-background", rgba(p.backgroundColor || "#172225", p.backgroundOpacity == null ? 92 : p.backgroundOpacity));
      root.style.textAlign = p.horizontalAlignment === "flex-start" ? "left" : p.horizontalAlignment === "flex-end" ? "right" : "center";
      date.hidden = p.displayMode === "time";
      time.hidden = p.displayMode === "date";
      let remoteDate = "", remoteTime = "";
      function renderContract() { date.textContent = remoteDate || p.dateText || ""; time.textContent = remoteTime || p.timeText || ""; }
      function tick() {
        if (p.useContractTime) return renderContract();
        const now = new Date(), locale = p.locale || "en-US", zone = p.timeZone ? { timeZone: p.timeZone } : {};
        try {
          date.textContent = new Intl.DateTimeFormat(locale, { dateStyle: p.dateFormat || "long", ...zone }).format(now);
          time.textContent = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", second: p.showSeconds === false ? undefined : "2-digit", hour12: p.hourFormat !== "24", ...zone }).format(now);
        } catch (_) {
          date.textContent = now.toLocaleDateString();
          time.textContent = now.toLocaleTimeString();
        }
      }
      if (p.useContractTime) {
        context.signals.subscribe("date", value => { remoteDate = String(value || ""); renderContract(); });
        context.signals.subscribe("time", value => { remoteTime = String(value || ""); renderContract(); });
      }
      tick();
      const timer = p.useContractTime ? 0 : setInterval(tick, 1000);
      return () => { if (timer) clearInterval(timer); };
    }
  });
})(window);
