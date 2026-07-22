(function (runtime) {
  "use strict";
  runtime.register({
    id: "search-input",
    name: "Search Input",
    category: "Text",
    defaultSize: { width: 560, height: 96 },
    properties: [
      { key: "placeholder", name: "Placeholder text", type: "text", defaultValue: "Search..." },
      { key: "defaultText", name: "Default text", type: "text", defaultValue: "" },
      { key: "fieldColor", name: "Field background color", type: "color", defaultValue: "#04aa8e" },
      { key: "buttonColor", name: "Search button color", type: "color", defaultValue: "#04aa8e" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#ffffff" },
      { key: "borderOpacity", name: "Border opacity", type: "number", min: 0, max: 100, step: 1, defaultValue: 34 },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "placeholderColor", name: "Placeholder color", type: "color", defaultValue: "#f5f7fa" },
      { key: "iconColor", name: "Search icon color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "textSize", name: "Text size", type: "number", min: 10, max: 60, step: 1, defaultValue: 30 },
      { key: "iconSize", name: "Search icon size", type: "number", min: 12, max: 70, step: 1, defaultValue: 38 },
      { key: "borderWidth", name: "Border width", type: "number", min: 0, max: 10, step: 1, defaultValue: 2 },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 60, step: 1, defaultValue: 12 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, step: 1, defaultValue: 10 },
      { key: "fieldOpacity", name: "Field opacity", type: "number", min: 0, max: 100, step: 1, defaultValue: 14 },
      { key: "maxLength", name: "Maximum characters", type: "number", min: 1, max: 512, step: 1, defaultValue: 128 },
      { key: "sendAsTyped", name: "Send text while typing", type: "checkbox", defaultValue: true },
    ],
    signals: [
      { key: "text", name: "Text", type: "serial", direction: "output", defaultValue: "SearchInput.Text" },
      { key: "searchPress", name: "Search Press", type: "digital", direction: "output", defaultValue: "SearchInput.Press" },
      { key: "feedback", name: "Name", type: "serial", direction: "input", defaultValue: "SearchInput.Name" },
    ],
    template: '<div class="search-root"><label class="search-field"><input class="search-native" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" aria-label="Search"></label><button class="search-submit" type="button" aria-label="Submit search"><svg class="search-svg" viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="20" r="12.5" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M29.2 29.2L40 40" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg></button></div>',
    styles: '[data-component="search-input"]{display:block;width:100%;height:100%;padding:2%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="search-input"] *{box-sizing:border-box}[data-component="search-input"] .search-root{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3%;width:100%;height:100%;align-items:stretch}[data-component="search-input"] .search-field,[data-component="search-input"] .search-submit{min-width:0;border:var(--border-width-px) solid var(--border-color);background:color-mix(in srgb,var(--field-color) calc(var(--field-opacity) * 1%),transparent);box-shadow:inset 0 2px 7px rgba(255,255,255,.42),inset 0 -7px 12px rgba(0,0,0,.18),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 55%,transparent)}[data-component="search-input"] .search-field{display:flex;overflow:hidden;border-radius:var(--corner-radius-px);padding:0 6%}[data-component="search-input"] .search-native{width:100%;height:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--text-color);font:400 var(--text-size-px)/1 "Segoe UI",sans-serif;-webkit-appearance:none;appearance:none}[data-component="search-input"] .search-native::-webkit-search-cancel-button{display:none}[data-component="search-input"] .search-native::placeholder{color:var(--placeholder-color);opacity:.94}[data-component="search-input"] .search-field:focus-within{box-shadow:inset 0 2px 7px rgba(255,255,255,.5),inset 0 -7px 12px rgba(0,0,0,.18),0 0 calc(var(--glow-strength-px) * 1.6) var(--glow-color)}[data-component="search-input"] .search-submit{display:flex;align-items:center;justify-content:center;width:auto;height:100%;aspect-ratio:1;border-radius:50%;padding:0;background:color-mix(in srgb,var(--button-color) calc(var(--field-opacity) * 1%),transparent);cursor:pointer;touch-action:manipulation}[data-component="search-input"] .search-submit:active{transform:scale(.94);filter:brightness(1.15)}[data-component="search-input"] .search-icon{position:relative;display:block;width:calc(var(--icon-size-px) * .62);height:calc(var(--icon-size-px) * .62);border:calc(var(--icon-size-px) * .075) solid var(--icon-color);border-radius:50%;filter:drop-shadow(0 0 calc(var(--glow-strength-px) * .45) var(--glow-color))}[data-component="search-input"] .search-icon:after{content:"";position:absolute;left:76%;top:77%;width:58%;height:calc(var(--icon-size-px) * .075);border-radius:999px;background:var(--icon-color);transform:rotate(-47deg);transform-origin:left center}',
    mount(root, context) {
      const input = root.querySelector(".search-native"), field = root.querySelector(".search-field"), button = root.querySelector(".search-submit"), icon = root.querySelector(".search-svg"), p = context.options.properties || {}, sendAsTyped = p.sendAsTyped === true || String(p.sendAsTyped).toLowerCase() === "true";
      function rgba(hex, opacity) { const value = String(hex || "#000000").replace("#", ""), n = parseInt(value, 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(100, Number(opacity) || 0)) / 100 + ")"; }
      const border = rgba(p.borderColor || "#ffffff", p.borderOpacity == null ? 34 : p.borderOpacity), fieldTint = rgba(p.fieldColor || "#04aa8e", p.fieldOpacity == null ? 14 : p.fieldOpacity), buttonTint = rgba(p.buttonColor || "#04aa8e", p.fieldOpacity == null ? 14 : p.fieldOpacity), glow = rgba(p.glowColor || "#04aa8e", 38), glassShadow = "inset 0 1px rgba(255,255,255,.38), inset 0 -18px 34px rgba(4,170,142,.1), 0 0 var(--glow-strength-px) " + glow + ", 0 6px 14px rgba(0,0,0,.24)";
      field.style.borderColor = border; field.style.background = "linear-gradient(145deg,rgba(255,255,255,.22),rgba(52,68,68,.24) 42%," + fieldTint + ")"; field.style.boxShadow = glassShadow;
      button.style.borderColor = border; button.style.background = "linear-gradient(145deg,rgba(255,255,255,.22),rgba(52,68,68,.24) 42%," + buttonTint + ")"; button.style.boxShadow = glassShadow;
      icon.style.cssText = "display:block;width:var(--icon-size-px);height:var(--icon-size-px);overflow:visible;color:var(--icon-color);filter:drop-shadow(0 0 calc(var(--glow-strength-px) * .45) var(--glow-color))";
      input.placeholder = p.placeholder || "Search...";
      input.value = p.defaultText || "";
      input.maxLength = Math.max(1, Number(p.maxLength || 128));
      function send() { context.signals.publish("text", input.value); }
      function press(event) { context.signals.publish("searchPress", true); send(); input.focus(); event.preventDefault(); }
      function release() { context.signals.publish("searchPress", false); }
      function key(event) { if (event.key === "Enter") { send(); input.blur(); } }
      function changed() { if (sendAsTyped) send(); }
      input.addEventListener("input", changed); input.addEventListener("change", send); input.addEventListener("keydown", key);
      button.addEventListener("pointerdown", press); button.addEventListener("pointerup", release); button.addEventListener("pointerleave", release); button.addEventListener("pointercancel", release);
      context.signals.subscribe("feedback", value => { const next = value == null ? "" : String(value); if (document.activeElement !== input && input.value !== next) input.value = next; });
      return () => { input.removeEventListener("input", changed); input.removeEventListener("change", send); input.removeEventListener("keydown", key); button.removeEventListener("pointerdown", press); button.removeEventListener("pointerup", release); button.removeEventListener("pointerleave", release); button.removeEventListener("pointercancel", release); };
    },
  });
})(window.ComposerRuntime);
