(function (runtime) {
  "use strict";
  const defaults = "HELLO_WORLD|TSI GLOBAL|CRESTRON|COMPOSER|HTML5_ROCKS";
  runtime.register({
    id: "text-scramble",
    name: "Text Scramble",
    category: "Text & Input",
    defaultSize: { width: 420, height: 100 },
    properties: [
      {
        key: "defaultCount",
        name: "Default text entries",
        type: "select",
        options: Array.from({ length: 20 }, (_, index) => ({
          value: String(index + 1),
          label: String(index + 1),
        })),
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "textEntries",
        name: "Local text entries",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Text entry",
        defaultValue: defaults,
      },
      {
        key: "labelBase",
        name: "Serial text entry pattern",
        type: "text",
        defaultValue: "TextScramble.Items.{index}.Name",
        signalSetting: true,
      },
      {
        key: "triggerBase",
        name: "Digital text trigger pattern",
        type: "text",
        defaultValue: "TextScramble.Items.{index}.Selected",
        signalSetting: true,
      },
      {
        key: "signalIncrement",
        name: "Join increment",
        type: "number",
        min: 1,
        max: 100,
        step: 1,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "defaultSpeed",
        name: "Default animation speed",
        type: "number",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 50,
      },
      {
        key: "characters",
        name: "Scramble characters",
        type: "text",
        defaultValue: "ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789",
      },
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
      { key: "backgroundColor", name: "Background color", type: "color", defaultValue: "#0e1119" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#5eead4" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#5eead4" },
      { key: "fontSize", name: "Text size", type: "number", min: 8, max: 120, step: 1, defaultValue: 28 },
      { key: "letterSpacing", name: "Letter spacing", type: "number", min: 0, max: 30, step: 1, defaultValue: 2 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, step: 1, defaultValue: 8 },
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
      { key: "padding", name: "Text padding", type: "number", min: 0, max: 80, step: 1, defaultValue: 12 },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 80, step: 1, defaultValue: 8 },
    ],
    signals: [
      {
        key: "speed",
        name: "Animation speed",
        type: "analog",
        direction: "input",
        defaultValue: "TextScramble.Speed.Feedback",
      },
    ],
    rangeBindings: [
      {
        name: "Serial text entry range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "signalIncrement",
        countKey: "defaultCount",
      },
      {
        name: "Digital text trigger range",
        type: "digital",
        direction: "input",
        baseKey: "triggerBase",
        incrementKey: "signalIncrement",
        countKey: "defaultCount",
      },
    ],
    template: '<div class="ts-stage"><span class="ts-text"></span></div>',
    styles:
      '[data-component="text-scramble"]{display:block;width:100%;height:100%;box-sizing:border-box;font-family:Consolas,"Courier New",monospace}' +
      '[data-component="text-scramble"] *{box-sizing:border-box}' +
      '[data-component="text-scramble"] .ts-stage{display:flex;align-items:center;width:100%;height:100%;overflow:hidden;padding:var(--padding-px);border-radius:var(--corner-radius-px);background:transparent}' +
      '[data-component="text-scramble"] .ts-text{display:block;width:100%;overflow:hidden;color:var(--text-color);font-size:var(--font-size-px);font-weight:700;letter-spacing:var(--letter-spacing-px);line-height:1.15;text-overflow:clip;text-shadow:0 0 var(--glow-strength-px) var(--glow-color);white-space:nowrap}',
    mount(root, context) {
      const p = context.options.properties || {},
        stage = root.querySelector(".ts-stage"),
        output = root.querySelector(".ts-text"),
        count = Math.max(1, Math.min(20, Number(p.defaultCount) || 5)),
        entries = String(p.textEntries || defaults).split("|").slice(0, count),
        characters = String(p.characters || "ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789") || "_",
        address = (base, index) =>
          p.bindingMode === "join"
            ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1))
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index));
      while (entries.length < count) entries.push("");
      stage.style.background = p.backgroundMode === "color"
        ? p.backgroundColor || "#0e1119"
        : "transparent";
      stage.style.justifyContent =
        p.alignment === "left" ? "flex-start" : p.alignment === "right" ? "flex-end" : "center";
      output.style.textAlign = p.alignment || "center";
      let speed = Math.max(0, Math.min(100, Number(p.defaultSpeed) || 0)),
        index = 0,
        current = entries[0] || "",
        transitionTimer = 0,
        cycleTimer = 0,
        activeTrigger = null,
        triggerStates = Array(count).fill(false),
        disposed = false;
      output.textContent = current;
      const timing = () => ({
        frameDelay: Math.round(72 - speed * 0.52),
        frames: Math.round(36 - speed * 0.22),
        hold: Math.round(3500 - speed * 25),
      });
      function clearTimers() {
        clearInterval(transitionTimer);
        clearTimeout(cycleTimer);
        transitionTimer = 0;
        cycleTimer = 0;
      }
      function schedule() {
        clearTimeout(cycleTimer);
        if (!disposed && activeTrigger == null && count > 1)
          cycleTimer = setTimeout(next, timing().hold);
      }
      function scrambleTo(target) {
        clearInterval(transitionTimer);
        const length = Math.max(current.length, target.length),
          settings = timing();
        let frame = 0;
        transitionTimer = setInterval(() => {
          let text = "";
          for (let character = 0; character < length; character++)
            text +=
              character < target.length && (frame / settings.frames) * length > character
                ? target[character]
                : characters[Math.floor(Math.random() * characters.length)];
          output.textContent = text;
          frame++;
          if (frame > settings.frames) {
            clearInterval(transitionTimer);
            transitionTimer = 0;
            current = target;
            output.textContent = target;
            schedule();
          }
        }, settings.frameDelay);
      }
      function next() {
        index = (index + 1) % count;
        scrambleTo(entries[index] || "");
      }
      for (let entry = 0; entry < count; entry++)
        context.signals.subscribeAddress(
          "serial",
          address(p.labelBase, entry),
          (value) => {
            if (value == null || value === "") return;
            entries[entry] = String(value);
            if (entry === index && !transitionTimer) {
              current = entries[entry];
              output.textContent = current;
            }
          },
        );
      for (let entry = 0; entry < count; entry++)
        context.signals.subscribeAddress(
          "digital",
          address(p.triggerBase, entry),
          (value) => {
            const selected = value === true || value === 1 || value === "1" || value === "true";
            triggerStates[entry] = selected;
            if (selected) {
              activeTrigger = entry;
              index = entry;
              clearTimeout(cycleTimer);
              scrambleTo(entries[entry] || "");
              return;
            }
            if (activeTrigger !== entry) return;
            const remaining = triggerStates.findIndex(Boolean);
            activeTrigger = remaining >= 0 ? remaining : null;
            if (remaining >= 0) {
              index = remaining;
              scrambleTo(entries[remaining] || "");
            } else if (!transitionTimer) {
              schedule();
            }
          },
        );
      context.signals.subscribe("speed", (value) => {
        const number = Number(value) || 0;
        speed = Math.max(0, Math.min(100, number > 100 ? (number / 65535) * 100 : number));
        if (!transitionTimer) schedule();
      });
      schedule();
      return () => {
        disposed = true;
        clearTimers();
      };
    },
  });
})(window.ComposerRuntime);
