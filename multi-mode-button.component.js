(function (runtime) {
  "use strict";
  const properties = [
    { key: "modeCount", name: "Number of modes", type: "number", min: 2, max: 8, step: 1, defaultValue: 4, affectsProperties: true },
  ];
  for (let index = 0; index < 8; index++) {
    const visibleWhen = { key: "modeCount", gte: index + 1 }, start = properties.length;
    properties.push(
      { key: `mode${index}Text`, name: `Mode ${index} text`, type: "text", defaultValue: `Mode ${index}`, visibleWhen },
      { key: `mode${index}ShowText`, name: `Mode ${index} show text`, type: "checkbox", defaultValue: true, visibleWhen },
      { key: `mode${index}TextColor`, name: `Mode ${index} text color`, type: "color", defaultValue: "#ffffff", visibleWhen },
      { key: `mode${index}FontSize`, name: `Mode ${index} text size`, type: "number", min: 8, max: 96, step: 1, defaultValue: 24, visibleWhen },
      { key: `mode${index}Color`, name: `Mode ${index} face color`, type: "color", defaultValue: index === 0 ? "#365250" : "#087e6c", visibleWhen },
      { key: `mode${index}BorderColor`, name: `Mode ${index} border color`, type: "color", defaultValue: "#ffffff", visibleWhen },
      { key: `mode${index}GlowColor`, name: `Mode ${index} glow color`, type: "color", defaultValue: "#04aa8e", visibleWhen },
      { key: `mode${index}SelectedColor`, name: `Mode ${index} selected color`, type: "color", defaultValue: "#04aa8e", visibleWhen },
      { key: `mode${index}CornerRadius`, name: `Mode ${index} corner radius`, type: "number", min: 0, max: 100, step: 1, defaultValue: 24, visibleWhen },
      { key: `mode${index}GlowStrength`, name: `Mode ${index} glow strength`, type: "number", min: 0, max: 50, step: 1, defaultValue: 14, visibleWhen },
      { key: `mode${index}Asset`, name: `Mode ${index} asset`, type: "asset", defaultValue: "", visibleWhen },
      { key: `mode${index}SelectedAsset`, name: `Mode ${index} selected asset`, type: "asset", defaultValue: "", visibleWhen },
      { key: `mode${index}AssetFit`, name: `Mode ${index} asset fit`, type: "select", defaultValue: "contain", options: [{ value: "contain", label: "Contain" }, { value: "cover", label: "Cover" }, { value: "fill", label: "Stretch" }], visibleWhen },
      { key: `mode${index}AssetOpacity`, name: `Mode ${index} asset opacity %`, type: "number", min: 0, max: 100, step: 1, defaultValue: 100, visibleWhen },
      { key: `mode${index}AssetWidth`, name: `Mode ${index} asset width %`, type: "number", min: 1, max: 200, step: 1, defaultValue: 100, visibleWhen },
      { key: `mode${index}AssetHeight`, name: `Mode ${index} asset height %`, type: "number", min: 1, max: 200, step: 1, defaultValue: 100, visibleWhen },
      { key: `mode${index}AssetX`, name: `Mode ${index} horizontal shift %`, type: "number", min: -100, max: 200, step: 1, defaultValue: 50, visibleWhen },
      { key: `mode${index}AssetY`, name: `Mode ${index} vertical shift %`, type: "number", min: -100, max: 200, step: 1, defaultValue: 50, visibleWhen },
    );
    properties.slice(start).forEach((property) => (property.group = `Mode ${index}`));
  }
  runtime.register({
    id: "multi-mode-button",
    name: "Multi-Mode Button",
    category: "Advanced Buttons",
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
      let mode = 0, serialName = "", selected = false;
      function modeCount() { return Math.max(2, Math.min(8, Number(values.modeCount) || 4)); }
      function showMode(next) {
        mode = Math.max(0, Math.min(modeCount() - 1, Math.round(Number(next) || 0)));
        label.textContent = serialName || values[`mode${mode}Text`] || `Mode ${mode}`;
        label.style.display = values[`mode${mode}ShowText`] === false || String(values[`mode${mode}ShowText`]).toLowerCase() === "false" ? "none" : "block";
        const color = values[`mode${mode}Color`] || "#087e6c",
          source = (selected && values[`mode${mode}SelectedAssetData`]) || values[`mode${mode}AssetData`] || "";
        button.style.setProperty("--multi-mode-color", color);
        button.style.setProperty("--text-color", values[`mode${mode}TextColor`] || "#ffffff");
        button.style.setProperty("--font-size-px", `${Math.max(8, Number(values[`mode${mode}FontSize`]) || 24)}px`);
        button.style.setProperty("--border-color", values[`mode${mode}BorderColor`] || "#ffffff");
        button.style.setProperty("--glow-color", values[`mode${mode}GlowColor`] || "#04aa8e");
        button.style.setProperty("--selected-color", values[`mode${mode}SelectedColor`] || "#04aa8e");
        button.style.setProperty("--corner-radius-px", `${Math.max(0, Number(values[`mode${mode}CornerRadius`]) || 0)}px`);
        button.style.setProperty("--glow-strength-px", `${Math.max(0, Number(values[`mode${mode}GlowStrength`]) || 0)}px`);
        button.style.borderColor = values[`mode${mode}BorderColor`] || "#ffffff";
        asset.style.backgroundImage = source ? `url("${String(source).replace(/"/g, "%22")}")` : "none";
        asset.style.backgroundSize = values[`mode${mode}AssetFit`] || "contain";
        asset.style.opacity = String(Math.max(0, Math.min(100, Number(values[`mode${mode}AssetOpacity`] ?? 100))) / 100);
        asset.style.width = `${Math.max(1, Math.min(200, Number(values[`mode${mode}AssetWidth`]) || 100))}%`;
        asset.style.height = `${Math.max(1, Math.min(200, Number(values[`mode${mode}AssetHeight`]) || 100))}%`;
        asset.style.left = `${Number(values[`mode${mode}AssetX`] ?? 50)}%`;
        asset.style.top = `${Number(values[`mode${mode}AssetY`] ?? 50)}%`;
        asset.style.inset = "auto";
        asset.style.transform = "translate(-50%,-50%)";
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
      context.signals.subscribe("selected", (value) => { selected = value === true || value === 1 || value === "1"; button.classList.toggle("active", selected); showMode(mode); });
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
