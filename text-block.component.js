(function (runtime) {
  "use strict";
  runtime.register({
    id: "text-block",
    name: "Text Block",
    category: "Text",
    defaultSize: { width: 280, height: 90 },
    properties: [
      { key: "text", name: "Local text", type: "text", defaultValue: "Text" },
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
      label.textContent = defaultText;
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
        label.textContent = String(value == null || value === "" ? defaultText : value);
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
