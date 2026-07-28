(function (runtime) {
  "use strict";
  runtime.register({
    id: "horizontal-typewriter-text",
    name: "Horizontal Typewriter Text",
    category: "Text & Input",
    defaultSize: { width: 520, height: 90 },
    signals: [
      { key: "text", name: "Text", type: "serial", direction: "input", defaultValue: "HorizontalTypewriterText.Text" },
      { key: "start", name: "Start", type: "digital", direction: "input", defaultValue: "HorizontalTypewriterText.Start" },
      { key: "speed", name: "Speed", type: "analog", direction: "input", defaultValue: "HorizontalTypewriterText.Speed" },
    ],
    properties: [
      { key: "defaultText", name: "Default text", type: "text", defaultValue: "Typewriter Text" },
      { key: "fontSize", name: "Font size", type: "number", defaultValue: 30 },
      { key: "fallbackSpeed", name: "Preview speed (0-100)", type: "number", defaultValue: 20 },
      { key: "minimumSpeed", name: "Minimum characters/second", type: "number", defaultValue: 2 },
      { key: "maximumSpeed", name: "Maximum characters/second", type: "number", defaultValue: 20 },
      { key: "loopEnabled", name: "Continuous looping", type: "checkbox", defaultValue: false },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#04dcb9" },
      { key: "textGlowColor", name: "Text glow color", type: "color", defaultValue: "#04dcb9" },
      { key: "textGlowOpacity", name: "Text glow opacity (0-100)", type: "number", defaultValue: 75 },
      { key: "secondaryGlowColor", name: "Secondary text glow", type: "color", defaultValue: "#04aa8e" },
      { key: "secondaryGlowOpacity", name: "Secondary glow opacity", type: "number", defaultValue: 55 },
      { key: "panelTintColor", name: "Glass panel tint", type: "color", defaultValue: "#04aa8e" },
      { key: "panelTintOpacity", name: "Panel tint opacity", type: "number", defaultValue: 14 },
      { key: "panelGlowColor", name: "Panel glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "panelGlowOpacity", name: "Panel glow opacity", type: "number", defaultValue: 38 },
      { key: "borderColor", name: "Panel border color", type: "color", defaultValue: "#ffffff" },
      { key: "borderOpacity", name: "Border opacity", type: "number", defaultValue: 34 },
    ],
    template: '<div class="typewriter-horizontal-panel"><div class="typewriter-horizontal-window"><span class="typewriter-horizontal-text"></span></div></div>',
    styles:
      '[data-component="horizontal-typewriter-text"]{display:block;width:100%;height:100%;padding:6px;overflow:hidden;box-sizing:border-box;font-family:Segoe UI,sans-serif}' +
      '[data-component="horizontal-typewriter-text"] .typewriter-horizontal-panel{position:relative;width:100%;height:100%;overflow:hidden;border:1px solid var(--border-color);border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(52,68,68,.24) 42%,var(--panel-tint));box-shadow:inset 0 1px rgba(255,255,255,.38),inset 0 -18px 34px rgba(4,170,142,.1),0 0 12px var(--panel-glow),0 6px 14px rgba(0,0,0,.24)}' +
      '[data-component="horizontal-typewriter-text"] .typewriter-horizontal-panel:before{content:"";position:absolute;z-index:2;inset:1px;border-radius:11px;background:linear-gradient(120deg,rgba(255,255,255,.18),transparent 58%);pointer-events:none}' +
      '[data-component="horizontal-typewriter-text"] .typewriter-horizontal-window{position:absolute;z-index:1;inset:0;display:flex;align-items:center;padding:0 18px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}' +
      '[data-component="horizontal-typewriter-text"] .typewriter-horizontal-window::-webkit-scrollbar{display:none}' +
      '[data-component="horizontal-typewriter-text"] .typewriter-horizontal-text{display:block;flex:none;color:var(--color);font-size:var(--font-size);font-weight:800;line-height:1;white-space:pre;text-shadow:0 2px 5px rgba(0,0,0,.68),0 0 8px var(--text-glow),0 0 18px var(--secondary-glow)}',
    mount(root, context) {
      const p = context.options.properties || {},
        windowEl = root.querySelector(".typewriter-horizontal-window"),
        textEl = root.querySelector(".typewriter-horizontal-text");
      function rgba(hex, opacity) {
        const value = String(hex || "#000000").replace("#", ""), n = parseInt(value, 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(100, Number(opacity) || 0)) / 100 + ")";
      }
      root.style.setProperty("--font-size", Math.max(1, Number(p.fontSize) || 30) + "px");
      root.style.setProperty("--color", p.textColor || "#04dcb9");
      root.style.setProperty("--text-glow", rgba(p.textGlowColor || "#04dcb9", p.textGlowOpacity ?? 75));
      root.style.setProperty("--secondary-glow", rgba(p.secondaryGlowColor || "#04aa8e", p.secondaryGlowOpacity ?? 55));
      root.style.setProperty("--panel-tint", rgba(p.panelTintColor || "#04aa8e", p.panelTintOpacity ?? 14));
      root.style.setProperty("--panel-glow", rgba(p.panelGlowColor || "#04aa8e", p.panelGlowOpacity ?? 38));
      root.style.setProperty("--border-color", rgba(p.borderColor || "#ffffff", p.borderOpacity ?? 34));
      const loopEnabled = p.loopEnabled === true || p.loopEnabled === 1 || p.loopEnabled === "1" || String(p.loopEnabled).toLowerCase() === "true";
      let speedValue = Math.max(0, Math.min(100, Number(p.fallbackSpeed) || 20)),
        pendingText = String(p.defaultText || "Typewriter Text"),
        revealedCount = 0,
        typeTimer = 0,
        started = false,
        disposed = false;
      function charsPerSecond() {
        const min = Math.max(0.1, Number(p.minimumSpeed) || 2),
          max = Math.max(min, Number(p.maximumSpeed) || 20);
        return min + (max - min) * (speedValue / 100);
      }
      function clearDisplay() {
        clearTimeout(typeTimer);
        typeTimer = 0;
        revealedCount = 0;
        textEl.textContent = "";
        windowEl.scrollLeft = 0;
      }
      function typeNext() {
        if (disposed) return;
        if (revealedCount >= pendingText.length) {
          typeTimer = loopEnabled ? setTimeout(restartLoop, 1200) : 0;
          return;
        }
        revealedCount++;
        textEl.textContent = pendingText.slice(0, revealedCount);
        windowEl.scrollLeft = windowEl.scrollWidth;
        typeTimer = setTimeout(typeNext, 1000 / charsPerSecond());
      }
      function restartLoop() {
        if (disposed) return;
        revealedCount = 0;
        textEl.textContent = "";
        windowEl.scrollLeft = 0;
        typeTimer = setTimeout(typeNext, 1000 / charsPerSecond());
      }
      function startTyping() {
        clearDisplay();
        if (!pendingText) return;
        typeTimer = setTimeout(typeNext, 1000 / charsPerSecond());
      }
      function setText(value) {
        pendingText = String(value == null || value === "" ? p.defaultText || "Typewriter Text" : value);
        clearDisplay();
      }
      function setSpeed(value) {
        const n = Number(value) || 0;
        speedValue = Math.max(0, Math.min(100, n > 100 ? (n / 65535) * 100 : n));
      }
      context.signals.subscribe("text", setText);
      context.signals.subscribe("speed", setSpeed);
      context.signals.subscribe("start", (value) => {
        const on = value === true || value === 1 || value === "1";
        if (on && !started) startTyping();
        started = on;
      });
      return () => {
        disposed = true;
        clearTimeout(typeTimer);
      };
    },
  });
})(window.ComposerRuntime);
