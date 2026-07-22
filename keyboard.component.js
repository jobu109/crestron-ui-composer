(function (global) {
  "use strict";
  const rows = [
    [
      ["1"],
      ["2"],
      ["3"],
      ["4"],
      ["5"],
      ["6"],
      ["7"],
      ["8"],
      ["9"],
      ["0"],
      ["BACK", "backspace", "wide"],
    ],
    [
      ["TAB", "value", "wide"],
      ["Q"],
      ["W"],
      ["E"],
      ["R"],
      ["T"],
      ["Y"],
      ["U"],
      ["I"],
      ["O"],
      ["P"],
    ],
    [
      ["CAPS", "caps", "xwide"],
      ["A"],
      ["S"],
      ["D"],
      ["F"],
      ["G"],
      ["H"],
      ["J"],
      ["K"],
      ["L"],
      ["ENTER", "enter", "xwide"],
    ],
    [
      ["SHIFT", "shift", "xwide"],
      ["Z"],
      ["X"],
      ["C"],
      ["V"],
      ["B"],
      ["N"],
      ["M"],
      ["."],
      ["SHIFT", "shift", "xwide"],
    ],
    [
      [",", "value", "wide"],
      ["-", "value", "wide"],
      ["SPACE", "space", "space"],
      ["_", "value", "wide"],
      ["@", "value", "wide"],
    ],
  ];
  global.ComposerRuntime.register({
    id: "keyboard",
    name: "Keyboard",
    category: "Text & Input",
    defaultSize: { width: 720, height: 340 },
    signals: [
      {
        key: "text",
        name: "Typed text",
        type: "serial",
        direction: "output",
        defaultValue: "Keyboard.Text",
      },
      {
        key: "enter",
        name: "Enter press",
        type: "digital",
        direction: "output",
        defaultValue: "Keyboard.Enter",
      },
    ],
    data: { rows },
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
        key: "backText",
        name: "Backspace text",
        type: "text",
        defaultValue: "BACK",
      },
      { key: "tabText", name: "Tab text", type: "text", defaultValue: "TAB" },
      {
        key: "capsText",
        name: "Caps text",
        type: "text",
        defaultValue: "CAPS",
      },
      {
        key: "enterText",
        name: "Enter text",
        type: "text",
        defaultValue: "ENTER",
      },
      {
        key: "shiftText",
        name: "Shift text",
        type: "text",
        defaultValue: "SHIFT",
      },
      {
        key: "spaceText",
        name: "Space text",
        type: "text",
        defaultValue: "SPACE",
      },
      {
        key: "clearAfterEnter",
        name: "Clear after Enter",
        type: "select",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        defaultValue: "yes",
      },
      {
        key: "panelColor",
        name: "Keyboard panel color",
        type: "color",
        defaultValue: "#141a1a",
      },
      {
        key: "keyColor",
        name: "Key color",
        type: "color",
        defaultValue: "#1c2020",
      },
      {
        key: "keyTextColor",
        name: "Key text color",
        type: "color",
        defaultValue: "#04dcb9",
      },
      {
        key: "activeColor",
        name: "Active key color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "activeTextColor",
        name: "Active text color",
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
        name: "Key text size (px)",
        type: "number",
        defaultValue: 20,
      },
      {
        key: "specialTextSize",
        name: "Special-key text size (px)",
        type: "number",
        defaultValue: 14,
      },
      {
        key: "cornerRadius",
        name: "Corner radius (px)",
        type: "number",
        defaultValue: 14,
      },
    ],
    template:
      '<div class="kb-root"><div class="kb-board"><div class="kb-inner"></div></div></div>',
    styles:
      '[data-component="keyboard"],[data-component="keyboard"] *{box-sizing:border-box}[data-component="keyboard"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.kb-root{width:100%;height:100%;padding:clamp(6px,2vmin,16px)}.kb-board{width:100%;height:100%;min-width:260px;min-height:150px;padding:clamp(6px,2vmin,14px);border-radius:var(--corner-radius-px);background:linear-gradient(145deg,color-mix(in srgb,var(--panel-color) 85%,#333),var(--panel-color));box-shadow:inset 0 -10px 24px rgba(0,0,0,.72),0 0 14px color-mix(in srgb,var(--glow-color) 28%,transparent);overflow:hidden}.kb-inner{width:100%;height:100%;padding:clamp(5px,1.5vmin,10px);border-radius:calc(var(--corner-radius-px)*.55);background:rgba(10,14,14,.55);box-shadow:inset 0 6px 12px rgba(0,0,0,.72);display:grid;grid-template-rows:repeat(5,1fr);gap:clamp(4px,1.1vmin,8px)}.kb-row{display:flex;gap:clamp(4px,1.1vmin,8px);min-height:0}.kb-keybox{flex:1 1 0;min-width:0;height:100%;padding:2px 2px 5px;border-radius:6px;background:color-mix(in srgb,var(--glow-color) 18%,transparent);box-shadow:0 0 8px color-mix(in srgb,var(--glow-color) 24%,transparent)}.kb-key{width:100%;height:100%;border:1px solid color-mix(in srgb,var(--glow-color) 28%,transparent);border-radius:5px;background:linear-gradient(145deg,color-mix(in srgb,var(--key-color) 80%,#444),var(--key-color));color:var(--key-text-color);text-shadow:0 0 6px color-mix(in srgb,var(--key-text-color) 58%,transparent),0 0 14px color-mix(in srgb,var(--glow-color) 36%,transparent);box-shadow:0 5px rgba(0,0,0,.62),inset 0 1px rgba(255,255,255,.08);font:800 var(--text-size-px)/1 "Segoe UI",sans-serif;cursor:pointer}.kb-key.special{font-size:var(--special-text-size-px)}.kb-key.pressed,.kb-key.toggle{transform:translateY(2px) scale(.97);color:var(--active-text-color);border-color:white;background:linear-gradient(145deg,rgba(255,255,255,.3),color-mix(in srgb,var(--active-color) 82%,transparent),var(--active-color));box-shadow:0 0 18px var(--glow-color),inset 0 2px 8px rgba(0,0,0,.56)}.kb-keybox.wide{flex-grow:1.55}.kb-keybox.xwide{flex-grow:2.15}.kb-keybox.space{flex-grow:5.6}',
    mount(root, context) {
      const p = context.options.properties || {},
        host = root.querySelector(".kb-inner");
      let typed = "",
        caps = false,
        shift = false,
        shiftButtons = [],
        capsButton;
      const names = {
        BACK: p.backText || "BACK",
        TAB: p.tabText || "TAB",
        CAPS: p.capsText || "CAPS",
        ENTER: p.enterText || "ENTER",
        SHIFT: p.shiftText || "SHIFT",
        SPACE: p.spaceText || "SPACE",
      };
      function publish() {
        context.signals.publish("text", typed);
      }
      function toggles() {
        capsButton && capsButton.classList.toggle("toggle", caps);
        shiftButtons.forEach((b) => b.classList.toggle("toggle", shift));
      }
      function use(button, value, action) {
        if (action === "backspace") typed = typed.slice(0, -1);
        else if (action === "space") typed += " ";
        else if (action === "caps") {
          caps = !caps;
          toggles();
          return;
        } else if (action === "shift") {
          shift = !shift;
          toggles();
          return;
        } else if (action === "enter") {
          publish();
          context.signals.publish("enter", true);
          setTimeout(() => context.signals.publish("enter", false), 100);
          if (p.clearAfterEnter !== "no")
            setTimeout(() => {
              typed = "";
              publish();
            }, 120);
          return;
        } else {
          let text = value === "TAB" ? " " : value;
          if (/^[A-Z]$/.test(text))
            text = caps || shift ? text : text.toLowerCase();
          typed += text;
          if (shift) {
            shift = false;
            toggles();
          }
        }
        publish();
      }
      rows.forEach((row) => {
        const rowEl = document.createElement("div");
        rowEl.className = "kb-row";
        row.forEach((spec) => {
          let value = spec[0],
            action = spec[1] || "value",
            size = spec[2] || "",
            box = document.createElement("div"),
            button = document.createElement("button");
          box.className = "kb-keybox " + size;
          button.type = "button";
          button.className = "kb-key" + (action !== "value" ? " special" : "");
          button.textContent = names[value] || value;
          button.style.position = "relative";
          button.style.overflow = "hidden";
          button.addEventListener("pointerdown", (e) => {
            button.classList.add("pressed");
            const wave = document.createElement("span");
            Object.assign(wave.style, {
              position: "absolute",
              inset: "-35%",
              borderRadius: "50%",
              pointerEvents: "none",
              background:
                "radial-gradient(circle,rgba(255,255,255,.86),color-mix(in srgb,var(--key-text-color) 52%,transparent) 22%,color-mix(in srgb,var(--glow-color) 18%,transparent) 46%,transparent 64%)",
            });
            button.appendChild(wave);
            wave
              .animate(
                [
                  { opacity: 1, transform: "scale(.2)" },
                  { opacity: 0, transform: "scale(1.75)" },
                ],
                { duration: 480, easing: "ease-out" },
              )
              .addEventListener("finish", () => wave.remove());
            use(button, value, action);
            e.preventDefault();
          });
          ["pointerup", "pointerleave", "pointercancel"].forEach((n) =>
            button.addEventListener(n, () =>
              button.classList.remove("pressed"),
            ),
          );
          if (action === "caps") capsButton = button;
          if (action === "shift") shiftButtons.push(button);
          box.appendChild(button);
          rowEl.appendChild(box);
        });
        host.appendChild(rowEl);
      });
      publish();
    },
  });
})(window);
