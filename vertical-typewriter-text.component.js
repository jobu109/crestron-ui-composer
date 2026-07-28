(function (runtime) {
  "use strict";
  runtime.register({
    id: "vertical-typewriter-text",
    name: "Vertical Typewriter Text",
    category: "Text & Input",
    defaultSize: { width: 260, height: 240 },
    signals: [
      { key: "text", name: "Text", type: "serial", direction: "input", defaultValue: "VerticalTypewriterText.Text" },
      { key: "start", name: "Start", type: "digital", direction: "input", defaultValue: "VerticalTypewriterText.Start" },
      { key: "speed", name: "Speed", type: "analog", direction: "input", defaultValue: "VerticalTypewriterText.Speed" },
    ],
    properties: [
      { key: "defaultText", name: "Local/default text", type: "text", defaultValue: "Typewriter Text" },
      { key: "fontSize", name: "Font size", type: "number", defaultValue: 32 },
      { key: "fallbackSpeed", name: "Local speed (0-100)", type: "number", defaultValue: 20 },
      { key: "minimumSpeed", name: "Minimum characters/second", type: "number", defaultValue: 2 },
      { key: "maximumSpeed", name: "Maximum characters/second", type: "number", defaultValue: 20 },
      { key: "loopEnabled", name: "Continuous looping", type: "checkbox", defaultValue: false },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowColor", name: "Text glow color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowOpacity", name: "Text glow opacity (0-100)", type: "number", defaultValue: 75 },
      { key: "panelGlowColor", name: "Panel glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "panelGlowOpacity", name: "Panel glow opacity", type: "number", defaultValue: 38 },
    ],
    template: '<div class="typewriter-vertical-panel"><div class="typewriter-vertical-window"><div class="typewriter-vertical-text"></div></div></div>',
    styles:
      '[data-component="vertical-typewriter-text"]{display:block;width:100%;height:100%;overflow:hidden;background:transparent;box-sizing:border-box}' +
      '[data-component="vertical-typewriter-text"] *{box-sizing:border-box}' +
      '[data-component="vertical-typewriter-text"] .typewriter-vertical-panel{width:100%;height:100%;min-width:20px;min-height:40px;padding:clamp(3px,1.2vmin,8px);border-radius:10px;background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(52,68,68,.24) 42%,rgba(4,170,142,.14));border:1px solid rgba(255,255,255,.34);box-shadow:inset 0 1px 0 rgba(255,255,255,.38),inset 0 -18px 34px rgba(4,170,142,.1),0 0 12px var(--panel-glow),0 6px 14px rgba(0,0,0,.24);backdrop-filter:blur(14px) saturate(135%);-webkit-backdrop-filter:blur(14px) saturate(135%);position:relative;overflow:hidden;font-family:Segoe UI,sans-serif}' +
      '[data-component="vertical-typewriter-text"] .typewriter-vertical-panel:before{content:"";position:absolute;inset:1px;border-radius:9px;background:linear-gradient(120deg,rgba(255,255,255,.2),rgba(255,255,255,.05) 34%,rgba(255,255,255,0) 58%);pointer-events:none;z-index:1}' +
      '[data-component="vertical-typewriter-text"] .typewriter-vertical-window{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;overflow-y:auto;overflow-x:hidden;z-index:2;scrollbar-width:none}' +
      '[data-component="vertical-typewriter-text"] .typewriter-vertical-window::-webkit-scrollbar{display:none}' +
      '[data-component="vertical-typewriter-text"] .typewriter-vertical-text{display:flex;flex-direction:column;align-items:center;width:100%;margin:auto 0;color:var(--text-color);font-size:var(--font-size);font-weight:800;line-height:1.15;text-align:center;text-shadow:0 2px 5px rgba(0,0,0,.68),0 0 8px var(--text-glow),0 0 18px rgba(4,170,142,.55)}' +
      '[data-component="vertical-typewriter-text"] .typewriter-vertical-char{display:block;width:100%;white-space:pre}',
    mount(root, context) {
      const p = context.options.properties || {},
        windowEl = root.querySelector(".typewriter-vertical-window"),
        textEl = root.querySelector(".typewriter-vertical-text");
      function rgba(hex, opacity) {
        const value = String(hex || "#000000").replace("#", ""), n = parseInt(value, 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(100, Number(opacity) || 0)) / 100 + ")";
      }
      root.style.setProperty("--text-color", p.textColor || "#04dcb9");
      root.style.setProperty("--text-glow", rgba(p.glowColor || "#04dcb9", p.glowOpacity ?? 75));
      root.style.setProperty("--panel-glow", rgba(p.panelGlowColor || "#04aa8e", p.panelGlowOpacity ?? 38));
      root.style.setProperty("--font-size", Math.max(1, Number(p.fontSize) || 32) + "px");
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
        textEl.innerHTML = "";
      }
      function typeNext() {
        if (disposed) return;
        if (revealedCount >= pendingText.length) {
          typeTimer = loopEnabled ? setTimeout(restartLoop, 1200) : 0;
          return;
        }
        const span = document.createElement("span");
        span.className = "typewriter-vertical-char";
        span.textContent = pendingText[revealedCount];
        textEl.appendChild(span);
        revealedCount++;
        windowEl.scrollTop = windowEl.scrollHeight;
        typeTimer = setTimeout(typeNext, 1000 / charsPerSecond());
      }
      function restartLoop() {
        if (disposed) return;
        revealedCount = 0;
        textEl.innerHTML = "";
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
