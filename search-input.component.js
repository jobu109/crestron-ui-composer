(function (runtime) {
  "use strict";
  runtime.register({
    id: "search-input",
    name: "Search Input",
    category: "Text & Input",
    defaultSize: { width: 560, height: 96 },
    properties: [
      { key: "placeholder", name: "Placeholder text", type: "text", defaultValue: "Search..." },
      { key: "defaultText", name: "Default text", type: "text", defaultValue: "" },
      { key: "expansionDirection", name: "Search popup direction", type: "select", options: [{ value: "right", label: "Right" }, { value: "left", label: "Left" }], defaultValue: "right" },
      { key: "startOpen", name: "Start with search field open", type: "checkbox", defaultValue: false },
      { key: "autoHide", name: "Auto-hide search bar", type: "checkbox", defaultValue: true },
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
      { key: "feedback", name: "Name", type: "serial", direction: "input", defaultValue: "SearchInput.Label" },
    ],
    template: '<div class="search-root"><button class="search-submit" type="button" aria-label="Open search"><svg class="search-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button><label class="search-field"><input class="search-native" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" aria-label="Search"></label></div>',
    styles: '[data-component="search-input"]{display:block;width:100%;height:100%;padding:2%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="search-input"] *{box-sizing:border-box}[data-component="search-input"] .search-root{display:flex;width:100%;height:100%;align-items:stretch;justify-content:flex-start;gap:2%;overflow:visible}[data-component="search-input"] .search-root.expand-left{flex-direction:row-reverse}[data-component="search-input"] .search-field,[data-component="search-input"] .search-submit{min-width:0;border:var(--border-width-px) solid color-mix(in srgb,var(--border-color) calc(var(--border-opacity)*1%),transparent);box-shadow:inset 0 2px 7px rgba(255,255,255,.26),inset 0 -7px 12px rgba(0,0,0,.2),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 48%,transparent)}[data-component="search-input"] .search-field{display:flex;flex:0 0 0;width:0;overflow:hidden;border-width:0;border-radius:999px;padding:0;opacity:0;background:linear-gradient(145deg,rgba(255,255,255,.1),color-mix(in srgb,var(--field-color) calc(var(--field-opacity)*1%),#151a24));transition:flex-basis .3s ease,width .3s ease,opacity .18s ease,padding .3s ease,border-width .1s ease}[data-component="search-input"] .search-root.open .search-field{flex:1 1 auto;width:auto;border-width:var(--border-width-px);padding:0 5%;opacity:1}[data-component="search-input"] .search-native{width:100%;height:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--text-color);font:400 var(--text-size-px)/1 "Segoe UI",sans-serif;-webkit-appearance:none;appearance:none}[data-component="search-input"] .search-native::-webkit-search-cancel-button{display:none}[data-component="search-input"] .search-native::placeholder{color:var(--placeholder-color);opacity:.94}[data-component="search-input"] .search-submit{display:flex;align-items:center;justify-content:center;flex:0 0 auto;height:100%;aspect-ratio:1;border-radius:50%;padding:0;background:linear-gradient(145deg,rgba(255,255,255,.16),color-mix(in srgb,var(--button-color) calc(var(--field-opacity)*1%),#151a24));color:var(--icon-color);cursor:pointer;touch-action:manipulation}[data-component="search-input"] .search-submit:active{transform:scale(.94);filter:brightness(1.15)}[data-component="search-input"] .search-svg{display:block;width:var(--icon-size-px);height:var(--icon-size-px);overflow:visible;color:var(--icon-color);filter:drop-shadow(0 0 calc(var(--glow-strength-px)*.45) var(--glow-color))}',
    mount(root, context) {
      const input = root.querySelector(".search-native"), field = root.querySelector(".search-field"), button = root.querySelector(".search-submit"), icon = root.querySelector(".search-svg"), shell = root.querySelector(".search-root"), p = context.options.properties || {}, sendAsTyped = p.sendAsTyped === true || String(p.sendAsTyped).toLowerCase() === "true", autoHide = !(p.autoHide === false || String(p.autoHide).toLowerCase() === "false");
      function rgba(hex, opacity) { const value = String(hex || "#000000").replace("#", ""), n = parseInt(value, 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(100, Number(opacity) || 0)) / 100 + ")"; }
      const border = rgba(p.borderColor || "#ffffff", p.borderOpacity == null ? 34 : p.borderOpacity), fieldTint = rgba(p.fieldColor || "#04aa8e", p.fieldOpacity == null ? 14 : p.fieldOpacity), buttonTint = rgba(p.buttonColor || "#04aa8e", p.fieldOpacity == null ? 14 : p.fieldOpacity), glow = rgba(p.glowColor || "#04aa8e", 38), glassShadow = "inset 0 1px rgba(255,255,255,.38), inset 0 -18px 34px rgba(4,170,142,.1), 0 0 var(--glow-strength-px) " + glow + ", 0 6px 14px rgba(0,0,0,.24)";
      field.style.borderColor = border; field.style.background = "linear-gradient(145deg,rgba(255,255,255,.22),rgba(52,68,68,.24) 42%," + fieldTint + ")"; field.style.boxShadow = glassShadow;
      button.style.borderColor = border; button.style.background = "linear-gradient(145deg,rgba(255,255,255,.22),rgba(52,68,68,.24) 42%," + buttonTint + ")"; button.style.boxShadow = glassShadow;
      icon.style.cssText = "display:block;width:var(--icon-size-px);height:var(--icon-size-px);overflow:visible;color:var(--icon-color);filter:drop-shadow(0 0 calc(var(--glow-strength-px) * .45) var(--glow-color))";
      input.placeholder = p.placeholder || "Search...";
      input.value = p.defaultText || "";
      input.maxLength = Math.max(1, Number(p.maxLength || 128));
      function send() { context.signals.publish("text", input.value); }
      shell.classList.toggle("expand-left", p.expansionDirection === "left");
      shell.classList.toggle("open", p.startOpen === true || String(p.startOpen).toLowerCase() === "true");
      function press(event) {
        context.signals.publish("searchPress", true);
        if (!shell.classList.contains("open")) { shell.classList.add("open"); input.focus(); }
        else if (input.value) { send(); input.focus(); }
        else { shell.classList.remove("open"); input.blur(); }
        event.preventDefault(); event.stopPropagation();
      }
      function release() { context.signals.publish("searchPress", false); }
      function key(event) {
        if (event.key === "Enter") { send(); input.blur(); }
        else if (event.key === "Escape") { shell.classList.remove("open"); input.blur(); }
      }
      function changed() { if (sendAsTyped) send(); }
      function outside(event) {
        if (root.contains(event.target)) return;
        if (!autoHide) return;
        shell.classList.remove("open");
      }
      input.addEventListener("input", changed); input.addEventListener("change", send); input.addEventListener("keydown", key);
      button.addEventListener("pointerdown", press); button.addEventListener("pointerup", release); button.addEventListener("pointerleave", release); button.addEventListener("pointercancel", release);
      document.addEventListener("pointerdown", outside);
      context.signals.subscribe("feedback", value => { const next = value == null ? "" : String(value); if (document.activeElement !== input && input.value !== next) input.value = next; });
      return () => { input.removeEventListener("input", changed); input.removeEventListener("change", send); input.removeEventListener("keydown", key); button.removeEventListener("pointerdown", press); button.removeEventListener("pointerup", release); button.removeEventListener("pointerleave", release); button.removeEventListener("pointercancel", release); document.removeEventListener("pointerdown", outside); };
    },
  });
})(window.ComposerRuntime);
