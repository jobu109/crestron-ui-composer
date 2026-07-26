(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "directional-pad",
    name: "Directional Pad",
    category: "Navigation & Menus",
    defaultSize: { width: 280, height: 280 },
    signals: [],
    signalGroups: [
      { name: "Directional press range", type: "digital", direction: "output" },
      {
        name: "Directional feedback range",
        type: "digital",
        direction: "input",
      },
      { name: "Directional label range", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Digital directional press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        countKey: "buttonCount",
        incrementKey: "signalIncrement",
      },
      {
        name: "Digital directional feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        countKey: "buttonCount",
        incrementKey: "signalIncrement",
      },
      {
        name: "Serial directional label range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        countKey: "buttonCount",
        incrementKey: "signalIncrement",
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
        key: "buttonLabels",
        name: "Local button labels",
        type: "text-list",
        countKey: "buttonCount",
        itemName: "Direction",
        defaultValue: "Up|Down|Left|Right|Home",
      },
      {
        key: "buttonCount",
        name: "Buttons",
        type: "number",
        min: 5,
        max: 5,
        defaultValue: 5,
        signalSetting: true,
      },
      {
        key: "directionDisplay",
        name: "Directional button display",
        type: "select",
        options: [
          { value: "icon", label: "Icon" },
          { value: "text", label: "Text / serial Name" },
          { value: "blank", label: "Blank" },
        ],
        defaultValue: "icon",
      },
      {
        key: "centerDisplay",
        name: "Center button display",
        type: "select",
        options: [
          { value: "icon", label: "Icon" },
          { value: "text", label: "Text / serial Name" },
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
        defaultValue: "home",
        visibleWhen: { key: "centerDisplay", equals: "icon" },
      },
      {
        key: "centerText",
        name: "Center button text",
        type: "text",
        defaultValue: "Home",
        visibleWhen: { key: "centerDisplay", equals: "text" },
      },
      {
        key: "pressBase",
        name: "Press base / pattern",
        type: "text",
        defaultValue: "DirectionalPad.Buttons.{n}.Press",
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Selected base / pattern",
        type: "text",
        defaultValue: "DirectionalPad.Buttons.{n}.Selected",
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Name base / pattern",
        type: "text",
        defaultValue: "DirectionalPad.Buttons.{n}.Label",
        signalSetting: true,
      },
      {
        key: "signalIncrement",
        name: "Join increment",
        type: "number",
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "iconColor",
        name: "Icon color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "faceColor",
        name: "Button tint",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "borderColor",
        name: "Border color",
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
        key: "activeColor",
        name: "Active tint",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "iconSize",
        name: "Icon size (%)",
        type: "number",
        defaultValue: 70,
      },
      {
        key: "textSize",
        name: "Text size",
        type: "number",
        min: 8,
        max: 64,
        defaultValue: 26,
      },
    ],
    template:
      '<div class="dpad-wrapper"><i></i><button class="dpad-button" data-key="up" type="button"><svg class="dpad-button-icon" viewBox="0 0 24 24"><path d="M12 5l-8 8h5v6h6v-6h5z" fill="currentColor"></path></svg></button><i></i><button class="dpad-button" data-key="left" type="button"><svg class="dpad-button-icon" viewBox="0 0 24 24"><path d="M5 12l8-8v5h6v6h-6v5z" fill="currentColor"></path></svg></button><button class="dpad-button" data-key="home" type="button"><svg class="dpad-button-icon" viewBox="0 0 24 24"><path d="M3 11.5L12 4l9 7.5M6.5 10.5V20h11v-9.5M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button><button class="dpad-button" data-key="right" type="button"><svg class="dpad-button-icon" viewBox="0 0 24 24"><path d="M19 12l-8 8v-5H5V9h6V4z" fill="currentColor"></path></svg></button><i></i><button class="dpad-button" data-key="down" type="button"><svg class="dpad-button-icon" viewBox="0 0 24 24"><path d="M12 19l8-8h-5V5H9v6H4z" fill="currentColor"></path></svg></button><i></i></div>',
    styles:
      '[data-component="directional-pad"]{display:block;width:100%;height:100%;box-sizing:border-box}[data-component="directional-pad"] *{box-sizing:border-box}[data-component="directional-pad"] .dpad-wrapper{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:clamp(4px,2vmin,12px);padding:clamp(4px,2vmin,12px);overflow:hidden}[data-component="directional-pad"] .dpad-wrapper>i{min-width:0;min-height:0}[data-component="directional-pad"] .dpad-button{width:100%;height:100%;min-width:28px;min-height:28px;padding:18%;border:1px solid color-mix(in srgb,var(--border-color) 36%,transparent);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(52,68,68,.26) 42%,color-mix(in srgb,var(--face-color) 16%,transparent));box-shadow:inset 0 1px rgba(255,255,255,.42),inset 0 -14px 26px color-mix(in srgb,var(--face-color) 10%,transparent),0 0 8px color-mix(in srgb,var(--glow-color) 32%,transparent),0 4px 8px rgba(0,0,0,.2);position:relative;overflow:hidden;cursor:pointer;color:var(--icon-color)}[data-component="directional-pad"] .dpad-button:before{content:"";position:absolute;inset:1px;border-radius:22px;background:linear-gradient(120deg,rgba(255,255,255,.22),rgba(255,255,255,.06) 34%,transparent 58%)}[data-component="directional-pad"] .dpad-button-icon{width:var(--icon-size-percent);height:var(--icon-size-percent);position:relative;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 0 8px rgba(255,255,255,.28))}[data-component="directional-pad"] .dpad-button-text{position:relative;z-index:1;font-size:var(--text-size-px);font-weight:700;line-height:1;text-align:center}[data-component="directional-pad"] .dpad-button.pressed{transform:scale(.94);filter:brightness(1.12)}[data-component="directional-pad"] .dpad-button.active{border-color:var(--active-color);background:linear-gradient(145deg,rgba(255,255,255,.28),rgba(52,68,68,.24) 38%,color-mix(in srgb,var(--active-color) 36%,transparent));box-shadow:inset 0 1px rgba(255,255,255,.46),0 0 16px color-mix(in srgb,var(--glow-color) 72%,transparent),0 4px 8px rgba(0,0,0,.2)}',
    mount(root, context) {
      const p = context.options.properties || {},
        order = ["up", "down", "left", "right", "home"],
        labels = String(p.buttonLabels || "Up|Down|Left|Right|Home").split("|"),
        originalMarkup = new Map(),
        centerIcons = {
          power: "⏻",
          home: "⌂",
          play: "▶",
          pause: "Ⅱ",
          stop: "■",
          check: "✓",
        };
      function address(base, index) {
        if ((p.bindingMode || "contract") === "join")
          return String(
            (Number(base) || 0) + index * (Number(p.signalIncrement) || 1),
          );
        return String(base || "")
          .replace(/\{n\}/g, String(index + 1))
          .replace(/\{index\}/g, String(index));
      }
      order.forEach((name, index) => {
        const button = root.querySelector('[data-key="' + name + '"]'),
          isCenter = name === "home",
          label = (isCenter && p.centerText) || labels[index] || name;
        originalMarkup.set(button, button.innerHTML);
        function renderContent(value = label) {
          const display = isCenter
            ? p.centerDisplay || "icon"
            : p.directionDisplay || "icon";
          if (display === "blank") button.textContent = "";
          else if (display === "text") {
            button.innerHTML = '<span class="dpad-button-text"></span>';
            button.firstElementChild.textContent =
              isCenter && !value ? p.centerText || "Home" : value;
          } else if (isCenter) {
            button.innerHTML = '<span class="dpad-button-text"></span>';
            button.firstElementChild.textContent =
              centerIcons[p.centerIcon || "home"] || "⌂";
          } else button.innerHTML = originalMarkup.get(button);
        }
        renderContent(
          isCenter && p.centerDisplay === "text"
            ? p.centerText || label
            : label,
        );
        button.setAttribute("aria-label", label);
        function down(e) {
          button.classList.add("pressed");
          context.signals.publishAddress(
            "digital",
            address(p.pressBase, index),
            true,
          );
          e.preventDefault();
        }
        function up() {
          button.classList.remove("pressed");
          context.signals.publishAddress(
            "digital",
            address(p.pressBase, index),
            false,
          );
        }
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointerleave", up);
        button.addEventListener("pointercancel", up);
        context.signals.subscribeAddress(
          "digital",
          address(p.feedbackBase, index),
          (v) =>
            button.classList.toggle(
              "active",
              v === true || v === 1 || v === "1",
            ),
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.labelBase, index),
          (v) => {
            const value = String(v || label);
            button.setAttribute("aria-label", value);
            if ((isCenter ? p.centerDisplay : p.directionDisplay) === "text")
              renderContent(value);
          },
        );
      });
    },
  });
})(window);
