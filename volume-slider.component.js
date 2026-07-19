(function (runtime) {
  "use strict";
  runtime.register({
    id: "volume-slider",
    name: "Volume Slider",
    category: "Sliders & Levels",
    defaultSize: { width: 420, height: 130 },
    properties: [
      {
        key: "showPercent",
        name: "Show percentage",
        type: "select",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        defaultValue: "yes",
      },
      {
        key: "percentPosition",
        name: "Percentage position",
        type: "select",
        options: [
          { value: "right", label: "Right" },
          { value: "left", label: "Left" },
          { value: "above", label: "Above" },
          { value: "below", label: "Below" },
        ],
        defaultValue: "right",
      },
      {
        key: "defaultPercent",
        name: "Default percentage",
        type: "number",
        defaultValue: 50,
      },
    ],
    signals: [
      {
        key: "set",
        name: "Set Level",
        type: "analog",
        direction: "output",
        defaultValue: "12",
      },
      {
        key: "feedback",
        name: "Level Feedback",
        type: "analog",
        direction: "input",
        defaultValue: "13",
      },
    ],
    template:
      '<div class="slider"><div class="track"><div class="fill"></div><div class="knob"></div></div><output>0%</output></div>',
    styles:
      '[data-component="volume-slider"]{display:block;width:100%;height:100%;padding:18px 30px;box-sizing:border-box;touch-action:none}' +
      '[data-component="volume-slider"] .slider{display:flex;align-items:center;width:100%;height:100%;gap:20px}' +
      '[data-component="volume-slider"] .track{position:relative;flex:1;height:34px;border-radius:999px;background:linear-gradient(to right,#4caf50 0 50%,#ffeb3b 60% 75%,#f44336 85%);box-shadow:inset -1px 2px 2px #000,0 0 12px rgba(4,170,142,.55);cursor:pointer}' +
      '[data-component="volume-slider"] .fill{position:absolute;top:0;right:0;bottom:0;width:100%;border-radius:999px;background:#2a2a2a;pointer-events:none}' +
      '[data-component="volume-slider"] .knob{position:absolute;top:50%;left:0;width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 0 9px rgba(4,170,142,.9);transform:translate(-50%,-50%);pointer-events:none}' +
      '[data-component="volume-slider"] output{min-width:82px;color:#fff;font:700 28px Segoe UI;text-align:right;text-shadow:0 0 8px #04aa8e}' +
      '[data-component="volume-slider"][data-percent-position="left"] .slider{flex-direction:row-reverse}' +
      '[data-component="volume-slider"][data-percent-position="left"] output{text-align:left}' +
      '[data-component="volume-slider"][data-percent-position="above"] .slider{flex-direction:column-reverse;justify-content:center;gap:22px}' +
      '[data-component="volume-slider"][data-percent-position="below"] .slider{flex-direction:column;justify-content:center;gap:22px}' +
      '[data-component="volume-slider"][data-percent-position="above"] .track,[data-component="volume-slider"][data-percent-position="below"] .track{width:100%;height:34px;flex:0 0 34px}' +
      '[data-component="volume-slider"][data-percent-position="above"] output,[data-component="volume-slider"][data-percent-position="below"] output{width:100%;min-width:0;text-align:center;line-height:1}',
    mount(root, context) {
      const track = root.querySelector(".track"),
        fill = root.querySelector(".fill"),
        knob = root.querySelector(".knob"),
        output = root.querySelector("output"),
        properties = context.options.properties || {};
      let dragging = false;
      root.dataset.percentPosition = properties.percentPosition || "right";
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function update(value) {
        const analog = clamp(Number(value) || 0, 0, 65535),
          percent = Math.round((analog / 65535) * 100);
        fill.style.width = 100 - percent + "%";
        knob.style.left = percent + "%";
        output.textContent = percent + "%";
      }
      function publish(clientX) {
        const rect = track.getBoundingClientRect(),
          ratio = clamp((clientX - rect.left) / rect.width, 0, 1),
          value = Math.round(ratio * 65535);
        update(value);
        context.signals.publish("set", value);
      }
      function down(event) {
        dragging = true;
        if (track.setPointerCapture) track.setPointerCapture(event.pointerId);
        publish(event.clientX);
        event.preventDefault();
      }
      function move(event) {
        if (dragging) publish(event.clientX);
      }
      function up() {
        dragging = false;
      }
      track.addEventListener("pointerdown", down);
      track.addEventListener("pointermove", move);
      track.addEventListener("pointerup", up);
      track.addEventListener("pointercancel", up);
      output.style.display = properties.showPercent === "no" ? "none" : "block";
      update((clamp(Number(properties.defaultPercent) || 0, 0, 100) / 100) * 65535);
      context.signals.subscribe("feedback", update);
      return () => {
        track.removeEventListener("pointerdown", down);
        track.removeEventListener("pointermove", move);
        track.removeEventListener("pointerup", up);
        track.removeEventListener("pointercancel", up);
      };
    },
  });
})(window.ComposerRuntime);
