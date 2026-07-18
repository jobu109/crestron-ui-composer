(function (global) {
  "use strict";
  const labels =
    "Settings|Copy|Share|Delete|Item 4|Item 5|Item 6|Item 7|Item 8|Item 9|Item 10|Item 11";
  const high = (v) => v === true || v === 1 || v === "1" || v === "true";
  global.ComposerRuntime.register({
    id: "hamburger-popup",
    name: "Hamburger Popup",
    category: "Navigation & Menus",
    defaultSize: { width: 360, height: 420 },
    signals: [],
    signalGroups: [
      { name: "Item count", type: "analog", direction: "input" },
      { name: "Menu item press range", type: "digital", direction: "output" },
      { name: "Menu item feedback range", type: "digital", direction: "input" },
      { name: "Menu item label range", type: "serial", direction: "input" },
    ],
    addressBindings: [
      {
        name: "Number of menu items (overrides local count)",
        type: "analog",
        direction: "input",
        key: "countSignal",
      },
    ],
    rangeBindings: [
      {
        name: "Digital menu item press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Digital menu item feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "signalIncrement",
      },
      {
        name: "Serial menu item label range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "signalIncrement",
      },
    ],
    data: { labels },
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
        name: "Default menu items",
        type: "select",
        options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({
          value: String(n),
          label: String(n),
        })),
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "menuLabels",
        name: "Local menu item labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Menu item",
        defaultValue: labels,
      },
      {
        key: "countSignal",
        name: "Item count",
        type: "text",
        defaultValue: "HamburgerPopup.ItemCount",
        signalSetting: true,
      },
      {
        key: "pressBase",
        name: "Press base / pattern",
        type: "text",
        defaultValue: "HamburgerPopup.Items.{n}.Press",
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Feedback base / pattern",
        type: "text",
        defaultValue: "HamburgerPopup.Items.{n}.Selected",
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Label base / pattern",
        type: "text",
        defaultValue: "HamburgerPopup.Items.{n}.Label",
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
        key: "accentColor",
        name: "Accent color",
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
        key: "buttonSize",
        name: "Menu button size (multiplier)",
        type: "number",
        defaultValue: 1,
      },
      {
        key: "itemTextSize",
        name: "Item text size (multiplier)",
        type: "number",
        defaultValue: 1,
      },
    ],
    template:
      '<div class="hp-root"><div class="hp-container"><div class="hp-list"></div><div class="hp-scroll-track"><div class="hp-scroll-thumb"></div></div><button class="hp-toggle" type="button" aria-label="Menu"><i></i><i></i><i></i></button></div></div>',
    styles:
      '[data-component="hamburger-popup"],[data-component="hamburger-popup"] *{box-sizing:border-box}[data-component="hamburger-popup"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}[data-component="hamburger-popup"] .hp-root{width:100%;height:100%;padding:4%;overflow:hidden}[data-component="hamburger-popup"] .hp-container{position:relative;width:100%;height:100%;min-width:170px;min-height:120px;overflow:hidden}[data-component="hamburger-popup"] .hp-toggle{position:absolute;right:0;bottom:0;width:calc(clamp(44px,16vmin,70px) * var(--button-size));height:calc(clamp(44px,16vmin,70px) * var(--button-size));border:0;border-radius:50%;padding:0;cursor:pointer;display:flex;flex-direction:column;gap:16%;align-items:center;justify-content:center;color:var(--text-color);background:var(--accent-color);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent-color) 25%,transparent),0 0 18px color-mix(in srgb,var(--glow-color) 45%,transparent);z-index:2}.hp-toggle i{display:block;width:42%;height:2px;background:currentColor;border-radius:2px}.hp-container.open .hp-toggle{filter:brightness(1.12);box-shadow:0 0 0 6px color-mix(in srgb,var(--accent-color) 18%,transparent),0 0 22px color-mix(in srgb,var(--glow-color) 72%,transparent)}.hp-toggle:active{transform:scale(.94)}[data-component="hamburger-popup"] .hp-list{position:absolute;left:0;right:clamp(58px,20vmin,86px);bottom:0;max-height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:clamp(7px,2.5vmin,12px);margin:0;padding:clamp(10px,4vmin,18px);border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(52,68,68,.24) 42%,color-mix(in srgb,var(--accent-color) 16%,transparent));border:1px solid rgba(255,255,255,.36);box-shadow:inset 0 1px rgba(255,255,255,.42),inset 0 -20px 34px color-mix(in srgb,var(--accent-color) 10%,transparent),0 0 14px color-mix(in srgb,var(--glow-color) 42%,transparent),0 8px 18px rgba(0,0,0,.28);opacity:0;transform:translateX(16px) scale(.92);transform-origin:right bottom;pointer-events:none;transition:opacity .22s,transform .28s}.hp-container.open .hp-list{opacity:1;transform:none;pointer-events:auto}.hp-list::-webkit-scrollbar{display:none}.hp-item{display:flex;align-items:center;gap:9px;width:100%;min-height:clamp(42px,16vmin,62px);border:0;border-radius:10px;background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(50,60,60,.28) 46%,color-mix(in srgb,var(--accent-color) 14%,transparent));color:var(--text-color);padding:10px 12px;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.3),inset 0 -12px 22px rgba(0,0,0,.16),0 0 8px color-mix(in srgb,var(--glow-color) 26%,transparent);font-family:inherit;text-align:left}.hp-item.pressed{transform:scale(.97);box-shadow:inset 0 0 18px color-mix(in srgb,var(--accent-color) 28%,transparent),0 0 18px color-mix(in srgb,var(--glow-color) 58%,transparent)}.hp-item.selected{background:linear-gradient(145deg,color-mix(in srgb,var(--accent-color) 82%,transparent),color-mix(in srgb,var(--accent-color) 90%,#043f36));box-shadow:inset 0 0 14px rgba(255,255,255,.22),0 0 18px color-mix(in srgb,var(--glow-color) 68%,transparent)}.hp-icon{width:clamp(16px,6vmin,24px);height:clamp(16px,6vmin,24px);flex:none}.hp-label{min-width:0;flex:1;font-size:calc(clamp(14px,6vmin,22px) * var(--item-text-size));font-weight:700;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    mount(root, context) {
      const high = (value) =>
        value === true || value === 1 || value === "1" || value === "true";
      const p = context.options.properties || {},
        container = root.querySelector(".hp-container"),
        list = root.querySelector(".hp-list"),
        scrollTrack = root.querySelector(".hp-scroll-track"),
        scrollThumb = root.querySelector(".hp-scroll-thumb"),
        toggle = root.querySelector(".hp-toggle"),
        local = String(p.menuLabels || labels).split("|"),
        max = 12;
      let count = Math.max(1, Math.min(max, Number(p.defaultCount) || 5));
      Object.assign(scrollTrack.style, {
        position: "absolute",
        width: "8px",
        borderRadius: "5px",
        background: "rgba(255,255,255,.09)",
        opacity: "0",
        pointerEvents: "none",
        transition: "opacity .2s",
        zIndex: "3",
      });
      Object.assign(scrollThumb.style, {
        position: "absolute",
        inset: "0 0 auto",
        minHeight: "28px",
        borderRadius: "5px",
        background: "var(--accent-color)",
        boxShadow: "0 0 10px var(--glow-color)",
        touchAction: "none",
        cursor: "grab",
      });
      function updateScroll() {
        const maxScroll = list.scrollHeight - list.clientHeight;
        if (maxScroll <= 1 || !container.classList.contains("open")) {
          scrollTrack.style.opacity = "0";
          scrollTrack.style.pointerEvents = "none";
          return;
        }
        const inset = 7,
          trackHeight = Math.max(20, list.clientHeight - inset * 2),
          thumbHeight = Math.max(
            28,
            trackHeight * (list.clientHeight / list.scrollHeight),
          ),
          maxThumbY = Math.max(0, trackHeight - thumbHeight),
          thumbY = maxThumbY * (list.scrollTop / maxScroll);
        scrollTrack.style.left = `${list.offsetLeft + list.offsetWidth - inset - 8}px`;
        scrollTrack.style.top = `${list.offsetTop + inset}px`;
        scrollTrack.style.height = `${trackHeight}px`;
        scrollTrack.style.opacity = "1";
        scrollTrack.style.pointerEvents = "auto";
        scrollThumb.style.height = `${thumbHeight}px`;
        scrollThumb.style.transform = `translateY(${thumbY}px)`;
      }
      const addr = (base, i) =>
        p.bindingMode === "join"
          ? String((Number(base) || 0) + i * (Number(p.signalIncrement) || 1))
          : String(base || "")
              .replace(/\{n\}/g, i + 1)
              .replace(/\{index\}/g, i);
      function draw() {
        list.innerHTML = "";
        for (let i = 0; i < count; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "hp-item";
          b.innerHTML =
            '<svg class="hp-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="hp-label">' +
            (local[i] || "Item " + i) +
            "</span>";
          const press = addr(p.pressBase, i);
          b.addEventListener("pointerdown", (e) => {
            b.classList.add("pressed");
            context.signals.publishAddress("digital", press, true);
            e.preventDefault();
          });
          ["pointerup", "pointerleave", "pointercancel"].forEach((n) =>
            b.addEventListener(n, () => {
              b.classList.remove("pressed");
              context.signals.publishAddress("digital", press, false);
            }),
          );
          context.signals.subscribeAddress(
            "digital",
            addr(p.feedbackBase, i),
            (v) => b.classList.toggle("selected", high(v)),
          );
          context.signals.subscribeAddress(
            "serial",
            addr(p.labelBase, i),
            (v) => {
              if (v) b.querySelector(".hp-label").textContent = v;
            },
          );
          list.append(b);
        }
        requestAnimationFrame(updateScroll);
      }
      toggle.addEventListener("click", () => {
        container.classList.toggle("open");
        requestAnimationFrame(updateScroll);
      });
      list.addEventListener("scroll", updateScroll, { passive: true });
      let dragging = false,
        dragStartY = 0,
        dragStartScroll = 0;
      scrollThumb.addEventListener("pointerdown", (event) => {
        dragging = true;
        dragStartY = event.clientY;
        dragStartScroll = list.scrollTop;
        scrollThumb.style.cursor = "grabbing";
        scrollThumb.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      scrollThumb.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const maxScroll = list.scrollHeight - list.clientHeight,
          maxThumbY = Math.max(1, scrollTrack.clientHeight - scrollThumb.offsetHeight);
        list.scrollTop =
          dragStartScroll + ((event.clientY - dragStartY) / maxThumbY) * maxScroll;
      });
      const endDrag = (event) => {
        dragging = false;
        scrollThumb.style.cursor = "grab";
        scrollThumb.releasePointerCapture?.(event.pointerId);
      };
      scrollThumb.addEventListener("pointerup", endDrag);
      scrollThumb.addEventListener("pointercancel", endDrag);
      context.signals.subscribeAddress("analog", p.countSignal, (v) => {
        const n = Math.round(Number(v) || 0);
        if (n > 0) {
          count = Math.min(max, n);
          draw();
        }
      });
      const observer = new ResizeObserver(updateScroll);
      observer.observe(list);
      draw();
      return () => observer.disconnect();
    },
  });
})(window);
