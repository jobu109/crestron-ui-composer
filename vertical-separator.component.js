(function (runtime) {
  "use strict";
  runtime.register({
    id: "vertical-separator",
    name: "Vertical Separator",
    category: "Visual Only",
    defaultSize: { width: 24, height: 300 },
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
      '[data-component="vertical-separator"]{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box}' +
      '[data-component="vertical-separator"] .separator-line{height:var(--length-percent-percent);border-left-width:var(--thickness-px);border-left-style:var(--line-style);border-left-color:var(--color);opacity:var(--opacity-percent)}',
    mount() {},
  });
})(window.ComposerRuntime);
