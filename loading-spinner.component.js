(function (runtime) {
  "use strict";
  runtime.register({
    id: "loading-spinner",
    name: "Loading Spinner",
    category: "Status & Information",
    defaultSize: { width: 240, height: 240 },
    properties: [
      { key: "text", name: "Default text", type: "text", defaultValue: "LOADING" },
      { key: "defaultSpeed", name: "Default speed (0–100)", type: "number", min: 0, max: 100, step: 1, defaultValue: 50 },
      { key: "spinnerColor", name: "Spinner color", type: "color", defaultValue: "#f4ef00" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#f4ef00" },
      { key: "trackColor", name: "Track color", type: "color", defaultValue: "#303030" },
      { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "#222222" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#f4ef00" },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 72, step: 1, defaultValue: 17 },
      { key: "ringThickness", name: "Ring thickness", type: "number", min: 1, max: 18, step: 1, defaultValue: 3 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, step: 1, defaultValue: 10 },
      { key: "showBackground", name: "Show background", type: "checkbox", defaultValue: true },
    ],
    signals: [
      { key: "speed", name: "Speed", type: "analog", direction: "input", defaultValue: "LoadingSpinner.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "LoadingSpinner.Name" },
    ],
    template:
      '<div class="loading-spinner"><svg class="spinner-svg" viewBox="0 0 120 120" aria-hidden="true"><circle class="spinner-track" cx="60" cy="60" r="49"></circle><g class="spinner-motion"><path class="spinner-arc" d="M60 11 A49 49 0 1 1 37 16.74"></path><circle class="spinner-dot" cx="60" cy="11" r="5"></circle></g></svg><span class="spinner-text">LOADING</span></div>',
    styles:
      '[data-component="loading-spinner"]{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:8%;box-sizing:border-box}[data-component="loading-spinner"] *{box-sizing:border-box}[data-component="loading-spinner"] .loading-spinner{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:visible;border-radius:50%;background:var(--background-color,#222222);box-shadow:inset 0 0 24px rgba(0,0,0,.42)}[data-component="loading-spinner"] .loading-spinner.no-background{background:transparent;box-shadow:none}[data-component="loading-spinner"] .spinner-svg{position:absolute;inset:5%;width:90%;height:90%;overflow:visible;filter:drop-shadow(0 0 var(--glow-strength-px,10px) var(--glow-color,#f4ef00))}[data-component="loading-spinner"] .spinner-track,[data-component="loading-spinner"] .spinner-arc{fill:none;stroke-width:var(--ring-thickness,3)}[data-component="loading-spinner"] .spinner-track{stroke:var(--track-color,#303030)}[data-component="loading-spinner"] .spinner-arc{stroke:var(--spinner-color,#f4ef00);stroke-linecap:round;stroke-linejoin:round}[data-component="loading-spinner"] .spinner-dot{fill:var(--spinner-color,#f4ef00);filter:drop-shadow(0 0 calc(var(--glow-strength-px,10px) * .7) var(--glow-color,#f4ef00))}[data-component="loading-spinner"] .spinner-motion{transform-box:view-box;transform-origin:60px 60px;animation:loading-spinner-rotate var(--spinner-duration,3.2s) linear infinite;animation-play-state:var(--spinner-play-state,running)}[data-component="loading-spinner"] .spinner-text{position:relative;z-index:1;max-width:62%;overflow:hidden;color:var(--text-color,#f4ef00);font:500 var(--text-size-px,17px)/1.1 "Segoe UI",sans-serif;letter-spacing:.14em;text-align:center;text-overflow:ellipsis;text-shadow:0 0 calc(var(--glow-strength-px,10px) * .65) var(--glow-color,#f4ef00);white-space:nowrap}@keyframes loading-spinner-rotate{to{transform:rotate(360deg)}}',
    mount(root, context) {
      const host = root.querySelector(".loading-spinner"),
        text = root.querySelector(".spinner-text"),
        properties = context.options.properties || {},
        defaultText = properties.text || "LOADING";
      [
        ["spinnerColor", "#f4ef00"],
        ["textColor", "#f4ef00"],
        ["trackColor", "#303030"],
        ["backgroundColor", "#222222"],
        ["glowColor", "#f4ef00"],
      ].forEach(([key, fallback]) =>
        root.style.setProperty(
          `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
          properties[key] || fallback,
        ),
      );
      text.textContent = defaultText;
      host.classList.toggle(
        "no-background",
        properties.showBackground === false ||
          String(properties.showBackground).toLowerCase() === "false",
      );
      function setSpeed(value) {
        let speed = Math.max(0, Number(value) || 0);
        if (speed > 100) speed = (Math.min(65535, speed) / 65535) * 100;
        speed = Math.min(100, speed);
        root.style.setProperty(
          "--spinner-duration",
          `${Math.max(0.35, 6 - speed * 0.056).toFixed(3)}s`,
        );
        root.style.setProperty(
          "--spinner-play-state",
          speed <= 0 ? "paused" : "running",
        );
      }
      setSpeed(properties.defaultSpeed == null ? 50 : properties.defaultSpeed);
      context.signals.subscribe("speed", setSpeed);
      context.signals.subscribe("name", (value) => {
        text.textContent = value == null || value === "" ? defaultText : String(value);
      });
    },
  });
})(window.ComposerRuntime);
