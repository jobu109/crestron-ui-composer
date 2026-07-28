(function (global) {
  "use strict";
  const defaults = Array.from({ length: 20 }, (_, i) => "Item " + i).join("|");
  global.ComposerRuntime.register({
    id: "rolling-menu",
    name: "Rolling Menu",
    category: "Lists & Selectors",
    defaultSize: { width: 340, height: 420 },
    signals: [],
    addressBindings: [
      {
        name: "Number of items (overrides local count)",
        type: "analog",
        direction: "input",
        key: "itemCountSignal",
      },
      {
        name: "Selected item set",
        type: "analog",
        direction: "input",
        key: "selectedSetSignal",
      },
      {
        name: "Selected item feedback",
        type: "analog",
        direction: "output",
        key: "selectedOutSignal",
      },
    ],
    rangeBindings: [
      {
        name: "Digital item press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Digital item feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Serial item label range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "signalIncrement",
      },
    ],
    data: { defaults },
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
        key: "itemCountSignal",
        name: "Item count signal",
        type: "text",
        defaultValue: "RollingMenu.ItemCount",
        signalSetting: true,
      },
      {
        key: "selectedSetSignal",
        name: "Selected set signal",
        type: "text",
        defaultValue: "RollingMenu.SelectedSet",
        signalSetting: true,
      },
      {
        key: "selectedOutSignal",
        name: "Selected output signal",
        type: "text",
        defaultValue: "RollingMenu.SelectedFeedback",
        signalSetting: true,
      },
      {
        key: "defaultCount",
        name: "Default items",
        type: "select",
        options: Array.from({ length: 20 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        })),
        defaultValue: "10",
        affectsProperties: true,
      },
      {
        key: "itemLabels",
        name: "Local item labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Item",
        defaultValue: defaults,
      },
      {
        key: "pressBase",
        name: "Press base / pattern",
        type: "text",
        defaultValue: "RollingMenu.Items[{index}].Press",
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Feedback base / pattern",
        type: "text",
        defaultValue: "RollingMenu.Items[{index}].Selected",
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Label base / pattern",
        type: "text",
        defaultValue: "RollingMenu.Items[{index}].Label",
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
        key: "itemColor",
        name: "Item color",
        type: "color",
        defaultValue: "#666666",
      },
      {
        key: "activeColor",
        name: "Selected item color",
        type: "color",
        defaultValue: "#04aa8e",
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
        key: "textSize",
        name: "Text size (px)",
        type: "number",
        defaultValue: 28,
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
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
        defaultValue: "right",
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
        defaultValue: "#04aa8e",
      },
    ],
    template: '<div class="rm-root"><div class="rm-items"></div><div class="rm-dots"></div></div>',
    styles:
      '[data-component="rolling-menu"],[data-component="rolling-menu"] *{box-sizing:border-box}[data-component="rolling-menu"]{display:block;width:100%;height:100%;background:transparent}[data-component="rolling-menu"] .rm-root{position:relative;width:100%;height:100%;overflow:hidden;perspective:1000px;touch-action:none;display:flex;flex-direction:row}[data-component="rolling-menu"] .rm-items{height:100%;flex:1 1 auto;min-width:0;position:relative;transform-style:preserve-3d}[data-component="rolling-menu"] .rm-item{position:absolute;top:50%;left:1%;width:98%;height:clamp(42px,14%,104px);padding:0 16px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--item-color) 65%,transparent);border:1px solid rgba(255,255,255,.24);border-radius:10px;font:700 var(--text-size-px)/1 "Segoe UI",sans-serif;color:var(--text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backface-visibility:hidden;transition:.2s;cursor:pointer}.rm-item.active{background:color-mix(in srgb,var(--active-color) 68%,transparent);border-color:var(--active-color);text-shadow:0 0 10px var(--text-color),0 0 20px var(--text-color);box-shadow:0 0 20px var(--glow-color);z-index:10}[data-component="rolling-menu"] .rm-dots{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:0 6px;z-index:5}[data-component="rolling-menu"] .rm-dot{width:clamp(6px,1.6vmin,10px);height:clamp(6px,1.6vmin,10px);border-radius:50%;border:0;padding:0;background:var(--dot-color);cursor:pointer;transition:height .2s ease,border-radius .2s ease,background .2s ease}[data-component="rolling-menu"] .rm-dot.active{height:clamp(18px,4.5vmin,28px);border-radius:5px;background:var(--active-dot-color)}[data-component="rolling-menu"][data-dots-pos="left"] .rm-dots{order:-1}',
    mount(root, context) {
      const p = context.options.properties || {},
        host = root.querySelector(".rm-items"),
        dotsEl = root.querySelector(".rm-dots"),
        showDots = p.showDots !== false && p.showDots !== 0 && p.showDots !== "0" && String(p.showDots).toLowerCase() !== "false",
        labels = String(p.itemLabels || defaults).split("|");
      let count = Math.max(1, Math.min(20, Number(p.defaultCount) || 10)),
        selected = 0,
        buttons = [];
      const address = (base, i) =>
        p.bindingMode === "join"
          ? String((Number(base) || 0) + i * (Number(p.signalIncrement) || 1))
          : String(base || "")
              .replace(/\{n\}/g, i + 1)
              .replace(/\{index\}/g, i);
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
      root.style.setProperty(
        "--dot-color",
        rgba(p.dotColor || "#fff", p.dotOpacity ?? 35),
      );
      root.style.setProperty("--active-dot-color", p.activeDotColor || "#04aa8e");
      root.dataset.dotsPos = p.dotsPosition === "left" ? "left" : "right";
      dotsEl.style.display = showDots ? "" : "none";
      function renderDots() {
        dotsEl.innerHTML = "";
        if (!showDots) return;
        for (let index = 0; index < count; index++) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "rm-dot" + (index === selected ? " active" : "");
          dot.setAttribute("aria-label", "Go to item " + (index + 1));
          dot.addEventListener("click", () => set(index, true));
          dotsEl.appendChild(dot);
        }
      }
      function syncDotsActive() {
        [...dotsEl.children].forEach((dot, index) =>
          dot.classList.toggle("active", index === selected),
        );
      }
      const rotate = () => {
        const step = 360 / count;
        buttons.forEach((b, i) => {
          let d = i - selected;
          while (d > count / 2) d -= count;
          while (d < -count / 2) d += count;
          const angle = d * step * 0.62,
            r = Math.max(90, root.clientHeight * 0.34),
            y = Math.sin((angle * Math.PI) / 180) * r,
            z = Math.cos((angle * Math.PI) / 180) * r - r;
          b.style.transform = `translateY(calc(-50% + ${y}px)) translateZ(${z}px) rotateX(${-angle}deg)`;
          b.style.opacity = String(Math.max(0.08, 1 - Math.abs(angle) / 120));
          b.classList.toggle("active", i === selected);
        });
      };
      const set = (value, publish) => {
        selected = ((Math.round(Number(value)) % count) + count) % count;
        rotate();
        syncDotsActive();
        root.dispatchEvent(
          new CustomEvent("composer-scroll-position", {
            detail: { axis: "vertical", value: selected },
          }),
        );
        if (publish)
          context.signals.publishAddress(
            "analog",
            p.selectedOutSignal,
            selected,
          );
      };
      function draw() {
        host.innerHTML = "";
        buttons = [];
        for (let i = 0; i < count; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "rm-item";
          b.textContent = labels[i] ?? "";
          b.addEventListener("click", () => {
            set(i, true);
            const a = address(p.pressBase, i);
            context.signals.publishAddress("digital", a, true);
            setTimeout(
              () => context.signals.publishAddress("digital", a, false),
              100,
            );
          });
          context.signals.subscribeAddress(
            "digital",
            address(p.feedbackBase, i),
            (v) => {
              if (v === true || v === 1 || v === "1") set(i, false);
            },
          );
          context.signals.subscribeAddress(
            "serial",
            address(p.labelBase, i),
            (v) => {
              if (v) b.textContent = v;
            },
          );
          host.appendChild(b);
          buttons.push(b);
        }
        rotate();
        renderDots();
      }
      let wheel = 0;
      root.addEventListener(
        "wheel",
        (e) => {
          wheel += e.deltaY;
          if (Math.abs(wheel) > 80) {
            set(selected + (wheel > 0 ? 1 : -1), true);
            wheel = 0;
          }
          e.preventDefault();
        },
        { passive: false },
      );
      let start = 0,
        dragStartSelected = 0,
        dragging = false;
      root.addEventListener("pointerdown", (e) => {
        start = e.clientY;
        dragStartSelected = selected;
        dragging = true;
        root.setPointerCapture && root.setPointerCapture(e.pointerId);
      });
      root.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const itemHeight = Math.max(36, root.clientHeight / 6);
        set(
          dragStartSelected + Math.round((start - e.clientY) / itemHeight),
          false,
        );
      });
      root.addEventListener("pointerup", (e) => {
        const d = start - e.clientY;
        dragging = false;
        if (Math.abs(d) > 8) set(selected, true);
      });
      root.addEventListener("pointercancel", () => {
        dragging = false;
      });
      root.addEventListener("composer-scroll-return", (event) => {
        if (event.detail?.axis === "vertical") set(0, true);
      });
      context.signals.subscribeAddress("analog", p.itemCountSignal, (v) => {
        const n = Math.round(Number(v));
        if (n > 0) {
          count = Math.min(20, n);
          selected = Math.min(selected, count - 1);
          draw();
        }
      });
      context.signals.subscribeAddress("analog", p.selectedSetSignal, (v) =>
        set(v, false),
      );
      const observer = new ResizeObserver(rotate);
      observer.observe(root);
      draw();
      return () => observer.disconnect();
    },
  });
})(window);
