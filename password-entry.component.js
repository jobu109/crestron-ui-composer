(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "password-entry",
    name: "Password Entry",
    category: "Text & Input",
    defaultSize: { width: 420, height: 300 },
    signals: [
      {
        key: "backspace",
        name: "Backspace",
        type: "digital",
        direction: "output",
        defaultValue: "Password.Backspace",
      },
      {
        key: "clear",
        name: "Clear",
        type: "digital",
        direction: "output",
        defaultValue: "Password.Clear",
      },
      {
        key: "enter",
        name: "Enter",
        type: "digital",
        direction: "output",
        defaultValue: "Password.Enter",
      },
      {
        key: "correct",
        name: "Correct password",
        type: "digital",
        direction: "input",
        defaultValue: "Password.Correct",
      },
      {
        key: "wrong",
        name: "Wrong password",
        type: "digital",
        direction: "input",
        defaultValue: "Password.Wrong",
      },
      {
        key: "password",
        name: "Entered password",
        type: "serial",
        direction: "output",
        defaultValue: "Password.Value",
      },
    ],
    rangeBindings: [
      {
        name: "Digital digit press range (0-9)",
        type: "digital",
        direction: "output",
        baseKey: "digitBase",
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
        key: "digitBase",
        name: "Digit press base / pattern",
        type: "text",
        defaultValue: "Password.Digits.{index}.Press",
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
        key: "maxDigits",
        name: "Maximum digits",
        type: "number",
        defaultValue: 8,
      },
      {
        key: "maskCharacter",
        name: "Mask character",
        type: "text",
        defaultValue: "*",
      },
      {
        key: "showEyeToggle",
        name: "Show password visibility eye",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "eyeColor",
        name: "Password eye color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "eyeSize",
        name: "Password eye size (px)",
        type: "number",
        min: 12,
        max: 96,
        defaultValue: 30,
      },
      {
        key: "clearText",
        name: "Clear text",
        type: "text",
        defaultValue: "CLEAR",
      },
      {
        key: "backText",
        name: "Backspace text",
        type: "text",
        defaultValue: "BACK",
      },
      {
        key: "enterText",
        name: "Enter text",
        type: "text",
        defaultValue: "ENTER",
      },
      {
        key: "correctText",
        name: "Correct message",
        type: "text",
        defaultValue: "CORRECT",
      },
      {
        key: "wrongText",
        name: "Wrong message",
        type: "text",
        defaultValue: "INCORRECT, TRY AGAIN",
      },
      {
        key: "buttonColor",
        name: "Button color",
        type: "color",
        defaultValue: "#a0a0a0",
      },
      {
        key: "actionColor",
        name: "Action button color",
        type: "color",
        defaultValue: "#787878",
      },
      {
        key: "accentColor",
        name: "Enter/accent color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "successColor",
        name: "Success color",
        type: "color",
        defaultValue: "#2ebe6c",
      },
      {
        key: "errorColor",
        name: "Error color",
        type: "color",
        defaultValue: "#d22d2d",
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
        key: "digitTextSize",
        name: "Digit text size (px)",
        type: "number",
        defaultValue: 46,
      },
      {
        key: "actionTextSize",
        name: "Action text size (px)",
        type: "number",
        defaultValue: 22,
      },
      {
        key: "displayTextSize",
        name: "Display text size (px)",
        type: "number",
        defaultValue: 42,
      },
    ],
    template:
      '<div class="pw-root"><div class="pw-keypad"><div class="pw-display"><span class="pw-value"></span><button class="pw-eye" type="button" aria-label="Show password" aria-pressed="false"><svg class="pw-eye-open" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="pw-eye-closed" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A11 11 0 0112 5c7 0 11 7 11 7a13.2 13.2 0 01-3 3.6M6.5 6.6C3.6 8.5 1 12 1 12s4 7 11 7a10 10 0 004-.8"/></svg></button></div><div class="pw-grid"></div><div class="pw-enter-row"><button class="pw-enter"></button><div class="pw-message"></div></div></div></div>',
    styles:
      '[data-component="password-entry"],[data-component="password-entry"] *{box-sizing:border-box}[data-component="password-entry"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.pw-root{width:100%;height:100%;padding:5%;overflow:hidden}.pw-keypad{position:relative;width:100%;height:100%;display:grid;grid-template-rows:minmax(48px,.9fr) 4fr 1fr;gap:clamp(6px,2vmin,12px)}.pw-display{position:relative;border-radius:8px;background:color-mix(in srgb,var(--button-color) 28%,transparent);border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 0 14px rgba(255,255,255,.08),0 0 12px color-mix(in srgb,var(--glow-color) 45%,transparent);display:flex;align-items:center;justify-content:center;color:var(--text-color);font-size:var(--display-text-size-px);font-weight:700;overflow:hidden}.pw-value{max-width:calc(100% - var(--eye-size-px,30px) - 28px);overflow:hidden;letter-spacing:.18em;text-overflow:ellipsis;white-space:nowrap}.pw-eye{position:absolute;right:10px;top:50%;width:calc(var(--eye-size-px,30px) + 10px);height:calc(var(--eye-size-px,30px) + 10px);padding:5px;transform:translateY(-50%);border:0;background:transparent;color:var(--eye-color);cursor:pointer;touch-action:manipulation}.pw-eye svg{position:absolute;inset:5px;width:var(--eye-size-px,30px);height:var(--eye-size-px,30px);fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:opacity .15s ease,transform .15s ease}.pw-eye .pw-eye-open{opacity:0;transform:scale(.82)}.pw-eye.visible .pw-eye-open{opacity:1;transform:scale(1)}.pw-eye.visible .pw-eye-closed{opacity:0;transform:scale(.82)}.pw-eye.hidden-control{display:none}.pw-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr);gap:clamp(6px,2vmin,12px)}.pw-button,.pw-enter{border:1px solid rgba(255,255,255,.24);border-radius:8px;background:color-mix(in srgb,var(--button-color) 42%,transparent);color:var(--text-color);box-shadow:0 0 10px color-mix(in srgb,var(--glow-color) 35%,transparent);font:700 var(--digit-text-size-px)/1 "Segoe UI",sans-serif;cursor:pointer}.pw-button.action{font-size:var(--action-text-size-px);background:color-mix(in srgb,var(--action-color) 48%,transparent)}.pw-button.pressed,.pw-enter.pressed{transform:scale(.96);background:color-mix(in srgb,var(--accent-color) 72%,transparent);box-shadow:0 0 24px var(--glow-color)}.pw-enter-row{display:grid}.pw-enter{width:100%;height:100%;background:color-mix(in srgb,var(--accent-color) 62%,transparent);font-size:var(--action-text-size-px);box-shadow:0 0 18px color-mix(in srgb,var(--glow-color) 78%,transparent)}.pw-message{display:none;color:var(--text-color);font-size:var(--action-text-size-px);font-weight:900;text-align:center}.pw-keypad.success .pw-display,.pw-keypad.error .pw-display,.pw-keypad.success .pw-grid,.pw-keypad.error .pw-grid{opacity:0;pointer-events:none}.pw-keypad.success .pw-enter-row,.pw-keypad.error .pw-enter-row{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}.pw-keypad.success .pw-enter,.pw-keypad.error .pw-enter{width:min(62vw,62vh,220px);height:min(62vw,62vh,220px);border-radius:50%;padding:18%}.pw-keypad.success .pw-enter{background:var(--success-color);box-shadow:0 0 34px var(--success-color)}.pw-keypad.error .pw-enter{background:var(--error-color);box-shadow:0 0 34px var(--error-color)}.pw-keypad.success .pw-message,.pw-keypad.error .pw-message{display:block}',
    mount(root, context) {
      const p = context.options.properties || {},
        keypad = root.querySelector(".pw-keypad"),
        display = root.querySelector(".pw-display"),
        displayValue = root.querySelector(".pw-value"),
        eye = root.querySelector(".pw-eye"),
        grid = root.querySelector(".pw-grid"),
        enter = root.querySelector(".pw-enter"),
        message = root.querySelector(".pw-message");
      let value = "",
        correct = false,
        wrong = false,
        passwordVisible = false;
      const addr = (i) =>
        p.bindingMode === "join"
          ? String(
              (Number(p.digitBase) || 0) + i * (Number(p.signalIncrement) || 1),
            )
          : String(p.digitBase || "")
              .replace(/\{n\}/g, i + 1)
              .replace(/\{index\}/g, i);
      function publish() {
        displayValue.textContent = passwordVisible
          ? value
          : String(p.maskCharacter || "*").repeat(value.length);
        context.signals.publish("password", value);
      }
      const showEye = p.showEyeToggle !== false && p.showEyeToggle !== 0 && p.showEyeToggle !== "0" && String(p.showEyeToggle).toLowerCase() !== "false";
      eye.classList.toggle("hidden-control", !showEye);
      eye.addEventListener("pointerdown", (event) => { event.stopPropagation(); event.preventDefault(); });
      eye.addEventListener("click", (event) => {
        event.stopPropagation();
        passwordVisible = !passwordVisible;
        eye.classList.toggle("visible", passwordVisible);
        eye.setAttribute("aria-pressed", String(passwordVisible));
        eye.setAttribute("aria-label", passwordVisible ? "Hide password" : "Show password");
        publish();
      });
      function pulse(key) {
        context.signals.publish(key, true);
        setTimeout(() => context.signals.publish(key, false), 100);
      }
      function state() {
        keypad.classList.toggle("success", correct);
        keypad.classList.toggle("error", !correct && wrong);
        if (correct) {
          enter.style.padding = "5%";
          enter.innerHTML =
            '<svg viewBox="0 0 58 45" width="90%" height="90%"><path fill="currentColor" d="M19 44L0 26l6-6 13 13L52 0l6 6z"/></svg>';
          message.textContent = p.correctText || "CORRECT";
        } else if (wrong) {
          enter.style.padding = "5%";
          enter.innerHTML =
            '<svg viewBox="0 0 48 48" width="90%" height="90%"><path fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" d="M9 9l30 30M39 9L9 39"/></svg>';
          message.textContent = p.wrongText || "INCORRECT, TRY AGAIN";
        } else {
          enter.style.padding = "";
          enter.textContent = p.enterText || "ENTER";
          message.textContent = "";
        }
        if (correct || wrong) {
          value = "";
          publish();
        }
      }
      function press(button, fn) {
        button.addEventListener("pointerdown", (e) => {
          button.classList.add("pressed");
          fn();
          e.preventDefault();
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach((n) =>
          button.addEventListener(n, () => button.classList.remove("pressed")),
        );
      }
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
        [p.clearText || "CLEAR", "clear"],
        ["0"],
        [p.backText || "BACK", "back"],
      ].forEach((spec) => {
        const b = document.createElement("button");
        b.className = "pw-button" + (spec[1] ? " action" : "");
        b.textContent = spec[0];
        press(b, () => {
          if (correct || wrong) return;
          if (spec[1] === "clear") {
            value = "";
            pulse("clear");
          } else if (spec[1] === "back") {
            value = value.slice(0, -1);
            pulse("backspace");
            } else {
              if (value.length < (Number(p.maxDigits) || 8)) value += spec[0];
              const a = addr(Number(spec[0]));
              context.signals.publishAddress("digital", a, true);
            setTimeout(
              () => context.signals.publishAddress("digital", a, false),
              100,
            );
          }
          publish();
        });
        grid.appendChild(b);
      });
      press(enter, () => {
        if (!correct && !wrong) {
          publish();
          pulse("enter");
        }
      });
      context.signals.subscribe("correct", (v) => {
        correct = v === true || v === 1 || v === "1";
        state();
      });
      context.signals.subscribe("wrong", (v) => {
        wrong = v === true || v === 1 || v === "1";
        state();
      });
      publish();
      state();
    },
  });
})(window);
