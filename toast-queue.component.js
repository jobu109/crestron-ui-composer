(function (runtime) {
  "use strict";
  const defaultMessages = 'Saved zone settings|Scene "Movie Night" updated|Device offline — retrying';
  const defaultTypes = "success|info|error";
  const defaultPersistence = "auto|auto|auto";
  const countOptions = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  runtime.register({
    id: "toast-queue",
    name: "Toast Queue",
    category: "Status & Information",
    defaultSize: { width: 240, height: 140 },
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
        name: "Number of notifications",
        type: "select",
        options: countOptions,
        defaultValue: "3",
        affectsProperties: true,
      },
      {
        key: "messages",
        name: "Local notification text",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Notification",
        defaultValue: defaultMessages,
      },
      {
        key: "messageTypes",
        name: "Notification type (success/info/error)",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Notification",
        defaultValue: defaultTypes,
      },
      {
        key: "messagePersistence",
        name: "Dismiss behavior",
        type: "select-list",
        countKey: "defaultCount",
        itemName: "Notification",
        options: [
          { value: "auto", label: "Auto-clear after visible duration" },
          { value: "manual", label: "Stay until closed (X)" },
        ],
        defaultItemValue: "auto",
        defaultValue: defaultPersistence,
      },
      {
        key: "triggerBase",
        name: "Trigger pattern",
        type: "text",
        defaultValue: "ToastQueue.Items.{index}.Trigger",
        signalSetting: true,
      },
      {
        key: "triggerIncrement",
        name: "Trigger join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "messageBase",
        name: "Message text pattern",
        type: "text",
        defaultValue: "ToastQueue.Items.{index}.Message",
        signalSetting: true,
      },
      {
        key: "messageIncrement",
        name: "Message join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "position",
        name: "Notification origin",
        type: "select",
        options: [
          { value: "top-left", label: "Top left" },
          { value: "top-center", label: "Top center" },
          { value: "top-right", label: "Top right" },
          { value: "bottom-left", label: "Bottom left" },
          { value: "bottom-center", label: "Bottom center" },
          { value: "bottom-right", label: "Bottom right" },
        ],
        defaultValue: "top-right",
      },
      {
        key: "edgeOffset",
        name: "Edge offset (px)",
        type: "number",
        min: 0,
        max: 120,
        defaultValue: 20,
      },
      {
        key: "gap",
        name: "Gap between toasts (px)",
        type: "number",
        min: 0,
        max: 40,
        defaultValue: 10,
      },
      {
        key: "minWidth",
        name: "Minimum toast width (px)",
        type: "number",
        min: 120,
        max: 480,
        defaultValue: 220,
      },
      {
        key: "cornerRadius",
        name: "Corner radius",
        type: "number",
        min: 0,
        max: 40,
        defaultValue: 10,
      },
      {
        key: "fontSize",
        name: "Text size",
        type: "number",
        min: 8,
        max: 32,
        defaultValue: 13,
      },
      {
        key: "backgroundColor",
        name: "Background color",
        type: "color",
        defaultValue: "#1b2030",
      },
      {
        key: "borderColor",
        name: "Border color",
        type: "color",
        defaultValue: "#242938",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#e6e8ec",
      },
      {
        key: "successColor",
        name: "Success dot color",
        type: "color",
        defaultValue: "#34d399",
      },
      {
        key: "errorColor",
        name: "Error dot color",
        type: "color",
        defaultValue: "#f87171",
      },
      {
        key: "infoColor",
        name: "Info dot color",
        type: "color",
        defaultValue: "#5eead4",
      },
      {
        key: "fallbackSpeed",
        name: "Local speed (0-100)",
        type: "number",
        min: 0,
        max: 100,
        defaultValue: 50,
      },
      {
        key: "minTransitionMs",
        name: "Fastest slide duration (ms)",
        type: "number",
        min: 50,
        max: 1000,
        defaultValue: 250,
      },
      {
        key: "maxTransitionMs",
        name: "Slowest slide duration (ms)",
        type: "number",
        min: 50,
        max: 2500,
        defaultValue: 1000,
      },
      {
        key: "minIntervalMs",
        name: "Fastest Run All stagger (ms)",
        type: "number",
        min: 0,
        max: 1000,
        defaultValue: 200,
      },
      {
        key: "maxIntervalMs",
        name: "Slowest Run All stagger (ms)",
        type: "number",
        min: 0,
        max: 3000,
        defaultValue: 1200,
      },
      {
        key: "holdMs",
        name: "Visible duration (ms)",
        type: "number",
        min: 500,
        max: 15000,
        defaultValue: 2400,
      },
    ],
    signals: [
      {
        key: "runAll",
        name: "Run all notifications",
        type: "digital",
        direction: "input",
        defaultValue: "ToastQueue.RunAll",
      },
      {
        key: "speed",
        name: "Animation speed",
        type: "analog",
        direction: "input",
        defaultValue: "ToastQueue.Speed",
      },
    ],
    signalGroups: [
      { name: "Notification trigger range", type: "digital", direction: "input" },
      { name: "Notification message range", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Digital notification trigger range",
        type: "digital",
        direction: "input",
        baseKey: "triggerBase",
        incrementKey: "triggerIncrement",
        countKey: "defaultCount",
      },
      {
        name: "Serial notification message range",
        type: "serial",
        direction: "input",
        baseKey: "messageBase",
        incrementKey: "messageIncrement",
        countKey: "defaultCount",
      },
    ],
    template: '<div class="toast-queue-stack"></div>',
    styles:
      '[data-component="toast-queue"]{display:block;width:100%;height:100%;overflow:visible;background:transparent;box-sizing:border-box}' +
      '[data-component="toast-queue"] *{box-sizing:border-box}' +
      /* The stack is reparented at mount time into the panel/page container so it can cover the
         whole panel instead of being confined to this widget's own small box. Because it leaves
         this element's subtree, its rules key off its own [data-toast-queue] marker (not an
         ancestor [data-component] selector) and its --custom-properties are set directly on it
         rather than inherited from root. */
      '.toast-queue-stack[data-toast-queue]{box-sizing:border-box;position:absolute;display:flex;flex-direction:column;gap:var(--gap-px);z-index:9999;pointer-events:none;font-family:Segoe UI,sans-serif}' +
      '.toast-queue-stack[data-toast-queue] *{box-sizing:border-box}' +
      '.toast-queue-stack[data-toast-queue][data-position="top-left"]{top:var(--edge-offset-px);left:var(--edge-offset-px);align-items:flex-start}' +
      '.toast-queue-stack[data-toast-queue][data-position="top-center"]{top:var(--edge-offset-px);left:50%;transform:translateX(-50%);align-items:center}' +
      '.toast-queue-stack[data-toast-queue][data-position="top-right"]{top:var(--edge-offset-px);right:var(--edge-offset-px);align-items:flex-end}' +
      '.toast-queue-stack[data-toast-queue][data-position="bottom-left"]{bottom:var(--edge-offset-px);left:var(--edge-offset-px);align-items:flex-start;flex-direction:column-reverse}' +
      '.toast-queue-stack[data-toast-queue][data-position="bottom-center"]{bottom:var(--edge-offset-px);left:50%;transform:translateX(-50%);align-items:center;flex-direction:column-reverse}' +
      '.toast-queue-stack[data-toast-queue][data-position="bottom-right"]{bottom:var(--edge-offset-px);right:var(--edge-offset-px);align-items:flex-end;flex-direction:column-reverse}' +
      '.toast-queue-stack[data-toast-queue] .toast-item{display:flex;align-items:center;gap:10px;min-width:var(--min-width-px);background:var(--bg-color);border:1px solid var(--border-color);border-radius:var(--corner-radius-px);padding:12px 16px;font-size:var(--font-size-px);color:var(--text-color);opacity:0;box-shadow:0 10px 24px rgba(0,0,0,.4);transition-property:transform,opacity;transition-timing-function:ease}' +
      '.toast-queue-stack[data-toast-queue] .toast-item.show{opacity:1;transform:none!important}' +
      '.toast-queue-stack[data-toast-queue][data-position="top-left"] .toast-item,.toast-queue-stack[data-toast-queue][data-position="bottom-left"] .toast-item{transform:translateX(-140%)}' +
      '.toast-queue-stack[data-toast-queue][data-position="top-right"] .toast-item,.toast-queue-stack[data-toast-queue][data-position="bottom-right"] .toast-item{transform:translateX(140%)}' +
      '.toast-queue-stack[data-toast-queue][data-position="top-center"] .toast-item{transform:translateY(-140%)}' +
      '.toast-queue-stack[data-toast-queue][data-position="bottom-center"] .toast-item{transform:translateY(140%)}' +
      '.toast-queue-stack[data-toast-queue] .toast-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}' +
      '.toast-queue-stack[data-toast-queue] .toast-dot.success{background:var(--success-color)}' +
      '.toast-queue-stack[data-toast-queue] .toast-dot.error{background:var(--error-color)}' +
      '.toast-queue-stack[data-toast-queue] .toast-dot.info{background:var(--info-color)}' +
      '.toast-queue-stack[data-toast-queue] .toast-label{flex:1 1 auto}' +
      '.toast-queue-stack[data-toast-queue] .toast-close{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid currentColor;background:transparent;color:inherit;opacity:.55;font-size:12px;line-height:1;cursor:pointer;padding:0;pointer-events:auto}' +
      '.toast-queue-stack[data-toast-queue] .toast-close:hover{opacity:1;background:rgba(255,255,255,.14)}',
    mount(root, context) {
      const p = context.options.properties || {},
        stack = root.querySelector(".toast-queue-stack"),
        truthy = (value) =>
          value === true || value === 1 || value === "1" || value === "true",
        address = (base, increment, index) =>
          p.bindingMode === "join"
            ? String((Number(base) || 0) + index * (Number(increment) || 1))
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index));
      const count = Math.max(1, Math.min(20, Math.round(Number(p.defaultCount) || 3))),
        messages = String(p.messages || defaultMessages).split("|"),
        types = String(p.messageTypes || defaultTypes).split("|"),
        persistence = String(p.messagePersistence || defaultPersistence).split("|");
      while (messages.length < count) messages.push("");
      while (types.length < count) types.push("info");
      while (persistence.length < count) persistence.push("auto");

      // Reparent the stack into the actual panel/page surface so it covers the whole panel
      // instead of being clipped to this widget's own small anchor box (falling back to the
      // widget's own root if no panel ancestor is found).
      const panelHost =
        root.closest(".stage") || root.closest(".page") || root.parentElement || root;
      if (panelHost === root) root.style.position = "relative";
      panelHost.appendChild(stack);
      stack.setAttribute("data-toast-queue", "");
      stack.dataset.position = p.position || "top-right";
      stack.style.setProperty("--edge-offset", Math.max(0, Number(p.edgeOffset) || 20) + "px");
      stack.style.setProperty("--gap", Math.max(0, Number(p.gap) || 10) + "px");
      stack.style.setProperty("--min-width", Math.max(0, Number(p.minWidth) || 220) + "px");
      stack.style.setProperty("--corner-radius", Math.max(0, Number(p.cornerRadius) || 10) + "px");
      stack.style.setProperty("--font-size", Math.max(1, Number(p.fontSize) || 13) + "px");
      stack.style.setProperty("--bg-color", p.backgroundColor || "#1b2030");
      stack.style.setProperty("--border-color", p.borderColor || "#242938");
      stack.style.setProperty("--text-color", p.textColor || "#e6e8ec");
      stack.style.setProperty("--success-color", p.successColor || "#34d399");
      stack.style.setProperty("--error-color", p.errorColor || "#f87171");
      stack.style.setProperty("--info-color", p.infoColor || "#5eead4");

      let speedValue = Math.max(0, Math.min(100, Number(p.fallbackSpeed) || 50)),
        triggerStates = Array(count).fill(false),
        runAllState = false,
        disposed = false;

      function transitionMs() {
        const min = Math.max(1, Number(p.minTransitionMs) || 250),
          max = Math.max(min, Number(p.maxTransitionMs) || 1000);
        return Math.round(max - (max - min) * (speedValue / 100));
      }
      function intervalMs() {
        const min = Math.max(0, Number(p.minIntervalMs) || 200),
          max = Math.max(min, Number(p.maxIntervalMs) || 1200);
        return Math.round(max - (max - min) * (speedValue / 100));
      }
      function setSpeed(value) {
        const n = Number(value) || 0;
        speedValue = Math.max(0, Math.min(100, n > 100 ? (n / 65535) * 100 : n));
      }
      function fireToast(index) {
        if (disposed) return;
        const text = messages[index] || "",
          type = ["success", "error", "info"].includes(types[index]) ? types[index] : "info",
          manual = persistence[index] === "manual",
          duration = transitionMs(),
          el = document.createElement("div"),
          dot = document.createElement("span"),
          label = document.createElement("span"),
          closeButton = document.createElement("button");
        el.className = "toast-item";
        el.style.transitionDuration = duration + "ms";
        dot.className = "toast-dot " + type;
        label.className = "toast-label";
        label.textContent = text;
        closeButton.type = "button";
        closeButton.className = "toast-close";
        closeButton.setAttribute("aria-label", "Dismiss");
        closeButton.textContent = "×";
        let dismissTimer = 0;
        function dismiss() {
          if (disposed) return;
          clearTimeout(dismissTimer);
          el.classList.remove("show");
          setTimeout(() => el.remove(), duration);
        }
        closeButton.onclick = dismiss;
        el.appendChild(dot);
        el.appendChild(label);
        el.appendChild(closeButton);
        stack.appendChild(el);
        requestAnimationFrame(() => el.classList.add("show"));
        if (!manual) {
          const hold = Math.max(200, Number(p.holdMs) || 2400);
          dismissTimer = setTimeout(dismiss, hold);
        }
      }
      function runAll() {
        for (let index = 0; index < count; index++)
          setTimeout(() => fireToast(index), index * intervalMs());
      }
      context.signals.subscribe("speed", setSpeed);
      context.signals.subscribe("runAll", (value) => {
        const on = truthy(value);
        if (on && !runAllState) runAll();
        runAllState = on;
      });
      for (let index = 0; index < count; index++) {
        context.signals.subscribeAddress(
          "digital",
          address(p.triggerBase, p.triggerIncrement, index),
          (value) => {
            const on = truthy(value);
            if (on && !triggerStates[index]) fireToast(index);
            triggerStates[index] = on;
          },
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.messageBase, p.messageIncrement, index),
          (value) => {
            if (value != null && value !== "") messages[index] = String(value);
          },
        );
      }
      return () => {
        disposed = true;
        stack.innerHTML = "";
        stack.remove();
      };
    },
  });
})(window.ComposerRuntime);
