(function (runtime) {
  "use strict";
  const defaultLabels = "Living Room|Kitchen|Patio|Bedroom|Garage";
  const countOptions = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  runtime.register({
    id: "select-all-checklist",
    name: "Select-All Checklist",
    category: "Lists & Selectors",
    defaultSize: { width: 260, height: 340 },
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
        name: "Number of items",
        type: "select",
        options: countOptions,
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "itemLabels",
        name: "Local item labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Item",
        defaultValue: defaultLabels,
      },
      {
        key: "allLabel",
        name: "\"Select all\" label",
        type: "text",
        defaultValue: "Select all zones",
      },
      {
        key: "itemBase",
        name: "Checked output pattern",
        type: "text",
        defaultValue: "Checklist.Items.{index}.Checked",
        signalSetting: true,
      },
      {
        key: "itemIncrement",
        name: "Checked output join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Checked feedback pattern",
        type: "text",
        defaultValue: "Checklist.Items.{index}.Feedback",
        signalSetting: true,
      },
      {
        key: "feedbackIncrement",
        name: "Checked feedback join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Item text pattern",
        type: "text",
        defaultValue: "Checklist.Items.{index}.Label",
        signalSetting: true,
      },
      {
        key: "labelIncrement",
        name: "Item text join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      { key: "backgroundColor", name: "Panel background", type: "color", defaultValue: "#12151c" },
      { key: "borderColor", name: "Panel border color", type: "color", defaultValue: "#242938" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#e6e8ec" },
      { key: "mutedColor", name: "Count text color", type: "color", defaultValue: "#8892a6" },
      { key: "accentColor", name: "Checkbox accent color", type: "color", defaultValue: "#5eead4" },
      { key: "fontSize", name: "Text size", type: "number", min: 8, max: 24, defaultValue: 13 },
    ],
    signals: [
      {
        key: "selectAll",
        name: "Select-all state",
        type: "digital",
        direction: "output",
        defaultValue: "Checklist.SelectAll",
      },
      {
        key: "selectAllSet",
        name: "Set select-all",
        type: "digital",
        direction: "input",
        defaultValue: "Checklist.SelectAll.Set",
      },
      {
        key: "selectedCount",
        name: "Selected count",
        type: "analog",
        direction: "output",
        defaultValue: "Checklist.SelectedCount",
      },
    ],
    signalGroups: [
      { name: "Item checked output range", type: "digital", direction: "output" },
      { name: "Item checked feedback range", type: "digital", direction: "input" },
      { name: "Item text range", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Digital item checked output range",
        type: "digital",
        direction: "output",
        baseKey: "itemBase",
        incrementKey: "itemIncrement",
        countKey: "defaultCount",
      },
      {
        name: "Digital item checked feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "feedbackIncrement",
        countKey: "defaultCount",
      },
      {
        name: "Serial item text range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "labelIncrement",
        countKey: "defaultCount",
      },
    ],
    template:
      '<div class="checklist-panel">' +
      '<label class="checklist-row checklist-all"><input type="checkbox" class="checklist-check" data-role="all" /><span class="checklist-all-label"></span></label>' +
      '<div class="checklist-items"></div>' +
      '<div class="checklist-count"></div>' +
      "</div>",
    styles:
      '[data-component="select-all-checklist"]{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;font-family:Segoe UI,sans-serif}' +
      '[data-component="select-all-checklist"] *{box-sizing:border-box}' +
      '[data-component="select-all-checklist"] .checklist-panel{width:100%;height:100%;background:var(--background-color);border:1px solid var(--border-color);border-radius:12px;padding:14px 16px;font-size:var(--font-size-px);color:var(--text-color);overflow-y:auto}' +
      '[data-component="select-all-checklist"] .checklist-row{display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer}' +
      '[data-component="select-all-checklist"] .checklist-all{font-weight:700;border-bottom:1px solid var(--border-color);padding-bottom:10px;margin-bottom:6px}' +
      '[data-component="select-all-checklist"] .checklist-check{width:17px;height:17px;accent-color:var(--accent-color);cursor:pointer;flex-shrink:0}' +
      '[data-component="select-all-checklist"] .checklist-count{font-size:calc(var(--font-size-px) * .86);color:var(--muted-color);margin-top:8px}',
    mount(root, context) {
      const p = context.options.properties || {},
        allCheckbox = root.querySelector('[data-role="all"]'),
        allLabel = root.querySelector(".checklist-all-label"),
        itemsHost = root.querySelector(".checklist-items"),
        countLabel = root.querySelector(".checklist-count"),
        truthy = (value) =>
          value === true || value === 1 || value === "1" || value === "true",
        address = (base, increment, index) =>
          p.bindingMode === "join"
            ? String((Number(base) || 0) + index * (Number(increment) || 1))
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index));
      const count = Math.max(1, Math.min(20, Math.round(Number(p.defaultCount) || 5))),
        labels = String(p.itemLabels || defaultLabels).split("|"),
        states = Array(count).fill(false),
        checkboxes = [];
      while (labels.length < count) labels.push("");

      root.style.setProperty("--background-color", p.backgroundColor || "#12151c");
      root.style.setProperty("--border-color", p.borderColor || "#242938");
      root.style.setProperty("--text-color", p.textColor || "#e6e8ec");
      root.style.setProperty("--muted-color", p.mutedColor || "#8892a6");
      root.style.setProperty("--accent-color", p.accentColor || "#5eead4");
      root.style.setProperty("--font-size", Math.max(1, Number(p.fontSize) || 13) + "px");
      allLabel.textContent = p.allLabel || "Select all zones";

      function updateSummary() {
        const checkedCount = states.filter(Boolean).length;
        allCheckbox.checked = checkedCount === count;
        allCheckbox.indeterminate = checkedCount > 0 && checkedCount < count;
        countLabel.textContent = `${checkedCount} of ${count} selected`;
        context.signals.publish("selectAll", checkedCount === count);
        context.signals.publish("selectedCount", checkedCount);
      }
      function setItem(index, value, publish) {
        states[index] = !!value;
        if (checkboxes[index]) checkboxes[index].checked = states[index];
        if (publish)
          context.signals.publishAddress(
            "digital",
            address(p.itemBase, p.itemIncrement, index),
            states[index],
          );
        updateSummary();
      }
      function setAll(value, publish) {
        for (let index = 0; index < count; index++) setItem(index, value, publish);
      }

      for (let index = 0; index < count; index++) {
        const row = document.createElement("label"),
          checkbox = document.createElement("input"),
          label = document.createElement("span");
        row.className = "checklist-row";
        checkbox.type = "checkbox";
        checkbox.className = "checklist-check";
        label.textContent = labels[index] || "";
        checkbox.onchange = () => setItem(index, checkbox.checked, true);
        row.appendChild(checkbox);
        row.appendChild(label);
        itemsHost.appendChild(row);
        checkboxes.push(checkbox);
        context.signals.subscribeAddress(
          "digital",
          address(p.feedbackBase, p.feedbackIncrement, index),
          (value) => setItem(index, truthy(value), false),
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.labelBase, p.labelIncrement, index),
          (value) => {
            if (value != null && value !== "") label.textContent = String(value);
          },
        );
      }
      allCheckbox.onchange = () => setAll(allCheckbox.checked, true);
      context.signals.subscribe("selectAllSet", (value) => setAll(truthy(value), true));

      updateSummary();
    },
  });
})(window.ComposerRuntime);
