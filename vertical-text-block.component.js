(function (runtime) {
  "use strict";
  runtime.register({
    id: "vertical-text-block",
    name: "Vertical Text Block",
    category: "Text & Input",
    defaultSize: { width: 90, height: 280 },
    properties: [
      { key: "text", name: "Local / advanced text", type: "cip-text", defaultValue: "Text" },
      { key: "selectedText", name: "Selected local / advanced text", type: "cip-text", defaultValue: "" },
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
        name: "Vertical alignment",
        type: "select",
        options: [
          { value: "top", label: "Top" },
          { value: "center", label: "Center" },
          { value: "bottom", label: "Bottom" },
        ],
        defaultValue: "center",
      },
      { key: "cornerRadius", name: "Corner radius", type: "number", defaultValue: 8 },
      { key: "padding", name: "Text padding", type: "number", defaultValue: 8 },
      { key: "pressEnabled", name: "Enable Press signal", type: "checkbox", defaultValue: false, signalSetting: true },
      { key: "selectedEnabled", name: "Enable Selected signal", type: "checkbox", defaultValue: false, signalSetting: true },
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "VerticalTextBlock.Press", optionalProperty: "pressEnabled" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "VerticalTextBlock.Selected", optionalProperty: "selectedEnabled" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "VerticalTextBlock.Name" },
    ],
    template: '<div class="text-block-vertical" role="text"><div class="text-block-vertical-label"></div></div>',
    styles:
      '[data-component="vertical-text-block"]{display:block;width:100%;height:100%}[data-component="vertical-text-block"] .text-block-vertical{display:flex;flex-direction:column;align-items:center;width:100%;height:100%;overflow:hidden;box-sizing:border-box;color:var(--text-color);font:700 var(--font-size-px) "Segoe UI",sans-serif;cursor:default;touch-action:none}[data-component="vertical-text-block"] .text-block-vertical-label{display:flex;flex-direction:column;align-items:center;width:100%;overflow:hidden}[data-component="vertical-text-block"] .text-block-vertical-char{display:block;width:100%;flex:0 0 auto;line-height:1.15;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:pre}[data-component="vertical-text-block"] .text-block-vertical.pressed{filter:brightness(1.15)}[data-component="vertical-text-block"] .text-block-vertical.active{color:var(--selected-text-color);background:var(--selected-background-color)}',
    mount(root, context) {
      const block = root.querySelector(".text-block-vertical"),
        label = root.querySelector(".text-block-vertical-label"),
        properties = context.options.properties || {},
        defaultText = String(properties.text || "Text"),
        selectedText = String(properties.selectedText || ""),
        selected = false;
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
        return "\u0000" + index + "\u0000";
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
      function renderChars(text) {
        label.textContent = "";
        const fragment = document.createDocumentFragment();
        Array.from(String(text)).forEach((character) => {
          const span = document.createElement("span");
          span.className = "text-block-vertical-char";
          span.textContent = character;
          fragment.appendChild(span);
        });
        label.appendChild(fragment);
      }
      function renderText() {
        const rendered = templateText.replace(/\u0000(\d+)\u0000/g, (_, index) => values[Number(index)] ?? "");
        renderChars(selected && selectedText ? selectedText : rendered);
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
      block.style.justifyContent = properties.alignment === "top"
        ? "flex-start"
        : properties.alignment === "bottom"
          ? "flex-end"
          : "center";
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
      context.signals.subscribe("selected", (value) => {
        selected = value === true || value === 1 || value === "1";
        block.classList.toggle("active", selected);
        renderText();
      });
      context.signals.subscribe("name", (value) => {
        if (!tokens.length) renderChars(value == null || value === "" ? defaultText : value);
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
