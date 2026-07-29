(function (runtime) {
  "use strict";
  runtime.register({
    id: "circular-hold-button",
    name: "Circular Hold Button",
    category: "Advanced Buttons",
    defaultSize: { width: 180, height: 180 },
    properties: [
      { key: "text", name: "Standard label", type: "text", defaultValue: "SAVE" },
      { key: "pressedText", name: "Pressed label", type: "text", defaultValue: "Hold to Save" },
      { key: "selectedText", name: "Selected label", type: "text", defaultValue: "Selected" },
      { key: "completedText", name: "Completed label", type: "text", defaultValue: "Saved" },
      { key: "holdSeconds", name: "Hold time (seconds)", type: "number", min: 0, max: 10, step: 0.1, defaultValue: 1.2 },
      { key: "autoReturnSelected", name: "Return to Standard automatically", type: "checkbox", defaultValue: true },
      { key: "selectedDisplaySeconds", name: "Selected state time (seconds)", type: "number", min: 0, max: 10, step: 0.1, defaultValue: 1.5 },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 160, defaultValue: 20 },
      { key: "ringWidth", name: "Progress ring width", type: "number", min: 2, max: 20, defaultValue: 7 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 100, defaultValue: 16 },
      { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#ffffff" },
      { key: "pressedTextColor", name: "Pressed text color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedTextColor", name: "Selected text color", type: "color", defaultValue: "#ffffff" },
      { key: "completedTextColor", name: "Completed text color", type: "color", defaultValue: "#ffffff" },
      { key: "faceColor", name: "Standard background color", type: "color", defaultValue: "#203332" },
      { key: "pressedColor", name: "Pressed background color", type: "color", defaultValue: "#087e6c" },
      { key: "selectedColor", name: "Selected background color", type: "color", defaultValue: "#04aa8e" },
      { key: "completedColor", name: "Completed background color", type: "color", defaultValue: "#04dcb9" },
      { key: "fillColor", name: "Hold progress color", type: "color", defaultValue: "#04dcb9" },
      { key: "borderColor", name: "Standard border color", type: "color", defaultValue: "#ffffff" },
      { key: "pressedBorderColor", name: "Pressed border color", type: "color", defaultValue: "#04dcb9" },
      { key: "selectedBorderColor", name: "Selected border color", type: "color", defaultValue: "#04aa8e" },
      { key: "completedBorderColor", name: "Completed border color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Standard glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "pressedGlowColor", name: "Pressed glow color", type: "color", defaultValue: "#04dcb9" },
      { key: "selectedGlowColor", name: "Selected glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "completedGlowColor", name: "Completed glow color", type: "color", defaultValue: "#04dcb9" },
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "CircularHoldButton.Press" },
      { key: "completed", name: "Completed", type: "digital", direction: "output", defaultValue: "CircularHoldButton.CompletedPress" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "CircularHoldButton.Selected" },
      { key: "label", name: "Standard name", type: "serial", direction: "input", defaultValue: "CircularHoldButton.Name" },
      { key: "pressedLabel", name: "Pressed name", type: "serial", direction: "input", defaultValue: "CircularHoldButton.PressedName" },
      { key: "selectedLabel", name: "Selected name", type: "serial", direction: "input", defaultValue: "CircularHoldButton.SelectionName" },
      { key: "completedLabel", name: "Completed name", type: "serial", direction: "input", defaultValue: "CircularHoldButton.CompletedName" },
      { key: "holdTime", name: "Hold time feedback", type: "analog", direction: "input", defaultValue: "CircularHoldButton.Feedback" },
    ],
    template: '<button class="circular-hold" type="button"><span class="hold-ring" aria-hidden="true"></span><span class="hold-label">SAVE</span></button>',
    styles: '[data-component="circular-hold-button"]{display:block;width:100%;height:100%;padding:12px;box-sizing:border-box}[data-component="circular-hold-button"] *{box-sizing:border-box}[data-component="circular-hold-button"] .circular-hold{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;min-height:0;aspect-ratio:1;border:1px solid var(--border-color);border-radius:50%;appearance:none;background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(0,0,0,.14)),var(--face-color);box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 10px color-mix(in srgb,var(--glow-color) 55%,transparent),0 6px 12px rgba(0,0,0,.25);color:var(--text-color);cursor:pointer;touch-action:none;overflow:visible}[data-component="circular-hold-button"] .hold-ring{--progress-angle:0deg;position:absolute;inset:2%;border-radius:50%;opacity:0;background:conic-gradient(from 0deg at 50% 50%,var(--fill-color) 0deg,var(--fill-color) var(--progress-angle),transparent var(--progress-angle),transparent 360deg);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--ring-width-px,7px)),#000 calc(100% - var(--ring-width-px,7px) + .5px));mask:radial-gradient(farthest-side,transparent calc(100% - var(--ring-width-px,7px)),#000 calc(100% - var(--ring-width-px,7px) + .5px));filter:drop-shadow(0 0 4px var(--fill-color));pointer-events:none}[data-component="circular-hold-button"] .circular-hold.drawing .hold-ring,[data-component="circular-hold-button"] .circular-hold.held .hold-ring{opacity:1}[data-component="circular-hold-button"] .hold-label{position:relative;z-index:1;max-width:68%;overflow:hidden;font:800 var(--text-size-px,20px)/1.05 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px #000;white-space:nowrap}',
    mount(root, context) {
      const button = root.querySelector(".circular-hold"), ring = root.querySelector(".hold-ring"), label = root.querySelector(".hold-label"), p = context.options.properties || {};
      ring.style.setProperty("--progress-angle", "0deg");
      const configuredDuration = Math.max(0, Math.min(10, Number(p.holdSeconds) || 0)) * 1000;
      let duration = configuredDuration;
      let holding = false, completed = false, feedbackSelected = false, localCompleted = false, started = 0, frame = 0, selectedTimer = 0;
      let remoteStandard = "", remotePressed = "", remoteSelected = "", remoteCompleted = "";
      const labels = { standard: p.text == null ? "SAVE" : String(p.text), pressed: p.pressedText == null ? "Hold to Save" : String(p.pressedText), selected: p.selectedText == null ? "Selected" : String(p.selectedText), completed: p.completedText == null ? "Saved" : String(p.completedText) };
      const autoReturn = p.autoReturnSelected !== false && p.autoReturnSelected !== 0 && p.autoReturnSelected !== "0" && String(p.autoReturnSelected).toLowerCase() !== "false";
      const selectedTime = Math.max(0, Math.min(10, Number(p.selectedDisplaySeconds) || 0)) * 1000;
      const theme = document.createElement("style");
      theme.textContent = '[data-component="circular-hold-button"] .circular-hold.pressed{color:var(--pressed-text-color);border-color:var(--pressed-border-color);background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(0,0,0,.16)),var(--pressed-color);box-shadow:inset 0 1px rgba(255,255,255,.44),0 0 var(--glow-strength-px) var(--pressed-glow-color)}[data-component="circular-hold-button"] .circular-hold.active{color:var(--selected-text-color);border-color:var(--selected-border-color);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(0,0,0,.1)),var(--selected-color);box-shadow:inset 0 1px rgba(255,255,255,.46),0 0 var(--glow-strength-px) var(--selected-glow-color)}[data-component="circular-hold-button"] .circular-hold.held{color:var(--completed-text-color);border-color:var(--completed-border-color);background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(0,0,0,.08)),var(--completed-color);box-shadow:inset 0 1px rgba(255,255,255,.5),0 0 var(--glow-strength-px) var(--completed-glow-color)}[data-component="circular-hold-button"] .circular-hold.saved-splash{animation:circular-hold-splash .5s cubic-bezier(.2,.9,.3,1.25)}@keyframes circular-hold-splash{0%{transform:scale(.86);filter:brightness(1.7)}55%{transform:scale(1.06)}100%{transform:scale(1);filter:brightness(1)}}';
      root.appendChild(theme);
      function render() { button.classList.toggle("active", feedbackSelected); button.classList.toggle("held", localCompleted); label.textContent = localCompleted ? (remoteCompleted || labels.completed) : holding ? (remotePressed || labels.pressed) : feedbackSelected ? (remoteSelected || labels.selected) : (remoteStandard || labels.standard); }
      function resetLocal() { localCompleted = false; ring.style.setProperty("--progress-angle", "0deg"); render(); }
      function pulse(key) { context.signals.publish(key, true); setTimeout(() => context.signals.publish(key, false), 100); }
      function finish() { if (completed) return; completed = true; holding = false; localCompleted = true; ring.style.setProperty("--progress-angle", "360deg"); button.classList.remove("pressed", "drawing"); button.classList.add("held", "saved-splash"); setTimeout(() => button.classList.remove("saved-splash"), 520); pulse("completed"); render(); clearTimeout(selectedTimer); if (autoReturn) selectedTimer = setTimeout(resetLocal, selectedTime); }
      function step(now) { if (!holding) return; const amount = duration <= 0 ? 1 : Math.min(1, (now - started) / duration); ring.style.setProperty("--progress-angle", `${amount * 360}deg`); if (amount > 0) button.classList.add("drawing"); if (amount >= 1) finish(); else frame = requestAnimationFrame(step); }
      function down() { if (holding) return; clearTimeout(selectedTimer); localCompleted = false; holding = true; completed = false; started = performance.now(); button.classList.remove("active", "held", "pressed", "drawing"); ring.style.setProperty("--progress-angle", "0deg"); void ring.getBoundingClientRect(); button.classList.add("pressed"); render(); frame = requestAnimationFrame(step); }
      function release() { cancelAnimationFrame(frame); const done = completed; holding = false; button.classList.remove("pressed", "drawing"); completed = false; if (!done) { ring.style.setProperty("--progress-angle", "0deg"); pulse("press"); } render(); }
      function cancel() { cancelAnimationFrame(frame); holding = false; completed = false; button.classList.remove("pressed", "drawing"); ring.style.setProperty("--progress-angle", "0deg"); render(); }
      const unbindPointer = context.interactions.bindPrimaryPointer(button, { down, up: release, cancel });
      context.signals.subscribe("selected", value => { feedbackSelected = value === true || value === 1 || value === "1"; render(); });
      [["label", value => remoteStandard = value], ["pressedLabel", value => remotePressed = value], ["selectedLabel", value => remoteSelected = value], ["completedLabel", value => remoteCompleted = value]].forEach(([key, assign]) => context.signals.subscribe(key, value => { assign(value == null ? "" : String(value)); render(); }));
      context.signals.subscribe("holdTime", value => { const n = Math.max(0, Number(value) || 0); duration = n > 0 ? Math.min(10, n > 10 ? n / 65535 * 10 : n) * 1000 : configuredDuration; });
      render();
      return () => { cancelAnimationFrame(frame); clearTimeout(selectedTimer); unbindPointer(); };
    },
  });
})(window.ComposerRuntime);
