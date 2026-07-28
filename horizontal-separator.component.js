(function (runtime) {
  "use strict";
  runtime.register({
    id: "horizontal-separator",
    name: "Horizontal Separator",
    category: "Visual Only",
    defaultSize: { width: 300, height: 24 },
    signals: [],
    properties: [
      { key: "color", name: "Line color", type: "color", defaultValue: "#3a4152" },
      { key: "thickness", name: "Thickness (px)", type: "number", min: 1, max: 20, defaultValue: 2 },
      {
        key: "lineStyle",
        name: "Line style",
        type: "select",
        options: [
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
        ],
        defaultValue: "solid",
      },
      { key: "lengthPercent", name: "Length (%)", type: "number", min: 5, max: 100, defaultValue: 100 },
      { key: "opacity", name: "Opacity (%)", type: "number", min: 0, max: 100, defaultValue: 100 },
    ],
    template: '<div class="separator-line"></div>',
    styles:
      '[data-component="horizontal-separator"]{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box}' +
      '[data-component="horizontal-separator"] .separator-line{width:var(--length-percent-percent);border-top-width:var(--thickness-px);border-top-style:var(--line-style);border-top-color:var(--color);opacity:var(--opacity-percent)}',
    mount() {},
  });
})(window.ComposerRuntime);
