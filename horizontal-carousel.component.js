(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "horizontal-carousel",
    name: "Horizontal Carousel",
    category: "Lists & Selectors",
    defaultSize: { width: 520, height: 220 },
    signals: [
      {
        key: "set",
        name: "Selected slide set",
        type: "analog",
        direction: "output",
        defaultValue: "HorizontalCarousel.Selected.Set",
      },
      {
        key: "feedback",
        name: "Selected slide feedback",
        type: "analog",
        direction: "input",
        defaultValue: "HorizontalCarousel.Selected.Value",
      },
      {
        key: "count",
        name: "Number of slides (overrides local count)",
        type: "analog",
        direction: "input",
        defaultValue: "HorizontalCarousel.SlideCount",
      },
    ],
    signalGroups: [
      { name: "Slide press range", type: "digital", direction: "output" },
      { name: "Slide feedback range", type: "digital", direction: "input" },
      { name: "Slide label range", type: "serial", direction: "input" },
    ],
    rangeBindings: [
      {
        name: "Digital slide press range",
        type: "digital",
        direction: "output",
        baseKey: "pressBase",
        incrementKey: "pressIncrement",
      },
      {
        name: "Digital slide feedback range",
        type: "digital",
        direction: "input",
        baseKey: "feedbackBase",
        incrementKey: "feedbackIncrement",
      },
      {
        name: "Serial slide label range",
        type: "serial",
        direction: "input",
        baseKey: "labelBase",
        incrementKey: "labelIncrement",
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
        key: "defaultSlideCount",
        name: "Default slides",
        type: "select",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
          { value: "6", label: "6" },
          { value: "7", label: "7" },
          { value: "8", label: "8" },
          { value: "9", label: "9" },
          { value: "10", label: "10" },
          { value: "12", label: "12" },
          { value: "16", label: "16" },
          { value: "20", label: "20" },
        ],
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "slideLabels",
        name: "Local slide labels",
        type: "text-list",
        countKey: "defaultSlideCount",
        itemName: "Slide",
        defaultValue: "Slide 1|Slide 2|Slide 3|Slide 4|Slide 5",
      },
      {
        key: "pressBase",
        name: "Press base / pattern",
        type: "text",
        defaultValue: "HorizontalCarousel.Slides.{n}.Press",
        signalSetting: true,
      },
      {
        key: "pressIncrement",
        name: "Press join increment",
        type: "number",
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "feedbackBase",
        name: "Feedback base / pattern",
        type: "text",
        defaultValue: "HorizontalCarousel.Slides.{n}.Selected",
        signalSetting: true,
      },
      {
        key: "feedbackIncrement",
        name: "Feedback increment",
        type: "number",
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "labelBase",
        name: "Label base / pattern",
        type: "text",
        defaultValue: "HorizontalCarousel.Slides.{n}.Label",
        signalSetting: true,
      },
      {
        key: "labelIncrement",
        name: "Label join increment",
        type: "number",
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "labelColor",
        name: "Label color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "activeLabelColor",
        name: "Active label color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "inactiveLabelColor",
        name: "Inactive label color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "slideColor",
        name: "Glass slide color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "slideOpacity",
        name: "Slide opacity (0–100)",
        type: "number",
        defaultValue: 10,
      },
      {
        key: "borderColor",
        name: "Slide border color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "borderOpacity",
        name: "Border opacity",
        type: "number",
        defaultValue: 15,
      },
      {
        key: "activeGlowColor",
        name: "Active glow color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "activeGlowOpacity",
        name: "Active glow strength",
        type: "number",
        defaultValue: 80,
      },
      {
        key: "arrowColor",
        name: "Arrow color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "arrowBackground",
        name: "Arrow background color",
        type: "color",
        defaultValue: "#ffffff",
      },
      {
        key: "arrowOpacity",
        name: "Arrow background opacity",
        type: "number",
        defaultValue: 20,
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
        defaultValue: "#04aa8e",
      },
    ],
    template:
      '<div class="glass-carousel-container"><div class="glass-track-wrapper"><div class="carousel-controls"><button class="glass-carousel-prev" type="button">&#10094;</button><button class="glass-carousel-next" type="button">&#10095;</button></div><div class="glass-track"></div></div><div class="carousel-dots"></div></div>',
    styles:
      '[data-component="horizontal-carousel"]{display:block;width:100%;height:100%;overflow:hidden;background:transparent;touch-action:none;box-sizing:border-box}[data-component="horizontal-carousel"] *{box-sizing:border-box}[data-component="horizontal-carousel"] .glass-carousel-container{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column}[data-component="horizontal-carousel"] .carousel-controls{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(8px,4%,32px);z-index:5;pointer-events:none}[data-component="horizontal-carousel"] .carousel-controls button{width:clamp(36px,14vmin,60px);height:clamp(36px,14vmin,60px);border:0;border-radius:50%;background:var(--arrow-background);color:var(--arrow-color);font-size:clamp(20px,8vmin,34px);line-height:1;cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 0 12px rgba(4,170,142,.4);pointer-events:auto}[data-component="horizontal-carousel"] .carousel-controls button:active{transform:scale(.92);box-shadow:0 0 20px var(--active-glow)}[data-component="horizontal-carousel"] .glass-track-wrapper{width:100%;flex:1 1 auto;min-height:0;overflow:hidden;position:relative}[data-component="horizontal-carousel"] .glass-track{display:flex;align-items:center;height:100%;transition:transform .4s ease-in-out;will-change:transform}[data-component="horizontal-carousel"] .glass-slide{width:min(54%,300px);height:min(62%,400px);min-width:120px;min-height:140px;margin:0 clamp(8px,2%,18px);position:relative;background:var(--slide-color);border:1px solid var(--border-color);backdrop-filter:blur(16px);border-radius:18px;box-shadow:inset 0 0 20px rgba(255,255,255,.15),0 4px 24px rgba(0,0,0,.4);flex-shrink:0;transition:box-shadow .3s ease,transform .3s ease;display:flex;align-items:center;justify-content:center;padding:clamp(10px,4%,20px)}[data-component="horizontal-carousel"] .glass-slide.active{box-shadow:0 0 20px var(--active-glow),0 0 40px var(--active-glow-medium),0 0 60px var(--active-glow-light);transform:scale(1.1)}[data-component="horizontal-carousel"] .glass-label{color:var(--label-color);font-family:Segoe UI,sans-serif;font-size:clamp(16px,8vmin,34px);font-weight:600;line-height:1.15;text-align:center}[data-component="horizontal-carousel"] .carousel-dots{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 0;z-index:5}[data-component="horizontal-carousel"] .carousel-dot{width:clamp(6px,1.6vmin,10px);height:clamp(6px,1.6vmin,10px);border-radius:50%;border:0;padding:0;background:var(--dot-color);cursor:pointer;transition:width .2s ease,border-radius .2s ease,background .2s ease}[data-component="horizontal-carousel"] .carousel-dot.active{width:clamp(18px,4.5vmin,28px);border-radius:5px;background:var(--active-dot-color)}[data-component="horizontal-carousel"][data-dots-pos="top"] .carousel-dots{order:-1}',
    mount(root, context) {
      const p = context.options.properties || {},
        track = root.querySelector(".glass-track"),
        wrapper = root.querySelector(".glass-track-wrapper"),
        prev = root.querySelector(".glass-carousel-prev"),
        next = root.querySelector(".glass-carousel-next"),
        dotsEl = root.querySelector(".carousel-dots"),
        showDots = p.showDots !== false && p.showDots !== 0 && p.showDots !== "0" && String(p.showDots).toLowerCase() !== "false";
      let labels = String(
          p.slideLabels ?? "Slide 1|Slide 2|Slide 3|Slide 4|Slide 5",
        )
          .split("|")
          .map((v) => v.trim()),
        current = 0,
        startX = 0,
        slides = [];
      root.style.position = "relative";
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
      const glow = Math.max(
        0,
        Math.min(100, Number(p.activeGlowOpacity) ?? 80),
      );
      root.style.setProperty("--label-color", p.labelColor || "#fff");
      root.style.setProperty(
        "--slide-color",
        rgba(p.slideColor || "#fff", p.slideOpacity ?? 10),
      );
      root.style.setProperty(
        "--border-color",
        rgba(p.borderColor || "#fff", p.borderOpacity ?? 15),
      );
      root.style.setProperty(
        "--active-glow",
        rgba(p.activeGlowColor || "#04aa8e", glow),
      );
      root.style.setProperty(
        "--active-glow-medium",
        rgba(p.activeGlowColor || "#04aa8e", glow * 0.5),
      );
      root.style.setProperty(
        "--active-glow-light",
        rgba(p.activeGlowColor || "#04aa8e", glow * 0.25),
      );
      root.style.setProperty("--arrow-color", p.arrowColor || "#fff");
      root.style.setProperty(
        "--arrow-background",
        rgba(p.arrowBackground || "#fff", p.arrowOpacity ?? 20),
      );
      root.style.setProperty(
        "--dot-color",
        rgba(p.dotColor || "#fff", p.dotOpacity ?? 35),
      );
      root.style.setProperty("--active-dot-color", p.activeDotColor || "#04aa8e");
      root.dataset.dotsPos = p.dotsPosition === "top" ? "top" : "bottom";
      dotsEl.style.display = showDots ? "" : "none";
      function pressAddress(index) {
        if ((p.bindingMode || "join") === "join")
          return String(
            (Number(p.pressBase) || 0) +
              index * (Number(p.pressIncrement) || 1),
          );
        return String(p.pressBase || "")
          .replace(/\{n\}/g, String(index + 1))
          .replace(/\{index\}/g, String(index));
      }
      function labelAddress(index) {
        if ((p.bindingMode || "join") === "join")
          return String(
            (Number(p.labelBase) || 0) +
              index * (Number(p.labelIncrement) || 1),
          );
        return String(p.labelBase || "")
          .replace(/\{n\}/g, String(index + 1))
          .replace(/\{index\}/g, String(index));
      }
      function feedbackAddress(index) {
        if ((p.bindingMode || "join") === "join")
          return String(
            (Number(p.feedbackBase) || 0) +
              index * (Number(p.feedbackIncrement) || 1),
          );
        return String(p.feedbackBase || "")
          .replace(/\{n\}/g, String(index + 1))
          .replace(/\{index\}/g, String(index));
      }
      function renderDots(count) {
        dotsEl.innerHTML = "";
        if (!showDots) return;
        for (let index = 0; index < count; index++) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "carousel-dot" + (index === current ? " active" : "");
          dot.setAttribute("aria-label", "Go to slide " + (index + 1));
          dot.onclick = () => select(index, true);
          dotsEl.appendChild(dot);
        }
      }
      function syncDotsActive() {
        [...dotsEl.children].forEach((dot, index) =>
          dot.classList.toggle("active", index === current),
        );
      }
      function render(count) {
        count = Math.max(1, Math.min(48, Math.round(Number(count) || 5)));
        track.innerHTML = "";
        current = Math.min(current, count - 1);
        for (let index = 0; index < count; index++) {
          const slide = document.createElement("div"),
            span = document.createElement("span");
          slide.className =
            "glass-slide" + (index === current ? " active" : "");
          span.className = "glass-label";
          span.textContent = labels[index] ?? "";
          span.style.color =
            index === current
              ? p.activeLabelColor || "#04aa8e"
              : p.inactiveLabelColor || p.labelColor || "#fff";
          slide.appendChild(span);
          slide.onclick = () => select(index, true);
          slide.onpointerdown = () =>
            context.signals.publishAddress(
              "digital",
              pressAddress(index),
              true,
            );
          slide.onpointerup = slide.onpointercancel = () =>
            context.signals.publishAddress(
              "digital",
              pressAddress(index),
              false,
            );
          track.appendChild(slide);
        }
        slides = [...track.children];
        renderDots(count);
        requestAnimationFrame(update);
      }
      function update() {
        if (!slides.length) return;
        const slide = slides[current],
          slideRect = slide.getBoundingClientRect(),
          wrapperRect = wrapper.getBoundingClientRect(),
          offset =
            wrapperRect.width / 2 - (slideRect.width / 2 + slide.offsetLeft);
        track.style.transform = "translateX(" + offset + "px)";
      }
      function select(index, publish) {
        if (!slides.length) return;
        index = Math.max(0, Math.min(slides.length - 1, index));
        slides[current].classList.remove("active");
        slides[current].querySelector(".glass-label").style.color =
          p.inactiveLabelColor || p.labelColor || "#fff";
        current = index;
        slides[current].classList.add("active");
        slides[current].querySelector(".glass-label").style.color =
          p.activeLabelColor || "#04aa8e";
        syncDotsActive();
        update();
        root.dispatchEvent(
          new CustomEvent("composer-scroll-position", {
            detail: { axis: "horizontal", value: current },
          }),
        );
        if (publish) context.signals.publish("set", current);
      }
      function move(amount) {
        select((current + amount + slides.length) % slides.length, true);
      }
      prev.onclick = () => move(-1);
      next.onclick = () => move(1);
      root.addEventListener("composer-scroll-return", (event) => {
        if (event.detail?.axis === "horizontal") select(0, true);
      });
      track.addEventListener("pointerdown", (e) => {
        startX = e.clientX;
      });
      track.addEventListener("pointerup", (e) => {
        const diff = e.clientX - startX;
        if (diff > 50) move(-1);
        else if (diff < -50) move(1);
      });
      context.signals.subscribe("feedback", (value) =>
        select(Math.round(Number(value) || 0), false),
      );
      context.signals.subscribe("count", (value) => {
        const n = Math.round(Number(value));
        if (n > 0) render(n);
      });
      for (let i = 0; i < 48; i++) {
        context.signals.subscribeAddress(
          "digital",
          feedbackAddress(i),
          (value) => {
            if (value === true || value === 1 || value === "1")
              select(i, false);
          },
        );
        context.signals.subscribeAddress("serial", labelAddress(i), (value) => {
          if (value !== undefined && value !== null) labels[i] = String(value);
          if (slides[i])
            slides[i].querySelector(".glass-label").textContent =
              labels[i] ?? "";
        });
      }
      render(Number(p.defaultSlideCount) || 5);
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(update);
        observer.observe(wrapper);
        return () => observer.disconnect();
      }
    },
  });
})(window);
