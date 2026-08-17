(function (runtime) {
  "use strict";

  const defaultLabels = "Item 1|Item 2|Item 3|Item 4";
  const countOptions = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }));

  runtime.register({
    id: "drag-drop-list",
    name: "Drag & Drop List",
    category: "Navigation & Menus",
    defaultSize: { width: 360, height: 420 },
    itemSelector: ".ddl-item",
    simulatorItemResolver(root, index) {
      const item = root.querySelector('.ddl-item[data-item-index="' + index + '"]');
      return item ? item.querySelector(".ddl-body") : null;
    },
    signals: [
      { key: "itemCountInput", name: "Set number of items", type: "analog", direction: "input", defaultValue: "DragDropList.SetCount" },
      { key: "order", name: "Current order", type: "serial", direction: "output", defaultValue: "DragDropList.Order" },
    ],
    rangeBindings: [
      { name: "Digital item press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Digital item selected range", type: "digital", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Serial item label range", type: "serial", direction: "input", baseKey: "labelBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "defaultCount", name: "Number of items", type: "select", options: countOptions, defaultValue: "4", affectsProperties: true },
      { key: "itemLabels", name: "Local item labels", type: "text-list", countKey: "defaultCount", itemName: "Item", defaultValue: defaultLabels },
      { key: "pressBase", name: "Digital item press base / pattern", type: "text", defaultValue: "DragDropList.Items.{index}.Press", signalSetting: true },
      { key: "feedbackBase", name: "Digital item selected base / pattern", type: "text", defaultValue: "DragDropList.Items.{index}.Selected", signalSetting: true },
      { key: "labelBase", name: "Serial item label base / pattern", type: "text", defaultValue: "DragDropList.Items.{index}.Label", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", defaultValue: 1, signalSetting: true },
      { key: "cardColor", name: "Card background color", type: "color", defaultValue: "#151a24" },
      { key: "borderColor", name: "Card border color", type: "color", defaultValue: "#242938" },
      { key: "itemColor", name: "Item background color", type: "color", defaultValue: "#1c212c" },
      { key: "itemBorderColor", name: "Item border color", type: "color", defaultValue: "#2a3040" },
      { key: "selectedItemColor", name: "Selected item background color", type: "color", defaultValue: "#0f3d36" },
      { key: "textColor", name: "Item text color", type: "color", defaultValue: "#e6e8ec" },
      { key: "selectedTextColor", name: "Selected item text color", type: "color", defaultValue: "#5eead4" },
      { key: "handleColor", name: "Drag handle color", type: "color", defaultValue: "#8892a6" },
      { key: "glowColor", name: "Press glow color", type: "color", defaultValue: "#5eead4" },
      { key: "glowStrength", name: "Press glow strength", type: "number", min: 0, max: 60, defaultValue: 14 },
      { key: "itemHeight", name: "Item row height", type: "number", min: 28, max: 120, defaultValue: 52 },
      { key: "itemGap", name: "Gap between items", type: "number", min: 0, max: 40, defaultValue: 8 },
      { key: "fontSize", name: "Item text size", type: "number", min: 8, max: 32, defaultValue: 15 },
      { key: "cornerRadius", name: "Item corner radius", type: "number", min: 0, max: 40, defaultValue: 10 },
    ],
    data: { defaultLabels },
    template: '<div class="ddl-card"><div class="ddl-list"></div></div>',
    styles: '[data-component="drag-drop-list"],[data-component="drag-drop-list"] *{box-sizing:border-box}' +
      '[data-component="drag-drop-list"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}' +
      '[data-component="drag-drop-list"] .ddl-card{position:relative;width:100%;height:100%;padding:10px;border-radius:12px;background:var(--card-color);border:1px solid var(--border-color);overflow:hidden}' +
      '[data-component="drag-drop-list"] .ddl-list{position:relative;width:100%;height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:var(--item-gap-px)}' +
      '[data-component="drag-drop-list"] .ddl-item{position:relative;flex:none;display:flex;align-items:stretch;height:var(--item-height-px);border-radius:var(--corner-radius-px);background:var(--item-color);border:1px solid var(--item-border-color);touch-action:pan-y}' +
      '[data-component="drag-drop-list"] .ddl-item.hidden{display:none}' +
      '[data-component="drag-drop-list"] .ddl-item.dragging{z-index:50;box-shadow:0 10px 22px rgba(0,0,0,.5);cursor:grabbing}' +
      '[data-component="drag-drop-list"] .ddl-item.selected{background:var(--selected-item-color);border-color:var(--selected-text-color)}' +
      '[data-component="drag-drop-list"] .ddl-handle{flex:none;width:40px;height:100%;border:0;background:transparent;color:var(--handle-color);display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;-webkit-tap-highlight-color:transparent}' +
      '[data-component="drag-drop-list"] .ddl-item.dragging .ddl-handle{cursor:grabbing}' +
      '[data-component="drag-drop-list"] .ddl-handle svg{width:18px;height:18px;fill:currentColor}' +
      '[data-component="drag-drop-list"] .ddl-body{flex:1 1 auto;min-width:0;display:flex;align-items:center;padding:0 12px 0 2px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border-radius:0 var(--corner-radius-px) var(--corner-radius-px) 0;transition:box-shadow .12s ease,transform .1s ease}' +
      '[data-component="drag-drop-list"] .ddl-body.pressed{transform:scale(.98);box-shadow:inset 0 0 var(--glow-px) color-mix(in srgb,var(--glow-color) 60%,transparent)}' +
      '[data-component="drag-drop-list"] .ddl-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-color);font-size:var(--font-size-px)}' +
      '[data-component="drag-drop-list"] .ddl-item.selected .ddl-label{color:var(--selected-text-color);font-weight:600}',
    mount(root, context) {
      const p = context.options.properties || {}, data = context.options.definitionData || {};
      const card = root.querySelector(".ddl-card"), list = root.querySelector(".ddl-list");
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      const address = (base, index) => p.bindingMode === "join"
        ? String((Number(base) || 0) + index * (Number(p.signalIncrement) || 1))
        : String(base || "").replace(/\{n\}/g, index + 1).replace(/\{index\}/g, index);

      card.style.setProperty("--card-color", p.cardColor || "#151a24");
      card.style.setProperty("--border-color", p.borderColor || "#242938");
      card.style.setProperty("--item-color", p.itemColor || "#1c212c");
      card.style.setProperty("--item-border-color", p.itemBorderColor || "#2a3040");
      card.style.setProperty("--selected-item-color", p.selectedItemColor || "#0f3d36");
      card.style.setProperty("--text-color", p.textColor || "#e6e8ec");
      card.style.setProperty("--selected-text-color", p.selectedTextColor || "#5eead4");
      card.style.setProperty("--handle-color", p.handleColor || "#8892a6");
      card.style.setProperty("--glow-color", p.glowColor || "#5eead4");
      card.style.setProperty("--glow-px", `${Number(p.glowStrength ?? 14)}px`);
      card.style.setProperty("--item-height-px", `${Math.max(20, Number(p.itemHeight) || 52)}px`);
      card.style.setProperty("--item-gap-px", `${Math.max(0, Number(p.itemGap) || 8)}px`);
      card.style.setProperty("--font-size-px", `${Math.max(1, Number(p.fontSize) || 15)}px`);
      card.style.setProperty("--corner-radius-px", `${Number(p.cornerRadius ?? 10)}px`);

      const count = Math.max(1, Math.min(12, Number(p.defaultCount) || 4));
      const labels = String(p.itemLabels || data.defaultLabels || defaultLabels).split("|");
      let activeCount = count;

      const visibleItems = () => [...list.children].filter(item => !item.classList.contains("hidden"));
      const publishOrder = () => {
        const order = visibleItems().map(item => Number(item.dataset.itemIndex) + 1).join(",");
        context.signals.publish("order", order);
      };
      const applyActiveCount = () => {
        [...list.children].forEach((item, position) => item.classList.toggle("hidden", position >= activeCount));
        publishOrder();
      };

      list.innerHTML = "";
      const cleanups = [];
      for (let index = 0; index < count; index++) {
        const item = document.createElement("div");
        item.className = "ddl-item";
        item.dataset.itemIndex = String(index);

        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "ddl-handle";
        handle.setAttribute("aria-label", "Drag to reorder");
        handle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

        const body = document.createElement("div");
        body.className = "ddl-body";
        const label = document.createElement("span");
        label.className = "ddl-label";
        label.textContent = labels[index] || `Item ${index + 1}`;
        body.appendChild(label);

        item.append(handle, body);
        list.appendChild(item);

        const pressSignal = address(p.pressBase, index);
        const pressDown = event => { body.classList.add("pressed"); event.preventDefault(); };
        const pressUp = () => {
          if (!body.classList.contains("pressed")) return;
          body.classList.remove("pressed");
          context.signals.publishAddress("digital", pressSignal, true);
          setTimeout(() => context.signals.publishAddress("digital", pressSignal, false), 100);
        };
        const pressCancel = () => body.classList.remove("pressed");
        body.addEventListener("pointerdown", pressDown);
        body.addEventListener("pointerup", pressUp);
        body.addEventListener("pointerleave", pressCancel);
        body.addEventListener("pointercancel", pressCancel);
        cleanups.push(() => {
          body.removeEventListener("pointerdown", pressDown);
          body.removeEventListener("pointerup", pressUp);
          body.removeEventListener("pointerleave", pressCancel);
          body.removeEventListener("pointercancel", pressCancel);
        });

        context.signals.subscribeAddress("digital", address(p.feedbackBase, index), value => item.classList.toggle("selected", truthy(value)));
        context.signals.subscribeAddress("serial", address(p.labelBase, index), value => { if (value !== undefined && value !== null && String(value) !== "") label.textContent = String(value); });

        let dragPointerId = null, startY = 0, stepHeight = 0, appliedSteps = 0;
        const onMove = event => {
          if (dragPointerId === null || event.pointerId !== dragPointerId) return;
          const dy = event.clientY - startY;
          if (stepHeight) {
            const targetSteps = Math.round(dy / stepHeight);
            while (targetSteps > appliedSteps) {
              const siblings = visibleItems(), idx = siblings.indexOf(item);
              if (idx >= siblings.length - 1) break;
              list.insertBefore(siblings[idx + 1], item);
              appliedSteps++;
            }
            while (targetSteps < appliedSteps) {
              const siblings = visibleItems(), idx = siblings.indexOf(item);
              if (idx <= 0) break;
              list.insertBefore(item, siblings[idx - 1]);
              appliedSteps--;
            }
          }
          item.style.transform = `translateY(${dy - appliedSteps * stepHeight}px)`;
        };
        const endDrag = event => {
          if (dragPointerId === null || event.pointerId !== dragPointerId) return;
          try { handle.releasePointerCapture(dragPointerId); } catch (_) {}
          dragPointerId = null;
          item.classList.remove("dragging");
          item.style.transform = "";
          publishOrder();
        };
        const startDrag = event => {
          dragPointerId = event.pointerId;
          startY = event.clientY;
          appliedSteps = 0;
          stepHeight = (Math.max(20, Number(p.itemHeight) || 52)) + (Math.max(0, Number(p.itemGap) || 8));
          item.classList.add("dragging");
          try { handle.setPointerCapture(dragPointerId); } catch (_) {}
          event.preventDefault();
        };
        handle.addEventListener("pointerdown", startDrag);
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", endDrag);
        handle.addEventListener("pointercancel", endDrag);
        cleanups.push(() => {
          handle.removeEventListener("pointerdown", startDrag);
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", endDrag);
          handle.removeEventListener("pointercancel", endDrag);
        });
      }

      context.signals.subscribe("itemCountInput", value => {
        const requested = Math.round(Number(value));
        activeCount = Number.isFinite(requested) && requested > 0 ? Math.max(1, Math.min(count, requested)) : count;
        applyActiveCount();
      });

      applyActiveCount();

      return () => cleanups.forEach(fn => fn());
    },
  });
})(window.ComposerRuntime);
