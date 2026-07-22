(function (runtime) {
  "use strict";
  const properties = [
    { key: "modeCount", name: "Number of modes", type: "number", min: 2, max: 8, step: 1, defaultValue: 4, affectsProperties: true },
    { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
    { key: "borderColor", name: "Border color", type: "color", defaultValue: "#ffffff" },
    { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
    { key: "selectedColor", name: "Selected color", type: "color", defaultValue: "#04aa8e" },
    { key: "fontSize", name: "Text size", type: "number", min: 8, max: 96, step: 1, defaultValue: 24 },
    { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 100, step: 1, defaultValue: 24 },
    { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 50, step: 1, defaultValue: 14 },
    { key: "assetFit", name: "Mode asset fit", type: "select", defaultValue: "contain", options: [{ value: "contain", label: "Contain" }, { value: "cover", label: "Cover" }, { value: "fill", label: "Stretch" }] },
    { key: "assetOpacity", name: "Mode asset opacity %", type: "number", min: 0, max: 100, step: 1, defaultValue: 100 },
  ];
  for (let index = 0; index < 8; index++) {
    const visibleWhen = { key: "modeCount", gte: index + 1 };
    properties.push(
      { key: `mode${index}Text`, name: `Mode ${index} text`, type: "text", defaultValue: `Mode ${index}`, visibleWhen },
      { key: `mode${index}Color`, name: `Mode ${index} color`, type: "color", defaultValue: index === 0 ? "#365250" : "#087e6c", visibleWhen },
      { key: `mode${index}Asset`, name: `Mode ${index} asset`, type: "asset", defaultValue: "", visibleWhen },
    );
  }
  runtime.register({
    id: "multi-mode-button",
    name: "Multi-Mode Button",
    category: "Buttons",
    defaultSize: { width: 240, height: 110 },
    properties,
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "MultiMode.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "MultiMode.Selected" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "MultiMode.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "MultiMode.Name" },
      { key: "visibility", name: "Visibility", type: "digital", direction: "input", defaultValue: "MultiMode.Visibility", optionalProperty: "visibilityEnabled" },
    ],
    template: '<button class="multi-mode-button" type="button"><span class="multi-mode-asset"></span><span class="multi-mode-label">Mode 0</span></button>',
    styles: '[data-component="multi-mode-button"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box}[data-component="multi-mode-button"] *{box-sizing:border-box}[data-component="multi-mode-button"] .multi-mode-button{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;padding:12px;border:1px solid rgba(255,255,255,.36);border-radius:var(--corner-radius-px,24px);appearance:none;background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(52,68,68,.26) 42%,var(--multi-mode-color,#365250));box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 var(--glow-strength-px,14px) var(--glow-color,#04aa8e),0 6px 12px rgba(0,0,0,.22);color:var(--text-color,#fff);cursor:pointer;touch-action:none}[data-component="multi-mode-button"] .multi-mode-button.active{border-color:var(--selected-color,#04aa8e);box-shadow:inset 0 1px rgba(255,255,255,.48),0 0 calc(var(--glow-strength-px,14px) * 1.4) var(--selected-color,#04aa8e),0 6px 12px rgba(0,0,0,.22)}[data-component="multi-mode-button"] .multi-mode-button.pressed{filter:brightness(1.16);transform:scale(.98)}[data-component="multi-mode-button"] .multi-mode-asset{position:absolute;inset:8px;background-position:center;background-repeat:no-repeat;pointer-events:none}[data-component="multi-mode-button"] .multi-mode-label{position:relative;z-index:1;max-width:100%;overflow:hidden;color:var(--text-color,#fff);font:800 var(--font-size-px,24px)/1.1 "Segoe UI",sans-serif;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px rgba(0,0,0,.8);white-space:nowrap}',
    mount(root, context) {
      const button = root.querySelector(".multi-mode-button"),
        label = root.querySelector(".multi-mode-label"),
        asset = root.querySelector(".multi-mode-asset"),
        values = context.options.properties || {};
      let mode = 0, serialName = "";
      function modeCount() { return Math.max(2, Math.min(8, Number(values.modeCount) || 4)); }
      function showMode(next) {
        mode = Math.max(0, Math.min(modeCount() - 1, Math.round(Number(next) || 0)));
        label.textContent = serialName || values[`mode${mode}Text`] || `Mode ${mode}`;
        const color = values[`mode${mode}Color`] || "#087e6c",
          source = values[`mode${mode}AssetData`] || "";
        button.style.setProperty("--multi-mode-color", color);
        asset.style.backgroundImage = source ? `url("${String(source).replace(/"/g, "%22")}")` : "none";
        asset.style.backgroundSize = values.assetFit || "contain";
        asset.style.opacity = String(Math.max(0, Math.min(100, Number(values.assetOpacity ?? 100))) / 100);
        button.dataset.mode = String(mode);
        button.setAttribute("aria-label", label.textContent);
      }
      function press(event) { button.classList.add("pressed"); context.signals.publish("press", true); event.preventDefault(); }
      function release() { button.classList.remove("pressed"); context.signals.publish("press", false); }
      function navigate() { if (context.options.targetPage) context.navigate(context.options.targetPage); }
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerup", navigate);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
      context.signals.subscribe("selected", (value) => button.classList.toggle("active", value === true || value === 1 || value === "1"));
      context.signals.subscribe("feedback", showMode);
      context.signals.subscribe("name", (value) => { serialName = String(value || ""); showMode(mode); });
      showMode(0);
      return () => {
        button.removeEventListener("pointerdown", press);
        button.removeEventListener("pointerup", release);
        button.removeEventListener("pointerup", navigate);
        button.removeEventListener("pointerleave", release);
        button.removeEventListener("pointercancel", release);
      };
    },
  });
})(window.ComposerRuntime);
