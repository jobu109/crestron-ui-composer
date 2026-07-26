(function (runtime) {
  "use strict";
  const mode = {
    key: "bindingMode",
    name: "Crestron binding mode",
    type: "select",
    options: [
      { value: "contract", label: "Contract names" },
      { value: "join", label: "Join numbers" },
    ],
    defaultValue: "contract",
    affectsBindings: true,
  };
  const colors = [
    {
      key: "surfaceColor",
      name: "Surface color",
      type: "color",
      defaultValue: "#2c3038",
    },
    {
      key: "shadowColor",
      name: "Shadow color",
      type: "color",
      defaultValue: "#171a20",
    },
    {
      key: "highlightColor",
      name: "Highlight color",
      type: "color",
      defaultValue: "#444b57",
    },
    {
      key: "accentColor",
      name: "Active / gauge color",
      type: "color",
      defaultValue: "#35e0c0",
    },
    {
      key: "textColor",
      name: "Text color",
      type: "color",
      defaultValue: "#d8dde6",
    },
    {
      key: "glowStrength",
      name: "Glow strength",
      type: "number",
      min: 0,
      max: 30,
      defaultValue: 8,
    },
  ];
  const commonStyles =
    '[data-component]{--surface:#2c3038;--shadow:#171a20;--highlight:#444b57;--accent:#35e0c0;--txt:#d8dde6;--glow:8px;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component] *{box-sizing:border-box}';
  function apply(root, p) {
    root.style.setProperty("--surface", p.surfaceColor || "#2c3038");
    root.style.setProperty("--shadow", p.shadowColor || "#171a20");
    root.style.setProperty("--highlight", p.highlightColor || "#444b57");
    root.style.setProperty("--accent", p.accentColor || "#35e0c0");
    root.style.setProperty("--txt", p.textColor || "#d8dde6");
    root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`);
  }
  function press(button, publish) {
    const down = (e) => {
        button.classList.add("pressed");
        publish(true);
        e.preventDefault();
      },
      up = () => {
        button.classList.remove("pressed");
        publish(false);
      };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  }
  runtime.register({
    id: "neumorphic-pill-toggle",
    name: "Neumorphic Pill Toggle",
    category: "Toggle Buttons",
    defaultSize: { width: 250, height: 100 },
    properties: [
      mode,
      {
        key: "localName",
        name: "Local name",
        type: "text",
        defaultValue: "Power",
      },
      { key: "onText", name: "On text", type: "text", defaultValue: "ON" },
      { key: "offText", name: "Off text", type: "text", defaultValue: "OFF" },
      { key: "textSize", name: "Text size", type: "number", defaultValue: 16 },
      {
        key: "iconSize",
        name: "Icon size",
        type: "number",
        min: 8,
        max: 60,
        defaultValue: 27,
      },
      ...colors,
    ],
    signals: [
      {
        key: "press",
        name: "Press",
        type: "digital",
        direction: "output",
        defaultValue: "PillToggle.Press",
      },
      {
        key: "selected",
        name: "Selected",
        type: "digital",
        direction: "input",
        defaultValue: "PillToggle.Selected",
      },
      {
        key: "name",
        name: "Name",
        type: "serial",
        direction: "input",
        defaultValue: "PillToggle.Name",
      },
    ],
    template:
      '<button class="n-pill" type="button"><span class="n-pill-on">ON</span><span class="n-pill-off">OFF</span><span class="n-pill-thumb"><i class="right"></i><i class="right"></i><i class="right"></i></span></button>',
    styles:
      commonStyles +
      '[data-component="neumorphic-pill-toggle"]{display:block;width:100%;height:100%;padding:12px}[data-component="neumorphic-pill-toggle"] .n-pill{position:relative;width:100%;height:100%;overflow:hidden;border:0;border-radius:999px;background:var(--surface);box-shadow:inset 6px 6px 12px var(--shadow),inset -6px -6px 12px var(--highlight);color:var(--txt);cursor:pointer;font-weight:800}[data-component="neumorphic-pill-toggle"] .n-pill:before{content:"";position:absolute;inset:0;background:var(--accent);opacity:0;transition:.22s;filter:drop-shadow(0 0 var(--glow) var(--accent))}[data-component="neumorphic-pill-toggle"] .n-pill.active:before{opacity:.72}[data-component="neumorphic-pill-toggle"] .n-pill-thumb{position:absolute;z-index:2;left:7px;top:7px;width:46%;height:calc(100% - 14px);display:flex;flex-direction:row;align-items:center;justify-content:center;border-radius:999px;background:var(--surface);box-shadow:4px 4px 8px var(--shadow),-3px -3px 7px var(--highlight);transition:left .22s;color:var(--txt)}[data-component="neumorphic-pill-toggle"] .n-pill-thumb i{display:block;width:calc(var(--icon-size-px) * .3);height:calc(var(--icon-size-px) * .3);border-right:calc(var(--icon-size-px) * .12) solid currentColor;border-bottom:calc(var(--icon-size-px) * .12) solid currentColor;margin:0 calc(var(--icon-size-px) * .12)}[data-component="neumorphic-pill-toggle"] .n-pill-thumb i.right{transform:rotate(-45deg)}[data-component="neumorphic-pill-toggle"] .n-pill-thumb i.left{transform:rotate(135deg)}[data-component="neumorphic-pill-toggle"] .active .n-pill-thumb{left:calc(54% - 7px)}[data-component="neumorphic-pill-toggle"] .n-pill-on,[data-component="neumorphic-pill-toggle"] .n-pill-off{position:absolute;z-index:1;top:50%;transform:translateY(-50%);font-size:var(--text-size-px)}[data-component="neumorphic-pill-toggle"] .n-pill-on{left:13%;opacity:0}[data-component="neumorphic-pill-toggle"] .active .n-pill-on{opacity:1}[data-component="neumorphic-pill-toggle"] .n-pill-off{right:13%}[data-component="neumorphic-pill-toggle"] .active .n-pill-off{opacity:0}',
    mount(root, context) {
      const p = context.options.properties || {},
        button = root.querySelector("button"),
        on = root.querySelector(".n-pill-on"),
        off = root.querySelector(".n-pill-off"),
        thumb = root.querySelector(".n-pill-thumb"),
        truthy = (value, fallback) =>
          value == null
            ? fallback
            : value === true ||
              value === 1 ||
              value === "1" ||
              String(value).toLowerCase() === "true";
      root.style.setProperty("--surface", p.surfaceColor || "#2c3038");
      root.style.setProperty("--shadow", p.shadowColor || "#171a20");
      root.style.setProperty("--highlight", p.highlightColor || "#444b57");
      root.style.setProperty("--accent", p.accentColor || "#35e0c0");
      root.style.setProperty("--txt", p.textColor || "#d8dde6");
      root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`);
      on.textContent = p.onText ?? "ON";
      off.textContent = p.offText ?? "OFF";
      const down = (event) => {
          button.classList.add("pressed");
          context.signals.publish("press", true);
          event.preventDefault();
        },
        up = () => {
          button.classList.remove("pressed");
          context.signals.publish("press", false);
        };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointerleave", up);
      button.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", (value) => {
        const active = truthy(value, false);
        button.classList.toggle("active", active);
        thumb.innerHTML = active
          ? '<i class="left"></i><i class="left"></i><i class="left"></i>'
          : '<i class="right"></i><i class="right"></i><i class="right"></i>';
      });
      context.signals.subscribe("name", (value) =>
        button.setAttribute(
          "aria-label",
          value == null ? (p.localName ?? "Power") : String(value),
        ),
      );
    },
  });
  runtime.register({
    id: "neumorphic-pill-toggle-vertical",
    name: "Vertical Neumorphic Pill Toggle",
    category: "Toggle Buttons",
    defaultSize: { width: 100, height: 250 },
    properties: [
      mode,
      {
        key: "localName",
        name: "Local name",
        type: "text",
        defaultValue: "Power",
      },
      { key: "onText", name: "On text", type: "text", defaultValue: "ON" },
      { key: "offText", name: "Off text", type: "text", defaultValue: "OFF" },
      { key: "textSize", name: "Text size", type: "number", defaultValue: 16 },
      {
        key: "iconSize",
        name: "Icon size",
        type: "number",
        min: 8,
        max: 60,
        defaultValue: 27,
      },
      ...colors,
    ],
    signals: [
      {
        key: "press",
        name: "Press",
        type: "digital",
        direction: "output",
        defaultValue: "PillToggleVertical.Press",
      },
      {
        key: "selected",
        name: "Selected",
        type: "digital",
        direction: "input",
        defaultValue: "PillToggleVertical.Selected",
      },
      {
        key: "name",
        name: "Name",
        type: "serial",
        direction: "input",
        defaultValue: "PillToggleVertical.Name",
      },
    ],
    template:
      '<button class="n-pill" type="button"><span class="n-pill-on">ON</span><span class="n-pill-off">OFF</span><span class="n-pill-thumb"><i class="down"></i><i class="down"></i><i class="down"></i></span></button>',
    styles:
      commonStyles +
      '[data-component="neumorphic-pill-toggle-vertical"]{display:block;width:100%;height:100%;padding:12px}[data-component="neumorphic-pill-toggle-vertical"] .n-pill{position:relative;width:100%;height:100%;overflow:hidden;border:0;border-radius:999px;background:var(--surface);box-shadow:inset 6px 6px 12px var(--shadow),inset -6px -6px 12px var(--highlight);color:var(--txt);cursor:pointer;font-weight:800}[data-component="neumorphic-pill-toggle-vertical"] .n-pill:before{content:"";position:absolute;inset:0;background:var(--accent);opacity:0;transition:.22s;filter:drop-shadow(0 0 var(--glow) var(--accent))}[data-component="neumorphic-pill-toggle-vertical"] .n-pill.active:before{opacity:.72}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-thumb{position:absolute;z-index:2;left:7px;top:7px;width:calc(100% - 14px);height:46%;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:999px;background:var(--surface);box-shadow:4px 4px 8px var(--shadow),-3px -3px 7px var(--highlight);transition:top .22s;color:var(--txt)}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-thumb i{display:block;width:calc(var(--icon-size-px) * .3);height:calc(var(--icon-size-px) * .3);border-right:calc(var(--icon-size-px) * .12) solid currentColor;border-bottom:calc(var(--icon-size-px) * .12) solid currentColor;margin:calc(var(--icon-size-px) * .12) 0}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-thumb i.down{transform:rotate(45deg)}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-thumb i.up{transform:rotate(-135deg)}[data-component="neumorphic-pill-toggle-vertical"] .active .n-pill-thumb{top:calc(54% - 7px)}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-on,[data-component="neumorphic-pill-toggle-vertical"] .n-pill-off{position:absolute;z-index:1;left:50%;transform:translateX(-50%);font-size:var(--text-size-px)}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-on{top:13%;opacity:0}[data-component="neumorphic-pill-toggle-vertical"] .active .n-pill-on{opacity:1}[data-component="neumorphic-pill-toggle-vertical"] .n-pill-off{bottom:13%}[data-component="neumorphic-pill-toggle-vertical"] .active .n-pill-off{opacity:0}',
    mount(root, context) {
      const p = context.options.properties || {},
        button = root.querySelector("button"),
        on = root.querySelector(".n-pill-on"),
        off = root.querySelector(".n-pill-off"),
        thumb = root.querySelector(".n-pill-thumb"),
        truthy = (value, fallback) =>
          value == null
            ? fallback
            : value === true ||
              value === 1 ||
              value === "1" ||
              String(value).toLowerCase() === "true";
      root.style.setProperty("--surface", p.surfaceColor || "#2c3038");
      root.style.setProperty("--shadow", p.shadowColor || "#171a20");
      root.style.setProperty("--highlight", p.highlightColor || "#444b57");
      root.style.setProperty("--accent", p.accentColor || "#35e0c0");
      root.style.setProperty("--txt", p.textColor || "#d8dde6");
      root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`);
      on.textContent = p.onText ?? "ON";
      off.textContent = p.offText ?? "OFF";
      const down = (event) => {
          button.classList.add("pressed");
          context.signals.publish("press", true);
          event.preventDefault();
        },
        up = () => {
          button.classList.remove("pressed");
          context.signals.publish("press", false);
        };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointerleave", up);
      button.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", (value) => {
        const active = truthy(value, false);
        button.classList.toggle("active", active);
        thumb.innerHTML = active
          ? '<i class="up"></i><i class="up"></i><i class="up"></i>'
          : '<i class="down"></i><i class="down"></i><i class="down"></i>';
      });
      context.signals.subscribe("name", (value) =>
        button.setAttribute(
          "aria-label",
          value == null ? (p.localName ?? "Power") : String(value),
        ),
      );
    },
  });
  const volumeStyles =
    commonStyles +
    '[data-component^="neumorphic-vertical-volume"],[data-component^="neumorphic-horizontal-volume"]{display:block;width:100%;height:100%;padding:12px}[data-component^="neumorphic-vertical-volume"] .nv-wrap{display:flex;flex-direction:column;align-items:center;width:100%;height:100%;gap:10px}[data-component^="neumorphic-horizontal-volume"] .nv-wrap{display:flex;flex-direction:row;align-items:center;width:100%;height:100%;gap:10px}[data-component^="neumorphic-vertical-volume"] .nv-track{position:relative;flex:1;width:60px;min-height:70px;padding:10px;border-radius:30px;background:var(--surface);box-shadow:inset 6px 6px 12px var(--shadow),inset -6px -6px 12px var(--highlight);overflow:hidden;touch-action:none}[data-component^="neumorphic-horizontal-volume"] .nv-track{position:relative;flex:1;height:60px;min-width:70px;padding:10px;border-radius:30px;background:var(--surface);box-shadow:inset 6px 6px 12px var(--shadow),inset -6px -6px 12px var(--highlight);overflow:hidden;touch-action:none}[data-component^="neumorphic-vertical-volume"] .nv-fill{position:absolute;left:0;right:0;bottom:0;height:50%;background:var(--accent);box-shadow:0 0 var(--glow) var(--accent);opacity:.88}[data-component^="neumorphic-horizontal-volume"] .nv-fill{position:absolute;top:0;bottom:0;left:0;width:50%;background:var(--accent);box-shadow:0 0 var(--glow) var(--accent);opacity:.88}[data-component^="neumorphic-vertical-volume"] .nv-thumb{position:absolute;left:2px;right:2px;bottom:50%;height:18px;border-radius:10px;background:var(--surface);box-shadow:2px 2px 5px var(--shadow),-2px -2px 5px var(--highlight),0 0 var(--glow) var(--accent);transform:translateY(50%)}[data-component^="neumorphic-horizontal-volume"] .nv-thumb{position:absolute;top:2px;bottom:2px;left:50%;width:18px;border-radius:10px;background:var(--surface);box-shadow:2px 2px 5px var(--shadow),-2px -2px 5px var(--highlight),0 0 var(--glow) var(--accent);transform:translateX(-50%)}[data-component^="neumorphic-vertical-volume"] .nv-segments{width:60px;display:flex;flex-direction:column-reverse;align-items:center;justify-content:space-between}[data-component^="neumorphic-horizontal-volume"] .nv-segments{height:60px;display:flex;flex-direction:row;align-items:center;justify-content:space-between}[data-component^="neumorphic-vertical-volume"] .nv-segment,[data-component^="neumorphic-horizontal-volume"] .nv-segment{width:16px;height:16px;flex:0 0 16px;border-radius:50%;background:var(--highlight);box-shadow:inset 1px 1px 2px var(--shadow)}[data-component^="neumorphic-vertical-volume"] .nv-segment.active,[data-component^="neumorphic-horizontal-volume"] .nv-segment.active{background:var(--accent);box-shadow:0 0 var(--glow) var(--accent)}[data-component^="neumorphic-vertical-volume"] .nv-value,[data-component^="neumorphic-horizontal-volume"] .nv-value{color:var(--txt);font-weight:800;font-size:var(--value-size-px)}[data-component^="neumorphic-vertical-volume"] .nv-mute,[data-component^="neumorphic-horizontal-volume"] .nv-mute{width:60px;height:60px;padding:15px;border:0;border-radius:50%;background:var(--surface);box-shadow:4px 4px 8px var(--shadow),-4px -4px 8px var(--highlight);color:var(--txt);cursor:pointer}[data-component^="neumorphic-vertical-volume"] .nv-mute svg,[data-component^="neumorphic-horizontal-volume"] .nv-mute svg{display:block;width:100%;height:100%;fill:currentColor}[data-component^="neumorphic-vertical-volume"] .nv-mute.active,[data-component^="neumorphic-horizontal-volume"] .nv-mute.active{color:var(--accent);box-shadow:inset 4px 4px 8px var(--shadow),inset -4px -4px 8px var(--highlight),0 0 var(--glow) var(--accent)}[data-component^="neumorphic-vertical-volume"] .nv-track,[data-component^="neumorphic-horizontal-volume"] .nv-track{order:1}[data-component^="neumorphic-vertical-volume"] .nv-controls,[data-component^="neumorphic-horizontal-volume"] .nv-controls{order:2;display:flex;align-items:center;gap:10px}[data-component^="neumorphic-vertical-volume"] .nv-controls{flex-direction:column}[data-component^="neumorphic-horizontal-volume"] .nv-controls{flex-direction:row}[data-component^="neumorphic-vertical-volume"][data-controls-position="start"] .nv-track,[data-component^="neumorphic-horizontal-volume"][data-controls-position="start"] .nv-track{order:2}[data-component^="neumorphic-vertical-volume"][data-controls-position="start"] .nv-controls,[data-component^="neumorphic-horizontal-volume"][data-controls-position="start"] .nv-controls{order:1}[data-component^="neumorphic-vertical-volume"][data-controls-position="start"] .nv-value,[data-component^="neumorphic-horizontal-volume"][data-controls-position="start"] .nv-value{order:2}[data-component^="neumorphic-vertical-volume"][data-controls-position="start"] .nv-mute,[data-component^="neumorphic-horizontal-volume"][data-controls-position="start"] .nv-mute{order:1}';
  function volumeDefinition(id, name, segmented, horizontal) {
    return {
      id,
      name,
      category: "Sliders & Levels",
      defaultSize: horizontal
        ? { width: 360, height: 130 }
        : { width: 130, height: 360 },
      data: { segmented, horizontal },
      properties: [
        mode,
        {
          key: "localName",
          name: "Local name",
          type: "text",
          defaultValue: "Volume",
        },
        {
          key: "showLabel",
          name: "Show label",
          type: "checkbox",
          defaultValue: false,
        },
        {
          key: "labelSize",
          name: "Label size",
          type: "number",
          min: 8,
          max: 36,
          defaultValue: 14,
        },
        {
          key: "defaultPercent",
          name: "Default percentage",
          type: "number",
          min: 0,
          max: 100,
          defaultValue: 50,
        },
        {
          key: "outputScale",
          name: "Outgoing analog scale",
          type: "select",
          options: [
            { value: "65535", label: "0–65535" },
            { value: "100", label: "0–100" },
          ],
          defaultValue: "65535",
        },
        {
          key: "showPercentage",
          name: "Show percentage",
          type: "checkbox",
          defaultValue: true,
        },
        {
          key: "valueSize",
          name: "Percentage size",
          type: "number",
          defaultValue: 16,
        },
        {
          key: "muteEnabled",
          name: "Show mute button",
          type: "checkbox",
          defaultValue: true,
        },
        {
          key: "muteIconSize",
          name: "Mute icon size (%)",
          type: "number",
          min: 20,
          max: 100,
          defaultValue: 50,
        },
        {
          key: "controlsPosition",
          name: horizontal
            ? "Percentage & mute side"
            : "Percentage & mute position",
          type: "select",
          options: horizontal
            ? [
                { value: "end", label: "Right" },
                { value: "start", label: "Left" },
              ]
            : [
                { value: "end", label: "Bottom" },
                { value: "start", label: "Top" },
              ],
          defaultValue: "end",
        },
        ...colors,
      ],
      signals: [
        {
          key: "set",
          name: "Value Set",
          type: "analog",
          direction: "output",
          defaultValue: `${name.replace(/\s/g, "")}.ValueSet`,
        },
        {
          key: "feedback",
          name: "Feedback",
          type: "analog",
          direction: "input",
          defaultValue: `${name.replace(/\s/g, "")}.Feedback`,
        },
        {
          key: "name",
          name: "Name",
          type: "serial",
          direction: "input",
          defaultValue: `${name.replace(/\s/g, "")}.Name`,
        },
        {
          key: "mutePress",
          name: "Mute Press",
          type: "digital",
          direction: "output",
          defaultValue: `${name.replace(/\s/g, "")}.MutePress`,
          optionalProperty: "muteEnabled",
        },
        {
          key: "muteSelected",
          name: "Mute Selected",
          type: "digital",
          direction: "input",
          defaultValue: `${name.replace(/\s/g, "")}.MuteSelected`,
          optionalProperty: "muteEnabled",
        },
      ],
      template: `<div class="nv-wrap"><span class="nv-name">Volume</span><div class="nv-track ${segmented ? "nv-segments" : ""}">${segmented ? Array.from({ length: 9 }, () => '<i class="nv-segment"></i>').join("") : '<i class="nv-fill"></i><i class="nv-thumb"></i>'}</div><div class="nv-controls"><output class="nv-value">50%</output><button class="nv-mute" type="button" aria-label="Mute"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm12.6 1.1 1.9 1.9-1.9 1.9 1.4 1.4 1.9-1.9 1.9 1.9 1.4-1.4-1.9-1.9 1.9-1.9-1.4-1.4-1.9 1.9-1.9-1.9-1.4 1.4z"/></svg></button></div></div>`,
      styles:
        volumeStyles +
        '[data-component^="neumorphic-vertical-volume"] .nv-name,[data-component^="neumorphic-horizontal-volume"] .nv-name{flex:0 0 auto;max-width:100%;overflow:hidden;color:var(--txt);font-size:var(--label-size-px);font-weight:800;text-overflow:ellipsis;white-space:nowrap}[data-component^="neumorphic-vertical-volume"] .nv-mute svg,[data-component^="neumorphic-horizontal-volume"] .nv-mute svg{width:var(--mute-icon-size-percent);height:var(--mute-icon-size-percent);margin:auto}',
      mount(root, context) {
        const p = context.options.properties || {},
          segmented = !!context.options.definitionData.segmented,
          horizontal = !!context.options.definitionData.horizontal,
          truthy = (input, fallback) =>
            input == null
              ? fallback
              : input === true ||
                input === 1 ||
                input === "1" ||
                String(input).toLowerCase() === "true",
          nameNode = root.querySelector(".nv-name"),
          track = root.querySelector(".nv-track"),
          output = root.querySelector(".nv-value"),
          mute = root.querySelector(".nv-mute"),
          fill = root.querySelector(".nv-fill"),
          thumb = root.querySelector(".nv-thumb"),
          segments = [...root.querySelectorAll(".nv-segment")];
        let value = Math.max(0, Math.min(100, Number(p.defaultPercent) || 0)),
          dragging = false;
        root.setAttribute(
          "data-controls-position",
          p.controlsPosition === "start" ? "start" : "end",
        );
        root.style.setProperty("--surface", p.surfaceColor || "#2c3038");
        root.style.setProperty("--shadow", p.shadowColor || "#171a20");
        root.style.setProperty("--highlight", p.highlightColor || "#444b57");
        root.style.setProperty("--accent", p.accentColor || "#35e0c0");
        root.style.setProperty("--txt", p.textColor || "#d8dde6");
        root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`);
        nameNode.textContent = p.localName ?? "Volume";
        nameNode.style.display = truthy(p.showLabel, false) ? "" : "none";
        output.style.display = truthy(p.showPercentage, true) ? "" : "none";
        mute.style.display = truthy(p.muteEnabled, true) ? "" : "none";
        function render() {
          output.textContent = `${Math.round(value)}%`;
          if (segmented)
            segments.forEach((item, index) =>
              item.classList.toggle(
                "active",
                index < Math.round((value / 100) * segments.length),
              ),
            );
          else if (horizontal) {
            fill.style.width = `${value}%`;
            thumb.style.left = `${value}%`;
          } else {
            fill.style.height = `${value}%`;
            thumb.style.bottom = `${value}%`;
          }
        }
        function set(event, publishValue) {
          const rect = track.getBoundingClientRect();
          value = horizontal
            ? Math.max(
                0,
                Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
              )
            : Math.max(
                0,
                Math.min(
                  100,
                  100 - ((event.clientY - rect.top) / rect.height) * 100,
                ),
              );
          render();
          if (publishValue)
            context.signals.publish(
              "set",
              p.outputScale === "100"
                ? Math.round(value)
                : Math.round((value / 100) * 65535),
            );
        }
        track.addEventListener("pointerdown", (event) => {
          dragging = true;
          track.setPointerCapture?.(event.pointerId);
          set(event, true);
          event.preventDefault();
        });
        track.addEventListener("pointermove", (event) => {
          if (dragging) set(event, true);
        });
        track.addEventListener("pointerup", () => (dragging = false));
        track.addEventListener("pointercancel", () => (dragging = false));
        const muteDown = (event) => {
            mute.classList.add("pressed");
            context.signals.publish("mutePress", true);
            event.preventDefault();
          },
          muteUp = () => {
            mute.classList.remove("pressed");
            context.signals.publish("mutePress", false);
          };
        mute.addEventListener("pointerdown", muteDown);
        mute.addEventListener("pointerup", muteUp);
        mute.addEventListener("pointerleave", muteUp);
        mute.addEventListener("pointercancel", muteUp);
        context.signals.subscribe("muteSelected", (state) =>
          mute.classList.toggle("active", truthy(state, false)),
        );
        context.signals.subscribe("feedback", (input) => {
          const number = Number(input) || 0;
          value = Math.max(
            0,
            Math.min(100, number > 100 ? (number / 65535) * 100 : number),
          );
          render();
        });
        context.signals.subscribe("name", (input) => {
          const text =
            input == null || input === ""
              ? (p.localName ?? "Volume")
              : String(input);
          root.setAttribute("aria-label", text);
          nameNode.textContent = text;
        });
        render();
      },
    };
  }
  runtime.register(
    volumeDefinition(
      "neumorphic-vertical-volume",
      "Vertical Volume",
      false,
      false,
    ),
  );
  runtime.register(
    volumeDefinition(
      "neumorphic-vertical-volume-segmented",
      "Vertical Volume Segmented",
      true,
      false,
    ),
  );
  runtime.register(
    volumeDefinition(
      "neumorphic-horizontal-volume",
      "Horizontal Volume",
      false,
      true,
    ),
  );
  runtime.register(
    volumeDefinition(
      "neumorphic-horizontal-volume-segmented",
      "Horizontal Volume Segmented",
      true,
      true,
    ),
  );
  const rockerStyles =
    commonStyles +
    '[data-component^="neumorphic-rocker"]{display:block;width:100%;height:100%;padding:12px}[data-component^="neumorphic-rocker"] .nr{display:flex;width:100%;height:100%;padding:var(--rocker-padding);gap:var(--rocker-gap);border-radius:999px;background:var(--surface);box-shadow:7px 7px 15px var(--shadow),-7px -7px 15px var(--highlight);overflow:hidden}[data-component^="neumorphic-rocker"] .nr.vertical{flex-direction:column}[data-component^="neumorphic-rocker"] .nr-button{flex:1;min-width:0;min-height:0;border:0;border-radius:999px;background:transparent;color:var(--txt);font-size:var(--text-size-px);font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}[data-component^="neumorphic-rocker"] .nr-icon{font-size:1.25em;line-height:1}[data-component^="neumorphic-rocker"] .v2 .nr-button{background:var(--surface);box-shadow:3px 3px 7px var(--shadow),-3px -3px 7px var(--highlight)}[data-component^="neumorphic-rocker"] .nr-button.active,[data-component^="neumorphic-rocker"] .nr-button.pressed{color:var(--accent);text-shadow:0 0 var(--glow) var(--accent);box-shadow:inset 5px 5px 11px var(--shadow),inset -3px -3px 8px var(--highlight),inset 0 0 20px color-mix(in srgb,var(--accent) 45%,transparent)}';
  function rockerDefinition(id, name, vertical, v2) {
    const namespace = name.replace(/\s/g, "");
    return {
      id,
      name,
      category: "Advanced Buttons",
      defaultSize: vertical
        ? { width: 130, height: 300 }
        : { width: 330, height: 120 },
      data: { v2 },
      properties: [
        mode,
        {
          key: "buttonCount",
          name: v2 ? "Default visible buttons" : "Visible buttons",
          type: "number",
          min: v2 ? 1 : 2,
          max: v2 ? 8 : 2,
          defaultValue: 2,
        },
        {
          key: "buttonLabels",
          name: "Local button labels",
          type: "text-list",
          countKey: "buttonCount",
          itemName: "Button",
          defaultValue: "Up|Down|Mode 3|Mode 4",
        },
        ...(v2
          ? [
              {
                key: "buttonIcons",
                name: "Button icons",
                type: "select-list",
                countKey: "buttonCount",
                itemName: "Button",
                options: [
                  "none",
                  "power",
                  "home",
                  "up",
                  "down",
                  "left",
                  "right",
                  "play",
                  "pause",
                  "stop",
                  "check",
                  "plus",
                  "minus",
                ].map((value) => ({
                  value,
                  label: value[0].toUpperCase() + value.slice(1),
                })),
                defaultItemValue: "none",
                defaultValue: "none|none|none|none",
              },
            ]
          : []),
        {
          key: "pressBase",
          name: "Press pattern",
          type: "text",
          defaultValue: `${namespace}.Items.{index}.Press`,
          signalSetting: true,
        },
        {
          key: "selectedBase",
          name: "Selected pattern",
          type: "text",
          defaultValue: `${namespace}.Items.{index}.Selected`,
          signalSetting: true,
        },
        {
          key: "nameBase",
          name: "Name pattern",
          type: "text",
          defaultValue: `${namespace}.Items.{index}.Name`,
          signalSetting: true,
        },
        {
          key: "textSize",
          name: "Text size",
          type: "number",
          defaultValue: 16,
        },
        ...colors,
      ],
      signals: v2
        ? [
            {
              key: "visibleCount",
              name: "Number of buttons",
              type: "analog",
              direction: "input",
              defaultValue: `${namespace}.Feedback`,
            },
          ]
        : [],
      signalGroups: [
        { name: "Button presses", type: "digital", direction: "output" },
        {
          name: "Button selected feedback",
          type: "digital",
          direction: "input",
        },
        { name: "Button names", type: "serial", direction: "input" },
      ],
      rangeBindings: [
        {
          name: "Press range",
          type: "digital",
          direction: "output",
          baseKey: "pressBase",
          countKey: "buttonCount",
        },
        {
          name: "Selected range",
          type: "digital",
          direction: "input",
          baseKey: "selectedBase",
          countKey: "buttonCount",
        },
        {
          name: "Name range",
          type: "serial",
          direction: "input",
          baseKey: "nameBase",
          countKey: "buttonCount",
        },
      ],
      template: `<div class="nr ${vertical ? "vertical" : "horizontal"} ${v2 ? "v2" : "classic"}"></div>`,
      styles: rockerStyles,
      mount(root, context) {
        const p = context.options.properties || {},
          v2 = !!context.options.definitionData.v2,
          truthy = (value) =>
            value === true ||
            value === 1 ||
            value === "1" ||
            String(value).toLowerCase() === "true",
          address = (base, index) =>
            (p.bindingMode || "contract") === "join"
              ? String((Number(base) || 0) + index)
              : String(base || "")
                  .replace(/\{n\}/g, String(index + 1))
                  .replace(/\{index\}/g, String(index)),
          host = root.querySelector(".nr"),
          labels = String(p.buttonLabels ?? "Up|Down").split("|"),
          iconNames = String(p.buttonIcons ?? "").split("|"),
          glyphs = {
            power: "⏻",
            home: "⌂",
            up: "▲",
            down: "▼",
            left: "◀",
            right: "▶",
            play: "▶",
            pause: "Ⅱ",
            stop: "■",
            check: "✓",
            plus: "+",
            minus: "−",
          },
          count = v2 ? Math.max(1, Math.min(8, Number(p.buttonCount) || 2)) : 2,
          buttons = [];
        root.style.setProperty("--surface", p.surfaceColor || "#2c3038");
        root.style.setProperty("--shadow", p.shadowColor || "#171a20");
        root.style.setProperty("--highlight", p.highlightColor || "#444b57");
        root.style.setProperty("--accent", p.accentColor || "#35e0c0");
        root.style.setProperty("--txt", p.textColor || "#d8dde6");
        root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`);
        root.style.setProperty("--rocker-padding", v2 ? "10px" : "0px");
        root.style.setProperty("--rocker-gap", v2 ? "10px" : "2px");
        function show(amount) {
          const visible = Math.max(1, Math.min(count, Number(amount) || count));
          buttons.forEach(
            (button, index) =>
              (button.style.display = index < visible ? "" : "none"),
          );
        }
        for (let index = 0; index < count; index++) {
          const button = document.createElement("button"),
            icon = document.createElement("span"),
            label = document.createElement("span"),
            localLabel = labels[index] ?? "";
          button.type = "button";
          button.className = "nr-button";
          icon.className = "nr-icon";
          icon.textContent = glyphs[iconNames[index]] || "";
          icon.style.display = icon.textContent ? "" : "none";
          label.className = "nr-label";
          label.textContent = localLabel;
          button.append(icon, label);
          host.appendChild(button);
          buttons.push(button);
          const down = (event) => {
              button.classList.add("pressed");
              context.signals.publishAddress(
                "digital",
                address(p.pressBase, index),
                true,
              );
              event.preventDefault();
            },
            up = () => {
              button.classList.remove("pressed");
              context.signals.publishAddress(
                "digital",
                address(p.pressBase, index),
                false,
              );
            };
          button.addEventListener("pointerdown", down);
          button.addEventListener("pointerup", up);
          button.addEventListener("pointerleave", up);
          button.addEventListener("pointercancel", up);
          context.signals.subscribeAddress(
            "digital",
            address(p.selectedBase, index),
            (state) => button.classList.toggle("active", truthy(state)),
          );
          context.signals.subscribeAddress(
            "serial",
            address(p.nameBase, index),
            (value) => {
              if (value !== undefined && value !== null)
                label.textContent = String(value);
            },
          );
        }
        const visibleCountSignal = "visibleCount";
        if (v2) context.signals.subscribe(visibleCountSignal, show);
        show(count);
      },
    };
  }
  runtime.register(
    rockerDefinition(
      "neumorphic-rocker-vertical",
      "Rocker Vertical",
      true,
      false,
    ),
  );
  runtime.register(
    rockerDefinition(
      "neumorphic-rocker-horizontal",
      "Rocker Horizontal",
      false,
      false,
    ),
  );
  runtime.register(
    rockerDefinition(
      "neumorphic-rocker-v2-vertical",
      "Rocker V2 Vertical",
      true,
      true,
    ),
  );
  runtime.register(
    rockerDefinition(
      "neumorphic-rocker-v2-horizontal",
      "Rocker V2 Horizontal",
      false,
      true,
    ),
  );
  const dpadStyles =
    commonStyles +
    '[data-component^="neumorphic-dpad"]{display:block;width:100%;height:100%;padding:12px}[data-component^="neumorphic-dpad"] .nd{position:relative;width:100%;height:100%}[data-component^="neumorphic-dpad"] .nd.square{display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);gap:10px}[data-component^="neumorphic-dpad"] .nd-button{border:0;border-radius:22%;background:var(--surface);box-shadow:4px 4px 9px var(--shadow),-4px -4px 9px var(--highlight);color:var(--txt);font-size:var(--icon-size-px);cursor:pointer}[data-component^="neumorphic-dpad"] .nd-button.pressed,[data-component^="neumorphic-dpad"] .nd-button.active{color:var(--accent);text-shadow:0 0 var(--glow) var(--accent);box-shadow:inset 4px 4px 9px var(--shadow),inset -3px -3px 7px var(--highlight),0 0 var(--glow) var(--accent)}[data-component="neumorphic-dpad-circular"] .nd.circular{display:grid;place-items:center;aspect-ratio:1;max-width:100%;max-height:100%;margin:auto}[data-component="neumorphic-dpad-circular"] .nd-ring{display:block;width:100%;height:100%;overflow:visible}[data-component="neumorphic-dpad-circular"] .nd-sector{cursor:pointer}[data-component="neumorphic-dpad-circular"] .nd-sector path{fill:var(--surface);stroke:rgba(255,255,255,.06);stroke-width:1;filter:drop-shadow(4px 4px 6px var(--shadow)) drop-shadow(-3px -3px 5px var(--highlight));transition:fill .15s,filter .15s}[data-component="neumorphic-dpad-circular"] .nd-sector text{fill:var(--txt);font-family:"Segoe UI",sans-serif;font-size:var(--icon-size-px);font-weight:700;text-anchor:middle;dominant-baseline:middle;pointer-events:none}[data-component="neumorphic-dpad-circular"] .nd-sector.pressed path,[data-component="neumorphic-dpad-circular"] .nd-sector.active path{fill:color-mix(in srgb,var(--surface) 78%,var(--accent));filter:drop-shadow(0 0 var(--glow) var(--accent))}[data-component="neumorphic-dpad-circular"] .nd-sector.pressed text,[data-component="neumorphic-dpad-circular"] .nd-sector.active text{fill:var(--accent);filter:drop-shadow(0 0 4px var(--accent))}[data-component="neumorphic-dpad-circular"] .nd-center{position:absolute;left:50%;top:50%;width:31%;height:31%;transform:translate(-50%,-50%);border-radius:50%;font-size:var(--icon-size-px);z-index:2}';
  function dpadDefinition(id, name, circular) {
    const ns = name.replace(/[^A-Za-z0-9_]/g, ""),
      circularMarkup =
        '<div class="nd circular"><svg class="nd-ring" viewBox="0 0 220 220" aria-label="Circular directional pad"><g class="nd-sector" data-index="0"><path d="M49 51 A86 86 0 0 1 171 51 L143 82 A45 45 0 0 0 77 82 Z"/><text x="110" y="49">⌃</text></g><g class="nd-sector" data-index="2" transform="rotate(90 110 110)"><path d="M49 51 A86 86 0 0 1 171 51 L143 82 A45 45 0 0 0 77 82 Z"/><text x="110" y="49">⌃</text></g><g class="nd-sector" data-index="3" transform="rotate(180 110 110)"><path d="M49 51 A86 86 0 0 1 171 51 L143 82 A45 45 0 0 0 77 82 Z"/><text x="110" y="49">⌃</text></g><g class="nd-sector" data-index="1" transform="rotate(270 110 110)"><path d="M49 51 A86 86 0 0 1 171 51 L143 82 A45 45 0 0 0 77 82 Z"/><text x="110" y="49">⌃</text></g></svg><button class="nd-button nd-center" data-index="4" type="button">⏻</button></div>';
    return {
      id,
      name,
      category: "Navigation & Menus",
      defaultSize: { width: 280, height: 280 },
      data: { circular },
      properties: [
        mode,
        {
          key: "buttonCount",
          name: "Directional buttons",
          type: "number",
          min: 5,
          max: 5,
          defaultValue: 5,
          signalSetting: true,
        },
        {
          key: "centerDisplay",
          name: "Center button display",
          type: "select",
          options: [
            { value: "icon", label: "Icon" },
            { value: "text", label: "Text" },
            { value: "blank", label: "Blank" },
          ],
          defaultValue: "icon",
        },
        {
          key: "centerIcon",
          name: "Center icon",
          type: "select",
          options: ["power", "home", "play", "pause", "stop", "check"].map(
            (value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }),
          ),
          defaultValue: "power",
          visibleWhen: { key: "centerDisplay", equals: "icon" },
        },
        {
          key: "centerText",
          name: "Center button text",
          type: "text",
          defaultValue: "OK",
          visibleWhen: { key: "centerDisplay", equals: "text" },
        },
        {
          key: "iconSize",
          name: "Icon / text size",
          type: "number",
          min: 8,
          max: 64,
          defaultValue: 26,
        },
        {
          key: "pressBase",
          name: "Press pattern",
          type: "text",
          defaultValue: `${ns}.Items.{index}.Press`,
          signalSetting: true,
        },
        {
          key: "selectedBase",
          name: "Selected pattern",
          type: "text",
          defaultValue: `${ns}.Items.{index}.Selected`,
          signalSetting: true,
        },
        ...colors,
      ],
      signals: [],
      signalGroups: [
        { name: "Directional presses", type: "digital", direction: "output" },
        {
          name: "Directional selected feedback",
          type: "digital",
          direction: "input",
        },
      ],
      rangeBindings: [
        {
          name: "Press range",
          type: "digital",
          direction: "output",
          baseKey: "pressBase",
          countKey: "buttonCount",
        },
        {
          name: "Selected range",
          type: "digital",
          direction: "input",
          baseKey: "selectedBase",
          countKey: "buttonCount",
        },
      ],
      template: circular ? circularMarkup : '<div class="nd square"></div>',
      styles: dpadStyles,
      mount(root, context) {
        const p = context.options.properties || {},
          circular = !!context.options.definitionData.circular,
          truthy = (value) =>
            value === true ||
            value === 1 ||
            value === "1" ||
            String(value).toLowerCase() === "true",
          address = (base, index) =>
            (p.bindingMode || "contract") === "join"
              ? String((Number(base) || 0) + index)
              : String(base || "")
                  .replace(/\{n\}/g, String(index + 1))
                  .replace(/\{index\}/g, String(index)),
          host = root.querySelector(".nd"),
          icons = {
            power: "⏻",
            home: "⌂",
            play: "▶",
            pause: "Ⅱ",
            stop: "■",
            check: "✓",
          },
          display =
            p.centerDisplay === "power" ? "icon" : p.centerDisplay || "icon",
          centerContent =
            display === "blank"
              ? ""
              : display === "text"
                ? String(p.centerText ?? "OK")
                : icons[p.centerIcon || "power"] || "⏻",
          values = [
            { t: "⌃", a: 0, grid: "1/2" },
            { t: "‹", a: 1, grid: "2/1" },
            { t: centerContent, a: 4, grid: "2/2" },
            { t: "›", a: 2, grid: "2/3" },
            { t: "⌄", a: 3, grid: "3/2" },
          ];
        root.style.setProperty("--surface", p.surfaceColor || "#2c3038");
        root.style.setProperty("--shadow", p.shadowColor || "#171a20");
        root.style.setProperty("--highlight", p.highlightColor || "#444b57");
        root.style.setProperty("--accent", p.accentColor || "#35e0c0");
        root.style.setProperty("--txt", p.textColor || "#d8dde6");
        root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`);
        if (!circular)
          values.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nd-button";
            button.textContent = item.t;
            button.style.gridArea = item.grid;
            host.appendChild(button);
          });
        else root.querySelector(".nd-center").textContent = centerContent;
        [...host.querySelectorAll("[data-index],.square .nd-button")].forEach(
          (target, position) => {
            const index = target.hasAttribute("data-index")
                ? Number(target.dataset.index)
                : values[position].a,
              down = (event) => {
                target.classList.add("pressed");
                context.signals.publishAddress(
                  "digital",
                  address(p.pressBase, index),
                  true,
                );
                event.preventDefault();
              },
              up = () => {
                target.classList.remove("pressed");
                context.signals.publishAddress(
                  "digital",
                  address(p.pressBase, index),
                  false,
                );
              };
            target.addEventListener("pointerdown", down);
            target.addEventListener("pointerup", up);
            target.addEventListener("pointerleave", up);
            target.addEventListener("pointercancel", up);
            context.signals.subscribeAddress(
              "digital",
              address(p.selectedBase, index),
              (state) => target.classList.toggle("active", truthy(state)),
            );
          },
        );
      },
    };
  }
  runtime.register(
    dpadDefinition("neumorphic-dpad-square", "Neumorphic D-Pad Square", false),
  );
  runtime.register(
    dpadDefinition(
      "neumorphic-dpad-circular",
      "Neumorphic D-Pad Circular",
      true,
    ),
  );
  const glassToggleIcons = {
    sun: '<circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/></g>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>',
    power:
      '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v9"/><path d="M7.05 6.75a7 7 0 1 0 9.9 0"/></g>',
    check:
      '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    lock: '<g fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>',
    unlock:
      '<g fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2" stroke-linecap="round"/></g>',
    bell: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 15z"/><path d="M10 20a2 2 0 0 0 4 0" stroke-linecap="round"/></g>',
    dot: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  };
  runtime.register({
    id: "neumorphic-glass-toggle",
    name: "Neumorphic Glass Toggle",
    category: "Toggle Buttons",
    defaultSize: { width: 240, height: 100 },
    properties: [
      {
        key: "offText",
        name: "Off label",
        type: "text",
        defaultValue: "Light",
      },
      { key: "onText", name: "On label", type: "text", defaultValue: "Dark" },
      {
        key: "offColor",
        name: "Off color",
        type: "color",
        defaultValue: "#55605f",
      },
      {
        key: "onColor",
        name: "On color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "trackColor",
        name: "Track color",
        type: "color",
        defaultValue: "#192322",
      },
      {
        key: "offIcon",
        name: "Off icon",
        type: "select",
        options: Object.keys(glassToggleIcons).map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        })),
        defaultValue: "sun",
      },
      {
        key: "onIcon",
        name: "On icon",
        type: "select",
        options: Object.keys(glassToggleIcons).map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        })),
        defaultValue: "moon",
      },
      {
        key: "offIconColor",
        name: "Off icon color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "onIconColor",
        name: "On icon color",
        type: "color",
        defaultValue: "#ffffff",
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
        key: "textSize",
        name: "Label size",
        type: "number",
        min: 8,
        max: 72,
        step: 1,
        defaultValue: 14,
      },
      {
        key: "iconSize",
        name: "Icon size",
        type: "number",
        min: 8,
        max: 60,
        step: 1,
        defaultValue: 22,
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 14,
      },
    ],
    signals: [
      {
        key: "press",
        name: "Toggle Press",
        type: "digital",
        direction: "output",
        defaultValue: "GlassToggle.Press",
      },
      {
        key: "selected",
        name: "Selected",
        type: "digital",
        direction: "input",
        defaultValue: "GlassToggle.Selected",
      },
    ],
    template:
      '<button class="ng-toggle" type="button"><span class="ng-label ng-label-off">OFF</span><span class="ng-label ng-label-on">ON</span><span class="ng-thumb"><span class="ng-icon ng-icon-off"></span><span class="ng-icon ng-icon-on"></span></span></button>',
    styles:
      commonStyles +
      '[data-component="neumorphic-glass-toggle"]{display:block;width:100%;height:100%;padding:12px}[data-component="neumorphic-glass-toggle"] *{box-sizing:border-box}[data-component="neumorphic-glass-toggle"] .ng-toggle{position:relative;display:block;width:100%;height:100%;border:1px solid color-mix(in srgb,var(--glow-color) 40%,#fff);padding:0;margin:0;overflow:visible;border-radius:999px;background:linear-gradient(145deg,color-mix(in srgb,var(--track-color) 72%,#fff),var(--track-color) 42%,color-mix(in srgb,var(--track-color) 72%,#000));box-shadow:inset 0 5px 12px rgba(0,0,0,.58),inset 0 -2px 5px rgba(255,255,255,.12),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 45%,transparent);cursor:pointer;transition:border-color .35s,box-shadow .35s}[data-component="neumorphic-glass-toggle"] .active.ng-toggle{border-color:var(--glow-color);box-shadow:inset 0 5px 12px rgba(0,0,0,.58),inset 0 -2px 5px rgba(255,255,255,.12),0 0 calc(var(--glow-strength-px) * 1.25) var(--glow-color)}[data-component="neumorphic-glass-toggle"] .ng-label{position:absolute;top:50%;transform:translateY(-50%);color:var(--text-color);font-weight:800;font-size:var(--text-size-px);letter-spacing:.02em;text-shadow:0 2px 4px rgba(0,0,0,.5);transition:opacity .35s;z-index:1}[data-component="neumorphic-glass-toggle"] .ng-label-off{right:16%;opacity:1}[data-component="neumorphic-glass-toggle"] .ng-label-on{left:16%;opacity:0}[data-component="neumorphic-glass-toggle"] .active .ng-label-off{opacity:0}[data-component="neumorphic-glass-toggle"] .active .ng-label-on{opacity:1}[data-component="neumorphic-glass-toggle"] .ng-thumb{position:absolute;top:50%;left:2%;width:46%;height:132%;transform:translateY(-50%);border-radius:50%;background:radial-gradient(circle at 34% 26%,color-mix(in srgb,var(--off-color) 60%,#fff),color-mix(in srgb,var(--off-color) 55%,transparent) 70%);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid color-mix(in srgb,var(--off-color) 65%,#fff);box-shadow:4px 4px 10px rgba(0,0,0,.42),-3px -3px 8px rgba(255,255,255,.15),0 0 calc(var(--glow-strength-px) * .6) color-mix(in srgb,var(--glow-color) 35%,transparent);transition:left .32s cubic-bezier(.34,1.56,.64,1),background .35s,border-color .35s;display:grid;place-items:center;z-index:2}[data-component="neumorphic-glass-toggle"] .ng-thumb:before{content:"";position:absolute;inset:10%;border-radius:50%;background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.5),transparent 60%);pointer-events:none}[data-component="neumorphic-glass-toggle"] .active .ng-thumb{left:calc(100% - 48%);background:radial-gradient(circle at 34% 26%,color-mix(in srgb,var(--on-color) 60%,#fff),color-mix(in srgb,var(--on-color) 55%,transparent) 70%);border-color:color-mix(in srgb,var(--on-color) 65%,#fff)}[data-component="neumorphic-glass-toggle"] .ng-toggle.pressed .ng-thumb{filter:brightness(.94)}[data-component="neumorphic-glass-toggle"] .ng-icon{position:absolute;width:var(--icon-size-px);height:var(--icon-size-px);transition:opacity .25s}[data-component="neumorphic-glass-toggle"] .ng-icon svg{display:block;width:100%;height:100%}[data-component="neumorphic-glass-toggle"] .ng-icon-off{opacity:1;color:var(--off-icon-color)}[data-component="neumorphic-glass-toggle"] .ng-icon-on{opacity:0;color:var(--on-icon-color)}[data-component="neumorphic-glass-toggle"] .active .ng-icon-off{opacity:0}[data-component="neumorphic-glass-toggle"] .active .ng-icon-on{opacity:1}',
    mount(root, context) {
      const icons = {
          sun: '<circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/></g>',
          moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>',
          power:
            '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v9"/><path d="M7.05 6.75a7 7 0 1 0 9.9 0"/></g>',
          check:
            '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
          x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
          lock: '<g fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>',
          unlock:
            '<g fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2" stroke-linecap="round"/></g>',
          bell: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 15z"/><path d="M10 20a2 2 0 0 0 4 0" stroke-linecap="round"/></g>',
          dot: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
        },
        p = context.options.properties || {},
        button = root.querySelector(".ng-toggle"),
        onLabel = root.querySelector(".ng-label-on"),
        offLabel = root.querySelector(".ng-label-off"),
        offIconSpan = root.querySelector(".ng-icon-off"),
        onIconSpan = root.querySelector(".ng-icon-on"),
        truthy = (value, fallback) =>
          value == null
            ? fallback
            : value === true ||
              value === 1 ||
              value === "1" ||
              String(value).toLowerCase() === "true";
      onLabel.textContent = p.onText ?? "Dark";
      offLabel.textContent = p.offText ?? "Light";
      offIconSpan.innerHTML = `<svg viewBox="0 0 24 24">${icons[p.offIcon] || icons.sun}</svg>`;
      onIconSpan.innerHTML = `<svg viewBox="0 0 24 24">${icons[p.onIcon] || icons.moon}</svg>`;
      const down = (event) => {
          button.classList.add("pressed");
          context.signals.publish("press", true);
          event.preventDefault();
        },
        up = () => {
          button.classList.remove("pressed");
          context.signals.publish("press", false);
        };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointerleave", up);
      button.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", (value) =>
        button.classList.toggle("active", truthy(value, false)),
      );
    },
  });
  const glassNavIcons = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12h6v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    search:
      '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    camera:
      '<path d="M9 4h6l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>',
    store:
      '<path d="M4 9V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 9h18l-1.5-5h-15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    bell: '<path d="M6 10a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    heart:
      '<path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5 6 5c2 0 4 1.5 6 4.5C14 6.5 16 5 18 5c4 0 5.3 4 3.5 7.5C19 16.65 12 21 12 21z" fill="currentColor"/>',
    settings:
      '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    check:
      '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  runtime.register({
    id: "neumorphic-glass-nav",
    name: "Glass Icon Nav",
    category: "Navigation & Menus",
    defaultSize: { width: 320, height: 120 },
    itemSelector: ".ngn-icon",
    properties: [
      mode,
      {
        key: "buttonCount",
        name: "Number of icons",
        type: "number",
        min: 2,
        max: 8,
        defaultValue: 4,
      },
      {
        key: "buttonIcons",
        name: "Regular icons",
        type: "select-list",
        countKey: "buttonCount",
        itemName: "Button",
        options: Object.keys(glassNavIcons).map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        })),
        defaultItemValue: "home",
        defaultValue: "home|store|camera|search",
      },
      {
        key: "buttonSelectedIcons",
        name: "Selected icons",
        type: "select-list",
        countKey: "buttonCount",
        itemName: "Button",
        options: Object.keys(glassNavIcons).map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        })),
        defaultItemValue: "home",
        defaultValue: "home|store|camera|search",
      },
      {
        key: "buttonAssets",
        name: "Custom image per button",
        type: "asset-list",
        countKey: "buttonCount",
        itemName: "Button",
      },
      {
        key: "buttonLabels",
        name: "Button labels",
        type: "text-list",
        countKey: "buttonCount",
        itemName: "Button",
        defaultValue: "Home|Store|Camera|Search",
      },
      {
        key: "labelSize",
        name: "Label size",
        type: "number",
        min: 8,
        max: 40,
        defaultValue: 13,
      },
      {
        key: "pressBase",
        name: "Press pattern",
        type: "text",
        defaultValue: "GlassNav.Items.{index}.Press",
        signalSetting: true,
      },
      {
        key: "selectedBase",
        name: "Selected pattern",
        type: "text",
        defaultValue: "GlassNav.Items.{index}.Selected",
        signalSetting: true,
      },
      {
        key: "nameBase",
        name: "Name pattern",
        type: "text",
        defaultValue: "GlassNav.Items.{index}.Name",
        signalSetting: true,
      },
      {
        key: "trackColor",
        name: "Track color",
        type: "color",
        defaultValue: "#1c1f26",
      },
      {
        key: "iconColor",
        name: "Icon color",
        type: "color",
        defaultValue: "#33363d",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "selectedColor",
        name: "Selected color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "selectedIconColor",
        name: "Selected icon color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        min: 0,
        max: 50,
        defaultValue: 16,
      },
      {
        key: "iconSize",
        name: "Icon size",
        type: "number",
        min: 30,
        max: 100,
        defaultValue: 62,
      },
    ],
    signals: [],
    signalGroups: [
      { name: "Icon presses", type: "digital", direction: "output" },
      { name: "Icon selected feedback", type: "digital", direction: "input" },
      { name: "Icon names", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        countKey: "buttonCount",
      },
      {
        name: "Selected range",
        type: "digital",
        direction: "input",
        baseKey: "selectedBase",
        countKey: "buttonCount",
      },
      {
        name: "Name range",
        type: "serial",
        direction: "input",
        baseKey: "nameBase",
        countKey: "buttonCount",
      },
    ],
    template: '<div class="ngn-track"></div>',
    styles:
      commonStyles +
      '[data-component="neumorphic-glass-nav"]{display:block;width:100%;height:100%;padding:10px}[data-component="neumorphic-glass-nav"] *{box-sizing:border-box}[data-component="neumorphic-glass-nav"] .ngn-track{position:relative;display:flex;align-items:center;justify-content:space-around;width:100%;height:100%;padding:0 .5em;border-radius:999px;background:color-mix(in srgb,var(--track-color) 60%,transparent);backdrop-filter:blur(10px) saturate(160%);-webkit-backdrop-filter:blur(10px) saturate(160%);border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 1px rgba(255,255,255,.2),inset 0 -8px 14px rgba(0,0,0,.4),0 10px 22px rgba(0,0,0,.35)}[data-component="neumorphic-glass-nav"] .ngn-icon{position:relative;flex:0 0 auto;display:grid;place-items:center;height:var(--icon-size-percent);aspect-ratio:1;border:0;border-radius:50%;background:#f2f3f5;color:var(--icon-color);cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.35),inset 0 1px 1px rgba(255,255,255,.7);transform:scale(.82);opacity:.72;transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .3s,background .35s,color .35s,box-shadow .35s}[data-component="neumorphic-glass-nav"] .ngn-icon-glyph{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .25s}[data-component="neumorphic-glass-nav"] .ngn-icon-glyph svg{width:48%;height:48%;display:block}[data-component="neumorphic-glass-nav"] .ngn-icon-selected{opacity:0}[data-component="neumorphic-glass-nav"] .ngn-icon.has-asset .ngn-icon-glyph{display:none}[data-component="neumorphic-glass-nav"] .ngn-icon.active .ngn-icon-regular{opacity:0}[data-component="neumorphic-glass-nav"] .ngn-icon.active .ngn-icon-selected{opacity:1}[data-component="neumorphic-glass-nav"] .ngn-icon.pressed{transform:scale(.7)}[data-component="neumorphic-glass-nav"] .ngn-icon.active{transform:scale(1.18);opacity:1;background:var(--selected-color);color:var(--selected-icon-color);box-shadow:0 6px 18px color-mix(in srgb,var(--selected-color) 55%,transparent),inset 0 1px 1px rgba(255,255,255,.5),0 0 var(--glow-strength-px) color-mix(in srgb,var(--selected-color) 60%,transparent)}[data-component="neumorphic-glass-nav"] .ngn-icon.active.pressed{transform:scale(1.05)}[data-component="neumorphic-glass-nav"] .ngn-label{position:absolute;top:calc(100% + .35em);left:50%;transform:translateX(-50%);white-space:nowrap;font-weight:700;font-size:var(--label-size-px);color:var(--text-color);pointer-events:none;transition:color .3s;text-shadow:0 1px 3px rgba(0,0,0,.6)}[data-component="neumorphic-glass-nav"] .ngn-icon.active .ngn-label{color:var(--selected-color)}',
    mount(root, context) {
      const icons = {
          home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12h6v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
          search:
            '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
          camera:
            '<path d="M9 4h6l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>',
          store:
            '<path d="M4 9V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 9h18l-1.5-5h-15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
          bell: '<path d="M6 10a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
          heart:
            '<path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5 6 5c2 0 4 1.5 6 4.5C14 6.5 16 5 18 5c4 0 5.3 4 3.5 7.5C19 16.65 12 21 12 21z" fill="currentColor"/>',
          settings:
            '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
          user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
          plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
          check:
            '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
        },
        p = context.options.properties || {},
        truthy = (value) =>
          value === true ||
          value === 1 ||
          value === "1" ||
          String(value).toLowerCase() === "true",
        address = (base, index) =>
          (p.bindingMode || "contract") === "join"
            ? String((Number(base) || 0) + index)
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index)),
        track = root.querySelector(".ngn-track"),
        iconNames = String(p.buttonIcons ?? "home|store|camera|search").split(
          "|",
        ),
        selectedIconNames = String(
          p.buttonSelectedIcons ?? "home|store|camera|search",
        ).split("|"),
        assetIds = String(p.buttonAssets ?? "").split("|"),
        labelTexts = String(p.buttonLabels ?? "").split("|"),
        count = Math.max(2, Math.min(8, Number(p.buttonCount) || 4));
      for (let index = 0; index < count; index++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ngn-icon";
        if (assetIds[index]) button.classList.add("has-asset");
        const iconKey = iconNames[index] || "home",
          selectedIconKey = selectedIconNames[index] || iconKey,
          defaultLabel = labelTexts[index] || "";
        button.innerHTML = `<span class="ngn-icon-glyph ngn-icon-regular"><svg viewBox="0 0 24 24">${icons[iconKey] || icons.home}</svg></span><span class="ngn-icon-glyph ngn-icon-selected"><svg viewBox="0 0 24 24">${icons[selectedIconKey] || icons.home}</svg></span><span class="ngn-label"></span>`;
        track.appendChild(button);
        const label = button.querySelector(".ngn-label");
        label.textContent = defaultLabel;
        label.style.display = defaultLabel ? "" : "none";
        button.setAttribute("aria-label", defaultLabel || iconKey);
        const down = (event) => {
            button.classList.add("pressed");
            context.signals.publishAddress(
              "digital",
              address(p.pressBase, index),
              true,
            );
            event.preventDefault();
          },
          up = () => {
            button.classList.remove("pressed");
            context.signals.publishAddress(
              "digital",
              address(p.pressBase, index),
              false,
            );
          };
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointerleave", up);
        button.addEventListener("pointercancel", up);
        context.signals.subscribeAddress(
          "digital",
          address(p.selectedBase, index),
          (state) => button.classList.toggle("active", truthy(state)),
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.nameBase, index),
          (value) => {
            if (value != null) {
              const text = String(value);
              label.textContent = text;
              label.style.display = text ? "" : "none";
              button.setAttribute(
                "aria-label",
                text || defaultLabel || iconKey,
              );
            }
          },
        );
      }
    },
  });
  runtime.register({
    id: "neumorphic-glass-nav-vertical",
    name: "Vertical Glass Icon Nav",
    category: "Navigation & Menus",
    defaultSize: { width: 110, height: 320 },
    itemSelector: ".ngn-icon",
    properties: [
      mode,
      {
        key: "buttonCount",
        name: "Number of icons",
        type: "number",
        min: 2,
        max: 8,
        defaultValue: 4,
      },
      {
        key: "buttonIcons",
        name: "Regular icons",
        type: "select-list",
        countKey: "buttonCount",
        itemName: "Button",
        options: Object.keys(glassNavIcons).map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        })),
        defaultItemValue: "home",
        defaultValue: "home|store|camera|search",
      },
      {
        key: "buttonSelectedIcons",
        name: "Selected icons",
        type: "select-list",
        countKey: "buttonCount",
        itemName: "Button",
        options: Object.keys(glassNavIcons).map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        })),
        defaultItemValue: "home",
        defaultValue: "home|store|camera|search",
      },
      {
        key: "buttonAssets",
        name: "Custom image per button",
        type: "asset-list",
        countKey: "buttonCount",
        itemName: "Button",
      },
      {
        key: "buttonLabels",
        name: "Button labels",
        type: "text-list",
        countKey: "buttonCount",
        itemName: "Button",
        defaultValue: "Home|Store|Camera|Search",
      },
      {
        key: "labelSize",
        name: "Label size",
        type: "number",
        min: 8,
        max: 40,
        defaultValue: 13,
      },
      {
        key: "pressBase",
        name: "Press pattern",
        type: "text",
        defaultValue: "GlassNavVertical.Items.{index}.Press",
        signalSetting: true,
      },
      {
        key: "selectedBase",
        name: "Selected pattern",
        type: "text",
        defaultValue: "GlassNavVertical.Items.{index}.Selected",
        signalSetting: true,
      },
      {
        key: "nameBase",
        name: "Name pattern",
        type: "text",
        defaultValue: "GlassNavVertical.Items.{index}.Name",
        signalSetting: true,
      },
      {
        key: "trackColor",
        name: "Track color",
        type: "color",
        defaultValue: "#1c1f26",
      },
      {
        key: "iconColor",
        name: "Icon color",
        type: "color",
        defaultValue: "#33363d",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "selectedColor",
        name: "Selected color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "selectedIconColor",
        name: "Selected icon color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        min: 0,
        max: 50,
        defaultValue: 16,
      },
      {
        key: "iconSize",
        name: "Icon size",
        type: "number",
        min: 30,
        max: 100,
        defaultValue: 62,
      },
    ],
    signals: [],
    signalGroups: [
      { name: "Icon presses", type: "digital", direction: "output" },
      { name: "Icon selected feedback", type: "digital", direction: "input" },
      { name: "Icon names", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        countKey: "buttonCount",
      },
      {
        name: "Selected range",
        type: "digital",
        direction: "input",
        baseKey: "selectedBase",
        countKey: "buttonCount",
      },
      {
        name: "Name range",
        type: "serial",
        direction: "input",
        baseKey: "nameBase",
        countKey: "buttonCount",
      },
    ],
    template: '<div class="ngn-track"></div>',
    styles:
      commonStyles +
      '[data-component="neumorphic-glass-nav-vertical"]{display:block;width:100%;height:100%;padding:10px}[data-component="neumorphic-glass-nav-vertical"] *{box-sizing:border-box}[data-component="neumorphic-glass-nav-vertical"] .ngn-track{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-around;width:100%;height:100%;padding:.5em 0;border-radius:999px;background:color-mix(in srgb,var(--track-color) 60%,transparent);backdrop-filter:blur(10px) saturate(160%);-webkit-backdrop-filter:blur(10px) saturate(160%);border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 1px rgba(255,255,255,.2),inset 0 -8px 14px rgba(0,0,0,.4),0 10px 22px rgba(0,0,0,.35)}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon{position:relative;flex:0 0 auto;display:grid;place-items:center;width:var(--icon-size-percent);aspect-ratio:1;border:0;border-radius:50%;background:#f2f3f5;color:var(--icon-color);cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.35),inset 0 1px 1px rgba(255,255,255,.7);transform:scale(.82);opacity:.72;transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .3s,background .35s,color .35s,box-shadow .35s}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon-glyph{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .25s}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon-glyph svg{width:48%;height:48%;display:block}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon-selected{opacity:0}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.has-asset .ngn-icon-glyph{display:none}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.active .ngn-icon-regular{opacity:0}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.active .ngn-icon-selected{opacity:1}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.pressed{transform:scale(.7)}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.active{transform:scale(1.18);opacity:1;background:var(--selected-color);color:var(--selected-icon-color);box-shadow:0 6px 18px color-mix(in srgb,var(--selected-color) 55%,transparent),inset 0 1px 1px rgba(255,255,255,.5),0 0 var(--glow-strength-px) color-mix(in srgb,var(--selected-color) 60%,transparent)}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.active.pressed{transform:scale(1.05)}[data-component="neumorphic-glass-nav-vertical"] .ngn-label{position:absolute;top:calc(100% + .35em);left:50%;transform:translateX(-50%);white-space:nowrap;font-weight:700;font-size:var(--label-size-px);color:var(--text-color);pointer-events:none;transition:color .3s;text-shadow:0 1px 3px rgba(0,0,0,.6)}[data-component="neumorphic-glass-nav-vertical"] .ngn-icon.active .ngn-label{color:var(--selected-color)}',
    mount(root, context) {
      const icons = {
          home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12h6v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
          search:
            '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
          camera:
            '<path d="M9 4h6l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>',
          store:
            '<path d="M4 9V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 9h18l-1.5-5h-15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
          bell: '<path d="M6 10a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
          heart:
            '<path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5 6 5c2 0 4 1.5 6 4.5C14 6.5 16 5 18 5c4 0 5.3 4 3.5 7.5C19 16.65 12 21 12 21z" fill="currentColor"/>',
          settings:
            '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
          user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
          plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
          check:
            '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
        },
        p = context.options.properties || {},
        truthy = (value) =>
          value === true ||
          value === 1 ||
          value === "1" ||
          String(value).toLowerCase() === "true",
        address = (base, index) =>
          (p.bindingMode || "contract") === "join"
            ? String((Number(base) || 0) + index)
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index)),
        track = root.querySelector(".ngn-track"),
        iconNames = String(p.buttonIcons ?? "home|store|camera|search").split(
          "|",
        ),
        selectedIconNames = String(
          p.buttonSelectedIcons ?? "home|store|camera|search",
        ).split("|"),
        assetIds = String(p.buttonAssets ?? "").split("|"),
        labelTexts = String(p.buttonLabels ?? "").split("|"),
        count = Math.max(2, Math.min(8, Number(p.buttonCount) || 4));
      for (let index = 0; index < count; index++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ngn-icon";
        if (assetIds[index]) button.classList.add("has-asset");
        const iconKey = iconNames[index] || "home",
          selectedIconKey = selectedIconNames[index] || iconKey,
          defaultLabel = labelTexts[index] || "";
        button.innerHTML = `<span class="ngn-icon-glyph ngn-icon-regular"><svg viewBox="0 0 24 24">${icons[iconKey] || icons.home}</svg></span><span class="ngn-icon-glyph ngn-icon-selected"><svg viewBox="0 0 24 24">${icons[selectedIconKey] || icons.home}</svg></span><span class="ngn-label"></span>`;
        track.appendChild(button);
        const label = button.querySelector(".ngn-label");
        label.textContent = defaultLabel;
        label.style.display = defaultLabel ? "" : "none";
        button.setAttribute("aria-label", defaultLabel || iconKey);
        const down = (event) => {
            button.classList.add("pressed");
            context.signals.publishAddress(
              "digital",
              address(p.pressBase, index),
              true,
            );
            event.preventDefault();
          },
          up = () => {
            button.classList.remove("pressed");
            context.signals.publishAddress(
              "digital",
              address(p.pressBase, index),
              false,
            );
          };
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointerleave", up);
        button.addEventListener("pointercancel", up);
        context.signals.subscribeAddress(
          "digital",
          address(p.selectedBase, index),
          (state) => button.classList.toggle("active", truthy(state)),
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.nameBase, index),
          (value) => {
            if (value != null) {
              const text = String(value);
              label.textContent = text;
              label.style.display = text ? "" : "none";
              button.setAttribute(
                "aria-label",
                text || defaultLabel || iconKey,
              );
            }
          },
        );
      }
    },
  });
  function neoIconNavDefinition(id, name, vertical) {
    return {
      id,
      name,
      category: "Navigation & Menus",
      defaultSize: vertical
        ? { width: 110, height: 320 }
        : { width: 320, height: 120 },
      itemSelector: ".nnb-icon",
      properties: [
        mode,
        {
          key: "buttonCount",
          name: "Number of icons",
          type: "number",
          min: 2,
          max: 8,
          defaultValue: 4,
        },
        {
          key: "buttonIcons",
          name: "Regular icons",
          type: "select-list",
          countKey: "buttonCount",
          itemName: "Button",
          options: Object.keys(glassNavIcons).map((value) => ({
            value,
            label: value[0].toUpperCase() + value.slice(1),
          })),
          defaultItemValue: "home",
          defaultValue: "home|store|camera|search",
        },
        {
          key: "buttonSelectedIcons",
          name: "Selected icons",
          type: "select-list",
          countKey: "buttonCount",
          itemName: "Button",
          options: Object.keys(glassNavIcons).map((value) => ({
            value,
            label: value[0].toUpperCase() + value.slice(1),
          })),
          defaultItemValue: "home",
          defaultValue: "home|store|camera|search",
        },
        {
          key: "buttonAssets",
          name: "Custom image per button",
          type: "asset-list",
          countKey: "buttonCount",
          itemName: "Button",
        },
        {
          key: "buttonLabels",
          name: "Button labels",
          type: "text-list",
          countKey: "buttonCount",
          itemName: "Button",
          defaultValue: "Home|Store|Camera|Search",
        },
        {
          key: "labelSize",
          name: "Label size",
          type: "number",
          min: 8,
          max: 40,
          defaultValue: 13,
        },
        {
          key: "pressBase",
          name: "Press pattern",
          type: "text",
          defaultValue: `${vertical ? "NeoNavVertical" : "NeoNav"}.Items.{index}.Press`,
          signalSetting: true,
        },
        {
          key: "selectedBase",
          name: "Selected pattern",
          type: "text",
          defaultValue: `${vertical ? "NeoNavVertical" : "NeoNav"}.Items.{index}.Selected`,
          signalSetting: true,
        },
        {
          key: "nameBase",
          name: "Name pattern",
          type: "text",
          defaultValue: `${vertical ? "NeoNavVertical" : "NeoNav"}.Items.{index}.Name`,
          signalSetting: true,
        },
        {
          key: "surfaceColor",
          name: "Surface color",
          type: "color",
          defaultValue: "#2c3038",
        },
        {
          key: "shadowDarkColor",
          name: "Dark shadow",
          type: "color",
          defaultValue: "#1a1c21",
        },
        {
          key: "shadowLightColor",
          name: "Light shadow",
          type: "color",
          defaultValue: "#3e444f",
        },
        {
          key: "iconColor",
          name: "Icon color",
          type: "color",
          defaultValue: "#aab2bd",
        },
        {
          key: "textColor",
          name: "Text color",
          type: "color",
          defaultValue: "#ffffff",
        },
        {
          key: "selectedColor",
          name: "Selected color",
          type: "color",
          defaultValue: "#04dcb9",
        },
        {
          key: "glowColor",
          name: "Glow color",
          type: "color",
          defaultValue: "#04dcb9",
        },
        {
          key: "glowStrength",
          name: "Glow strength",
          type: "number",
          min: 0,
          max: 40,
          defaultValue: 6,
        },
        {
          key: "shadowDistance",
          name: "Shadow distance",
          type: "number",
          min: 1,
          max: 20,
          defaultValue: 6,
        },
        {
          key: "iconSize",
          name: "Icon size",
          type: "number",
          min: 30,
          max: 100,
          defaultValue: 62,
        },
      ],
      signals: [],
      signalGroups: [
        { name: "Icon presses", type: "digital", direction: "output" },
        { name: "Icon selected feedback", type: "digital", direction: "input" },
        { name: "Icon names", type: "serial", direction: "input" },
      ],
      rangeBindings: [
        {
          name: "Press range",
          type: "digital",
          direction: "output",
          baseKey: "pressBase",
          countKey: "buttonCount",
        },
        {
          name: "Selected range",
          type: "digital",
          direction: "input",
          baseKey: "selectedBase",
          countKey: "buttonCount",
        },
        {
          name: "Name range",
          type: "serial",
          direction: "input",
          baseKey: "nameBase",
          countKey: "buttonCount",
        },
      ],
      template: '<div class="nnb-track"></div>',
      styles:
        commonStyles +
        `[data-component="${id}"] *{box-sizing:border-box}[data-component="${id}"]{display:block;width:100%;height:100%;padding:10px}[data-component="${id}"] .nnb-track{position:relative;display:flex;${vertical ? "flex-direction:column;" : ""}align-items:center;justify-content:space-around;width:100%;height:100%;padding:${vertical ? ".5em 0" : "0 .5em"};border-radius:999px;background:var(--surface-color);box-shadow:inset calc(var(--shadow-distance-px) * .6) calc(var(--shadow-distance-px) * .6) calc(var(--shadow-distance-px) * 1.2) var(--shadow-dark-color),inset calc(var(--shadow-distance-px) * -.6) calc(var(--shadow-distance-px) * -.6) calc(var(--shadow-distance-px) * 1.2) var(--shadow-light-color)}[data-component="${id}"] .nnb-icon{position:relative;flex:0 0 auto;display:grid;place-items:center;${vertical ? "width" : "height"}:var(--icon-size-percent);aspect-ratio:1;border:0;border-radius:50%;background:var(--surface-color);color:var(--icon-color);cursor:pointer;box-shadow:var(--shadow-distance-px) var(--shadow-distance-px) calc(var(--shadow-distance-px) * 2) var(--shadow-dark-color),calc(var(--shadow-distance-px) * -1) calc(var(--shadow-distance-px) * -1) calc(var(--shadow-distance-px) * 2) var(--shadow-light-color);transition:box-shadow .18s,color .18s,transform .08s}[data-component="${id}"] .nnb-icon-glyph{position:absolute;inset:0;display:grid;place-items:center;transition:opacity .25s}[data-component="${id}"] .nnb-icon-glyph svg{width:48%;height:48%;display:block;stroke:currentColor;fill:none;stroke-width:2}[data-component="${id}"] .nnb-icon-selected{opacity:0}[data-component="${id}"] .nnb-icon.has-asset .nnb-icon-glyph{display:none}[data-component="${id}"] .nnb-icon.active .nnb-icon-regular{opacity:0}[data-component="${id}"] .nnb-icon.active .nnb-icon-selected{opacity:1}[data-component="${id}"] .nnb-icon.pressed,[data-component="${id}"] .nnb-icon.active{box-shadow:inset calc(var(--shadow-distance-px) * .75) calc(var(--shadow-distance-px) * .75) calc(var(--shadow-distance-px) * 1.5) var(--shadow-dark-color),inset calc(var(--shadow-distance-px) * -.75) calc(var(--shadow-distance-px) * -.75) calc(var(--shadow-distance-px) * 1.5) var(--shadow-light-color),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 75%,transparent);color:var(--selected-color)}[data-component="${id}"] .nnb-icon.pressed{transform:scale(.94)}[data-component="${id}"] .nnb-label{position:absolute;top:calc(100% + .35em);left:50%;transform:translateX(-50%);white-space:nowrap;font-weight:700;font-size:var(--label-size-px);color:var(--text-color);pointer-events:none;transition:color .3s}[data-component="${id}"] .nnb-icon.active .nnb-label{color:var(--selected-color)}`,
      mount(root, context) {
        const icons = {
            home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22V12h6v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
            search:
              '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
            camera:
              '<path d="M9 4h6l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>',
            store:
              '<path d="M4 9V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 9h18l-1.5-5h-15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
            bell: '<path d="M6 10a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
            heart:
              '<path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5 6 5c2 0 4 1.5 6 4.5C14 6.5 16 5 18 5c4 0 5.3 4 3.5 7.5C19 16.65 12 21 12 21z" fill="currentColor"/>',
            settings:
              '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
            user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
            plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
            check:
              '<path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
          },
          p = context.options.properties || {},
          truthy = (value) =>
            value === true ||
            value === 1 ||
            value === "1" ||
            String(value).toLowerCase() === "true",
          address = (base, index) =>
            (p.bindingMode || "contract") === "join"
              ? String((Number(base) || 0) + index)
              : String(base || "")
                  .replace(/\{n\}/g, String(index + 1))
                  .replace(/\{index\}/g, String(index)),
          track = root.querySelector(".nnb-track"),
          iconNames = String(p.buttonIcons ?? "home|store|camera|search").split(
            "|",
          ),
          selectedIconNames = String(
            p.buttonSelectedIcons ?? "home|store|camera|search",
          ).split("|"),
          assetIds = String(p.buttonAssets ?? "").split("|"),
          labelTexts = String(p.buttonLabels ?? "").split("|"),
          count = Math.max(2, Math.min(8, Number(p.buttonCount) || 4));
        for (let index = 0; index < count; index++) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "nnb-icon";
          if (assetIds[index]) button.classList.add("has-asset");
          const iconKey = iconNames[index] || "home",
            selectedIconKey = selectedIconNames[index] || iconKey,
            defaultLabel = labelTexts[index] || "";
          button.innerHTML = `<span class="nnb-icon-glyph nnb-icon-regular"><svg viewBox="0 0 24 24">${icons[iconKey] || icons.home}</svg></span><span class="nnb-icon-glyph nnb-icon-selected"><svg viewBox="0 0 24 24">${icons[selectedIconKey] || icons.home}</svg></span><span class="nnb-label"></span>`;
          track.appendChild(button);
          const label = button.querySelector(".nnb-label");
          label.textContent = defaultLabel;
          label.style.display = defaultLabel ? "" : "none";
          button.setAttribute("aria-label", defaultLabel || iconKey);
          const down = (event) => {
              button.classList.add("pressed");
              context.signals.publishAddress(
                "digital",
                address(p.pressBase, index),
                true,
              );
              event.preventDefault();
            },
            up = () => {
              button.classList.remove("pressed");
              context.signals.publishAddress(
                "digital",
                address(p.pressBase, index),
                false,
              );
            };
          button.addEventListener("pointerdown", down);
          button.addEventListener("pointerup", up);
          button.addEventListener("pointerleave", up);
          button.addEventListener("pointercancel", up);
          context.signals.subscribeAddress(
            "digital",
            address(p.selectedBase, index),
            (state) => button.classList.toggle("active", truthy(state)),
          );
          context.signals.subscribeAddress(
            "serial",
            address(p.nameBase, index),
            (value) => {
              if (value != null) {
                const text = String(value);
                label.textContent = text;
                label.style.display = text ? "" : "none";
                button.setAttribute(
                  "aria-label",
                  text || defaultLabel || iconKey,
                );
              }
            },
          );
        }
      },
    };
  }
  runtime.register(
    neoIconNavDefinition("neumorphic-icon-nav", "Neumorphic Icon Nav", false),
  );
  runtime.register(
    neoIconNavDefinition(
      "neumorphic-icon-nav-vertical",
      "Vertical Neumorphic Icon Nav",
      true,
    ),
  );
})(window.ComposerRuntime);
