(function (runtime) {
  "use strict";
  runtime.register({
    id: "countdown-auto-fire",
    name: "Countdown Auto Fire",
    category: "Advanced Buttons",
    defaultSize: { width: 180, height: 180 },
    properties: [
      { key: "text", name: "Standard label", type: "text", defaultValue: "Shutdown" },
      { key: "selectedText", name: "Selected / armed label", type: "text", defaultValue: "CANCEL" },
      { key: "completedText", name: "Completed label", type: "text", defaultValue: "Shutting Down..." },
      { key: "countdownSeconds", name: "Countdown time (seconds)", type: "number", min: 0, max: 60, step: 0.1, defaultValue: 3 },
      { key: "completedDisplaySeconds", name: "Completed display time (seconds)", type: "number", min: 0, max: 10, step: 0.1, defaultValue: 1 },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 160, defaultValue: 20 },
      { key: "ringWidth", name: "Countdown ring width", type: "number", min: 2, max: 20, defaultValue: 7 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 100, defaultValue: 16 },
      { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedTextColor", name: "Selected / armed text color", type: "color", defaultValue: "#ffffff" },
      { key: "completedTextColor", name: "Completed text color", type: "color", defaultValue: "#ffffff" },
      { key: "faceColor", name: "Standard background color", type: "color", defaultValue: "#04aa8e" },
      { key: "selectedColor", name: "Selected / armed background color", type: "color", defaultValue: "#7e3159" },
      { key: "completedColor", name: "Completed background color", type: "color", defaultValue: "#04aa8e" },
      { key: "ringColor", name: "Countdown ring color", type: "color", defaultValue: "#f472b6" },
      { key: "borderColor", name: "Standard border color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedBorderColor", name: "Selected / armed border color", type: "color", defaultValue: "#f472b6" },
      { key: "completedBorderColor", name: "Completed border color", type: "color", defaultValue: "#04dcb9" },
      { key: "glowColor", name: "Standard glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "selectedGlowColor", name: "Selected / armed glow color", type: "color", defaultValue: "#f472b6" },
      { key: "completedGlowColor", name: "Completed glow color", type: "color", defaultValue: "#04dcb9" },
    ],
    signals: [
      { key: "press", name: "Arm press", type: "digital", direction: "output", defaultValue: "CountdownAutoFire.ArmPress" },
      { key: "cancel", name: "Cancel press", type: "digital", direction: "output", defaultValue: "CountdownAutoFire.CancelPress" },
      { key: "completed", name: "Fired", type: "digital", direction: "output", defaultValue: "CountdownAutoFire.CompletedPress" },
      { key: "selected", name: "Armed selected", type: "digital", direction: "input", defaultValue: "CountdownAutoFire.Selected" },
      { key: "label", name: "Standard name", type: "serial", direction: "input", defaultValue: "CountdownAutoFire.Name" },
      { key: "armedLabel", name: "Armed name", type: "serial", direction: "input", defaultValue: "CountdownAutoFire.ArmedName" },
      { key: "completedLabel", name: "Completed name", type: "serial", direction: "input", defaultValue: "CountdownAutoFire.CompletedName" },
      { key: "countdownTime", name: "Countdown time feedback", type: "analog", direction: "input", defaultValue: "CountdownAutoFire.Feedback" },
    ],
    template: '<button class="countdown-button" type="button"><span class="countdown-ring" aria-hidden="true"></span><span class="countdown-label">Shutdown</span></button>',
    styles: '[data-component="countdown-auto-fire"]{display:block;width:100%;height:100%;padding:12px;box-sizing:border-box}[data-component="countdown-auto-fire"] *{box-sizing:border-box}[data-component="countdown-auto-fire"] .countdown-button{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;aspect-ratio:1;border:1px solid var(--border-color);border-radius:50%;appearance:none;background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(0,0,0,.14)),var(--face-color);box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 10px color-mix(in srgb,var(--glow-color) 55%,transparent),0 6px 12px rgba(0,0,0,.25);color:var(--text-color);cursor:pointer;touch-action:none;overflow:visible}[data-component="countdown-auto-fire"] .countdown-ring{--elapsed-angle:0deg;position:absolute;inset:2%;border-radius:50%;opacity:0;background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,transparent var(--elapsed-angle),var(--ring-color) var(--elapsed-angle),var(--ring-color) 360deg);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--ring-width-px,7px)),#000 calc(100% - var(--ring-width-px,7px) + .5px));mask:radial-gradient(farthest-side,transparent calc(100% - var(--ring-width-px,7px)),#000 calc(100% - var(--ring-width-px,7px) + .5px));filter:drop-shadow(0 0 4px var(--ring-color));pointer-events:none}[data-component="countdown-auto-fire"] .countdown-button.armed .countdown-ring{opacity:1}[data-component="countdown-auto-fire"] .countdown-label{position:relative;z-index:1;max-width:68%;overflow:hidden;font:800 var(--text-size-px,20px)/1.05 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px #000;white-space:nowrap}',
    mount(root, context) {
      const button = root.querySelector(".countdown-button"), ring = root.querySelector(".countdown-ring"), label = root.querySelector(".countdown-label"), p = context.options.properties || {};
      let duration = Math.max(0, Math.min(60, Number(p.countdownSeconds) || 0)) * 1000;
      const completedTime = Math.max(0, Math.min(10, Number(p.completedDisplaySeconds) || 0)) * 1000;
      const labels = { standard: p.text == null ? "Shutdown" : String(p.text), armed: p.selectedText == null ? "CANCEL" : String(p.selectedText), completed: p.completedText == null ? "Shutting Down..." : String(p.completedText) };
      let remoteStandard = "", remoteArmed = "", remoteCompleted = "", armed = false, completed = false, feedbackArmed = false, started = 0, frame = 0, resetTimer = 0;
      const theme = document.createElement("style");
      theme.textContent = '[data-component="countdown-auto-fire"] .countdown-button.armed{color:var(--selected-text-color);border-color:var(--selected-border-color);background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(0,0,0,.16)),var(--selected-color);box-shadow:inset 0 1px rgba(255,255,255,.44),0 0 var(--glow-strength-px) var(--selected-glow-color)}[data-component="countdown-auto-fire"] .countdown-button.completed{color:var(--completed-text-color);border-color:var(--completed-border-color);background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(0,0,0,.1)),var(--completed-color);box-shadow:inset 0 1px rgba(255,255,255,.48),0 0 var(--glow-strength-px) var(--completed-glow-color);animation:countdown-fire .45s cubic-bezier(.2,.9,.3,1.2)}@keyframes countdown-fire{0%{transform:scale(.88);filter:brightness(1.7)}60%{transform:scale(1.07)}100%{transform:scale(1);filter:brightness(1)}}';
      root.appendChild(theme);
      function isTrue(value) { return value === true || value === 1 || value === "1"; }
      function pulse(key) { context.signals.publish(key, true); setTimeout(() => context.signals.publish(key, false), 100); }
      function render() { button.classList.toggle("armed", armed || feedbackArmed); button.classList.toggle("completed", completed); label.textContent = completed ? (remoteCompleted || labels.completed) : (armed || feedbackArmed) ? (remoteArmed || labels.armed) : (remoteStandard || labels.standard); }
      function reset() { cancelAnimationFrame(frame); clearTimeout(resetTimer); armed = false; completed = false; ring.style.setProperty("--elapsed-angle", "0deg"); render(); }
      function fire() { armed = false; completed = true; ring.style.setProperty("--elapsed-angle", "360deg"); pulse("completed"); render(); resetTimer = setTimeout(reset, completedTime); }
      function step(now) { if (!armed) return; const amount = duration <= 0 ? 1 : Math.min(1, (now - started) / duration); ring.style.setProperty("--elapsed-angle", `${amount * 360}deg`); if (amount >= 1) fire(); else frame = requestAnimationFrame(step); }
      function arm(sendSignal) { clearTimeout(resetTimer); completed = false; armed = true; started = performance.now(); ring.style.setProperty("--elapsed-angle", "0deg"); if (sendSignal) pulse("press"); render(); frame = requestAnimationFrame(step); }
      function cancel(sendSignal) { cancelAnimationFrame(frame); armed = false; ring.style.setProperty("--elapsed-angle", "0deg"); if (sendSignal) pulse("cancel"); render(); }
      button.addEventListener("pointerdown", event => { event.preventDefault(); if (completed) reset(); else if (armed) cancel(true); else arm(true); });
      context.signals.subscribe("selected", value => { const next = isTrue(value); feedbackArmed = next; if (next && !armed && !completed) arm(false); else if (!next && armed) cancel(false); render(); });
      [["label", value => remoteStandard = value], ["armedLabel", value => remoteArmed = value], ["completedLabel", value => remoteCompleted = value]].forEach(([key, assign]) => context.signals.subscribe(key, value => { assign(value == null ? "" : String(value)); render(); }));
      context.signals.subscribe("countdownTime", value => { const n = Math.max(0, Number(value) || 0); duration = Math.min(60, n > 60 ? n / 65535 * 60 : n) * 1000; });
      render();
      return () => { cancelAnimationFrame(frame); clearTimeout(resetTimer); };
    },
  });
})(window.ComposerRuntime);
