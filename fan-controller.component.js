(function (runtime) {
  "use strict";

  const countOptions = Array.from({ length: 9 }, (_, index) => ({
    value: String(index),
    label: index === 0 ? "0 — Hide row" : String(index),
  }));
  const defaults = {
    zones: "Bedroom|Lounge|Kitchen|Patio|Office|Dining|Guest|Suite",
    fans: "1|2|3|4|5|6|7|8",
    colors: "Cooler|Neutral|Warmer|Daylight|Warm|Custom 1|Custom 2|Custom 3",
    brightness: "Dim|Light|Bright|25%|50%|75%|Scene|Full",
    timers: "1H|4H|8H|2H|6H|12H|30M|Off",
  };

  const groups = [
    {
      id: "zone",
      title: "ROOM",
      headingKey: "zoneHeading",
      countSignal: "zoneCount",
      countKey: "defaultZoneCount",
      labelsKey: "zoneLabels",
      pressKey: "zonePressBase",
      selectedKey: "zoneSelectedBase",
      nameKey: "zoneNameBase",
      defaults: defaults.zones,
    },
    {
      id: "fan",
      title: "FAN",
      headingKey: "fanHeading",
      countSignal: "fanCount",
      countKey: "defaultFanCount",
      labelsKey: "fanLabels",
      pressKey: "fanPressBase",
      selectedKey: "fanSelectedBase",
      nameKey: "fanNameBase",
      defaults: defaults.fans,
    },
    {
      id: "color",
      title: "LIGHT — COLOR TEMP",
      headingKey: "colorHeading",
      countSignal: "colorCount",
      countKey: "defaultColorCount",
      labelsKey: "colorLabels",
      pressKey: "colorPressBase",
      selectedKey: "colorSelectedBase",
      nameKey: "colorNameBase",
      defaults: defaults.colors,
    },
    {
      id: "brightness",
      title: "LIGHT — BRIGHTNESS",
      headingKey: "brightnessHeading",
      countSignal: "brightnessCount",
      countKey: "defaultBrightnessCount",
      labelsKey: "brightnessLabels",
      pressKey: "brightnessPressBase",
      selectedKey: "brightnessSelectedBase",
      nameKey: "brightnessNameBase",
      defaults: defaults.brightness,
    },
    {
      id: "timer",
      title: "TIMER",
      headingKey: "timerHeading",
      countSignal: "timerCount",
      countKey: "defaultTimerCount",
      labelsKey: "timerLabels",
      pressKey: "timerPressBase",
      selectedKey: "timerSelectedBase",
      nameKey: "timerNameBase",
      defaults: defaults.timers,
    },
  ];

  function signalProperties(group) {
    const title = group.title.replace(/ — /g, " ").toLowerCase();
    return [
      {
        key: group.pressKey,
        name: `${title} Press base / pattern`,
        type: "text",
        defaultValue: `FanController.${group.id}.Items.{index}.Press`,
        signalSetting: true,
      },
      {
        key: group.selectedKey,
        name: `${title} Selected base / pattern`,
        type: "text",
        defaultValue: `FanController.${group.id}.Items.{index}.Selected`,
        signalSetting: true,
      },
      {
        key: group.nameKey,
        name: `${title} Name base / pattern`,
        type: "text",
        defaultValue: `FanController.${group.id}.Items.{index}.Label`,
        signalSetting: true,
      },
    ];
  }

  runtime.register({
    id: "fan-controller",
    name: "Multi-Device Controller",
    category: "Multi-Devices",
    defaultSize: { width: 410, height: 700 },
    signals: [
      ...groups.map((group) => ({
        key: group.countSignal,
        name: `${group.title} button count`,
        type: "analog",
        direction: "input",
        defaultValue: `FanController.${group.id}.Count.Feedback`,
      })),
      {
        key: "powerPress",
        name: "Fan Power Press",
        type: "digital",
        direction: "output",
        defaultValue: "FanController.Power.Press",
      },
      {
        key: "powerSelected",
        name: "Fan Power Selected",
        type: "digital",
        direction: "input",
        defaultValue: "FanController.Power.Selected",
      },
      {
        key: "powerName",
        name: "Fan Power Name",
        type: "serial",
        direction: "input",
        defaultValue: "FanController.Power.Label",
      },
      {
        key: "reversePress",
        name: "Reverse Press",
        type: "digital",
        direction: "output",
        defaultValue: "FanController.Reverse.Press",
      },
      {
        key: "reverseSelected",
        name: "Reverse Selected",
        type: "digital",
        direction: "input",
        defaultValue: "FanController.Reverse.Selected",
      },
      {
        key: "reverseName",
        name: "Reverse Name",
        type: "serial",
        direction: "input",
        defaultValue: "FanController.Reverse.Label",
      },
    ],
    rangeBindings: groups.flatMap((group) => [
      {
        name: `${group.title} digital press range`,
        type: "digital",
        direction: "output",
        baseKey: group.pressKey,
        incrementKey: "signalIncrement",
        countKey: group.countKey,
      },
      {
        name: `${group.title} digital selected range`,
        type: "digital",
        direction: "input",
        baseKey: group.selectedKey,
        incrementKey: "signalIncrement",
        countKey: group.countKey,
      },
      {
        name: `${group.title} serial name range`,
        type: "serial",
        direction: "input",
        baseKey: group.nameKey,
        incrementKey: "signalIncrement",
        countKey: group.countKey,
      },
    ]),
    itemSelector: ".fc-button",
    data: { defaults },
    properties: [
      {
        key: "defaultZoneCount",
        name: "Default room buttons",
        type: "select",
        options: countOptions,
        defaultValue: "2",
        affectsProperties: true,
      },
      {
        key: "zoneHeading",
        name: "Room row heading",
        type: "text",
        defaultValue: "ROOM",
      },
      {
        key: "zoneLabels",
        name: "Local room names",
        type: "text-list",
        countKey: "defaultZoneCount",
        itemName: "Room",
        defaultValue: defaults.zones,
      },
      {
        key: "defaultFanCount",
        name: "Default fan speed buttons",
        type: "select",
        options: countOptions,
        defaultValue: "6",
        affectsProperties: true,
      },
      {
        key: "fanHeading",
        name: "Fan row heading",
        type: "text",
        defaultValue: "FAN",
      },
      {
        key: "fanLabels",
        name: "Local fan speed names",
        type: "text-list",
        countKey: "defaultFanCount",
        itemName: "Speed",
        defaultValue: defaults.fans,
      },
      {
        key: "showPower",
        name: "Show fan power button",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "showReverse",
        name: "Show reverse button",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "powerLabel",
        name: "Local power name",
        type: "text",
        defaultValue: "Power",
      },
      {
        key: "reverseLabel",
        name: "Local reverse name",
        type: "text",
        defaultValue: "Reverse",
      },
      {
        key: "defaultColorCount",
        name: "Default color temperature buttons",
        type: "select",
        options: countOptions,
        defaultValue: "3",
        affectsProperties: true,
      },
      {
        key: "colorHeading",
        name: "Color temperature row heading",
        type: "text",
        defaultValue: "LIGHT — COLOR TEMP",
      },
      {
        key: "colorLabels",
        name: "Local color temperature names",
        type: "text-list",
        countKey: "defaultColorCount",
        itemName: "Color",
        defaultValue: defaults.colors,
      },
      {
        key: "defaultBrightnessCount",
        name: "Default brightness buttons",
        type: "select",
        options: countOptions,
        defaultValue: "3",
        affectsProperties: true,
      },
      {
        key: "brightnessHeading",
        name: "Brightness row heading",
        type: "text",
        defaultValue: "LIGHT — BRIGHTNESS",
      },
      {
        key: "brightnessLabels",
        name: "Local brightness names",
        type: "text-list",
        countKey: "defaultBrightnessCount",
        itemName: "Brightness",
        defaultValue: defaults.brightness,
      },
      {
        key: "defaultTimerCount",
        name: "Default timer buttons",
        type: "select",
        options: countOptions,
        defaultValue: "3",
        affectsProperties: true,
      },
      {
        key: "timerHeading",
        name: "Timer row heading",
        type: "text",
        defaultValue: "TIMER",
      },
      {
        key: "timerLabels",
        name: "Local timer names",
        type: "text-list",
        countKey: "defaultTimerCount",
        itemName: "Timer",
        defaultValue: defaults.timers,
      },
      {
        key: "panelColor",
        name: "Panel color",
        type: "color",
        defaultValue: "#20242c",
      },
      {
        key: "buttonColor",
        name: "Standard button color",
        type: "color",
        defaultValue: "#282d37",
      },
      {
        key: "selectedColor",
        name: "Selected button color",
        type: "color",
        defaultValue: "#11151c",
      },
      {
        key: "textColor",
        name: "Standard text color",
        type: "color",
        defaultValue: "#d7dbe3",
      },
      {
        key: "selectedTextColor",
        name: "Selected text color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "accentColor",
        name: "Accent color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "accentGlowColor",
        name: "Accent glow color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "glowColor",
        name: "Glow color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "textSize",
        name: "Button text size",
        type: "number",
        min: 8,
        max: 36,
        defaultValue: 13,
      },
      {
        key: "headingSize",
        name: "Row heading size",
        type: "number",
        min: 7,
        max: 24,
        defaultValue: 10,
      },
      {
        key: "itemGap",
        name: "Button spacing",
        type: "number",
        min: 0,
        max: 28,
        defaultValue: 8,
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        min: 0,
        max: 40,
        defaultValue: 8,
      },
      {
        key: "wrapText",
        name: "Wrap text",
        type: "checkbox",
        defaultValue: false,
      },
      ...groups.flatMap(signalProperties),
      {
        key: "signalIncrement",
        name: "Join increment",
        type: "number",
        min: 1,
        defaultValue: 1,
        signalSetting: true,
      },
    ],
    template: '<div class="fc-panel"><div class="fc-content"></div></div>',
    styles:
      '[data-component="fan-controller"]{display:block;width:100%;height:100%;padding:0;overflow:visible!important;contain:none!important;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="fan-controller"] *{box-sizing:border-box}[data-component="fan-controller"] .fc-panel{width:100%;height:100%;padding:5%;overflow:auto;border-radius:34px;background:linear-gradient(145deg,color-mix(in srgb,var(--panel-color) 112%,white),var(--panel-color));box-shadow:12px 12px 25px rgba(0,0,0,.35),-8px -8px 20px rgba(255,255,255,.18),0 0 var(--glow-strength-px) var(--glow-color),inset 0 1px rgba(255,255,255,.5);color:var(--text-color)}[data-component="fan-controller"] .fc-content{display:flex;min-height:100%;flex-direction:column;justify-content:space-around;gap:calc(var(--item-gap-px)*1.1)}[data-component="fan-controller"] .fc-section{display:flex;flex-direction:column;gap:5px}[data-component="fan-controller"] .fc-heading{text-align:center;font-size:var(--heading-size-px);font-weight:800;letter-spacing:.18em;opacity:.68}[data-component="fan-controller"] .fc-row{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:var(--item-gap-px)}[data-component="fan-controller"] .fc-button{min-width:0;min-height:38px;padding:7px;border:0;border-radius:999px;background:var(--button-color);box-shadow:4px 4px 8px rgba(0,0,0,.2),-3px -3px 7px rgba(255,255,255,.14);color:var(--text-color);font:750 var(--text-size-px)/1.05 "Segoe UI",sans-serif;cursor:pointer;touch-action:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:transform .12s,background .18s,color .18s,box-shadow .18s}[data-component="fan-controller"].wrap-text .fc-button{white-space:normal;overflow-wrap:anywhere}[data-component="fan-controller"] .fc-button.pressed{transform:scale(.96);box-shadow:inset 3px 3px 7px rgba(0,0,0,.45),inset -2px -2px 5px rgba(255,255,255,.12)}[data-component="fan-controller"] .fc-button.selected{border:1px solid var(--accent-color);background:var(--selected-color);color:var(--selected-text-color);box-shadow:inset 2px 2px 5px rgba(0,0,0,.5),0 0 var(--glow-strength-px) var(--accent-glow-color)}[data-component="fan-controller"] .fc-pill{position:relative;display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));min-height:42px;padding:5px;border-radius:999px;background:color-mix(in srgb,var(--panel-color) 88%,#777);box-shadow:inset 3px 3px 7px rgba(0,0,0,.35),inset -3px -3px 7px rgba(255,255,255,.1);overflow:hidden}[data-component="fan-controller"] .fc-pill-thumb{position:absolute;z-index:0;left:calc(5px + (100% - 10px) / var(--columns) * var(--selected-index));top:5px;width:calc((100% - 10px) / var(--columns));height:calc(100% - 10px);border:1px solid var(--accent-color);border-radius:999px;background:var(--selected-color);box-shadow:3px 3px 7px rgba(0,0,0,.4),0 0 var(--glow-strength-px) color-mix(in srgb,var(--accent-glow-color) 60%,transparent);transition:left .22s ease}[data-component="fan-controller"] .fc-pill .fc-button{position:relative;z-index:1;min-height:32px;padding:5px;background:transparent;box-shadow:none}[data-component="fan-controller"] .fc-pill .fc-button.selected{border:0;background:transparent;box-shadow:none}[data-component="fan-controller"] .fc-fan-stage{position:relative;width:min(84%,260px);aspect-ratio:1;margin:auto;border-radius:50%;background:linear-gradient(145deg,color-mix(in srgb,var(--panel-color) 92%,white),color-mix(in srgb,var(--panel-color) 88%,#111));box-shadow:inset 7px 7px 14px rgba(0,0,0,.35),inset -7px -7px 14px rgba(255,255,255,.08)}[data-component="fan-controller"] .fc-speed{position:absolute;width:19%;aspect-ratio:1;min-height:0;padding:0;transform:translate(-50%,-50%)}[data-component="fan-controller"] .fc-speed.pressed{transform:translate(-50%,-50%) scale(.94)}[data-component="fan-controller"] .fc-power{position:absolute;left:50%;top:50%;width:26%;aspect-ratio:1;min-height:0;padding:0;transform:translate(-50%,-50%);font-size:0}[data-component="fan-controller"] .fc-power:after{content:"";width:35%;height:42%;display:block;margin:auto;border:3px solid currentColor;border-top-color:transparent;border-radius:50%}[data-component="fan-controller"] .fc-power:before{content:"";position:absolute;left:50%;top:27%;width:3px;height:30%;transform:translateX(-50%);background:currentColor;border-radius:4px}[data-component="fan-controller"] .fc-power.pressed{transform:translate(-50%,-50%) scale(.94)}[data-component="fan-controller"] .fc-reverse{align-self:center;min-width:38%;padding-inline:16px}[data-component="fan-controller"] .fc-reverse:before{content:"⇄";margin-right:7px;font-size:1.2em}',
    mount(root, context) {
      const p = context.options.properties || {},
        content = root.querySelector(".fc-content"),
        states = Object.create(null),
        cleanups = [];
      root.style.padding = "4%";
      root.style.setProperty("overflow", "visible", "important");
      root.style.setProperty("contain", "none", "important");
      root.querySelector(".fc-panel").style.boxShadow =
        "12px 12px 25px rgba(0,0,0,.35), -8px -8px 20px rgba(255,255,255,.18), inset 0 1px rgba(255,255,255,.5)";
      const truthy = (value) =>
        value === true ||
        value === 1 ||
        value === "1" ||
        String(value).toLowerCase() === "true";
      const clampCount = (value, fallback) => {
        const number = Number(value);
        return Number.isFinite(number)
          ? Math.max(0, Math.min(8, Math.round(number)))
          : fallback;
      };
      const address = (base, index) =>
        p.bindingMode === "join"
          ? String(
              (Number(base) || 0) +
                index * Math.max(1, Number(p.signalIncrement) || 1),
            )
          : String(base || "")
              .replace(/\{n\}/g, index + 1)
              .replace(/\{index\}/g, index);
      const bindPress = (button, publish) => {
        const down = (event) => {
          button.classList.add("pressed");
          publish(true);
          event.preventDefault();
        };
        const up = () => {
          button.classList.remove("pressed");
          publish(false);
        };
        const unbind = context.interactions?.bindPrimaryPointer
          ? context.interactions.bindPrimaryPointer(button, {
              down,
              up,
              cancel: up,
            })
          : null;
        if (unbind) cleanups.push(unbind);
        else {
          button.addEventListener("pointerdown", down);
          ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
            button.addEventListener(name, up),
          );
        }
      };
      function fixedButton(className, label, pressKey, selectedKey, nameKey) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `fc-button ${className}`;
        button.textContent = label;
        bindPress(button, (value) => context.signals.publish(pressKey, value));
        context.signals.subscribe(selectedKey, (value) =>
          button.classList.toggle("selected", truthy(value)),
        );
        context.signals.subscribe(nameKey, (value) => {
          if (value != null && String(value) !== "") {
            button.dataset.name = String(value);
            if (!className.includes("fc-power"))
              button.textContent = String(value);
          }
        });
        return button;
      }
      function makeSection(group, count) {
        const section = document.createElement("section");
        section.className = `fc-section fc-${group.id}-section`;
        section.dataset.group = group.id;
        if (!count) {
          section.hidden = true;
          return section;
        }
        const labels = String(p[group.labelsKey] || group.defaults).split("|");
        const heading = document.createElement("div");
        heading.className = "fc-heading";
        heading.textContent =
          p[group.headingKey] == null
            ? group.title
            : String(p[group.headingKey]);
        heading.hidden = heading.textContent === "";
        section.appendChild(heading);
        const holder = document.createElement("div");
        holder.className =
          group.id === "zone"
            ? "fc-pill"
            : group.id === "fan"
              ? "fc-fan-stage"
              : "fc-row";
        holder.style.setProperty(
          "--columns",
          String(group.id === "fan" ? count : Math.min(count, 4)),
        );
        const rows = [],
          select = (index, active) => {
            states[group.id] = active
              ? index
              : states[group.id] === index
                ? -1
                : states[group.id];
            rows.forEach((row, i) =>
              row.classList.toggle("selected", i === states[group.id]),
            );
            if (group.id === "zone")
              holder.style.setProperty(
                "--selected-index",
                String(Math.max(0, states[group.id] || 0)),
              );
          };
        if (group.id === "zone") {
          const thumb = document.createElement("span");
          thumb.className = "fc-pill-thumb";
          holder.appendChild(thumb);
        }
        for (let index = 0; index < count; index += 1) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `fc-button${group.id === "fan" ? " fc-speed" : ""}`;
          button.textContent = labels[index] || "";
          if (group.id === "fan") {
            const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;
            button.style.left = `${50 + Math.cos(angle) * 37}%`;
            button.style.top = `${50 + Math.sin(angle) * 37}%`;
          }
          bindPress(button, (value) =>
            context.signals.publishAddress(
              "digital",
              address(p[group.pressKey], index),
              value,
            ),
          );
          context.signals.subscribeAddress(
            "digital",
            address(p[group.selectedKey], index),
            (value) => select(index, truthy(value)),
          );
          context.signals.subscribeAddress(
            "serial",
            address(p[group.nameKey], index),
            (value) => {
              if (value != null && String(value) !== "")
                button.textContent = String(value);
            },
          );
          holder.appendChild(button);
          rows.push(button);
        }
        if (group.id === "fan" && truthy(p.showPower))
          holder.appendChild(
            fixedButton(
              "fc-power",
              p.powerLabel || "Power",
              "powerPress",
              "powerSelected",
              "powerName",
            ),
          );
        section.appendChild(holder);
        if (group.id === "fan" && truthy(p.showReverse)) {
          const reverse = fixedButton(
            "fc-reverse",
            p.reverseLabel || "Reverse",
            "reversePress",
            "reverseSelected",
            "reverseName",
          );
          reverse.style.marginTop = "14px";
          section.appendChild(reverse);
        }
        return section;
      }
      function render() {
        content.innerHTML = "";
        groups.forEach((group) =>
          content.appendChild(makeSection(group, states[`${group.id}Count`])),
        );
      }
      groups.forEach((group) => {
        states[`${group.id}Count`] = clampCount(p[group.countKey], 0);
        context.signals.subscribe(group.countSignal, (value) => {
          states[`${group.id}Count`] = clampCount(
            value,
            states[`${group.id}Count`],
          );
          render();
        });
      });
      render();
      return () => cleanups.forEach((cleanup) => cleanup());
    },
  });
})(window.ComposerRuntime);
