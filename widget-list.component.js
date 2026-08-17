(function (runtime) {
  "use strict";

  const widgetOptions = [
    ["standard-button", "Standard Button"], ["blank-button", "Blank Button"],
    ["wave-button", "Wave Button"], ["mute-button", "Mute Button"],
    ["volume-up-button", "Volume Up"], ["volume-down-button", "Volume Down"],
    ["power-button", "Power Button"], ["illuminated-power-button", "Illuminated Power Button"],
    ["rolling-toggle", "Standard Toggle"], ["hole-toggle", "Hole Toggle"],
    ["mic-hole-toggle", "Mic Hole Toggle"], ["tsw-toggle", "Power Switch"],
    ["rotary-knob", "Rotary Knob"], ["effect-knob", "Effect Knob"],
    ["neumorphic-volume-knob", "Neumorphic Volume Knob"],
    ["single-light-control", "Single Light Control"], ["single-shade-control", "Single Shade Control"],
    ["single-mic-control", "Single Mic Control"], ["battery-gauge", "Battery Gauge"],
    ["wifi-gauge", "Wi-Fi Gauge"], ["cell-bar-gauge", "Cell Bar Gauge"],
    ["glass-block", "Glass Block"], ["loading-spinner", "Loading Spinner"],
    ["please-wait-spinner", "Please Wait Spinner"], ["menu-item", "Menu Item"],
    ["preset-led", "Preset with LED"], ["neumorphic-circle-button", "Neumorphic Circle Button"],
    ["neumorphic-square-button", "Neumorphic Square Button"], ["neumorphic-glow-dial", "Neumorphic Glow Dial"],
    ["neumorphic-glow-square", "Neumorphic Glow Square"]
  ].map(([value, label]) => ({ value, label }));

  const includedPropertyPrefix = "includedWidget__";

  function includedWidgetProperties(listProperties) {
    const definition = runtime.get(String(listProperties?.widgetType || "standard-button"));
    if (!definition || definition.id === "widget-list") return [];
    return (definition.properties || [])
      .filter(property => !property.signalSetting && property.key !== "bindingMode")
      .map(property => {
        const mapped = { ...property };
        mapped.key = includedPropertyPrefix + property.key;
        mapped.name = property.name;
        mapped.group = "Included Widget Properties";
        if (property.visibleWhen)
          mapped.visibleWhen = { ...property.visibleWhen, key: includedPropertyPrefix + property.visibleWhen.key };
        if (property.disabledWhen)
          mapped.disabledWhen = { ...property.disabledWhen, key: includedPropertyPrefix + property.disabledWhen.key };
        return mapped;
      });
  }

  function includedWidgetRanges(listProperties) {
    const definition = runtime.get(String(listProperties?.widgetType || "standard-button"));
    if (!definition || definition.id === "widget-list") return [];
    const clean = value => String(value || "Signal").replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "Signal";
    return (definition.signals || [])
      .filter(signal => signal.key !== "visibility")
      .map(signal => ({
        name: `${definition.name} — ${signal.name}`,
        type: signal.type,
        direction: signal.direction,
        baseKey: `includedRange__${signal.key}`,
        incrementKey: `includedRangeIncrement__${signal.key}`,
        countKey: "defaultCount",
        defaultValue: `WidgetList.Items[{index}].${clean(signal.name)}`,
        nestedSignalKey: signal.key
      }));
  }

  runtime.register({
    id: "widget-list",
    name: "Widget List",
    category: "Multi-Devices",
    defaultSize: { width: 760, height: 260 },
    signals: [
      { key: "count", name: "Number of widgets", type: "analog", direction: "input", defaultValue: "WidgetList.Feedback" }
    ],
    rangeBindings: [
      { name: "Digital Press range", type: "digital", direction: "output", baseKey: "pressBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Digital Selected range", type: "digital", direction: "input", baseKey: "selectedBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Analog Value Set range", type: "analog", direction: "output", baseKey: "valueSetBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Analog Feedback range", type: "analog", direction: "input", baseKey: "feedbackBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Serial Name range", type: "serial", direction: "input", baseKey: "nameBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Serial Text range", type: "serial", direction: "output", baseKey: "textBase", incrementKey: "signalIncrement", countKey: "defaultCount" },
      { name: "Per-item Visibility range", type: "digital", direction: "input", baseKey: "visibilityBase", incrementKey: "signalIncrement", countKey: "defaultCount", visibilitySelector: ".wl-item", optionalProperty: "itemVisibilityEnabled" }
    ],
    itemSelector: ".wl-item",
    scrollAxes: ["horizontal", "vertical"],
    inspectorProperties: includedWidgetProperties,
    dynamicRangeBindings: includedWidgetRanges,
    properties: [
      { key: "widgetType", name: "Widget", type: "select", options: widgetOptions, defaultValue: "standard-button", affectsProperties: true },
      { key: "orientation", name: "Orientation", type: "select", options: [{ value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" }], defaultValue: "horizontal" },
      { key: "defaultCount", name: "Default widgets", type: "select", options: Array.from({ length: 20 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })), defaultValue: "4", affectsProperties: true },
      { key: "useWidgetDefaultSize", name: "Use selected widget's default size", type: "checkbox", defaultValue: true, affectsProperties: true },
      { key: "itemWidth", name: "Custom item width (px)", type: "number", min: 40, max: 1200, defaultValue: 220, visibleWhen: { key: "useWidgetDefaultSize", equals: false } },
      { key: "itemHeight", name: "Custom item height (px)", type: "number", min: 40, max: 1200, defaultValue: 120, visibleWhen: { key: "useWidgetDefaultSize", equals: false } },
      { key: "itemGap", name: "Item spacing (px)", type: "number", min: 0, max: 100, defaultValue: 12 },
      { key: "itemPadding", name: "Item glow space (px)", type: "number", min: 0, max: 60, defaultValue: 10 },
      { key: "alignItems", name: "Item alignment", type: "select", options: [{ value: "start", label: "Start" }, { value: "center", label: "Center" }, { value: "end", label: "End" }, { value: "stretch", label: "Stretch" }], defaultValue: "center" },
      { key: "includedGraphicAsset", name: "Standard state — asset", type: "asset", defaultValue: "", group: "Included Widget Graphics" },
      { key: "includedSelectedGraphicAsset", name: "Selected state — asset", type: "asset", defaultValue: "", group: "Included Widget Graphics", disabledWhen: { key: "includedWidget__selectedSameAsStandard", value: true } },
      { key: "includedGraphicMode", name: "Graphic mode", type: "select", options: [{ value: "none", label: "None" }, { value: "background", label: "Background" }, { value: "overlay", label: "Graphic overlay" }], defaultValue: "overlay", group: "Included Widget Graphics" },
      { key: "includedGraphicFit", name: "Graphic fit", type: "select", options: [{ value: "contain", label: "Contain" }, { value: "cover", label: "Cover" }, { value: "fill", label: "Stretch" }], defaultValue: "contain", group: "Included Widget Graphics" },
      { key: "includedGraphicAspectLocked", name: "Lock graphic aspect ratio", type: "checkbox", defaultValue: true, group: "Included Widget Graphics" },
      { key: "includedGraphicWidth", name: "Graphic width %", type: "number", min: 1, max: 200, defaultValue: 35, group: "Included Widget Graphics" },
      { key: "includedGraphicHeight", name: "Graphic height %", type: "number", min: 1, max: 200, defaultValue: 35, group: "Included Widget Graphics" },
      { key: "includedGraphicX", name: "Horizontal Shift %", type: "number", min: -100, max: 200, defaultValue: 50, group: "Included Widget Graphics" },
      { key: "includedGraphicY", name: "Vertical Shift %", type: "number", min: -100, max: 200, defaultValue: 50, group: "Included Widget Graphics" },
      { key: "includedGraphicOpacity", name: "Graphic opacity %", type: "number", min: 0, max: 100, defaultValue: 100, group: "Included Widget Graphics" },
      { key: "includedInteractionScope", name: "Apply interactions to", type: "select", options: [{ value: "item", label: "Each repeated widget" }, { value: "list", label: "Whole Widget List" }], defaultValue: "item", group: "Included Widget Interaction & Animation" },
      { key: "includedPressEffect", name: "Press effect", type: "select", options: [{ value: "none", label: "None" }, { value: "wave", label: "Wave" }, { value: "water-ripple", label: "Water ripple" }, { value: "particle-burst", label: "Particle burst" }, { value: "shake", label: "Shake" }, { value: "glass-crack", label: "Glass crack" }], defaultValue: "none", group: "Included Widget Interaction & Animation" },
      { key: "includedAnimation", name: "Animation preset", type: "select", options: [{ value: "none", label: "None" }, { value: "press", label: "Press state" }, { value: "fade", label: "Fade" }, { value: "scale", label: "Scale" }, { value: "glow", label: "Glow" }, { value: "slide-left", label: "Slide from left" }, { value: "slide-right", label: "Slide from right" }], defaultValue: "press", group: "Included Widget Interaction & Animation" },
      { key: "includedHoldAnimation", name: "Hold animation preset", type: "select", options: [{ value: "none", label: "None" }, { value: "press", label: "Press state" }, { value: "fade", label: "Fade" }, { value: "scale", label: "Scale" }, { value: "glow", label: "Glow" }, { value: "slide-left", label: "Slide from left" }, { value: "slide-right", label: "Slide from right" }], defaultValue: "glow", group: "Included Widget Interaction & Animation" },
      { key: "includedEffectColor", name: "Effect color", type: "color", defaultValue: "#04aa8e", group: "Included Widget Interaction & Animation" },
      { key: "includedEffectIntensity", name: "Effect intensity (%)", type: "number", min: 10, max: 200, defaultValue: 100, group: "Included Widget Interaction & Animation" },
      { key: "includedInteractionDuration", name: "Duration (ms)", type: "number", min: 80, max: 10000, defaultValue: 450, group: "Included Widget Interaction & Animation" },
      { key: "includedInteractionDelay", name: "Start delay (ms)", type: "number", min: 0, max: 10000, defaultValue: 0, group: "Included Widget Interaction & Animation" },
      { key: "includedInteractionEasing", name: "Easing", type: "select", options: [{ value: "ease-out", label: "Ease out" }, { value: "ease-in-out", label: "Ease in/out" }, { value: "linear", label: "Linear" }, { value: "cubic-bezier(.2,.8,.2,1)", label: "Smooth" }], defaultValue: "ease-out", group: "Included Widget Interaction & Animation" },
      { key: "includedEntryAnimation", name: "Page/list entry animation", type: "select", options: [{ value: "none", label: "None" }, { value: "fade", label: "Fade" }, { value: "scale", label: "Scale" }, { value: "slide-left", label: "Slide from left" }, { value: "slide-right", label: "Slide from right" }], defaultValue: "none", group: "Included Widget Interaction & Animation" },
      { key: "includedStaggerDelay", name: "Item stagger delay (ms)", type: "number", min: 0, max: 2000, defaultValue: 60, group: "Included Widget Interaction & Animation" },
      { key: "includedHoldDuration", name: "Hold duration (ms)", type: "number", min: 100, max: 10000, defaultValue: 800, group: "Included Widget Interaction & Animation" },
      { key: "includedNavigationTrigger", name: "Navigation trigger", type: "select", options: [{ value: "none", label: "None" }, { value: "press", label: "Press" }, { value: "release", label: "Release" }, { value: "hold", label: "Hold" }], defaultValue: "none", group: "Included Widget Interaction & Animation" },
      { key: "includedNavigationTarget", name: "Navigation target page ID", type: "text", defaultValue: "", group: "Included Widget Interaction & Animation" },
      { key: "includedActionTrigger", name: "Per-item action trigger", type: "select", options: [{ value: "none", label: "None" }, { value: "press", label: "Press" }, { value: "release", label: "Release" }, { value: "hold", label: "Hold" }], defaultValue: "none", group: "Included Widget Interaction & Animation" },
      { key: "includedActionType", name: "Per-item action", type: "select", options: [{ value: "none", label: "None" }, { value: "navigate", label: "Navigate" }, { value: "digital", label: "Pulse digital" }, { value: "analog", label: "Publish analog" }, { value: "serial", label: "Publish serial" }, { value: "hide", label: "Hide affected item" }, { value: "show", label: "Show affected item" }, { value: "toggle-visibility", label: "Toggle affected item" }, { value: "select", label: "Highlight affected item" }, { value: "deselect", label: "Clear affected highlight" }], defaultValue: "none", group: "Included Widget Interaction & Animation" },
      { key: "includedActionTarget", name: "Action target / signal (supports {index} and {n})", type: "text", defaultValue: "", group: "Included Widget Interaction & Animation" },
      { key: "includedActionValue", name: "Action value / text (supports {index} and {n})", type: "text", defaultValue: "", group: "Included Widget Interaction & Animation" },
      { key: "includedMaxEffects", name: "Maximum simultaneous effects", type: "number", min: 1, max: 20, defaultValue: 6, group: "Included Widget Interaction & Animation" },
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.Press", signalSetting: true },
      { key: "selectedBase", name: "Selected base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.Selected", signalSetting: true },
      { key: "valueSetBase", name: "Value Set base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.ValueSet", signalSetting: true },
      { key: "feedbackBase", name: "Feedback base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.Feedback", signalSetting: true },
      { key: "nameBase", name: "Name base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.Label", signalSetting: true },
      { key: "textBase", name: "Text base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.Text", signalSetting: true },
      { key: "visibilityBase", name: "Visibility base / pattern", type: "text", defaultValue: "WidgetList.Items.{index}.Visibility", signalSetting: true },
      { key: "signalIncrement", name: "Join increment", type: "number", min: 1, defaultValue: 1, signalSetting: true }
    ],
    template: '<div class="wl-root"><div class="wl-list"></div></div>',
    styles: '[data-component="widget-list"]{display:block;width:100%;height:100%;box-sizing:border-box;overflow:hidden}[data-component="widget-list"] *{box-sizing:border-box}[data-component="widget-list"] .wl-root{width:100%;height:100%;overflow:auto;padding:4px}[data-component="widget-list"] .wl-list{display:flex;flex-direction:row;gap:var(--item-gap-px,12px);align-items:center;min-width:100%;min-height:100%}[data-component="widget-list"] .wl-list.vertical{flex-direction:column}[data-component="widget-list"] .wl-item{position:relative;flex:0 0 auto;width:var(--item-width-px,220px);height:var(--item-height-px,120px);padding:var(--item-padding-px,10px);overflow:visible}[data-component="widget-list"] .wl-item>.wl-widget{display:block;position:relative;width:100%;height:100%;overflow:visible}[data-component="widget-list"] .wl-shared-graphic-selected{display:none}[data-component="widget-list"] .wl-widget[data-has-selected-graphic="true"][data-asset-selected="true"]>.wl-shared-graphic-standard{display:none}[data-component="widget-list"] .wl-widget[data-has-selected-graphic="true"][data-asset-selected="true"]>.wl-shared-graphic-selected{display:block}',
    mount(root, context) {
      const p = context.options.properties || {}, list = root.querySelector(".wl-list"), includedPropertyPrefix = "includedWidget__";
      let count = Math.max(1, Math.min(20, Number(p.defaultCount) || 4)), cleanups = [], activeEffects = 0;
      list.classList.toggle("vertical", p.orientation === "vertical");
      list.style.alignItems = p.alignItems || "center";
      function address(base, index, ordinal) {
        if (p.bindingMode === "join" || /^\d+$/.test(String(base || "")))
          return String(Math.max(1, Number(base) || 1) + index * Math.max(1, Number(p.signalIncrement) || 1) + ordinal);
        return String(base || "").replace(/\{index\}/g, index).replace(/\{n\}/g, index + 1);
      }
      function baseFor(signal) {
        if (signal.key !== "visibility") return `includedRange__${signal.key}`;
        if (signal.type === "digital" && signal.direction === "output") return "pressBase";
        if (signal.type === "digital" && signal.direction === "input") return /visib/i.test(signal.key) ? "visibilityBase" : "selectedBase";
        if (signal.type === "analog" && signal.direction === "output") return "valueSetBase";
        if (signal.type === "analog" && signal.direction === "input") return "feedbackBase";
        if (signal.type === "serial" && signal.direction === "output") return "textBase";
        return "nameBase";
      }
      function defaultSignalBase(definition, signal) {
        const range = (definition.signals || []).find(entry => entry.key === signal.key);
        const label = String(range?.name || signal.name || signal.key || "Signal").replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "Signal";
        return `WidgetList.Items[{index}].${label}`;
      }
      function disposeChildren() { cleanups.splice(0).forEach(cleanup => { if (typeof cleanup === "function") cleanup(); }); }
      function motionFrames(preset, reverse) {
        const intensity = Math.max(.1, Math.min(2, Number(p.includedEffectIntensity) / 100 || 1)), scale = Math.max(.45, 1 - .28 * intensity), slide = 35 * intensity;
        let frames = preset === "fade" ? [{ opacity: Math.max(0, 1 - intensity) }, { opacity: 1 }]
          : preset === "scale" ? [{ transform: `scale(${scale})`, opacity: Math.max(.08, 1 - .75 * intensity) }, { transform: "scale(1)", opacity: 1 }]
          : preset === "glow" ? [{ filter: "brightness(1)", transform: "scale(1)" }, { filter: `brightness(${1 + .3 * intensity})`, transform: `scale(${Math.max(.82, 1 - .04 * intensity)})` }]
          : preset === "slide-left" ? [{ transform: `translateX(${-slide}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }]
          : preset === "slide-right" ? [{ transform: `translateX(${slide}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }]
          : [{ transform: "scale(1)", filter: "brightness(1)" }, { transform: `scale(${Math.max(.78, 1 - .06 * intensity)})`, filter: `brightness(${1 + .15 * intensity})` }];
        return reverse ? [...frames].reverse() : frames;
      }
      function animateTarget(target, preset, reverse, delay) {
        if (!target || !preset || preset === "none" || !target.animate) return;
        target.animate(motionFrames(preset, reverse), { duration: Math.max(80, Number(p.includedInteractionDuration) || 450), delay: Math.max(0, Number(delay ?? p.includedInteractionDelay) || 0), easing: p.includedInteractionEasing || "ease-out", fill: "both" });
      }
      function pressEffect(target, event) {
        const kind = p.includedPressEffect || "none", limit = Math.max(1, Number(p.includedMaxEffects) || 6);
        if (!target || kind === "none" || activeEffects >= limit) return;
        const duration = Math.max(100, Number(p.includedInteractionDuration) || 450), color = p.includedEffectColor || "#04aa8e", rect = target.getBoundingClientRect(), intensity = Math.max(.1, Math.min(2, Number(p.includedEffectIntensity) / 100 || 1));
        activeEffects += 1;
        if (kind === "shake") target.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-6 * intensity}px)` }, { transform: `translateX(${7 * intensity}px)` }, { transform: `translateX(${-5 * intensity}px)` }, { transform: "translateX(0)" }], { duration, easing: "ease-out" });
        else if (kind === "glass-crack") {
          const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d"), x = event && Number.isFinite(event.clientX) ? event.clientX - rect.left : rect.width / 2, y = event && Number.isFinite(event.clientY) ? event.clientY - rect.top : rect.height / 2;
          canvas.width = Math.max(1, Math.round(rect.width)); canvas.height = Math.max(1, Math.round(rect.height)); canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:90"; ctx.strokeStyle = color; ctx.lineWidth = .8;
          for (let ray = 0; ray < Math.round(7 + 5 * intensity); ray += 1) { const angle = ray / Math.round(7 + 5 * intensity) * Math.PI * 2, length = Math.min(rect.width, rect.height) * (.2 + Math.random() * .2) * intensity; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.stroke(); }
          target.appendChild(canvas); canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out" }); setTimeout(() => canvas.remove(), duration + 30);
        } else {
          const layer = document.createElement("span"), x = event && Number.isFinite(event.clientX) ? event.clientX - rect.left : rect.width / 2, y = event && Number.isFinite(event.clientY) ? event.clientY - rect.top : rect.height / 2;
          layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;z-index:90"; target.appendChild(layer);
          if (kind === "particle-burst") for (let dot = 0, total = Math.round(7 + 5 * intensity); dot < total; dot += 1) { const particle = document.createElement("i"), angle = dot / total * Math.PI * 2, distance = Math.min(rect.width, rect.height) * .32 * intensity, size = 3 + 2 * intensity; particle.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${4 + 3 * intensity}px ${color}`; layer.appendChild(particle); particle.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px),calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`, opacity: 0 }], { duration: duration * 1.8, easing: "ease-out" }); }
          else for (let ring = 0; ring < (kind === "wave" ? Math.max(1, Math.round(1 + intensity)) : 1); ring += 1) { const ripple = document.createElement("i"), size = Math.max(rect.width, rect.height) * (.72 + .38 * intensity); ripple.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;border:${kind === "water-ripple" ? `${Math.max(1, 2 * intensity)}px solid ${color}` : "0"};background:${kind === "wave" ? color : "transparent"};opacity:${Math.min(.65, .2 + .15 * intensity)};transform:translate(-50%,-50%) scale(0)`; layer.appendChild(ripple); ripple.animate([{ transform: "translate(-50%,-50%) scale(0)", opacity: Math.min(.75, .3 + .2 * intensity) }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0 }], { duration, delay: ring * duration * .18, easing: "ease-out" }); }
          setTimeout(() => layer.remove(), duration * (kind === "particle-burst" ? 1.9 : 1.4));
        }
        setTimeout(() => { activeEffects = Math.max(0, activeEffects - 1); }, duration * (kind === "particle-burst" ? 1.9 : 1.1));
      }
      function itemToken(value, index) {
        return String(value == null ? "" : value).replace(/\{index\}/g, String(index)).replace(/\{n\}/g, String(index + 1));
      }
      function runIncludedAction(phase, index, target) {
        if ((p.includedActionTrigger || "none") !== phase) return;
        const type = p.includedActionType || "none", destination = itemToken(p.includedActionTarget, index), value = itemToken(p.includedActionValue, index), item = target.closest?.(".wl-item") || target;
        if (type === "navigate" && destination) context.navigate(destination);
        else if (type === "digital" && destination) {
          context.signals.publishAddress("digital", destination, true);
          setTimeout(() => context.signals.publishAddress("digital", destination, false), 80);
        } else if (type === "analog" && destination) context.signals.publishAddress("analog", destination, Number(value) || 0);
        else if (type === "serial" && destination) context.signals.publishAddress("serial", destination, value);
        else if (type === "hide") item.style.visibility = "hidden";
        else if (type === "show") item.style.visibility = "visible";
        else if (type === "toggle-visibility") item.style.visibility = item.style.visibility === "hidden" ? "visible" : "hidden";
        else if (type === "select" || type === "deselect") {
          const selected = type === "select";
          target.classList.toggle("selected", selected);
          target.dataset.assetSelected = selected ? "true" : "false";
        }
      }
      function wireSharedInteraction(target, index) {
        if (!target) return;
        let holdTimer = 0, held = false;
        const down = event => {
          held = false; pressEffect(target, event); animateTarget(target, p.includedAnimation || "press", false);
          if (p.includedNavigationTrigger === "press" && p.includedNavigationTarget) context.navigate(itemToken(p.includedNavigationTarget, index));
          runIncludedAction("press", index, target); clearTimeout(holdTimer);
          holdTimer = setTimeout(() => {
            held = true; animateTarget(target, p.includedAnimation || "press", true); animateTarget(target, p.includedHoldAnimation || "glow", false);
            if (p.includedNavigationTrigger === "hold" && p.includedNavigationTarget) context.navigate(itemToken(p.includedNavigationTarget, index));
            runIncludedAction("hold", index, target);
          }, Math.max(100, Number(p.includedHoldDuration) || 800));
        };
        const up = () => {
          clearTimeout(holdTimer); animateTarget(target, held ? (p.includedHoldAnimation || "glow") : (p.includedAnimation || "press"), true);
          if (!held && p.includedNavigationTrigger === "release" && p.includedNavigationTarget) context.navigate(itemToken(p.includedNavigationTarget, index));
          if (!held) runIncludedAction("release", index, target);
        };
        const cancel = () => { clearTimeout(holdTimer); animateTarget(target, held ? (p.includedHoldAnimation || "glow") : (p.includedAnimation || "press"), true); };
        let unbindPointer;
        if (context.interactions?.bindPrimaryPointer) unbindPointer = context.interactions.bindPrimaryPointer(target, { down, up, cancel });
        else {
          target.addEventListener("pointerdown", down); target.addEventListener("pointerup", up); target.addEventListener("pointercancel", cancel);
          unbindPointer = () => { target.removeEventListener("pointerdown", down); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", cancel); };
        }
        cleanups.push(() => { clearTimeout(holdTimer); if (typeof unbindPointer === "function") unbindPointer(); });
        animateTarget(target, p.includedEntryAnimation, false, Number(p.includedInteractionDelay || 0) + index * Math.max(0, Number(p.includedStaggerDelay) || 0));
      }
      function build(nextCount) {
        count = Math.max(1, Math.min(20, Math.round(Number(nextCount) || Number(p.defaultCount) || 4)));
        disposeChildren(); list.innerHTML = "";
        const definition = context.resolveComponent && context.resolveComponent(p.widgetType || "standard-button");
        if (!definition || definition.id === "widget-list") return;
        const useDefaultSize = p.useWidgetDefaultSize === true || p.useWidgetDefaultSize === 1 || p.useWidgetDefaultSize === "1" || String(p.useWidgetDefaultSize).toLowerCase() === "true";
        const padding = Math.max(0, Number(p.itemPadding) || 0);
        const itemWidth = useDefaultSize ? Math.max(40, Number(definition.defaultSize && definition.defaultSize.width) || 220) + padding * 2 : Math.max(40, Number(p.itemWidth) || 220);
        const itemHeight = useDefaultSize ? Math.max(40, Number(definition.defaultSize && definition.defaultSize.height) || 120) + padding * 2 : Math.max(40, Number(p.itemHeight) || 120);
        const defaults = Object.fromEntries((definition.properties || []).map(property => {
          const sharedKey = includedPropertyPrefix + property.key;
          return [property.key, Object.prototype.hasOwnProperty.call(p, sharedKey) ? p[sharedKey] : property.defaultValue];
        }));
        for (let index = 0; index < count; index += 1) {
          const item = document.createElement("div"), widget = document.createElement("div");
          item.className = "wl-item"; item.dataset.visibilityIndex = index; widget.className = "wl-widget"; widget.dataset.component = definition.id;
          item.style.width = itemWidth + "px"; item.style.height = itemHeight + "px";
          Object.entries(defaults).forEach(([key, value]) => {
            const name = "--" + key.replace(/[A-Z]/g, match => "-" + match.toLowerCase());
            widget.style.setProperty(name, String(value ?? ""));
            if (typeof value === "number") {
              widget.style.setProperty(name + "-px", value + "px");
              widget.style.setProperty(name + "-percent", value + "%");
            }
          });
          widget.innerHTML = "<style>" + definition.styles + "</style>" + definition.template;
          const normalGraphic = String(p.includedGraphicAssetData || ""),
            selectedSame = defaults.selectedSameAsStandard == null || defaults.selectedSameAsStandard === true || defaults.selectedSameAsStandard === 1 || defaults.selectedSameAsStandard === "1" || String(defaults.selectedSameAsStandard).toLowerCase() === "true",
            selectedGraphic = selectedSame ? normalGraphic : String(p.includedSelectedGraphicAssetData || normalGraphic),
            graphicMode = p.includedGraphicMode || "overlay",
            graphicFit = p.includedGraphicAspectLocked === false || p.includedGraphicAspectLocked === 0 || p.includedGraphicAspectLocked === "0" || String(p.includedGraphicAspectLocked).toLowerCase() === "false" ? "fill" : (p.includedGraphicFit || "contain");
          widget.dataset.assetSelected = "false";
          widget.dataset.hasSelectedGraphic = selectedGraphic ? "true" : "false";
          if (graphicMode === "background" && normalGraphic) {
            widget.style.backgroundImage = `url("${normalGraphic}")`;
            widget.style.backgroundSize = graphicFit;
            widget.style.backgroundPosition = `${Number(p.includedGraphicX ?? 50)}% ${Number(p.includedGraphicY ?? 50)}%`;
            widget.style.backgroundRepeat = "no-repeat";
          } else if (graphicMode === "overlay" && (normalGraphic || selectedGraphic)) {
            const addGraphic = (url, selected) => {
              if (!url) return;
              const image = document.createElement("img");
              image.className = `wl-shared-graphic wl-shared-graphic-${selected ? "selected" : "standard"}`;
              image.alt = ""; image.src = url;
              image.style.cssText = `position:absolute;z-index:50;left:${Number(p.includedGraphicX ?? 50)}%;top:${Number(p.includedGraphicY ?? 50)}%;width:${Number(p.includedGraphicWidth ?? 35)}%;height:${Number(p.includedGraphicHeight ?? 35)}%;max-width:none;object-fit:${graphicFit};opacity:${Math.max(0, Math.min(100, Number(p.includedGraphicOpacity ?? 100))) / 100};pointer-events:none;transform:translate(-50%,-50%)`;
              widget.appendChild(image);
            };
            addGraphic(normalGraphic, false); addGraphic(selectedGraphic, true);
          }
          const hiddenSelectors = Object.entries(definition.optionalContent || {})
            .filter(([key]) => defaults[key] === false || defaults[key] === 0 || defaults[key] === "0" || String(defaults[key]).toLowerCase() === "false")
            .map(([, selector]) => `[data-component="${definition.id}"] ${selector}{display:none!important}`)
            .join("");
          if (hiddenSelectors) {
            const visibilityStyle = document.createElement("style");
            visibilityStyle.textContent = hiddenSelectors;
            widget.appendChild(visibilityStyle);
          }
          item.appendChild(widget); list.appendChild(item);
          const ordinals = {};
          const nestedSignals = {
            publish(key, value) {
              const signal = (definition.signals || []).find(entry => entry.key === key); if (!signal) return;
              const baseKey = baseFor(signal), ordinal = ordinals[baseKey + ":" + key] || 0;
              context.signals.publishAddress(signal.type, address(p[baseKey] ?? defaultSignalBase(definition, signal), index, ordinal), value);
            },
            subscribe(key, callback) {
              const signal = (definition.signals || []).find(entry => entry.key === key); if (!signal) return;
              const baseKey = baseFor(signal), ordinal = ordinals[baseKey + ":" + key] || 0;
              const handler = signal.type === "digital" && signal.direction === "input" && /selected|feedback|active/i.test(`${signal.key} ${signal.name}`)
                ? value => { const selected = value === true || value === 1 || value === "1"; widget.dataset.assetSelected = selected ? "true" : "false"; if (graphicMode === "background") widget.style.backgroundImage = `url("${selected ? selectedGraphic || normalGraphic : normalGraphic}")`; callback(value); }
                : callback;
              context.signals.subscribeAddress(signal.type, address(p[baseKey] ?? defaultSignalBase(definition, signal), index, ordinal), handler);
            },
            publishAddress: context.signals.publishAddress,
            subscribeAddress: context.signals.subscribeAddress,
            subscribeExact: context.signals.subscribeExact
          };
          const typeCounts = {};
          (definition.signals || []).forEach(signal => {
            const baseKey = baseFor(signal), slot = baseKey + ":" + signal.key;
            ordinals[slot] = typeCounts[baseKey] || 0; typeCounts[baseKey] = ordinals[slot] + 1;
          });
          const cleanup = definition.mount(widget, {
            signals: nestedSignals,
            interactions: context.interactions,
            resolveComponent: context.resolveComponent,
            navigate: context.navigate,
            options: { properties: defaults, definitionData: definition.data || {} }
          });
          if (typeof cleanup === "function") cleanups.push(cleanup);
          if ((p.includedInteractionScope || "item") === "item") wireSharedInteraction(widget, index);
        }
        if (p.includedInteractionScope === "list") wireSharedInteraction(list, 0);
      }
      context.signals.subscribe("count", value => build(value));
      build(count);
      return disposeChildren;
    }
  });
})(window.ComposerRuntime);
