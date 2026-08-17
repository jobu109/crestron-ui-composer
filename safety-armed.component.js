(function (runtime) {
  "use strict";
  runtime.register({
    id: "safety-armed-on-off",
    name: "Safety Armed On/Off",
    category: "Advanced Buttons",
    defaultSize: { width: 240, height: 110 },
    properties: [
      { key: "text", name: "Standard label", type: "text", defaultValue: "ALL OFF" },
      { key: "selectedText", name: "Selected / armed label", type: "text", defaultValue: "CONFIRM?" },
      { key: "completedText", name: "Completed label", type: "text", defaultValue: "DONE" },
      { key: "armSeconds", name: "Confirmation window (seconds)", type: "number", min: 0, max: 60, step: 0.1, defaultValue: 3 },
      { key: "completedDisplaySeconds", name: "Completed display time (seconds)", type: "number", min: 0, max: 10, step: 0.1, defaultValue: 1.2 },
      { key: "showCountdownSeconds", name: "Show countdown seconds below button", type: "checkbox", defaultValue: false },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 160, defaultValue: 24 },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 100, defaultValue: 18 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 100, defaultValue: 16 },
      { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedTextColor", name: "Selected / armed text color", type: "color", defaultValue: "#ffffff" },
      { key: "completedTextColor", name: "Completed text color", type: "color", defaultValue: "#ffffff" },
      { key: "faceColor", name: "Standard background color", type: "color", defaultValue: "#3b2028" },
      { key: "selectedColor", name: "Selected / armed background color", type: "color", defaultValue: "#d94b58" },
      { key: "completedColor", name: "Completed background color", type: "color", defaultValue: "#04aa8e" },
      { key: "borderColor", name: "Standard border color", type: "color", defaultValue: "#d94b58" },
      { key: "selectedBorderColor", name: "Selected / armed border color", type: "color", defaultValue: "#ff9aa4" },
      { key: "completedBorderColor", name: "Completed border color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowColor", name: "Standard glow color", type: "color", defaultValue: "#d94b58" },
      { key: "selectedGlowColor", name: "Selected / armed glow color", type: "color", defaultValue: "#ff6575" },
      { key: "completedGlowColor", name: "Completed glow color", type: "color", defaultValue: "#04dcb9" },
    ],
    signals: [
      { key: "press", name: "Arm press", type: "digital", direction: "output", defaultValue: "SafetyArmedOnOff.ArmPress" },
      { key: "completed", name: "Confirmed", type: "digital", direction: "output", defaultValue: "SafetyArmedOnOff.CompletedPress" },
      { key: "selected", name: "Armed selected", type: "digital", direction: "input", defaultValue: "SafetyArmedOnOff.Selected" },
      { key: "label", name: "Standard name", type: "serial", direction: "input", defaultValue: "SafetyArmedOnOff.Label" },
      { key: "selectedLabel", name: "Armed name", type: "serial", direction: "input", defaultValue: "SafetyArmedOnOff.SelectionLabel" },
      { key: "completedLabel", name: "Completed name", type: "serial", direction: "input", defaultValue: "SafetyArmedOnOff.CompletedLabel" },
      { key: "armTime", name: "Confirmation time feedback", type: "analog", direction: "input", defaultValue: "SafetyArmedOnOff.Feedback" },
    ],
    template: '<div class="safety-root"><button class="safety-button" type="button"><span class="safety-label">ALL OFF</span></button><div class="safety-countdown"></div></div>',
    styles: '[data-component="safety-armed-on-off"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box}[data-component="safety-armed-on-off"] *{box-sizing:border-box}[data-component="safety-armed-on-off"] .safety-root{display:grid;width:100%;height:100%;grid-template-rows:minmax(0,1fr) auto;gap:6px}[data-component="safety-armed-on-off"] .safety-button{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:12px;border:1px solid var(--border-color);border-radius:var(--corner-radius-px,18px);appearance:none;background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(0,0,0,.16)),var(--face-color);box-shadow:inset 0 1px rgba(255,255,255,.3),0 0 var(--glow-strength-px,16px) color-mix(in srgb,var(--glow-color) 55%,transparent),0 6px 12px rgba(0,0,0,.28);color:var(--text-color);cursor:pointer;touch-action:none}[data-component="safety-armed-on-off"] .safety-label{max-width:90%;overflow:hidden;font:800 var(--text-size-px,24px)/1.05 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px #000;white-space:nowrap}[data-component="safety-armed-on-off"] .safety-countdown{min-height:1em;color:var(--text-color);font:800 calc(var(--text-size-px,24px)*.7)/1 "Segoe UI",sans-serif;text-align:center;text-shadow:0 2px 5px #000}',
    visibilityProperties: { showCountdownSeconds: ".safety-countdown" },
    mount(root, context) {
      const button = root.querySelector(".safety-button"), label = root.querySelector(".safety-label"), countdown = root.querySelector(".safety-countdown"), p = context.options.properties || {};
      const configuredWindowMs = Math.max(0, Math.min(60, Number(p.armSeconds) || 0)) * 1000;
      let windowMs = configuredWindowMs;
      const completedMs = Math.max(0, Math.min(10, Number(p.completedDisplaySeconds) || 0)) * 1000;
      const labels = { standard: p.text == null ? "ALL OFF" : String(p.text), selected: p.selectedText == null ? "CONFIRM?" : String(p.selectedText), completed: p.completedText == null ? "DONE" : String(p.completedText) };
      let armed = false, completed = false, feedbackArmed = false, armTimer = 0, countdownTimer = 0, armedUntil = 0, resetTimer = 0, remoteStandard = "", remoteSelected = "", remoteCompleted = "";
      const theme = document.createElement("style");
      theme.textContent = '[data-component="safety-armed-on-off"] .safety-button.pressed{transform:scale(.97);filter:brightness(1.16)}[data-component="safety-armed-on-off"] .safety-button.armed{color:var(--selected-text-color);border-color:var(--selected-border-color);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(0,0,0,.1)),var(--selected-color);box-shadow:inset 0 1px rgba(255,255,255,.4),0 0 var(--glow-strength-px) var(--selected-glow-color)}[data-component="safety-armed-on-off"] .safety-button.completed{color:var(--completed-text-color);border-color:var(--completed-border-color);background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(0,0,0,.08)),var(--completed-color);box-shadow:inset 0 1px rgba(255,255,255,.44),0 0 var(--glow-strength-px) var(--completed-glow-color);animation:safety-done .45s cubic-bezier(.2,.9,.3,1.2)}@keyframes safety-done{0%{transform:scale(.9)}60%{transform:scale(1.05)}100%{transform:scale(1)}}';
      root.appendChild(theme);
      function pulse(key) { context.signals.publish(key, true); setTimeout(() => context.signals.publish(key, false), 100); }
      function renderCountdown() { countdown.textContent = armed ? `${Math.max(0, Math.ceil((armedUntil - performance.now()) / 1000))}` : ""; }
      function render() { button.classList.toggle("armed", armed || feedbackArmed); button.classList.toggle("completed", completed); label.textContent = completed ? (remoteCompleted || labels.completed) : (armed || feedbackArmed) ? (remoteSelected || labels.selected) : (remoteStandard || labels.standard); renderCountdown(); }
      function disarm() { clearTimeout(armTimer); clearInterval(countdownTimer); armed = false; render(); }
      function arm(send) { clearTimeout(resetTimer); completed = false; armed = true; armedUntil = performance.now() + windowMs; if (send) pulse("press"); clearTimeout(armTimer); clearInterval(countdownTimer); armTimer = setTimeout(disarm, windowMs); countdownTimer = setInterval(renderCountdown, 100); render(); }
      function confirm() { clearTimeout(armTimer); clearInterval(countdownTimer); armed = false; completed = true; pulse("completed"); render(); resetTimer = setTimeout(() => { completed = false; render(); }, completedMs); }
      const unbindPointer = context.interactions.bindPrimaryPointer(button, { down: () => button.classList.add("pressed"), up: () => { button.classList.remove("pressed"); if (completed) return; if (armed) confirm(); else arm(true); }, cancel: () => button.classList.remove("pressed") });
      context.signals.subscribe("selected", value => { feedbackArmed = value === true || value === 1 || value === "1"; if (!feedbackArmed && armed) disarm(); render(); });
      [["label", value => remoteStandard = value], ["selectedLabel", value => remoteSelected = value], ["completedLabel", value => remoteCompleted = value]].forEach(([key, assign]) => context.signals.subscribe(key, value => { assign(value == null ? "" : String(value)); render(); }));
      context.signals.subscribe("armTime", value => { const n = Math.max(0, Number(value) || 0); windowMs = n > 0 ? Math.min(60, n > 60 ? n / 65535 * 60 : n) * 1000 : configuredWindowMs; });
      render();
      return () => { clearTimeout(armTimer); clearInterval(countdownTimer); clearTimeout(resetTimer); unbindPointer(); };
    },
  });
})(window.ComposerRuntime);
