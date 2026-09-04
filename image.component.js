(function (runtime) {
  "use strict";
  runtime.register({
    id: "image",
    name: "Image",
    category: "Visual Only",
    defaultSize: { width: 300, height: 200 },
    signals: [
      { key: "source", name: "Image source / URL (serial)", type: "serial", direction: "input", defaultValue: "Image.Source" },
    ],
    properties: [
      { key: "asset", name: "Image asset", type: "asset", defaultValue: "" },
      {
        key: "fit",
        name: "Fit",
        type: "select",
        options: [
          { value: "contain", label: "Contain (show entire image)" },
          { value: "cover", label: "Cover (fill and crop)" },
          { value: "fill", label: "Stretch to fill" },
          { value: "none", label: "Actual size" },
        ],
        defaultValue: "contain",
      },
      { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "transparent" },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 200, defaultValue: 0 },
      { key: "opacity", name: "Opacity (%)", type: "number", min: 0, max: 100, defaultValue: 100 },
    ],
    template: '<div class="image-frame"><img class="image-picture" alt=""></div>',
    styles:
      '[data-component="image"]{display:block;width:100%;height:100%;box-sizing:border-box}' +
      '[data-component="image"] .image-frame{width:100%;height:100%;overflow:hidden;border-radius:var(--corner-radius-px);background:var(--background-color);opacity:var(--opacity-percent)}' +
      '[data-component="image"] .image-picture{display:block;width:100%;height:100%;object-fit:var(--fit);object-position:center}' +
      '[data-component="image"] .image-picture:not([src]),[data-component="image"] .image-picture[src=""]{visibility:hidden}',
    mount(root, context) {
      const picture = root.querySelector(".image-picture"),
        properties = context.options.properties || {};
      let assetSource = properties.assetData || "";
      function applySource(value) {
        const source = String(value || "").trim();
        picture.src = source;
      }
      applySource(assetSource);
      context.signals.subscribe("source", (value) => {
        // A runtime-supplied URL/asset only takes over once actually sent; an
        // empty/never-published signal must not blank out the authored asset.
        if (value == null || value === "") return;
        applySource(value);
      });
    },
  });
})(window.ComposerRuntime);
