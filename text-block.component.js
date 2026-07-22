(function (runtime) {
  "use strict";
  runtime.register({
    id: "text-block",
    name: "Text Block",
    category: "Text & Input",
    defaultSize: { width: 280, height: 90 },
    properties: [
      { key: "text", name: "Local / advanced text", type: "cip-text", defaultValue: "Text" },
      {
        key: "backgroundMode",
        name: "Background",
        type: "select",
        options: [
          { value: "transparent", label: "Transparent" },
          { value: "color", label: "Colored" },
        ],
        defaultValue: "transparent",
      },
      { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "#253436" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "selectedBackgroundColor", name: "Selected background color", type: "color", defaultValue: "#04aa8e" },
      { key: "selectedTextColor", name: "Selected text color", type: "color", defaultValue: "#ffffff" },
      { key: "fontSize", name: "Text size", type: "number", defaultValue: 24 },
      {
        key: "alignment",
        name: "Text alignment",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ],
        defaultValue: "center",
      },
      { key: "cornerRadius", name: "Corner radius", type: "number", defaultValue: 8 },
      { key: "padding", name: "Text padding", type: "number", defaultValue: 8 },
      { key: "pressEnabled", name: "Enable Press signal", type: "checkbox", defaultValue: false, signalSetting: true },
      { key: "selectedEnabled", name: "Enable Selected signal", type: "checkbox", defaultValue: false, signalSetting: true },
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "TextBlock.Press", optionalProperty: "pressEnabled" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "TextBlock.Selected", optionalProperty: "selectedEnabled" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "TextBlock.Name" },
    ],
    template: '<div class="text-block" role="text"><span class="text-block-label">Text</span></div>',
    styles:
      '[data-component="text-block"]{display:block;width:100%;height:100%}[data-component="text-block"] .text-block{display:flex;align-items:center;width:100%;height:100%;overflow:hidden;box-sizing:border-box;color:var(--text-color);font:700 var(--font-size-px) "Segoe UI",sans-serif;cursor:default;touch-action:none}[data-component="text-block"] .text-block-label{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:pre-wrap}[data-component="text-block"] .text-block.pressed{filter:brightness(1.15)}[data-component="text-block"] .text-block.active{color:var(--selected-text-color);background:var(--selected-background-color)}',
    mount(root, context) {
      const block = root.querySelector(".text-block"),
        label = root.querySelector(".text-block-label"),
        properties = context.options.properties || {},
        defaultText = String(properties.text || "Text");
      const tagPattern = /<cip([sda])>([\s\S]*?)<\/cip\1>/gi,
        tokens = [], values = [];
      let templateText = defaultText;
      templateText = templateText.replace(tagPattern, (match, kind, content) => {
        let address = String(content).trim(), format = "", trueText = "True", falseText = "False", fallback = "";
        if (kind.toLowerCase() === "d") {
          const question = address.indexOf("?"), colon = address.indexOf(":", question + 1);
          if (question >= 0) { trueText = address.slice(question + 1, colon >= 0 ? colon : undefined); falseText = colon >= 0 ? address.slice(colon + 1) : ""; address = address.slice(0, question); }
        } else if (kind.toLowerCase() === "a") {
          const question = address.indexOf("?");
          if (question >= 0) { format = address.slice(question + 1); address = address.slice(0, question); }
        } else {
          const colon = address.indexOf(":");
          if (colon >= 0) { fallback = address.slice(colon + 1); address = address.slice(0, colon); }
        }
        const index = tokens.length;
        tokens.push({ kind: kind.toLowerCase(), address: address.trim(), format: format.trim(), trueText, falseText, fallback });
        values.push(kind.toLowerCase() === "s" ? fallback : kind.toLowerCase() === "d" ? falseText : "0");
        return `\u0000${index}\u0000`;
      });
      function analogText(value, format) {
        const number = Number(value) || 0, spec = String(format || "%r");
        if (/%x/i.test(spec)) return Math.round(number).toString(16).toUpperCase().padStart(2, "0");
        if (/%t/i.test(spec)) { const seconds = Math.max(0, Math.round(number)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
        const percent = spec.match(/%(\d+(?:\.\d+)?)\.(\d+)p/i);
        if (percent) return `${((number / Math.max(1, Number(percent[1]))) * 100).toFixed(Number(percent[2]))}%`;
        const fixed = spec.match(/%(\d+)\.(\d+)f/i);
        if (fixed) return number.toFixed(Number(fixed[2])).padStart(Number(fixed[1]) + Number(fixed[2]) + 1, "0");
        const integer = spec.match(/%(\d+)?[du]/i);
        if (integer) return String(Math.round(number)).padStart(Number(integer[1]) || 0, "0");
        return String(Math.round(number));
      }
      function renderText() {
        label.textContent = templateText.replace(/\u0000(\d+)\u0000/g, (_, index) => values[Number(index)] ?? "");
      }
      tokens.forEach((token, index) => {
        const type = token.kind === "s" ? "serial" : token.kind === "d" ? "digital" : "analog";
        context.signals.subscribeExact(type, token.address, (value) => {
          values[index] = token.kind === "s"
            ? String(value == null || value === "" ? token.fallback : value)
            : token.kind === "d"
              ? (value === true || value === 1 || value === "1" ? token.trueText : token.falseText)
              : analogText(value, token.format);
          renderText();
        });
      });
      renderText();
      block.style.background = properties.backgroundMode === "color"
        ? properties.backgroundColor || "#253436"
        : "transparent";
      block.style.justifyContent = properties.alignment === "left"
        ? "flex-start"
        : properties.alignment === "right"
          ? "flex-end"
          : "center";
      block.style.textAlign = properties.alignment || "center";
      block.style.borderRadius = `${Math.max(0, Number(properties.cornerRadius) || 0)}px`;
      block.style.padding = `${Math.max(0, Number(properties.padding) || 0)}px`;
      function press(event) {
        block.classList.add("pressed");
        context.signals.publish("press", true);
        event.preventDefault();
      }
      function release() {
        block.classList.remove("pressed");
        context.signals.publish("press", false);
      }
      block.addEventListener("pointerdown", press);
      block.addEventListener("pointerup", release);
      block.addEventListener("pointerleave", release);
      block.addEventListener("pointercancel", release);
      context.signals.subscribe("selected", (value) =>
        block.classList.toggle("active", value === true || value === 1 || value === "1"),
      );
      context.signals.subscribe("name", (value) => {
        if (!tokens.length) label.textContent = String(value == null || value === "" ? defaultText : value);
      });
      return () => {
        block.removeEventListener("pointerdown", press);
        block.removeEventListener("pointerup", release);
        block.removeEventListener("pointerleave", release);
        block.removeEventListener("pointercancel", release);
      };
    },
  });
})(window.ComposerRuntime);
