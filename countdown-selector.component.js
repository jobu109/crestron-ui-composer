(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "countdown-selector",
    name: "Countdown Selector",
    category: "Lists & Selectors",
    defaultSize: { width: 360, height: 300 },
    signals: [
      {
        key: "value",
        name: "Selected value",
        type: "analog",
        direction: "output",
        defaultValue: "CountdownSelector.Value",
      },
      {
        key: "valueText",
        name: "Selected value text",
        type: "serial",
        direction: "output",
        defaultValue: "CountdownSelector.ValueText",
      },
      {
        key: "enabled",
        name: "Countdown enabled",
        type: "digital",
        direction: "output",
        defaultValue: "CountdownSelector.Enabled",
      },
      {
        key: "disabled",
        name: "Countdown disabled",
        type: "digital",
        direction: "output",
        defaultValue: "CountdownSelector.Disabled",
      },
    ],
    properties: [
      {
        key: "bindingMode",
        name: "Crestron binding mode",
        type: "select",
        options: [
          { value: "contract", label: "Contract names" },
          { value: "join", label: "Join numbers" },
        ],
        defaultValue: "contract",
        affectsBindings: true,
      },
      {
        key: "minValue",
        name: "Minimum value",
        type: "number",
        defaultValue: 5,
      },
      {
        key: "maxValue",
        name: "Maximum value",
        type: "number",
        defaultValue: 240,
      },
      { key: "stepValue", name: "Step value", type: "number", defaultValue: 5 },
      {
        key: "defaultValue",
        name: "Default value",
        type: "number",
        defaultValue: 60,
      },
      {
        key: "defaultEnabled",
        name: "Default enabled",
        type: "select",
        options: [
          { value: "no", label: "Disabled" },
          { value: "yes", label: "Enabled" },
        ],
        defaultValue: "no",
      },
      {
        key: "enabledText",
        name: "Enabled text",
        type: "text",
        defaultValue: "ENABLED",
      },
      {
        key: "disabledText",
        name: "Disabled text",
        type: "text",
        defaultValue: "DISABLED",
      },
      {
        key: "actionText",
        name: "Action text",
        type: "text",
        defaultValue: "ENABLE / DISABLE",
      },
      {
        key: "panelColor",
        name: "Panel color",
        type: "color",
        defaultValue: "#2a3636",
      },
      {
        key: "enabledColor",
        name: "Enabled color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "disabledColor",
        name: "Disabled color",
        type: "color",
        defaultValue: "#a03c3c",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "glowColor",
        name: "Glow color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "valueTextSize",
        name: "Value text size (px)",
        type: "number",
        defaultValue: 32,
      },
      {
        key: "stateTextSize",
        name: "State text size (px)",
        type: "number",
        defaultValue: 16,
      },
      {
        key: "actionTextSize",
        name: "Action text size (px)",
        type: "number",
        defaultValue: 11,
      },
    ],
    template:
      '<div class="cd-root"><div class="cd-panel"><button class="cd-enable"><span class="cd-state"></span><span class="cd-action"></span></button><div class="cd-window"><div class="cd-items"></div></div></div></div>',
    styles:
      '[data-component="countdown-selector"],[data-component="countdown-selector"] *{box-sizing:border-box}[data-component="countdown-selector"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif;color:var(--text-color)}.cd-root{width:100%;height:100%;padding:4%;overflow:hidden}.cd-panel{position:relative;width:100%;height:100%;min-width:180px;min-height:120px;border-radius:10px;background:linear-gradient(145deg,color-mix(in srgb,var(--panel-color) 90%,white),var(--panel-color) 52%,color-mix(in srgb,var(--enabled-color) 18%,transparent));border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 0 28px rgba(0,0,0,.36),0 0 14px color-mix(in srgb,var(--glow-color) 22%,transparent);overflow:hidden}.cd-enable{position:absolute;left:50%;top:12px;width:min(190px,54%);height:54px;transform:translateX(-50%);border:1px solid rgba(255,255,255,.48);border-radius:999px;background:linear-gradient(145deg,rgba(255,255,255,.14),color-mix(in srgb,var(--disabled-color) 48%,transparent)),color-mix(in srgb,var(--disabled-color) 82%,#222);box-shadow:0 0 12px color-mix(in srgb,var(--disabled-color) 42%,transparent);color:var(--text-color);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.cd-enable.enabled{background:linear-gradient(145deg,rgba(255,255,255,.16),color-mix(in srgb,var(--enabled-color) 56%,transparent)),color-mix(in srgb,var(--enabled-color) 80%,#043f36);box-shadow:0 0 14px color-mix(in srgb,var(--glow-color) 68%,transparent)}.cd-state{font-size:var(--state-text-size-px);font-weight:900}.cd-action{font-size:var(--action-text-size-px);font-weight:700;opacity:.78}.cd-window{position:absolute;left:0;right:0;top:78px;bottom:0;overflow:hidden;cursor:grab;mask-image:linear-gradient(90deg,transparent,white 16%,white 84%,transparent)}.cd-items{position:absolute;left:50%;top:50%;transform-style:preserve-3d}.cd-item{position:absolute;width:86px;height:54px;margin:-27px 0 0 -43px;display:flex;align-items:center;justify-content:center;color:color-mix(in srgb,var(--text-color) 38%,transparent);font-size:var(--value-text-size-px);transition:.18s}.cd-item.active{color:var(--text-color);font-weight:600;text-shadow:0 0 10px var(--text-color)}',
    mount(root, context) {
      const p = context.options.properties || {},
        windowEl = root.querySelector(".cd-window"),
        host = root.querySelector(".cd-items"),
        button = root.querySelector(".cd-enable"),
        state = root.querySelector(".cd-state"),
        action = root.querySelector(".cd-action"),
        min = Number(p.minValue) || 0,
        max = Math.max(min, Number(p.maxValue) || 240),
        step = Math.max(1, Number(p.stepValue) || 5),
        values = [];
      for (let v = min; v <= max; v += step) values.push(v);
      let index = Math.max(0, values.indexOf(Number(p.defaultValue))),
        enabled = p.defaultEnabled === "yes",
        start = 0,
        startIndex = 0,
        dragging = false;
      action.textContent = p.actionText || "ENABLE / DISABLE";
      function publish() {
        context.signals.publish("value", values[index]);
        context.signals.publish("valueText", String(values[index]));
      }
      function render() {
        const itemWidth = Math.max(
          44,
          host.querySelector(".cd-item")?.getBoundingClientRect().width || 86,
        );
        state.textContent = enabled
          ? p.enabledText || "ENABLED"
          : p.disabledText || "DISABLED";
        button.classList.toggle("enabled", enabled);
        host.querySelectorAll(".cd-item").forEach((el, i) => {
          const d = i - index;
          el.style.transform = `translateX(${d * itemWidth}px) translateZ(${-Math.min(Math.abs(d) * 14, 84)}px) rotateY(${d * 12}deg)`;
          el.style.opacity = String(Math.max(0.12, 1 - Math.abs(d) * 0.2));
          el.classList.toggle("active", i === index);
        });
      }
      function select(i, out) {
        index = Math.max(0, Math.min(values.length - 1, i));
        render();
        if (out) publish();
      }
      values.forEach((v, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "cd-item";
        el.textContent = v;
        el.onclick = () => select(i, true);
        host.appendChild(el);
      });
      button.addEventListener("pointerdown", (event) => {
        button.classList.add("pressed");
        button.style.transform = "translateX(-50%) scale(.96)";
        button.style.filter = "brightness(1.12)";
        enabled = !enabled;
        render();
        context.signals.publish("enabled", enabled);
        context.signals.publish("disabled", !enabled);
        button.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((name) =>
        button.addEventListener(name, () => {
          button.classList.remove("pressed");
          button.style.transform = "translateX(-50%)";
          button.style.filter = "";
        }),
      );
      windowEl.addEventListener(
        "wheel",
        (e) => {
          select(index + (e.deltaY > 0 ? 1 : -1), true);
          e.preventDefault();
        },
        { passive: false },
      );
      windowEl.addEventListener("pointerdown", (e) => {
        dragging = true;
        start = e.clientX;
        startIndex = index;
        windowEl.classList.add("dragging");
        windowEl.setPointerCapture && windowEl.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      windowEl.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const itemWidth = Math.max(
          44,
          host.querySelector(".cd-item")?.getBoundingClientRect().width || 86,
        );
        select(startIndex - Math.round((e.clientX - start) / itemWidth), false);
      });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        windowEl.classList.remove("dragging");
        publish();
      };
      ["pointerup", "pointerleave", "pointercancel"].forEach((name) =>
        windowEl.addEventListener(name, endDrag),
      );
      const observer = new ResizeObserver(render);
      observer.observe(root);
      render();
      publish();
      context.signals.publish("enabled", enabled);
      context.signals.publish("disabled", !enabled);
      return () => observer.disconnect();
    },
  });
})(window);
