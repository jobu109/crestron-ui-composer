(function (runtime) {
  "use strict";

  const REFERENCE_SIZE = 200;

  runtime.register({
    id: "number-stepper",
    name: "Number Stepper",
    category: "Sliders & Levels",
    defaultSize: { width: 380, height: 200 },
    signals: [
      { key: "add", name: "Add press", type: "digital", direction: "output", defaultValue: "NumberStepper.Add", simulatorSelector: ".nst-plus" },
      { key: "subtract", name: "Subtract press", type: "digital", direction: "output", defaultValue: "NumberStepper.Subtract", simulatorSelector: ".nst-minus" },
      { key: "setCount", name: "Set count", type: "analog", direction: "input", defaultValue: "NumberStepper.SetCount" },
      { key: "currentCount", name: "Current count", type: "analog", direction: "output", defaultValue: "NumberStepper.CurrentCount" },
    ],
    properties: [
      { key: "label", name: "Label", type: "text", defaultValue: "Quantity" },
      { key: "initialValue", name: "Initial value", type: "number", defaultValue: 0 },
      { key: "minValue", name: "Minimum value", type: "number", defaultValue: -9999 },
      { key: "maxValue", name: "Maximum value", type: "number", defaultValue: 9999 },
      { key: "step", name: "Step", type: "number", defaultValue: 1 },
      { key: "decimals", name: "Decimal places", type: "number", min: 0, max: 4, defaultValue: 0 },
      { key: "tiltEnabled", name: "3D tilt on press", type: "checkbox", defaultValue: true },
      { key: "cardColor", name: "Card color", type: "color", defaultValue: "#20242c" },
      { key: "buttonColor", name: "Button color", type: "color", defaultValue: "#ffffff" },
      { key: "iconColor", name: "Icon color", type: "color", defaultValue: "#151a24" },
      { key: "numberColor", name: "Number color", type: "color", defaultValue: "#ffffff" },
      { key: "labelColor", name: "Label color", type: "color", defaultValue: "#aab2bd" },
      { key: "glowColor", name: "Press glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowStrength", name: "Press glow strength", type: "number", min: 0, max: 60, defaultValue: 18 },
      { key: "buttonSize", name: "Button size", type: "number", min: 30, max: 140, defaultValue: 70 },
      { key: "numberSize", name: "Number size", type: "number", min: 16, max: 90, defaultValue: 44 },
      { key: "labelSize", name: "Label size", type: "number", min: 8, max: 32, defaultValue: 14 },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 80, defaultValue: 32 },
    ],
    data: { REFERENCE_SIZE },
    template: '<div class="nst-card"><button type="button" class="nst-btn nst-minus" aria-label="Decrease"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button><div class="nst-value"><span class="nst-number"></span><span class="nst-label"></span></div><button type="button" class="nst-btn nst-plus" aria-label="Increase"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>',
    styles: '[data-component="number-stepper"],[data-component="number-stepper"] *{box-sizing:border-box}[data-component="number-stepper"]{display:block;width:100%;height:100%;perspective:1000px;font-family:"Segoe UI",sans-serif}[data-component="number-stepper"] .nst-card{position:relative;width:100%;height:100%;container-type:size;display:flex;align-items:center;justify-content:space-between;gap:4%;padding:8%;border-radius:var(--corner-radius-px);background:var(--card-color);transform-style:preserve-3d;transition:transform .15s ease;box-shadow:0 1px 3px rgba(0,0,0,.4)}[data-component="number-stepper"] .nst-btn{flex:none;width:var(--button-size-px);height:var(--button-size-px);border-radius:50%;border:0;padding:0;background:var(--button-color);color:var(--icon-color);display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:box-shadow .15s ease,transform .1s ease}[data-component="number-stepper"] .nst-btn.pressed{transform:scale(.94);box-shadow:0 0 var(--glow-px) color-mix(in srgb,var(--glow-color) 70%,transparent)}[data-component="number-stepper"] .nst-btn svg{width:46%;height:46%;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round}[data-component="number-stepper"] .nst-value{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}[data-component="number-stepper"] .nst-number{color:var(--number-color);font-size:var(--number-size-px);font-weight:700;line-height:1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}[data-component="number-stepper"] .nst-label{color:var(--label-color);font-size:var(--label-size-px);font-weight:500;letter-spacing:.05em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {}, referenceSize = data.REFERENCE_SIZE || 200;
      const card = root.querySelector(".nst-card"), minusBtn = root.querySelector(".nst-minus"), plusBtn = root.querySelector(".nst-plus"), numberEl = root.querySelector(".nst-number"), labelEl = root.querySelector(".nst-label");
      const toResponsiveSize = (px, min, max) => `clamp(${min}px, ${((Number(px) || 0) / referenceSize) * 100}cqmin, ${max}px)`;

      card.style.setProperty("--card-color", p.cardColor || "#20242c");
      card.style.setProperty("--button-color", p.buttonColor || "#ffffff");
      card.style.setProperty("--icon-color", p.iconColor || "#151a24");
      card.style.setProperty("--number-color", p.numberColor || "#ffffff");
      card.style.setProperty("--label-color", p.labelColor || "#aab2bd");
      card.style.setProperty("--glow-color", p.glowColor || "#04aa8e");
      card.style.setProperty("--glow-px", `${Number(p.glowStrength ?? 18)}px`);
      card.style.setProperty("--button-size-px", toResponsiveSize(p.buttonSize ?? 70, 20, 200));
      card.style.setProperty("--number-size-px", toResponsiveSize(p.numberSize ?? 44, 12, 140));
      card.style.setProperty("--label-size-px", toResponsiveSize(p.labelSize ?? 14, 7, 48));
      card.style.setProperty("--corner-radius-px", `${Number(p.cornerRadius ?? 32)}px`);
      labelEl.textContent = p.label || "Quantity";

      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      const minValue = Number(p.minValue ?? -9999), maxValue = Number(p.maxValue ?? 9999);
      const step = Number(p.step) || 1;
      const decimals = Math.max(0, Math.min(4, Math.round(Number(p.decimals ?? 0))));
      const tiltEnabled = p.tiltEnabled == null ? true : truthy(p.tiltEnabled);
      const clamp = value => Math.max(minValue, Math.min(maxValue, value));
      const format = value => value.toFixed(decimals);

      let current = clamp(Number(p.initialValue ?? 0));
      const render = () => { numberEl.textContent = format(current); };
      render();
      context.signals.publish("currentCount", current);

      let tiltTimer = 0;
      const tilt = direction => {
        if (!tiltEnabled) return;
        if (tiltTimer) clearTimeout(tiltTimer);
        card.style.transform = `rotateY(${direction * 20}deg)`;
        tiltTimer = setTimeout(() => { card.style.transform = "rotateY(0deg)"; tiltTimer = 0; }, 150);
      };

      const cleanups = [];
      const bindStep = (button, signalKey, delta) => {
        const down = event => { button.classList.add("pressed"); event.preventDefault(); };
        const up = () => {
          if (!button.classList.contains("pressed")) return;
          button.classList.remove("pressed");
          current = clamp(current + delta);
          render();
          context.signals.publish("currentCount", current);
          tilt(delta > 0 ? 1 : -1);
          context.signals.publish(signalKey, true);
          setTimeout(() => context.signals.publish(signalKey, false), 100);
        };
        const cancel = () => button.classList.remove("pressed");
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointerleave", cancel);
        button.addEventListener("pointercancel", cancel);
        cleanups.push(() => {
          button.removeEventListener("pointerdown", down);
          button.removeEventListener("pointerup", up);
          button.removeEventListener("pointerleave", cancel);
          button.removeEventListener("pointercancel", cancel);
        });
      };
      bindStep(minusBtn, "subtract", -step);
      bindStep(plusBtn, "add", step);

      context.signals.subscribe("setCount", value => {
        current = clamp(Number(value) || 0);
        render();
        context.signals.publish("currentCount", current);
      });

      return () => {
        if (tiltTimer) clearTimeout(tiltTimer);
        cleanups.forEach(fn => fn());
      };
    },
  });
})(window.ComposerRuntime);
