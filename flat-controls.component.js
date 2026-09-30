(function (runtime) {
  "use strict";
  function mountFlatButton(root, context) {
    const button = root.querySelector(".flat-btn"), label = root.querySelector(".flat-label"), fill = root.querySelector(".flat-hold-fill"), p = context.options.properties || {}, kind = context.options.definitionData.kind;
    const actionSignal = kind === "toggle" ? "value" : kind === "hold" ? "held" : null;
    let selected = kind === "toggle" && p.defaultSelected === true, remoteLabel = "", remoteSelectedLabel = "", heldTimer = 0, progressTimer = 0, pulseTimer = 0, started = 0;
    const truth = value => value === true || value === 1 || value === "1";
    function render() {
      button.classList.toggle("active", selected);
      if (kind === "toggle") button.setAttribute("aria-pressed", String(selected));
      label.textContent = selected ? remoteSelectedLabel || p.selectedText || p.text || "Button" : remoteLabel || p.text || "Button";
      button.setAttribute("aria-label", label.textContent);
    }
    function stop() { clearTimeout(heldTimer); clearInterval(progressTimer); if (fill) fill.style.width = "0%"; }
    function down() {
      button.classList.add("is-pressed"); context.signals.publish("press", true);
      if (kind === "hold") {
        stop(); started = performance.now(); const duration = Math.max(100, (Number(p.holdDuration) || 3) * 1000);
        progressTimer = setInterval(() => { fill.style.width = Math.min(100, (performance.now() - started) / duration * 100) + "%"; }, 30);
        heldTimer = setTimeout(() => {
          clearInterval(progressTimer); fill.style.width = "100%"; context.signals.publish(actionSignal, true);
          pulseTimer = setTimeout(() => context.signals.publish(actionSignal, false), 100);
        }, duration);
      }
    }
    function release(cancelled) {
      stop(); button.classList.remove("is-pressed"); context.signals.publish("press", false);
      if (!cancelled && kind === "toggle") { selected = !selected; render(); context.signals.publish(actionSignal, selected); }
      if (!cancelled && context.options.targetPage) context.navigate(context.options.targetPage);
    }
    const unbind = context.interactions.bindPrimaryPointer(button, { down, up: () => release(false), cancel: () => release(true) });
    context.signals.subscribe("selected", value => { selected = truth(value); render(); });
    context.signals.subscribe("label", value => { remoteLabel = String(value ?? ""); render(); });
    context.signals.subscribe("selectedLabel", value => { remoteSelectedLabel = String(value ?? ""); render(); });
    function keyboard(event) {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault(); if (event.type === "keydown" && !event.repeat) down(); else if (event.type === "keyup") release(false);
    }
    const blur = () => release(true);
    button.addEventListener("keydown", keyboard); button.addEventListener("keyup", keyboard); button.addEventListener("blur", blur); render();
    return () => { stop(); clearTimeout(pulseTimer); context.signals.publish("press", false); if (kind === "hold") context.signals.publish(actionSignal, false); unbind(); button.removeEventListener("keydown", keyboard); button.removeEventListener("keyup", keyboard); button.removeEventListener("blur", blur); };
  }
  const buttonProperties = [
    { key: "text", name: "Standard label", type: "text", defaultValue: "Button" },
    { key: "selectedText", name: "Selected label", type: "text", defaultValue: "Selected" },
    { key: "textColor", name: "Standard text color", type: "color", defaultValue: "#e9ecf1" },
    { key: "selectedTextColor", name: "Selected text color", type: "color", defaultValue: "#e9ecf1" },
    { key: "faceColor", name: "Standard surface", type: "color", defaultValue: "#2b2f38" },
    { key: "selectedColor", name: "Selected surface", type: "color", defaultValue: "#2f80ed" },
    { key: "pressedColor", name: "Pressed surface", type: "color", defaultValue: "#2468c4" },
    { key: "fillColor", name: "Hold progress color", type: "color", defaultValue: "#2f80ed", visibleWhen: { key: "holdDuration", gte: 0 } },
    { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 100, defaultValue: 8 },
    { key: "textSize", name: "Text size (px)", type: "number", min: 8, max: 96, defaultValue: 16 }
  ];
  for (const [id, name, category, kind] of [
    ["flat-standard-button", "Flat Standard Button", "Standard Buttons", "standard"],
    ["flat-toggle-button", "Flat Toggle Button", "Toggle Buttons", "toggle"],
    ["flat-hold-button", "Flat Hold Button", "Advanced Buttons", "hold"]
  ]) {
    const scope = '[data-component="' + id + '"]', prefix = id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('');
    const properties = structuredClone(buttonProperties).filter(property => kind === "hold" || property.key !== "fillColor");
    if (kind === "toggle") properties.push({ key: "defaultSelected", name: "Default selected", type: "checkbox", defaultValue: false });
    if (kind === "hold") properties.push({ key: "holdDuration", name: "Hold duration (seconds)", type: "number", min: 0.1, max: 30, step: 0.1, defaultValue: 3 });
    const signals = [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: prefix + ".Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: prefix + ".Selected" },
      { key: "label", name: "Standard Label", type: "serial", direction: "input", defaultValue: prefix + ".Label" },
      { key: "selectedLabel", name: "Selected Label", type: "serial", direction: "input", defaultValue: prefix + ".SelectedLabel" }
    ];
    if (kind === "toggle") signals.push({ key: "value", name: "Toggle value", type: "digital", direction: "output", defaultValue: prefix + ".ToggleValue" });
    if (kind === "hold") signals.push({ key: "held", name: "Held", type: "digital", direction: "output", defaultValue: prefix + ".Held" });
    runtime.register({ id, name, category, defaultSize: { width: 180, height: 56 }, properties, signals, data: { kind },
      template: '<button class="flat-btn" type="button"' + (kind === "toggle" ? ' aria-pressed="false"' : '') + '>' + (kind === "hold" ? '<span class="flat-hold-fill"></span>' : '') + '<span class="flat-label" data-composer-label>Button</span></button>',
      styles: scope + '{display:block;width:100%;height:100%;box-sizing:border-box}' + scope + ' .flat-btn{position:relative;width:100%;height:100%;min-width:0;padding:0 20px;overflow:hidden;border:0;border-radius:var(--corner-radius-px,8px);background:var(--face-color,#2b2f38);color:var(--text-color,#e9ecf1);font:600 var(--text-size-px,16px) "Segoe UI",Roboto,Helvetica,Arial,sans-serif;cursor:pointer;user-select:none;touch-action:none;transition:background .12s;box-shadow:none}' + scope + ' .flat-btn.active{background:var(--selected-color,#2f80ed);color:var(--selected-text-color,#e9ecf1)}' + scope + ' .flat-btn.is-pressed{background:var(--pressed-color,#2468c4)}' + scope + ' .flat-label{position:relative;z-index:1;color:inherit}' + scope + ' .flat-hold-fill{position:absolute;inset:0 auto 0 0;width:0;background:var(--fill-color,#2f80ed);pointer-events:none}', mount: mountFlatButton });
  }
  function mountFlatSwitch(root, context) {
    const button = root.querySelector('.flat-switch'), p = context.options.properties || {};
    let selected = p.defaultSelected === true;
    const render = () => button.setAttribute('aria-checked', String(selected));
    function click() { selected = !selected; render(); context.signals.publish('value', selected); button.dispatchEvent(new CustomEvent('flat-change', { detail: { value: selected } })); if (context.options.targetPage) context.navigate(context.options.targetPage); }
    button.addEventListener('click', click);
    context.signals.subscribe('selected', value => { selected = value === true || value === 1 || value === '1'; render(); });
    context.signals.subscribe('label', value => { button.setAttribute('aria-label', String(value || p.localLabel || 'Toggle')); root.querySelector('.flat-switch-label').textContent = String(value || p.localLabel || 'Toggle'); });
    button.setAttribute('aria-label', p.localLabel || 'Toggle'); root.querySelector('.flat-switch-label').textContent = p.localLabel || 'Toggle'; render();
    return () => button.removeEventListener('click', click);
  }
  runtime.register({ id: 'flat-slide-toggle', name: 'Flat Slide Toggle', category: 'Toggle Buttons', defaultSize: { width: 96, height: 52 },
    properties: [
      { key: 'defaultSelected', name: 'Default selected', type: 'checkbox', defaultValue: false },
      { key: 'localLabel', name: 'Local label', type: 'text', defaultValue: 'Toggle' },
      { key: 'showLabel', name: 'Show label', type: 'checkbox', defaultValue: false },
      { key: 'faceColor', name: 'Standard surface', type: 'color', defaultValue: '#2b2f38' },
      { key: 'selectedColor', name: 'Selected surface', type: 'color', defaultValue: '#2f80ed' },
      { key: 'knobColor', name: 'Knob color', type: 'color', defaultValue: '#e9ecf1' }
    ], signals: [
      { key: 'value', name: 'Toggle value', type: 'digital', direction: 'output', defaultValue: 'FlatSlideToggle.Value' },
      { key: 'selected', name: 'Selected', type: 'digital', direction: 'input', defaultValue: 'FlatSlideToggle.Selected' },
      { key: 'label', name: 'Label', type: 'serial', direction: 'input', defaultValue: 'FlatSlideToggle.Label' }
    ], optionalContent: { showLabel: '.flat-switch-label' },
    template: '<button class="flat-switch" type="button" role="switch" aria-checked="false" aria-label="Toggle"><span class="knob"></span><span class="flat-switch-label">Toggle</span></button>',
    styles: '[data-component="flat-slide-toggle"]{display:block;width:100%;height:100%}[data-component="flat-slide-toggle"] .flat-switch{position:relative;width:100%;height:100%;padding:0;border:0;border-radius:999px;background:var(--face-color,#2b2f38);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .18s;box-shadow:none}[data-component="flat-slide-toggle"] .knob{position:absolute;top:6px;left:6px;width:auto;height:calc(100% - 12px);aspect-ratio:1;border-radius:50%;background:var(--knob-color,#e9ecf1);transition:left .18s ease,transform .18s ease}[data-component="flat-slide-toggle"] .flat-switch[aria-checked="true"]{background:var(--selected-color,#2f80ed)}[data-component="flat-slide-toggle"] .flat-switch[aria-checked="true"] .knob{left:calc(100% - 6px);transform:translateX(-100%)}[data-component="flat-slide-toggle"] .flat-switch-label{display:none;position:absolute;left:100%;margin-left:8px;top:50%;transform:translateY(-50%);color:var(--text-color,#e9ecf1);white-space:nowrap}', mount: mountFlatSwitch });
  function mountFlatSlider(root, context) {
    const track = root.querySelector(".flat-slider"), label = root.querySelector(".flat-slider-name"), output = root.querySelector(".flat-slider-value"), p = context.options.properties || {}, vertical = context.options.definitionData.vertical;
    let value = 0, dragging = false, pointerId = null;
    const crestron = p.analogScale !== "percent", clamp = input => Math.max(0, Math.min(100, Number(input) || 0));
    function render(next) { value = clamp(next); track.style.setProperty("--value", String(value)); track.setAttribute("aria-valuenow", String(Math.round(value))); output.textContent = Math.round(value) + "%"; }
    function set(next) { render(next); context.signals.publish("value", Math.round(crestron ? value / 100 * 65535 : value)); }
    function point(event) { const r = track.getBoundingClientRect(); if (r.width && r.height) set(vertical ? (r.bottom - event.clientY) / r.height * 100 : (event.clientX - r.left) / r.width * 100); }
    function down(event) { if (event.isPrimary === false || (event.button != null && event.button !== 0)) return; dragging = true; pointerId = event.pointerId; try { track.setPointerCapture(pointerId); } catch (_) {} point(event); event.preventDefault(); }
    function move(event) { if (dragging && event.pointerId === pointerId) point(event); }
    function up(event) { if (event.pointerId !== pointerId) return; dragging = false; if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId); pointerId = null; }
    function keyboard(event) { let next = value; if (event.key === "ArrowUp" || event.key === "ArrowRight") next += Number(p.step) || 1; else if (event.key === "ArrowDown" || event.key === "ArrowLeft") next -= Number(p.step) || 1; else if (event.key === "Home") next = 0; else if (event.key === "End") next = 100; else return; event.preventDefault(); set(next); }
    label.textContent = p.localLabel || "Level"; track.setAttribute("aria-label", label.textContent); render(p.defaultPercent ?? 50);
    context.signals.subscribe("feedback", input => render(crestron ? Number(input) / 65535 * 100 : input));
    context.signals.subscribe("label", input => { label.textContent = String(input || p.localLabel || "Level"); track.setAttribute("aria-label", label.textContent); });
    track.addEventListener("pointerdown", down); track.addEventListener("pointermove", move); track.addEventListener("pointerup", up); track.addEventListener("pointercancel", up); track.addEventListener("lostpointercapture", up); track.addEventListener("keydown", keyboard);
    return () => { dragging = false; for (const [type, handler] of [["pointerdown",down],["pointermove",move],["pointerup",up],["pointercancel",up],["lostpointercapture",up],["keydown",keyboard]]) track.removeEventListener(type,handler); };
  }
  for (const vertical of [false, true]) {
    const id = vertical ? "flat-vertical-slider" : "flat-horizontal-slider", scope = '[data-component="' + id + '"]', prefix = vertical ? "FlatVerticalSlider" : "FlatHorizontalSlider";
    runtime.register({ id, name: vertical ? "Flat Vertical Slider" : "Flat Horizontal Slider", category: "Sliders & Levels", defaultSize: vertical ? { width: 64, height: 260 } : { width: 280, height: 56 }, data: { vertical },
      properties: [
        { key: "localLabel", name: "Local label", type: "text", defaultValue: "Level" },
        { key: "showLabel", name: "Show label", type: "checkbox", defaultValue: false },
        { key: "showPercentage", name: "Show percentage", type: "checkbox", defaultValue: true },
        { key: "defaultPercent", name: "Default percentage", type: "number", min: 0, max: 100, defaultValue: vertical ? 75 : 50 },
        { key: "step", name: "Keyboard step (%)", type: "number", min: 1, max: 100, defaultValue: 1 },
        { key: "analogScale", name: "Analog scale", type: "select", options: [{value:"crestron",label:"Crestron (0–65535)"},{value:"percent",label:"Percentage (0–100)"}], defaultValue: "crestron" },
        { key: "faceColor", name: "Track surface", type: "color", defaultValue: "#2b2f38" },
        { key: "fillColor", name: "Fill color", type: "color", defaultValue: "#2f80ed" },
        { key: "textColor", name: "Text color", type: "color", defaultValue: "#e9ecf1" },
        { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 100, defaultValue: 8 },
        { key: "textSize", name: "Text size (px)", type: "number", min: 8, max: 96, defaultValue: vertical ? 14 : 16 }
      ],
      signals: [
        { key: "value", name: "Value set", type: "analog", direction: "output", defaultValue: prefix + ".ValueSet" },
        { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: prefix + ".Feedback" },
        { key: "label", name: "Label", type: "serial", direction: "input", defaultValue: prefix + ".Label" }
      ], optionalContent: {showLabel:".flat-slider-name",showPercentage:".flat-slider-value"},
      template: '<div class="flat-slider" role="slider" tabindex="0" aria-label="Level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-orientation="' + (vertical ? 'vertical' : 'horizontal') + '"><div class="flat-slider-fill"></div><div class="flat-slider-label"><span class="flat-slider-name"></span><span class="flat-slider-value">50%</span></div></div>',
      styles: scope + '{display:block;width:100%;height:100%;box-sizing:border-box}' + scope + ' .flat-slider{position:relative;width:100%;height:100%;overflow:hidden;border-radius:var(--corner-radius-px,8px);background:var(--face-color,#2b2f38);touch-action:none;cursor:pointer;user-select:none}' + scope + ' .flat-slider-fill{position:absolute;left:0;bottom:0;background:var(--fill-color,#2f80ed);' + (vertical ? 'right:0;height:calc(var(--value,75)*1%)' : 'top:0;width:calc(var(--value,50)*1%)') + '}' + scope + ' .flat-slider-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:' + (vertical ? 'flex-start;padding-top:10px' : 'center') + ';gap:4px;color:var(--text-color,#e9ecf1);font:600 var(--text-size-px,16px) "Segoe UI",Roboto,Helvetica,Arial,sans-serif;pointer-events:none}', mount: mountFlatSlider });
  }
})(window.ComposerRuntime);
