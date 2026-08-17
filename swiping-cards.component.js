(function (runtime) {
  "use strict";
  const defaultLabels = "Card 1|Card 2|Card 3|Card 4|Card 5";
  const countOptions = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  runtime.register({
    id: "swiping-cards",
    name: "Swiping Cards",
    category: "Lists & Selectors",
    defaultSize: { width: 360, height: 430 },
    itemSelector: ".swipe-card",
    properties: [
      {
        key: "defaultCardCount",
        name: "Default cards",
        type: "select",
        options: countOptions,
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "cardLabels",
        name: "Local card labels",
        type: "text-list",
        countKey: "defaultCardCount",
        itemName: "Card",
        defaultValue: defaultLabels,
      },
      {
        key: "cardAssets",
        name: "Custom asset per card",
        type: "asset-list",
        countKey: "defaultCardCount",
        itemName: "Card",
      },
      {
        key: "pressBase",
        name: "Press pattern",
        type: "text",
        defaultValue: "SwipingCards.Items.{index}.Press",
        signalSetting: true,
      },
      {
        key: "pressIncrement",
        name: "Press join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Selected pattern",
        type: "text",
        defaultValue: "SwipingCards.Items.{index}.Selected",
        signalSetting: true,
      },
      {
        key: "feedbackIncrement",
        name: "Selected join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Name pattern",
        type: "text",
        defaultValue: "SwipingCards.Items.{index}.Label",
        signalSetting: true,
      },
      {
        key: "labelIncrement",
        name: "Name join increment",
        type: "number",
        min: 1,
        max: 100,
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "cardColor",
        name: "Card color",
        type: "color",
        defaultValue: "#1b2030",
      },
      {
        key: "cardBottomColor",
        name: "Card gradient color",
        type: "color",
        defaultValue: "#0d0f16",
      },
      {
        key: "selectedCardColor",
        name: "Selected card color",
        type: "color",
        defaultValue: "#253436",
      },
      {
        key: "borderColor",
        name: "Border color",
        type: "color",
        defaultValue: "#44505f",
      },
      {
        key: "textColor",
        name: "Text color",
        type: "color",
        defaultValue: "#e6e8ec",
      },
      {
        key: "selectedTextColor",
        name: "Selected text color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "glowColor",
        name: "Selected glow color",
        type: "color",
        defaultValue: "#04dcb9",
      },
      {
        key: "fontSize",
        name: "Text size",
        type: "number",
        min: 8,
        max: 100,
        defaultValue: 24,
      },
      {
        key: "cornerRadius",
        name: "Corner radius",
        type: "number",
        min: 0,
        max: 80,
        defaultValue: 18,
      },
      {
        key: "glowStrength",
        name: "Glow strength",
        type: "number",
        min: 0,
        max: 40,
        defaultValue: 14,
      },
      {
        key: "cardWidth",
        name: "Card width %",
        type: "number",
        min: 30,
        max: 100,
        defaultValue: 78,
      },
      {
        key: "cardHeight",
        name: "Card height %",
        type: "number",
        min: 30,
        max: 100,
        defaultValue: 76,
      },
      {
        key: "stackDepth",
        name: "Visible cards",
        type: "select",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
        ],
        defaultValue: "3",
      },
      {
        key: "stackOffset",
        name: "Vertical stack spacing",
        type: "number",
        min: 0,
        max: 30,
        defaultValue: 8,
      },
      {
        key: "stackHorizontalOffset",
        name: "Left stack spacing",
        type: "number",
        min: 0,
        max: 30,
        defaultValue: 6,
      },
      {
        key: "swipeThreshold",
        name: "Swipe distance",
        type: "number",
        min: 20,
        max: 200,
        defaultValue: 60,
      },
      {
        key: "animationDuration",
        name: "Animation duration (ms)",
        type: "number",
        min: 100,
        max: 1500,
        defaultValue: 300,
      },
      {
        key: "showDots",
        name: "Show page dots",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "dotsPosition",
        name: "Dots position",
        type: "select",
        options: [
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
        ],
        defaultValue: "bottom",
      },
      {
        key: "dotColor",
        name: "Dot color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "dotOpacity",
        name: "Inactive dot opacity",
        type: "number",
        defaultValue: 35,
      },
      {
        key: "activeDotColor",
        name: "Active dot color",
        type: "color",
        defaultValue: "#04dcb9",
      },
    ],
    signals: [
      {
        key: "set",
        name: "Selected card value set",
        type: "analog",
        direction: "output",
        defaultValue: "SwipingCards.ValueSet",
      },
      {
        key: "feedback",
        name: "Selected card feedback",
        type: "analog",
        direction: "input",
        defaultValue: "SwipingCards.Feedback",
      },
      {
        key: "count",
        name: "Number of cards",
        type: "analog",
        direction: "input",
        defaultValue: "SwipingCards.CardCount.Feedback",
      },
    ],
    signalGroups: [
      { name: "Card press range", type: "digital", direction: "output" },
      { name: "Card selected range", type: "digital", direction: "input" },
      { name: "Card name range", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Digital card press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        incrementKey: "pressIncrement",
        countKey: "defaultCardCount",
      },
      {
        name: "Digital card selected range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "feedbackIncrement",
        countKey: "defaultCardCount",
      },
      {
        name: "Serial card name range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "labelIncrement",
        countKey: "defaultCardCount",
      },
    ],
    template: '<div class="swipe-stage"><div class="swipe-deck"></div><div class="swipe-dots"></div></div>',
    styles:
      '[data-component="swiping-cards"]{display:block;width:100%;height:100%;overflow:visible;background:transparent;touch-action:none;box-sizing:border-box}' +
      '[data-component="swiping-cards"] *{box-sizing:border-box}' +
      '[data-component="swiping-cards"] .swipe-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:visible}' +
      '[data-component="swiping-cards"] .swipe-deck{position:relative;width:var(--card-width);height:var(--card-height);overflow:visible;flex:0 0 auto}' +
      '[data-component="swiping-cards"] .swipe-card{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;overflow:hidden;border:1px solid var(--border-color);border-radius:var(--corner-radius);background:linear-gradient(160deg,var(--card-color),var(--card-bottom-color));box-shadow:0 10px 30px rgba(0,0,0,.42);color:var(--text-color);font:700 var(--font-size)/1.15 "Segoe UI",sans-serif;text-align:center;cursor:grab;user-select:none;will-change:transform;transform-origin:50% 80%;transition:transform var(--animation-duration) ease,box-shadow var(--animation-duration) ease}' +
      '[data-component="swiping-cards"] .swipe-card.active{background:linear-gradient(160deg,var(--selected-card-color),var(--card-bottom-color));color:var(--selected-text-color);box-shadow:0 10px 30px rgba(0,0,0,.42),0 0 var(--glow-strength) var(--glow-color)}' +
      '[data-component="swiping-cards"] .swipe-card.dragging{cursor:grabbing;transition:none}' +
      '[data-component="swiping-cards"] .swipe-dots{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 0;z-index:5}' +
      '[data-component="swiping-cards"] .swipe-dot{width:clamp(6px,1.6vmin,10px);height:clamp(6px,1.6vmin,10px);border-radius:50%;border:0;padding:0;background:var(--dot-color);cursor:pointer;transition:width .2s ease,border-radius .2s ease,background .2s ease}' +
      '[data-component="swiping-cards"] .swipe-dot.active{width:clamp(18px,4.5vmin,28px);border-radius:5px;background:var(--active-dot-color)}' +
      '[data-component="swiping-cards"][data-dots-pos="top"] .swipe-dots{order:-1}',
    mount(root, context) {
      const p = context.options.properties || {},
        deck = root.querySelector(".swipe-deck"),
        dotsEl = root.querySelector(".swipe-dots"),
        showDots = p.showDots !== false && p.showDots !== 0 && p.showDots !== "0" && String(p.showDots).toLowerCase() !== "false",
        clamp = (value, minimum, maximum) =>
          Math.max(minimum, Math.min(maximum, value)),
        truthy = (value) =>
          value === true || value === 1 || value === "1" || value === "true",
        address = (base, increment, index) =>
          p.bindingMode === "join"
            ? String((Number(base) || 0) + index * (Number(increment) || 1))
            : String(base || "")
                .replace(/\{n\}/g, String(index + 1))
                .replace(/\{index\}/g, String(index));
      let count = clamp(Math.round(Number(p.defaultCardCount) || 5), 1, 20),
        labels = String(p.cardLabels || defaultLabels).split("|"),
        current = 0,
        disposed = false,
        releaseTimer = 0;
      while (labels.length < 20) labels.push("");
      function rgba(hex, opacity) {
        const n = parseInt(String(hex || "#000000").replace("#", ""), 16);
        return (
          "rgba(" +
          ((n >> 16) & 255) +
          "," +
          ((n >> 8) & 255) +
          "," +
          (n & 255) +
          "," +
          Math.max(0, Math.min(100, Number(opacity) || 0)) / 100 +
          ")"
        );
      }
      root.style.position = "relative";
      root.style.setProperty(
        "--card-width",
        clamp(Number(p.cardWidth) || 78, 30, 100) + "%",
      );
      root.style.setProperty(
        "--card-height",
        clamp(Number(p.cardHeight) || 76, 30, 100) + "%",
      );
      root.style.setProperty("--card-color", p.cardColor || "#1b2030");
      root.style.setProperty(
        "--card-bottom-color",
        p.cardBottomColor || "#0d0f16",
      );
      root.style.setProperty(
        "--selected-card-color",
        p.selectedCardColor || "#253436",
      );
      root.style.setProperty("--border-color", p.borderColor || "#44505f");
      root.style.setProperty("--text-color", p.textColor || "#e6e8ec");
      root.style.setProperty(
        "--selected-text-color",
        p.selectedTextColor || "#ffffff",
      );
      root.style.setProperty("--glow-color", p.glowColor || "#04dcb9");
      root.style.setProperty(
        "--font-size",
        clamp(Number(p.fontSize) || 24, 8, 100) + "px",
      );
      root.style.setProperty(
        "--corner-radius",
        clamp(Number(p.cornerRadius) || 18, 0, 80) + "px",
      );
      root.style.setProperty(
        "--glow-strength",
        clamp(Number(p.glowStrength) || 14, 0, 40) + "px",
      );
      root.style.setProperty(
        "--animation-duration",
        clamp(Number(p.animationDuration) || 300, 100, 1500) + "ms",
      );
      root.style.setProperty(
        "--dot-color",
        rgba(p.dotColor || "#fff", p.dotOpacity ?? 35),
      );
      root.style.setProperty("--active-dot-color", p.activeDotColor || "#04dcb9");
      root.dataset.dotsPos = p.dotsPosition === "top" ? "top" : "bottom";
      dotsEl.style.display = showDots ? "" : "none";

      function publishPress(index, value) {
        context.signals.publishAddress(
          "digital",
          address(p.pressBase, p.pressIncrement, index),
          value,
        );
      }
      function select(index, publish) {
        current = ((Math.round(Number(index) || 0) % count) + count) % count;
        render();
        root.dispatchEvent(
          new CustomEvent("composer-scroll-position", {
            detail: { axis: "horizontal", value: current },
          }),
        );
        if (publish) context.signals.publish("set", current);
      }
      function attachDrag(card, index) {
        let pointerId = null,
          startX = 0,
          startY = 0,
          dx = 0,
          dy = 0,
          moved = false;
        const duration = clamp(Number(p.animationDuration) || 300, 100, 1500),
          threshold = clamp(Number(p.swipeThreshold) || 60, 20, 200);
        card.addEventListener("pointerdown", (event) => {
          pointerId = event.pointerId;
          startX = event.clientX;
          startY = event.clientY;
          dx = dy = 0;
          moved = false;
          card.classList.add("dragging");
          card.setPointerCapture?.(pointerId);
          publishPress(index, true);
          event.preventDefault();
        });
        card.addEventListener("pointermove", (event) => {
          if (event.pointerId !== pointerId) return;
          dx = event.clientX - startX;
          dy = event.clientY - startY;
          moved = moved || Math.abs(dx) > 4 || Math.abs(dy) > 4;
          if (Math.abs(dx) > 2) layoutStack(dx > 0 ? 1 : -1, true);
          card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx * 0.055}deg)`;
        });
        const release = (event) => {
          if (
            pointerId == null ||
            (event.pointerId != null && event.pointerId !== pointerId)
          )
            return;
          const releasedId = pointerId;
          pointerId = null;
          card.releasePointerCapture?.(releasedId);
          card.classList.remove("dragging");
          publishPress(index, false);
          if (Math.abs(dx) >= threshold) {
            const direction = dx > 0 ? 1 : -1;
            card.style.transition = `transform ${duration}ms ease`;
            card.style.transform = `translate(${dx < 0 ? -deck.clientWidth * 2 : deck.clientWidth * 2}px,${dy * 1.5}px) rotate(${dx * 0.12}deg)`;
            clearTimeout(releaseTimer);
            releaseTimer = setTimeout(
              () => {
                if (!disposed) select(current + direction, true);
              },
              Math.round(duration * 0.72),
            );
          } else {
            card.style.transform = "translate(0,0) rotate(0deg)";
            layoutStack(1, true);
            if (!moved) context.signals.publish("set", current);
          }
        };
        card.addEventListener("pointerup", release);
        card.addEventListener("pointercancel", release);
      }
      function layoutStack(direction, preserveActive) {
        const depthCount = Math.min(
            count,
            clamp(Number(p.stackDepth) || 3, 1, 5),
          ),
          offset = clamp(Number(p.stackOffset) || 8, 0, 30),
          horizontalOffset = clamp(Number(p.stackHorizontalOffset) || 6, 0, 30);
        [...deck.children].forEach((card, index) => {
          const depth =
              direction > 0
                ? (index - current + count) % count
                : (current - index + count) % count,
            visible = depth < depthCount;
          card.classList.toggle("active", depth === 0);
          card.style.zIndex = String(100 - depth);
          card.style.display = visible ? "flex" : "none";
          if (!(preserveActive && depth === 0))
            card.style.transform = `translate(${-depth * horizontalOffset}px,${depth * offset}px) scale(${Math.max(0.72, 1 - depth * 0.055)})`;
        });
      }
      function renderDots() {
        dotsEl.innerHTML = "";
        if (!showDots) return;
        for (let index = 0; index < count; index++) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "swipe-dot" + (index === current ? " active" : "");
          dot.setAttribute("aria-label", "Go to card " + (index + 1));
          dot.onclick = () => select(index, true);
          dotsEl.appendChild(dot);
        }
      }
      function render() {
        deck.innerHTML = "";
        for (let index = 0; index < count; index++) {
          const card = document.createElement("div");
          card.className = "swipe-card";
          card.dataset.itemIndex = String(index);
          card.textContent = labels[index] || "";
          if (index === current) attachDrag(card, index);
          deck.appendChild(card);
        }
        layoutStack(1, false);
        renderDots();
      }
      context.signals.subscribe("feedback", (value) => select(value, false));
      root.addEventListener("composer-scroll-return", (event) => {
        if (event.detail?.axis === "horizontal") select(0, true);
      });
      context.signals.subscribe("count", (value) => {
        const nextCount = Math.round(Number(value));
        if (nextCount > 0) {
          count = clamp(nextCount, 1, 20);
          current = Math.min(current, count - 1);
          render();
        }
      });
      for (let index = 0; index < 20; index++) {
        context.signals.subscribeAddress(
          "digital",
          address(p.feedbackBase, p.feedbackIncrement, index),
          (value) => {
            if (truthy(value) && index < count) select(index, false);
          },
        );
        context.signals.subscribeAddress(
          "serial",
          address(p.labelBase, p.labelIncrement, index),
          (value) => {
            if (value == null) return;
            labels[index] = String(value);
            render();
          },
        );
      }
      render();
      return () => {
        disposed = true;
        clearTimeout(releaseTimer);
      };
    },
  });
})(window.ComposerRuntime);
