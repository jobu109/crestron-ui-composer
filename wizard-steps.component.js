(function (runtime) {
  "use strict";
  const defaultLabels = "Account|Devices|Preferences|Finish";
  const countOptions = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  runtime.register({
    id: "wizard-steps",
    name: "Wizard Steps",
    category: "Navigation & Menus",
    defaultSize: { width: 480, height: 160 },
    itemSelector: ".wiz-step",
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
        key: "defaultCount",
        name: "Number of steps",
        type: "select",
        options: countOptions,
        defaultValue: "4",
        affectsProperties: true,
      },
      {
        key: "stepLabels",
        name: "Local step labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Step",
        defaultValue: defaultLabels,
      },
      {
        key: "triggerBase",
        name: "Jump-to-step pattern",
        type: "text",
        defaultValue: "WizardSteps.Steps.{index}.Trigger",
        signalSetting: true,
      },
      {
        key: "triggerIncrement",
        name: "Jump-to-step join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Selected feedback pattern",
        type: "text",
        defaultValue: "WizardSteps.Steps.{index}.Selected",
        signalSetting: true,
      },
      {
        key: "feedbackIncrement",
        name: "Selected feedback join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Step text pattern",
        type: "text",
        defaultValue: "WizardSteps.Steps.{index}.Label",
        signalSetting: true,
      },
      {
        key: "labelIncrement",
        name: "Step text join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      { key: "circleColor", name: "Step circle color", type: "color", defaultValue: "#151a24" },
      { key: "circleBorderColor", name: "Step circle border / line color", type: "color", defaultValue: "#242938" },
      { key: "doneColor", name: "Completed step color", type: "color", defaultValue: "#5eead4" },
      { key: "doneTextColor", name: "Completed step number color", type: "color", defaultValue: "#0b0d12" },
      { key: "activeColor", name: "Active step accent color", type: "color", defaultValue: "#5eead4" },
      { key: "textColor", name: "Active/completed label color", type: "color", defaultValue: "#e6e8ec" },
      { key: "mutedTextColor", name: "Upcoming step color", type: "color", defaultValue: "#8892a6" },
      { key: "circleSize", name: "Circle size (px)", type: "number", min: 20, max: 60, defaultValue: 32 },
      { key: "connectorLength", name: "Connector length (px)", type: "number", min: 20, max: 160, defaultValue: 60 },
      { key: "fontSize", name: "Label text size", type: "number", min: 8, max: 24, defaultValue: 12 },
      { key: "buttonColor", name: "Button color", type: "color", defaultValue: "#151a24" },
      { key: "buttonBorderColor", name: "Button border color", type: "color", defaultValue: "#242938" },
      { key: "buttonTextColor", name: "Button text color", type: "color", defaultValue: "#e6e8ec" },
      { key: "primaryColor", name: "Next button color", type: "color", defaultValue: "#5eead4" },
      { key: "primaryTextColor", name: "Next button text color", type: "color", defaultValue: "#0b0d12" },
    ],
    signals: [
      {
        key: "setStep",
        name: "Set current step",
        type: "analog",
        direction: "input",
        defaultValue: "WizardSteps.SetStep",
      },
    ],
    signalGroups: [
      { name: "Jump-to-step range", type: "digital", direction: "input" },
      { name: "Step selected range", type: "digital", direction: "output" },
      { name: "Step text range", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Digital jump-to-step range",
        type: "digital",
        direction: "input",
        baseKey: "triggerBase",
        incrementKey: "triggerIncrement",
        countKey: "defaultCount",
      },
      {
        name: "Digital step selected range",
        type: "digital",
        direction: "output",
        baseKey: "feedbackBase",
        incrementKey: "feedbackIncrement",
        countKey: "defaultCount",
      },
      {
        name: "Serial step text range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "labelIncrement",
        countKey: "defaultCount",
      },
    ],
    template:
      '<div class="wiz-wrap"><div class="wiz-track"></div><div class="wiz-buttons"><button type="button" class="wiz-btn" data-action="back">Back</button><button type="button" class="wiz-btn primary" data-action="next">Next</button></div></div>',
    styles:
      '[data-component="wizard-steps"]{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;font-family:Segoe UI,sans-serif}' +
      '[data-component="wizard-steps"] *{box-sizing:border-box}' +
      '[data-component="wizard-steps"] .wiz-wrap{display:flex;flex-direction:column;align-items:center;gap:18px}' +
      '[data-component="wizard-steps"] .wiz-track{display:flex;align-items:center}' +
      '[data-component="wizard-steps"] .wiz-step{display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;cursor:pointer}' +
      '[data-component="wizard-steps"] .wiz-circle{width:var(--circle-size-px);height:var(--circle-size-px);border-radius:50%;background:var(--circle-color);border:2px solid var(--circle-border-color);display:flex;align-items:center;justify-content:center;font-size:calc(var(--circle-size-px) * .38);font-weight:700;color:var(--muted-text-color);transition:all .25s ease}' +
      '[data-component="wizard-steps"] .wiz-step.done .wiz-circle{background:var(--done-color);border-color:var(--done-color);color:var(--done-text-color)}' +
      '[data-component="wizard-steps"] .wiz-step.active .wiz-circle{border-color:var(--active-color);color:var(--active-color);box-shadow:0 0 0 4px color-mix(in srgb,var(--active-color) 20%,transparent)}' +
      '[data-component="wizard-steps"] .wiz-label{font-size:var(--font-size-px);color:var(--muted-text-color);white-space:nowrap}' +
      '[data-component="wizard-steps"] .wiz-step.active .wiz-label,[data-component="wizard-steps"] .wiz-step.done .wiz-label{color:var(--text-color)}' +
      '[data-component="wizard-steps"] .wiz-line{width:var(--connector-length-px);height:2px;background:var(--circle-border-color);transition:background .3s ease}' +
      '[data-component="wizard-steps"] .wiz-line.done{background:var(--done-color)}' +
      '[data-component="wizard-steps"] .wiz-buttons{display:flex;gap:10px}' +
      '[data-component="wizard-steps"] .wiz-btn{padding:9px 20px;border-radius:8px;background:var(--button-color);border:1px solid var(--button-border-color);color:var(--button-text-color);font-size:.8rem;cursor:pointer;transition:border-color .15s ease}' +
      '[data-component="wizard-steps"] .wiz-btn:hover{border-color:var(--active-color)}' +
      '[data-component="wizard-steps"] .wiz-btn.primary{background:var(--primary-color);color:var(--primary-text-color);border-color:var(--primary-color);font-weight:600}' +
      '[data-component="wizard-steps"] .wiz-btn:disabled{opacity:.4;cursor:not-allowed}',
    mount(root, context) {
      const p = context.options.properties || {},
        track = root.querySelector(".wiz-track"),
        backBtn = root.querySelector('[data-action="back"]'),
        nextBtn = root.querySelector('[data-action="next"]'),
        truthy = (value) =>
          value === true || value === 1 || value === "1" || value === "true",
        address = (base, increment, index) =>
          p.bindingMode === "join"
            ? String((Number(base) || 0) + index * (Number(increment) || 1))
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index));
      const count = Math.max(1, Math.min(20, Math.round(Number(p.defaultCount) || 4))),
        labels = String(p.stepLabels || defaultLabels).split("|");
      while (labels.length < count) labels.push("");

      root.style.setProperty("--circle-color", p.circleColor || "#151a24");
      root.style.setProperty("--circle-border-color", p.circleBorderColor || "#242938");
      root.style.setProperty("--done-color", p.doneColor || "#5eead4");
      root.style.setProperty("--done-text-color", p.doneTextColor || "#0b0d12");
      root.style.setProperty("--active-color", p.activeColor || "#5eead4");
      root.style.setProperty("--text-color", p.textColor || "#e6e8ec");
      root.style.setProperty("--muted-text-color", p.mutedTextColor || "#8892a6");
      root.style.setProperty("--circle-size", Math.max(20, Number(p.circleSize) || 32) + "px");
      root.style.setProperty("--connector-length", Math.max(0, Number(p.connectorLength) || 60) + "px");
      root.style.setProperty("--font-size", Math.max(1, Number(p.fontSize) || 12) + "px");
      root.style.setProperty("--button-color", p.buttonColor || "#151a24");
      root.style.setProperty("--button-border-color", p.buttonBorderColor || "#242938");
      root.style.setProperty("--button-text-color", p.buttonTextColor || "#e6e8ec");
      root.style.setProperty("--primary-color", p.primaryColor || "#5eead4");
      root.style.setProperty("--primary-text-color", p.primaryTextColor || "#0b0d12");

      let current = 0,
        finished = false,
        triggerStates = Array(count).fill(false);

      function publishFeedback() {
        for (let index = 0; index < count; index++)
          context.signals.publishAddress(
            "digital",
            address(p.feedbackBase, p.feedbackIncrement, index),
            index === current,
          );
      }
      function updateButtons() {
        backBtn.disabled = current === 0;
        if (finished) {
          nextBtn.textContent = "Done ✓";
          nextBtn.disabled = true;
        } else {
          nextBtn.textContent = current === count - 1 ? "Finish" : "Next";
          nextBtn.disabled = false;
        }
      }
      function render() {
        track.innerHTML = "";
        for (let index = 0; index < count; index++) {
          if (index > 0) {
            const line = document.createElement("div");
            line.className = "wiz-line" + (index <= current ? " done" : "");
            track.appendChild(line);
          }
          const step = document.createElement("div"),
            circle = document.createElement("div"),
            label = document.createElement("div");
          step.className =
            "wiz-step" +
            (index < current ? " done" : index === current ? " active" : "");
          circle.className = "wiz-circle";
          circle.textContent = index < current ? "✓" : String(index + 1);
          label.className = "wiz-label";
          label.textContent = labels[index] || "";
          step.appendChild(circle);
          step.appendChild(label);
          step.onclick = () => select(index);
          track.appendChild(step);
        }
        updateButtons();
      }
      function select(index) {
        index = Math.max(0, Math.min(count - 1, Math.round(index) || 0));
        finished = false;
        current = index;
        render();
        publishFeedback();
      }
      backBtn.onclick = () => {
        if (current > 0) select(current - 1);
      };
      nextBtn.onclick = () => {
        if (current < count - 1) select(current + 1);
        else {
          finished = true;
          updateButtons();
        }
      };
      context.signals.subscribe("setStep", (value) => select(Number(value) || 0));
      for (let index = 0; index < count; index++)
        context.signals.subscribeAddress(
          "digital",
          address(p.triggerBase, p.triggerIncrement, index),
          (value) => {
            const on = truthy(value);
            if (on && !triggerStates[index]) select(index);
            triggerStates[index] = on;
          },
        );
      for (let index = 0; index < count; index++)
        context.signals.subscribeAddress(
          "serial",
          address(p.labelBase, p.labelIncrement, index),
          (value) => {
            if (value != null && value !== "") {
              labels[index] = String(value);
              render();
            }
          },
        );
      render();
      publishFeedback();
    },
  });
})(window.ComposerRuntime);
