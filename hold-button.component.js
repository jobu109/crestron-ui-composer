(function (runtime) {
  "use strict";
  runtime.register({
    id: "hold-button",
    name: "Hold Button",
    category: "Advanced Buttons",
    defaultSize: { width: 240, height: 110 },
    properties: [
      { key: "text", name: "Standard label", type: "text", defaultValue: "SAVE" },
      { key: "pressedText", name: "Pressed label", type: "text", defaultValue: "Hold to Save" },
      { key: "selectedText", name: "Selected label", type: "text", defaultValue: "Selected" },
      { key: "completedText", name: "Completed label", type: "text", defaultValue: "Saved" },
      { key: "holdSeconds", name: "Hold time (seconds)", type: "number", min: 0, max: 10, step: 0.1, defaultValue: 1.2 },
      { key: "autoReturnSelected", name: "Return to Standard automatically", type: "checkbox", defaultValue: true },
      { key: "selectedDisplaySeconds", name: "Selected state time (seconds)", type: "number", min: 0, max: 10, step: 0.1, defaultValue: 1.5 },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 160, defaultValue: 24 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 100, defaultValue: 16 },
      { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#ffffff" },
      { key: "pressedTextColor", name: "Pressed text color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedTextColor", name: "Selected text color", type: "color", defaultValue: "#ffffff" },
      { key: "completedTextColor", name: "Completed text color", type: "color", defaultValue: "#ffffff" },
      { key: "faceColor", name: "Standard background color", type: "color", defaultValue: "#04aa8e" },
      { key: "pressedColor", name: "Pressed background color", type: "color", defaultValue: "#087e6c" },
      { key: "selectedColor", name: "Selected background color", type: "color", defaultValue: "#04aa8e" },
      { key: "completedColor", name: "Completed background color", type: "color", defaultValue: "#04dcb9" },
      { key: "fillColor", name: "Hold fill color", type: "color", defaultValue: "#04dcb9" },
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
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "HoldButton.Press" },
      { key: "completed", name: "Completed", type: "digital", direction: "output", defaultValue: "HoldButton.CompletedPress" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "HoldButton.Selected" },
      { key: "label", name: "Standard name", type: "serial", direction: "input", defaultValue: "HoldButton.Label" },
      { key: "pressedLabel", name: "Pressed name", type: "serial", direction: "input", defaultValue: "HoldButton.PressedLabel" },
      { key: "selectedLabel", name: "Selected name", type: "serial", direction: "input", defaultValue: "HoldButton.SelectionLabel" },
      { key: "completedLabel", name: "Completed name", type: "serial", direction: "input", defaultValue: "HoldButton.CompletedLabel" },
      { key: "holdTime", name: "Hold time feedback", type: "analog", direction: "input", defaultValue: "HoldButton.Feedback" },
    ],
    template: '<button class="hold-button" type="button"><span class="hold-fill"></span><span class="hold-label">SAVE</span></button>',
    styles: '[data-component="hold-button"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box}[data-component="hold-button"] *{box-sizing:border-box}[data-component="hold-button"] .hold-button{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;padding:12px;border:1px solid rgba(255,255,255,.36);border-radius:24px;appearance:none;background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(32,51,50,.4));box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 10px rgba(4,170,142,.35),0 6px 12px rgba(0,0,0,.22);color:#fff;cursor:pointer;touch-action:none}[data-component="hold-button"] .hold-fill{position:absolute;inset:0 auto 0 0;width:0;background:color-mix(in srgb,var(--fill-color,#f472b6) 48%,transparent);pointer-events:none}[data-component="hold-button"] .hold-label{position:relative;z-index:1;overflow:hidden;color:inherit;font:800 var(--text-size-px,24px) "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px #000;white-space:nowrap}[data-component="hold-button"] .hold-button.pressed{filter:brightness(1.12)}[data-component="hold-button"] .hold-button.held{border-color:var(--selected-border-color);box-shadow:inset 0 1px rgba(255,255,255,.46),0 0 var(--glow-strength-px,16px) var(--selected-glow-color)}',
    mount(root, context) {
      const button = root.querySelector(".hold-button");
      const fill = root.querySelector(".hold-fill");
      const label = root.querySelector(".hold-label");
      const p = context.options.properties || {};
      const configuredDuration = Math.max(0, Math.min(10, Number(p.holdSeconds) || 0)) * 1000;
      let duration = configuredDuration;
      let holding = false, completed = false, feedbackSelected = false, localCompleted = false, started = 0, frame = 0, selectedTimer = 0;
      let remoteStandard = "", remotePressed = "", remoteSelected = "", remoteCompleted = "";
      const standardLabel = p.text == null ? "SAVE" : String(p.text);
      const pressedLabel = p.pressedText == null ? "Hold to Save" : String(p.pressedText);
      const selectedLabel = p.selectedText == null ? "Selected" : String(p.selectedText);
      const completedLabel = p.completedText == null ? "Saved" : String(p.completedText);
      const autoReturn = p.autoReturnSelected !== false && p.autoReturnSelected !== 0 && p.autoReturnSelected !== "0" && String(p.autoReturnSelected).toLowerCase() !== "false";
      const selectedTime = Math.max(0, Math.min(10, Number(p.selectedDisplaySeconds) || 0)) * 1000;
      const theme = document.createElement("style");
      theme.textContent = '[data-component="hold-button"] .hold-button{color:var(--text-color);border-color:var(--border-color);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(0,0,0,.12)),var(--face-color);box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 10px color-mix(in srgb,var(--glow-color) 55%,transparent),0 6px 12px rgba(0,0,0,.22)}[data-component="hold-button"] .hold-fill{background:color-mix(in srgb,var(--fill-color) 58%,transparent)}[data-component="hold-button"] .hold-button.active{color:var(--selected-text-color);border-color:var(--selected-border-color);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(0,0,0,.1)),var(--selected-color);box-shadow:inset 0 1px rgba(255,255,255,.46),0 0 var(--glow-strength-px,16px) var(--selected-glow-color)}[data-component="hold-button"] .hold-button.held{color:var(--completed-text-color);border-color:var(--completed-border-color);background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(0,0,0,.08)),var(--completed-color);box-shadow:inset 0 1px rgba(255,255,255,.5),0 0 var(--glow-strength-px,16px) var(--completed-glow-color)}[data-component="hold-button"] .hold-button.pressed{color:var(--pressed-text-color);border-color:var(--pressed-border-color);background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(0,0,0,.16)),var(--pressed-color);box-shadow:inset 0 1px rgba(255,255,255,.44),0 0 var(--glow-strength-px,16px) var(--pressed-glow-color);filter:brightness(1.08)}[data-component="hold-button"] .hold-button.saved-splash{animation:hold-saved-splash .5s cubic-bezier(.2,.9,.3,1.25)}@keyframes hold-saved-splash{0%{transform:scale(.86);filter:brightness(1.7)}55%{transform:scale(1.08)}100%{transform:scale(1);filter:brightness(1)}}';
      root.appendChild(theme);
      function isSelected() { return feedbackSelected || localCompleted; }
      function renderState() { button.classList.toggle("active", feedbackSelected); button.classList.toggle("held", localCompleted); label.textContent = localCompleted ? (remoteCompleted || completedLabel) : holding ? (remotePressed || pressedLabel) : feedbackSelected ? (remoteSelected || selectedLabel) : (remoteStandard || standardLabel); }
      function clearLocalSelected() { localCompleted = false; fill.style.transition = "width .25s ease"; fill.style.width = "0%"; button.classList.remove("held"); renderState(); }
      function pulse(key) { context.signals.publish(key, true); setTimeout(() => context.signals.publish(key, false), 100); }
      function complete() { if (completed) return; completed = true; holding = false; localCompleted = true; fill.style.width = "100%"; button.classList.remove("pressed"); button.classList.add("held", "saved-splash"); setTimeout(() => button.classList.remove("saved-splash"), 520); pulse("completed"); renderState(); clearTimeout(selectedTimer); if (autoReturn) selectedTimer = setTimeout(clearLocalSelected, selectedTime); }
      function step(now) { if (!holding) return; const amount = duration <= 0 ? 1 : Math.min(1, (now - started) / duration); fill.style.width = `${amount * 100}%`; if (amount >= 1) complete(); else frame = requestAnimationFrame(step); }
      function down() { if (holding) return; clearTimeout(selectedTimer); localCompleted = false; holding = true; completed = false; started = performance.now(); button.classList.remove("active", "held"); button.classList.add("pressed"); fill.style.transition = "none"; renderState(); frame = requestAnimationFrame(step); }
      function release() { cancelAnimationFrame(frame); const wasCompleted = completed; holding = false; button.classList.remove("pressed"); completed = false; if (!wasCompleted) { fill.style.transition = "width .2s ease"; fill.style.width = "0%"; pulse("press"); } renderState(); }
      function cancel() { cancelAnimationFrame(frame); holding = false; completed = false; button.classList.remove("pressed"); fill.style.transition = "width .2s ease"; fill.style.width = "0%"; renderState(); }
      const unbindPointer = context.interactions.bindPrimaryPointer(button, { down, up: release, cancel });
      context.signals.subscribe("selected", value => { feedbackSelected = value === true || value === 1 || value === "1"; renderState(); });
      context.signals.subscribe("label", value => { remoteStandard = value == null ? "" : String(value); renderState(); });
      context.signals.subscribe("pressedLabel", value => { remotePressed = value == null ? "" : String(value); renderState(); });
      context.signals.subscribe("selectedLabel", value => { remoteSelected = value == null ? "" : String(value); renderState(); });
      context.signals.subscribe("completedLabel", value => { remoteCompleted = value == null ? "" : String(value); renderState(); });
      context.signals.subscribe("holdTime", value => { const n = Math.max(0, Number(value) || 0); duration = n > 0 ? Math.min(10, n > 10 ? n / 65535 * 10 : n) * 1000 : configuredDuration; });
      renderState();
      return () => { cancelAnimationFrame(frame); clearTimeout(selectedTimer); unbindPointer(); };
    },
  });
})(window.ComposerRuntime);
