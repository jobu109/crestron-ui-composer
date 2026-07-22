(function (global) {
  "use strict";
  const displayDefaults = Array.from(
    { length: 20 },
    (_, i) => `Display ${i + 1}`,
  ).join("|");
  const sourceDefaults =
    "HDMI 1|HDMI 2|HDMI 3|HDMI 4|Input 5|Input 6|Input 7|Input 8";
  global.ComposerRuntime.register({
    id: "display-control",
    name: "Display Control",
    category: "Multi-Devices",
    defaultSize: { width: 480, height: 360 },
    signals: [],
    data: { displayDefaults, sourceDefaults },
    addressBindings: [
      {
        name: "Number of displays (overrides local count)",
        type: "analog",
        direction: "input",
        key: "countSignal",
      },
    ],
    rangeBindings: [
      {
        name: "Serial display-name range",
        type: "serial",
        direction: "input",
        baseKey: "nameBase",
        incrementKey: "displayIncrement",
      },
      {
        name: "Digital power press range",
        type: "digital",
        direction: "output",
        baseKey: "powerPressBase",
        incrementKey: "displayIncrement",
      },
      {
        name: "Digital power feedback range",
        type: "digital",
        direction: "input",
        baseKey: "powerFeedbackBase",
        incrementKey: "displayIncrement",
      },
      {
        name: "Digital video-mute press range",
        type: "digital",
        direction: "output",
        baseKey: "mutePressBase",
        incrementKey: "displayIncrement",
      },
      {
        name: "Digital video-mute feedback range",
        type: "digital",
        direction: "input",
        baseKey: "muteFeedbackBase",
        incrementKey: "displayIncrement",
      },
      {
        name: "Serial video-mute label range",
        type: "serial",
        direction: "input",
        baseKey: "muteLabelBase",
        incrementKey: "displayIncrement",
      },
      {
        name: "Digital source press range",
        type: "digital",
        direction: "output",
        baseKey: "sourcePressBase",
        incrementKey: "sourceIncrement",
      },
      {
        name: "Digital source feedback range",
        type: "digital",
        direction: "input",
        baseKey: "sourceFeedbackBase",
        incrementKey: "sourceIncrement",
      },
      {
        name: "Serial source label range",
        type: "serial",
        direction: "input",
        baseKey: "sourceLabelBase",
        incrementKey: "sourceIncrement",
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
        key: "defaultCount",
        name: "Default displays",
        type: "select",
        options: Array.from({ length: 20 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        })),
        defaultValue: "5",
        affectsProperties: true,
      },
      {
        key: "displayLabels",
        name: "Local display labels",
        type: "text-list",
        countKey: "defaultCount",
        itemName: "Display",
        defaultValue: displayDefaults,
      },
      {
        key: "sourceCount",
        name: "Sources per display",
        type: "select",
        options: Array.from({ length: 8 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        })),
        defaultValue: "2",
      },
      {
        key: "sourceLabels",
        name: "Local source labels",
        type: "text",
        defaultValue: sourceDefaults,
      },
      {
        key: "muteText",
        name: "Local video-mute text",
        type: "text",
        defaultValue: "Video Mute",
      },
      {
        key: "offText",
        name: "Power-off text",
        type: "text",
        defaultValue: "OFF",
      },
      {
        key: "onText",
        name: "Power-on text",
        type: "text",
        defaultValue: "ON",
      },
      {
        key: "countSignal",
        name: "Display count",
        type: "text",
        defaultValue: "Displays.Count",
        signalSetting: true,
      },
      {
        key: "nameBase",
        name: "Display name base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.Name",
        signalSetting: true,
      },
      {
        key: "powerPressBase",
        name: "Power press base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.Power.Press",
        signalSetting: true,
      },
      {
        key: "powerFeedbackBase",
        name: "Power feedback base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.Power.Value",
        signalSetting: true,
      },
      {
        key: "mutePressBase",
        name: "Video-mute press base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.VideoMute.Press",
        signalSetting: true,
      },
      {
        key: "muteFeedbackBase",
        name: "Video-mute feedback base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.VideoMute.Value",
        signalSetting: true,
      },
      {
        key: "muteLabelBase",
        name: "Video-mute label base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.VideoMute.Label",
        signalSetting: true,
      },
      {
        key: "sourcePressBase",
        name: "Source press base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.Sources.{source}.Press",
        signalSetting: true,
      },
      {
        key: "sourceFeedbackBase",
        name: "Source feedback base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.Sources.{source}.Selected",
        signalSetting: true,
      },
      {
        key: "sourceLabelBase",
        name: "Source label base / pattern",
        type: "text",
        defaultValue: "Displays.Items.{n}.Sources.{source}.Label",
        signalSetting: true,
      },
      {
        key: "displayIncrement",
        name: "Display join increment",
        type: "number",
        defaultValue: 5,
        signalSetting: true,
      },
      {
        key: "sourceIncrement",
        name: "Source join increment",
        type: "number",
        defaultValue: 1,
        signalSetting: true,
      },
      {
        key: "cardColor",
        name: "Card color",
        type: "color",
        defaultValue: "#045548",
      },
      {
        key: "buttonColor",
        name: "Button color",
        type: "color",
        defaultValue: "#749c96",
      },
      {
        key: "selectedColor",
        name: "Selected source color",
        type: "color",
        defaultValue: "#04aa8e",
      },
      {
        key: "muteColor",
        name: "Active mute color",
        type: "color",
        defaultValue: "#be2a2a",
      },
      {
        key: "textColor",
        name: "Text/icon color",
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
        key: "nameTextSize",
        name: "Display-name size (px)",
        type: "number",
        defaultValue: 22,
      },
      {
        key: "buttonTextSize",
        name: "Button text size (px)",
        type: "number",
        defaultValue: 14,
      },
      {
        key: "iconSize",
        name: "Display icon size (px)",
        type: "number",
        defaultValue: 26,
      },
    ],
    template:
      '<div class="dc-stage"><div class="dc-track"></div><div class="dc-scroll"><i></i></div></div>',
    styles:
      '[data-component="display-control"],[data-component="display-control"] *{box-sizing:border-box}[data-component="display-control"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif;color:var(--text-color)}.dc-stage{position:relative;width:100%;height:100%;overflow:hidden;container-type:size}.dc-track{position:absolute;inset:0;display:grid;grid-auto-flow:column;grid-auto-columns:clamp(210px,64cqw,320px);grid-template-rows:minmax(0,1fr);gap:clamp(8px,2cqw,18px);padding:clamp(8px,3cqh,18px) clamp(10px,3cqw,28px) 18px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.dc-track::-webkit-scrollbar{display:none}.dc-card{height:100%;min-height:0;padding:clamp(8px,2cqh,16px);display:grid;grid-template-rows:auto minmax(0,1fr);gap:10px;border:1px solid color-mix(in srgb,var(--glow-color) 58%,transparent);border-radius:7px;background:radial-gradient(circle at 42% 34%,rgba(255,255,255,.26),transparent 64%),linear-gradient(145deg,rgba(255,255,255,.16),color-mix(in srgb,var(--card-color) 38%,transparent)),color-mix(in srgb,var(--card-color) 32%,transparent);box-shadow:inset 0 0 22px rgba(255,255,255,.09),inset 0 0 28px color-mix(in srgb,var(--glow-color) 22%,transparent),0 0 14px color-mix(in srgb,var(--glow-color) 24%,transparent);container-type:size}.dc-header{display:flex;align-items:center;gap:12px;min-width:0}.dc-icon{width:var(--icon-size-px);height:var(--icon-size-px);flex:none;fill:currentColor}.dc-name{min-width:0;font-size:var(--name-text-size-px);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 5px #000}.dc-controls{min-height:0;display:grid;grid-template-rows:repeat(3,minmax(0,1fr));align-items:center;justify-items:center}.dc-power{width:clamp(126px,58cqw,172px);height:clamp(44px,24cqh,68px);padding:5px;border:0;background:transparent;display:flex;perspective:300px;cursor:pointer}.dc-mode{flex:1;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(#f5f4f6,#ccc9ca);color:green;font-size:var(--button-text-size-px);font-weight:800;transition:.25s}.dc-mode:first-child{border-radius:8px 0 0 8px;transform-origin:right}.dc-mode:last-child{border-radius:0 8px 8px 0;transform-origin:left}.dc-power:not(.selected) .dc-mode:first-child{transform:rotateY(50deg);color:red;box-shadow:-10px 5px 20px #0003}.dc-power.selected .dc-mode:last-child{transform:rotateY(-50deg);color:red;box-shadow:10px 5px 20px #0003}.dc-mute{min-width:110px;height:clamp(38px,17cqh,48px);padding:0 18px;border:1px solid color-mix(in srgb,var(--glow-color) 72%,transparent);border-radius:999px;background:color-mix(in srgb,var(--button-color) 68%,transparent);color:var(--text-color);font-size:var(--button-text-size-px);font-weight:800;box-shadow:0 4px 9px #0005,0 0 10px color-mix(in srgb,var(--glow-color) 32%,transparent);cursor:pointer}.dc-mute.pressed,.dc-source.pressed{transform:scale(.96)}.dc-mute.active{background:color-mix(in srgb,var(--mute-color) 78%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--mute-color) 62%,transparent)}.dc-sources{--count:2;--selected:0;position:relative;display:grid;grid-template-columns:repeat(var(--count),1fr);width:min(100%,210px);height:clamp(48px,24cqh,72px);padding:4px;background:#f0f0f01a;border-radius:7px;overflow:hidden}.dc-slider{position:absolute;top:4px;left:calc(4px + ((100% - 8px)/var(--count))*var(--selected));width:calc((100% - 8px)/var(--count));height:calc(100% - 8px);border-radius:6px;background:var(--selected-color);box-shadow:0 0 15px var(--glow-color);transition:left .25s;animation:dc-pulse 1.5s infinite}.dc-source{position:relative;z-index:1;min-width:0;border:0;background:transparent;color:var(--text-color);font-size:var(--button-text-size-px);font-weight:800;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.dc-scroll{position:absolute;left:14px;right:14px;bottom:4px;height:7px;border-radius:99px;background:#2a2a2a61;opacity:0;pointer-events:none}.dc-scroll.visible{opacity:1;pointer-events:auto}.dc-scroll i{display:block;height:100%;width:36px;border-radius:inherit;background:#707070c2;touch-action:none}@keyframes dc-pulse{0%,100%{box-shadow:0 0 10px color-mix(in srgb,var(--glow-color) 40%,transparent)}50%{box-shadow:0 0 24px color-mix(in srgb,var(--glow-color) 85%,transparent)}}',
    mount(root, context) {
      const p = context.options.properties || {},
        track = root.querySelector(".dc-track"),
        scroll = root.querySelector(".dc-scroll"),
        thumb = scroll.querySelector("i"),
        displayLabels = String(p.displayLabels || displayDefaults).split("|"),
        sourceLabels = String(p.sourceLabels || sourceDefaults).split("|");
      let count = Math.max(1, Math.min(48, Number(p.defaultCount) || 5));
      const addr = (base, d, s) => {
        if (p.bindingMode === "join")
          return String(
            (Number(base) || 0) +
              d * (Number(p.displayIncrement) || 5) +
              (s == null ? 0 : s * (Number(p.sourceIncrement) || 1)),
          );
        return String(base || "")
          .replace(/\{n\}|\{display\}/g, d + 1)
          .replace(/\{index\}/g, d)
          .replace(/\{source\}/g, (s || 0) + 1)
          .replace(/\{sourceIndex\}/g, s || 0);
      };
      const pulse = (signal) => {
        context.signals.publishAddress("digital", signal, true);
        setTimeout(
          () => context.signals.publishAddress("digital", signal, false),
          100,
        );
      };
      function updateScroll() {
        const max = track.scrollWidth - track.clientWidth,
          width = scroll.clientWidth;
        if (max <= 1 || width <= 0) {
          scroll.classList.remove("visible");
          return;
        }
        const tw = Math.max(
            36,
            (track.clientWidth / track.scrollWidth) * width,
          ),
          x = (track.scrollLeft / max) * (width - tw);
        scroll.classList.add("visible");
        thumb.style.width = `${tw}px`;
        thumb.style.transform = `translateX(${x}px)`;
      }
      function draw() {
        track.innerHTML = "";
        for (let d = 0; d < count; d++) {
          const card = document.createElement("section");
          card.className = "dc-card";
          card.innerHTML =
            '<header class="dc-header"><svg class="dc-icon" viewBox="0 0 24 24"><path d="M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6v2h3a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v9h16V7H4Z"/></svg><div class="dc-name"></div></header><div class="dc-controls"><button class="dc-power"><span class="dc-mode dc-off"></span><span class="dc-mode dc-on"></span><span class="dc-power-back dc-left"></span><span class="dc-power-back dc-right"></span></button><button class="dc-mute"></button><div class="dc-sources"><i class="dc-slider"></i></div></div>';
          const name = card.querySelector(".dc-name"),
            power = card.querySelector(".dc-power"),
            powerBacks = power.querySelectorAll(".dc-power-back"),
            modes = power.querySelectorAll(".dc-mode"),
            mute = card.querySelector(".dc-mute"),
            sources = card.querySelector(".dc-sources"),
            buttons = [];
          power.style.position = "relative";
          power.style.isolation = "isolate";
          powerBacks.forEach((back, index) => Object.assign(back.style, { position: "absolute", top: "50%", height: "calc(100% - 18px)", width: index === 0 ? "50%" : "0", left: index === 0 ? "5px" : "auto", right: index === 1 ? "5px" : "auto", zIndex: "0", background: "linear-gradient(90deg,#999899,#545354)", transform: `translateY(-50%) rotateY(${index === 0 ? -65 : 65}deg)`, transformOrigin: index === 0 ? "left" : "right", transition: "width .25s" }));
          modes.forEach((mode, index) => { mode.style.position = "relative"; mode.style.zIndex = "1"; mode.style.borderRadius = index === 0 ? "8px 0 0 8px" : "0 8px 8px 0"; mode.style.transformOrigin = index === 0 ? "right" : "left"; });
          const setPower = selected => { power.classList.toggle("selected", selected); modes[0].style.transform = selected ? "none" : "rotateY(50deg)"; modes[1].style.transform = selected ? "rotateY(-50deg)" : "none"; modes[0].style.color = selected ? "green" : "red"; modes[1].style.color = selected ? "red" : "green"; modes[0].style.boxShadow = selected ? "none" : "-10px 5px 20px rgba(0,0,0,.2)"; modes[1].style.boxShadow = selected ? "10px 5px 20px rgba(0,0,0,.2)" : "none"; powerBacks[0].style.width = selected ? "0" : "50%"; powerBacks[1].style.width = selected ? "50%" : "0"; };
          name.textContent = displayLabels[d] || `Display ${d + 1}`;
          modes[0].textContent = p.offText || "OFF";
          modes[1].textContent = p.onText || "ON";
          setPower(false);
          mute.textContent = p.muteText || "Video Mute";
          power.onclick = () => {
            setPower(!power.classList.contains("selected"));
            pulse(addr(p.powerPressBase, d));
          };
          mute.addEventListener("pointerdown", (e) => {
            mute.classList.add("pressed");
            context.signals.publishAddress(
              "digital",
              addr(p.mutePressBase, d),
              true,
            );
            e.preventDefault();
          });
          ["pointerup", "pointerleave", "pointercancel"].forEach((n) =>
            mute.addEventListener(n, () => {
              mute.classList.remove("pressed");
              context.signals.publishAddress(
                "digital",
                addr(p.mutePressBase, d),
                false,
              );
            }),
          );
          const sc = Math.max(1, Math.min(8, Number(p.sourceCount) || 2));
          sources.style.setProperty("--count", sc);
          const select = (i) => {
            sources.style.setProperty("--selected", i);
            buttons.forEach((b, n) => b.classList.toggle("selected", n === i));
          };
          for (let s = 0; s < sc; s++) {
            const b = document.createElement("button");
            b.className = "dc-source";
            b.textContent = sourceLabels[s] || `Input ${s + 1}`;
            b.onclick = () => {
              select(s);
              pulse(addr(p.sourcePressBase, d, s));
            };
            context.signals.subscribeAddress(
              "digital",
              addr(p.sourceFeedbackBase, d, s),
              (v) => {
                if (v === true || v === 1 || v === "1") select(s);
              },
            );
            context.signals.subscribeAddress(
              "serial",
              addr(p.sourceLabelBase, d, s),
              (v) => {
                if (v) b.textContent = v;
              },
            );
            sources.appendChild(b);
            buttons.push(b);
          }
          select(0);
          context.signals.subscribeAddress(
            "serial",
            addr(p.nameBase, d),
            (v) => {
              if (v) name.textContent = v;
            },
          );
          context.signals.subscribeAddress(
            "digital",
            addr(p.powerFeedbackBase, d),
            (v) =>
            setPower(v === true || v === 1 || v === "1"),
          );
          context.signals.subscribeAddress(
            "digital",
            addr(p.muteFeedbackBase, d),
            (v) =>
              mute.classList.toggle(
                "active",
                v === true || v === 1 || v === "1",
              ),
          );
          context.signals.subscribeAddress(
            "serial",
            addr(p.muteLabelBase, d),
            (v) => {
              if (v) mute.textContent = v;
            },
          );
          track.appendChild(card);
        }
        requestAnimationFrame(updateScroll);
      }
      track.addEventListener("scroll", updateScroll, { passive: true });
      let dragging = false,
        startX = 0,
        startScroll = 0;
      scroll.addEventListener("pointerdown", (e) => {
        dragging = true;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        scroll.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      });
      scroll.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const max = track.scrollWidth - track.clientWidth,
          travel = Math.max(1, scroll.clientWidth - thumb.offsetWidth);
        track.scrollLeft = startScroll + ((e.clientX - startX) / travel) * max;
      });
      ["pointerup", "pointercancel"].forEach((n) =>
        scroll.addEventListener(n, () => {
          dragging = false;
        }),
      );
      context.signals.subscribeAddress("analog", p.countSignal, (v) => {
        const n = Math.round(Number(v));
        if (n > 0) {
          count = Math.min(48, n);
          draw();
        }
      });
      const observer = new ResizeObserver(updateScroll);
      observer.observe(root);
      draw();
      return () => observer.disconnect();
    },
  });
})(window);
