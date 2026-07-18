(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "glass-block",
    name: "Glass Block",
    category: "Status & Information",
    defaultSize: { width: 220, height: 140 },
    signals: [
      { key: "text", name: "Text", type: "serial", direction: "input", defaultValue: "GlassBlock.Text" },
      { key: "visible", name: "Visible feedback", type: "digital", direction: "input", defaultValue: "GlassBlock.Visible" }
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "localText", name: "Local text", type: "text", defaultValue: "" },
      { key: "glassColor", name: "Glass tint", type: "color", defaultValue: "#344444" },
      { key: "accentColor", name: "Accent tint", type: "color", defaultValue: "#04aa8e" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#ffffff" },
      { key: "highlightColor", name: "Highlight color", type: "color", defaultValue: "#ffffff" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glassOpacity", name: "Glass opacity (%)", type: "number", defaultValue: 100 },
      { key: "blurAmount", name: "Backdrop blur (px)", type: "number", defaultValue: 14 },
      { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 14 },
      { key: "cornerRadius", name: "Corner radius (px)", type: "number", defaultValue: 10 },
      { key: "textSize", name: "Text size (px)", type: "number", defaultValue: 24 },
      { key: "textWeight", name: "Text weight", type: "select", options: [{ value: "400", label: "Regular" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }, { value: "900", label: "Black" }], defaultValue: "700" }
    ],
    template: '<div class="gb-root"><div class="gb-panel"><span class="gb-text"></span></div></div>',
    styles: '[data-component="glass-block"],[data-component="glass-block"] *{box-sizing:border-box}[data-component="glass-block"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.gb-root{width:100%;height:100%;display:block;padding:4px;overflow:hidden}.gb-panel{position:relative;width:100%;height:100%;overflow:hidden;border:1px solid color-mix(in srgb,var(--border-color) 36%,transparent);border-radius:var(--corner-radius-px);background:linear-gradient(145deg,color-mix(in srgb,var(--highlight-color) 24%,transparent),color-mix(in srgb,var(--glass-color) 26%,transparent) 42%,color-mix(in srgb,var(--accent-color) 16%,transparent));box-shadow:inset 0 1px color-mix(in srgb,var(--highlight-color) 42%,transparent),inset 0 -24px 42px color-mix(in srgb,var(--accent-color) 10%,transparent),0 0 calc(var(--glow-strength)*1px) color-mix(in srgb,var(--glow-color) 45%,transparent),0 8px 18px rgba(0,0,0,.3);backdrop-filter:blur(var(--blur-amount-px)) saturate(135%);opacity:calc(var(--glass-opacity)/100);display:flex;align-items:center;justify-content:center}.gb-panel::before{content:"";position:absolute;inset:1px;border-radius:calc(var(--corner-radius-px) - 1px);background:linear-gradient(120deg,color-mix(in srgb,var(--highlight-color) 22%,transparent),color-mix(in srgb,var(--highlight-color) 6%,transparent) 34%,transparent 58%);pointer-events:none}.gb-panel::after{content:"";position:absolute;left:8%;right:8%;top:8%;height:22%;border-radius:999px;background:color-mix(in srgb,var(--highlight-color) 12%,transparent);filter:blur(18px);pointer-events:none}.gb-text{position:relative;z-index:2;max-width:90%;max-height:90%;overflow:hidden;color:var(--text-color);font-size:var(--text-size-px);font-weight:var(--text-weight);line-height:1.1;text-align:center;text-shadow:0 2px 5px rgba(0,0,0,.65),0 0 10px color-mix(in srgb,var(--glow-color) 35%,transparent);white-space:pre-wrap}.gb-root.hidden{opacity:0;pointer-events:none}',
    mount(root, context) {
      const p = context.options.properties || {}, text = root.querySelector(".gb-text"), host = root.querySelector(".gb-root");
      root.style.setProperty("--text-weight", p.textWeight || "700");
      text.textContent = p.localText || "";
      context.signals.subscribe("text", value => { text.textContent = value == null || value === "" ? (p.localText || "") : String(value); });
      context.signals.subscribe("visible", value => host.classList.toggle("hidden", !(value === true || value === 1 || value === "1")));
    }
  });
})(window);
