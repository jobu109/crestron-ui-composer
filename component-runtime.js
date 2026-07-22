(function (global) {
  "use strict";
  const definitions = new Map();
  const simulator = {
    values: new Map(),
    listeners: new Map(),
    events: [],
    publish(type, signal, value) {
      this.values.set(type + ":" + signal, value);
      this.events.push({ time: new Date().toISOString(), type, signal, value });
      (this.listeners.get(type + ":" + signal) || []).forEach((fn) =>
        fn(value),
      );
    },
    subscribe(type, signal, callback) {
      const key = type + ":" + signal,
        list = this.listeners.get(key) || [];
      list.push(callback);
      this.listeners.set(key, list);
      if (this.values.has(key)) callback(this.values.get(key));
      return () =>
        this.listeners.set(
          key,
          (this.listeners.get(key) || []).filter((fn) => fn !== callback),
        );
    },
    set(type, signal, value) {
      this.publish(type, signal, value);
    },
  };
  function typeCode(type) {
    return type === "digital" ? "b" : type === "analog" ? "n" : "s";
  }
  function contractPattern(value) {
    return String(value || "").replace(
      /^(.*)\.\{(?:n|index)\}\.(.+)$/,
      function (_, prefix, attribute) {
        return (
          prefix +
          "[{index}]." +
          attribute.replace(/\./g, "_")
        );
      },
    );
  }
  function standardContractAttribute(type, direction, value) {
    if (/^Visibility$/i.test(String(value || "").replace(/[^A-Za-z0-9_]/g, "_"))) return "Visibility";
    const suffix = type === "digital" ? (direction === "output" ? "Press" : "Selected") : type === "analog" ? (direction === "output" ? "ValueSet" : "Feedback") : direction === "output" ? "Text" : "Name",
      pattern = type === "digital" ? /(?:_?(?:Press|Selected|Feedback|Value|Button|Btn))$/i : type === "analog" ? direction === "output" ? /(?:_?(?:ValueSet|LevelSet|PositionSet|Set|Value))$/i : /(?:_?(?:Feedback|LevelValue|PositionValue|Value|Level))$/i : /(?:_?(?:IndirectText|Label|Name|Text))$/i;
    let prefix = String(value || "").replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").replace(pattern, "").replace(/_+$/g, "");
    if (/^(?:Level|Value|Position|Selected|Indirect|Signal)$/i.test(prefix)) prefix = "";
    return prefix + suffix;
  }
  function contractAddress(value, type, direction, prefix) {
    const address = String(value || "").replace(
      /^(.*)\.(\d+)\.(.+)$/,
      function (_, prefix, index, attribute) {
        var number = Number(index);
        return (
          prefix +
          "[" +
          Math.max(0, number) +
          "]." +
          attribute.replace(/\./g, "_")
        );
      },
    );
    const array = address.match(
      /^([A-Za-z_][A-Za-z0-9_.]*\[\d+\])\.([A-Za-z0-9_.]+)$/,
    );
    let structured;
    if (array) structured = `${array[1]}.${array[2].replace(/\./g, "_")}`;
    const parts = address.split(".");
    if (!structured)
      structured = parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join("_")}`
        : address;
    const legacyCollection = structured.match(
      /^[A-Za-z_][A-Za-z0-9_]*_([A-Za-z][A-Za-z0-9_]*)(\[\d+\])\.([A-Za-z0-9_.]+)$/,
    );
    if (prefix && legacyCollection) {
      structured = `${prefix}.${legacyCollection[1]}${legacyCollection[2]}.${legacyCollection[3]}`;
      prefix = "";
    }
    if (prefix && structured.includes(".")) {
      const rootEnd = structured.indexOf("."),
        remainder = structured.includes("[")
          ? structured.slice(rootEnd + 1)
          : address.split(".").pop();
      structured = `${prefix}.${remainder}`;
    }
    const separator = structured.lastIndexOf(".");
    return separator < 0 || !type || !direction
      ? structured
      : `${structured.slice(0, separator)}.${standardContractAttribute(type, direction, structured.slice(separator + 1))}`;
  }
  function standardContractPattern(value, type, direction) {
    const pattern = contractPattern(value),
      array = pattern.match(/^(.*\[\{index\}\])\.(.+)$/),
      parts = pattern.split(".");
    if (array)
      return `${array[1]}.${standardContractAttribute(type, direction, array[2].replace(/\./g, "_"))}`;
    return parts.length > 1
      ? `${parts[0]}.${standardContractAttribute(type, direction, parts.slice(1).join("_"))}`
      : pattern;
  }
  function library() {
    try {
      return (
        global.CrComLib ||
        (global.parent && global.parent !== global && global.parent.CrComLib) ||
        null
      );
    } catch (e) {
      return global.CrComLib || null;
    }
  }
  const componentThemes = {
    "standard-button": {
      props: [
        "textColor|Text color|#ffffff",
        "faceColor|Button tint|#04aa8e",
        "borderColor|Border color|#ffffff",
        "glowColor|Glow color|#04aa8e",
        "selectedColor|Selected tint|#04aa8e",
      ],
    },
    "power-button": {
      props: [
        "offColor|Power off color|#dc2d2d",
        "onColor|Power on color|#04dc78",
        "glowColor|Glow color|#04aa8e",
      ],
    },
    "rolling-toggle": {
      props: [
        "offColor|Off color|#203332",
        "onColor|On color|#982f36",
        "glowColor|Glow color|#04aa8e",
      ],
      css: '[data-component="rolling-toggle"] .state:checked~.track,[data-component="rolling-toggle"] .state:checked+.thumb{animation:rolling-toggle-pulse 1.5s infinite}@keyframes rolling-toggle-pulse{0%,100%{box-shadow:0 0 15px color-mix(in srgb,var(--glow-color) 50%,transparent)}50%{box-shadow:0 0 100px color-mix(in srgb,var(--glow-color) 50%,transparent)}}',
    },
    "tsw-toggle": {
      props: [
        "offColor|Off indicator color|#ff0000",
        "onColor|On indicator color|#ff0000",
        "glowColor|Glow color|#04aa8e",
      ],
    },
    "volume-up-button": {
      props: [
        "textColor|Text/icon color|#ffffff",
        "faceColor|Button color|#555555",
        "pressedColor|Pressed color|#777777",
        "selectedColor|Selected color|#0fae8e",
        "glowColor|Glow color|#04aa8e",
        "borderColor|Border color|#ffffff",
      ],
    },
    "volume-down-button": {
      props: [
        "textColor|Text/icon color|#ffffff",
        "faceColor|Button color|#555555",
        "pressedColor|Pressed color|#777777",
        "selectedColor|Selected color|#0fae8e",
        "glowColor|Glow color|#04aa8e",
        "borderColor|Border color|#ffffff",
      ],
    },
    "mute-button": {
      props: [
        "textColor|Text/icon color|#ffffff",
        "faceColor|Button color|#555555",
        "pressedColor|Pressed color|#777777",
        "selectedColor|Selected color|#0fae8e",
        "glowColor|Glow color|#04aa8e",
        "borderColor|Border color|#ffffff",
      ],
      css: '[data-component="mute-button"] .oval.active{animation:mute-pulse-glow 1.5s infinite}@keyframes mute-pulse-glow{0%,100%{box-shadow:0 0 8px color-mix(in srgb,var(--glow-color) 45%,transparent)}50%{box-shadow:0 0 26px color-mix(in srgb,var(--glow-color) 95%,transparent)}}',
    },
    "wave-button": {
      props: [
        "textColor|Text color|#ffffff",
        "waveColor|Wave color|#04aa8e",
        "glowColor|Glow color|#04aa8e",
        "borderColor|Border color|#ffffff",
      ],
      css: '[data-component="wave-button"] .wave{color:var(--text-color);border-color:var(--border-color);box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 10px var(--glow-color),0 6px 12px rgba(0,0,0,.22)}[data-component="wave-button"] .wave i{background:radial-gradient(circle,color-mix(in srgb,var(--wave-color) 40%,transparent),transparent 70%)}[data-component="wave-button"] .wave.active{border-color:var(--glow-color);box-shadow:0 0 18px var(--glow-color)}',
    },
    "display-flip": {
      props: [
        "textColor|Text color|#ffffff",
        "frontColor|Front face color|#333333",
        "backColor|Back face color|#126c5d",
        "screenColor|Screen color|#090909",
        "selectedColor|Selected screen color|#04aa8e",
        "glowColor|Glow color|#04aa8e",
      ],
      css: '[data-component="display-flip"] .face{color:var(--text-color);box-shadow:0 8px 16px rgba(0,0,0,.3),0 0 18px color-mix(in srgb,var(--glow-color) 30%,transparent)}[data-component="display-flip"] .front{background:var(--front-color)}[data-component="display-flip"] .back{background:linear-gradient(145deg,var(--back-color),#424)}[data-component="display-flip"] .screen{background:var(--screen-color);box-shadow:0 0 10px var(--glow-color)}[data-component="display-flip"] .back .screen{background:var(--selected-color);box-shadow:0 0 30px var(--glow-color)}',
    },
    "card-flip": {
      props: [
        "textColor|Text color|#ffffff",
        "frontColor|Front face color|#333333",
        "backColor|Back face color|#126c5d",
        "glowColor|Glow color|#04aa8e",
      ],
      css: '[data-component="card-flip"] .face{color:var(--text-color);box-shadow:0 8px 16px rgba(0,0,0,.3),0 0 18px color-mix(in srgb,var(--glow-color) 30%,transparent)}[data-component="card-flip"] .front{background:var(--front-color)}[data-component="card-flip"] .back{background:linear-gradient(145deg,var(--back-color),#424)}',
    },
    "volume-slider": {
      props: [
        "lowColor|Low-level color|#4caf50",
        "middleColor|Mid-level color|#ffeb3b",
        "highColor|High-level color|#f44336",
        "trackCoverColor|Track cover color|#2a2a2a",
        "knobColor|Knob color|#ffffff",
        "textColor|Percentage color|#ffffff",
        "glowColor|Glow color|#04aa8e",
      ],
      css: '[data-component="volume-slider"] .track{background:linear-gradient(to right,var(--low-color) 0 50%,var(--middle-color) 60% 75%,var(--high-color) 85%);box-shadow:inset -1px 2px 2px #000,0 0 12px color-mix(in srgb,var(--glow-color) 55%,transparent)}[data-component="volume-slider"] .fill{background:var(--track-cover-color)}[data-component="volume-slider"] .knob{background:var(--knob-color);box-shadow:0 0 9px color-mix(in srgb,var(--glow-color) 90%,transparent)}[data-component="volume-slider"] output{color:var(--text-color);text-shadow:0 0 8px var(--glow-color)}',
    },
    "lighting-control": {
      props: [
        "textColor|Text color|#ffffff",
        "faceColor|Load face color|#222222",
        "levelLowColor|Level low color|#f5b700",
        "levelHighColor|Level high color|#fff36a",
        "glowColor|Glow color|#ffe61e",
        "borderColor|Border color|#ffffff",
      ],
      css: '[data-component="lighting-control"] .load{background:var(--face-color);color:var(--text-color);border-color:color-mix(in srgb,var(--border-color) 30%,transparent);box-shadow:inset 0 1px rgba(255,255,255,.35),0 0 12px color-mix(in srgb,var(--glow-color) 40%,transparent)}[data-component="lighting-control"] .fill{background:linear-gradient(to top,var(--level-low-color),var(--level-high-color))}[data-component="lighting-control"] .glow{background:radial-gradient(circle at 50% 90%,color-mix(in srgb,var(--glow-color) 60%,transparent),transparent 70%)}',
    },
    "microphone-control": {
      props: [
        "textColor|Text color|#ffffff",
        "cardColor|Card tint|#045548",
        "gaugeColor|Gauge low color|#04aa8e",
        "toggleOffColor|Toggle off color|#8a7c79",
        "toggleOnColor|Toggle on color|#04aa8e",
        "glowColor|Glow color|#04dcb9",
      ],
      css: '[data-component="microphone-control"] .mic-card{color:var(--text-color);background:linear-gradient(145deg,rgba(255,255,255,.15),color-mix(in srgb,var(--card-color) 40%,transparent)),color-mix(in srgb,var(--card-color) 32%,transparent)}[data-component="microphone-control"] .label,[data-component="microphone-control"] .value{color:var(--text-color)}[data-component="microphone-control"] .toggle{background:var(--toggle-off-color)}[data-component="microphone-control"] .toggle.selected{background:var(--toggle-on-color);border-color:var(--glow-color);box-shadow:0 0 12px var(--glow-color)}',
    },
    keyboard: {
      props: [],
      css: '[data-component="keyboard"] .kb-board{position:relative;padding:clamp(4px,1vmin,8px)}[data-component="keyboard"] .kb-board::before{content:"";position:absolute;left:-95%;top:-110%;width:72%;height:310%;background:linear-gradient(135deg,transparent 0 36%,color-mix(in srgb,var(--glow-color) 3%,transparent) 43%,color-mix(in srgb,var(--glow-color) 23%,transparent) 50%,rgba(255,255,255,.055) 54%,color-mix(in srgb,var(--glow-color) 7%,transparent) 61%,transparent 72%);filter:blur(10px);pointer-events:none;animation:kb-diagonal-glow 5.5s linear infinite;z-index:1}[data-component="keyboard"] .kb-inner{position:relative;z-index:2;padding:clamp(3px,.7vmin,6px);gap:clamp(2px,.55vmin,4px)}[data-component="keyboard"] .kb-row{gap:clamp(2px,.55vmin,4px)}[data-component="keyboard"] .kb-keybox{padding:1px 1px clamp(2px,.5vmin,4px)}@keyframes kb-diagonal-glow{0%{transform:translate3d(0,0,0);opacity:0}12%{opacity:1}72%{opacity:1}100%{transform:translate3d(310%,38%,0);opacity:0}}',
    },
    "folding-menu": {
      props: [],
      css: '[data-component="folding-menu"] .panel.opening{animation:folding-menu-open .45s cubic-bezier(.67,.17,.4,.83) both;pointer-events:auto}[data-component="folding-menu"] .panel.closing{animation:folding-menu-close .45s cubic-bezier(.67,.17,.4,.83) both;pointer-events:none}@keyframes folding-menu-open{0%{opacity:0;transform:translateY(-50%) scaleX(.02)}100%{opacity:1;transform:translateY(-50%) scaleX(1)}}@keyframes folding-menu-close{0%{opacity:1;transform:translateY(-50%) scaleX(1)}100%{opacity:0;transform:translateY(-50%) scaleX(.02)}}',
    },
    "menu-item": {
      props: [],
      css: '[data-component="menu-item"] .mi-root{position:relative;padding-bottom:12px}[data-component="menu-item"] .mi-scroll{position:absolute;left:14px;right:14px;bottom:3px;height:6px;border-radius:999px;background:rgba(42,42,42,.38);opacity:0;transition:opacity .18s;z-index:5}[data-component="menu-item"] .mi-scroll.visible{opacity:1}[data-component="menu-item"] .mi-scroll i{display:block;height:100%;width:32px;border-radius:inherit;background:rgba(112,112,112,.76);box-shadow:0 0 4px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.2);touch-action:none}',
    },
    "password-entry": {
      props: [],
      css: '[data-component="password-entry"] .pw-display,[data-component="password-entry"] .pw-grid{transition:opacity .25s ease,transform .25s ease}[data-component="password-entry"] .pw-enter-row{transition:all .32s cubic-bezier(.67,.17,.4,.83)}[data-component="password-entry"] .pw-enter{transition:background .22s cubic-bezier(.67,.17,.4,.83),box-shadow .22s cubic-bezier(.67,.17,.4,.83),transform .32s cubic-bezier(.67,.17,.4,.83),border-radius .32s cubic-bezier(.67,.17,.4,.83),width .32s cubic-bezier(.67,.17,.4,.83),height .32s cubic-bezier(.67,.17,.4,.83)}[data-component="password-entry"] .pw-keypad.success .pw-display,[data-component="password-entry"] .pw-keypad.error .pw-display,[data-component="password-entry"] .pw-keypad.success .pw-grid,[data-component="password-entry"] .pw-keypad.error .pw-grid{transform:scale(.94)}[data-component="password-entry"] .pw-keypad.success .pw-enter,[data-component="password-entry"] .pw-keypad.error .pw-enter{transform:rotate(-180deg)}[data-component="password-entry"] .pw-message{width:min(92vw,720px);line-height:1.05;text-shadow:0 2px 5px rgba(0,0,0,.82),0 0 14px rgba(255,255,255,.58)}',
    },
    "countdown-selector": {
      props: [],
      css: '[data-component="countdown-selector"] .cd-root{padding:4vw}[data-component="countdown-selector"] .cd-panel{background:linear-gradient(145deg,rgba(58,66,66,.9),rgba(42,54,54,.88) 52%,rgba(4,170,142,.18));border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 28px rgba(0,0,0,.36),0 0 14px rgba(4,170,142,.22)}[data-component="countdown-selector"] .cd-panel::after{content:"";position:absolute;left:50%;top:62%;width:clamp(66px,18vw,112px);height:clamp(34px,42vh,58px);transform:translate(-50%,-50%);border-radius:7px;background:rgba(110,110,110,.68);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 10px rgba(0,0,0,.32);pointer-events:none;z-index:1}[data-component="countdown-selector"] .cd-enable{top:clamp(8px,4vh,20px);width:clamp(128px,34vw,190px);height:clamp(44px,14vh,60px);z-index:4}[data-component="countdown-selector"] .cd-window{top:clamp(52px,24vh,82px);z-index:2}[data-component="countdown-selector"] .cd-item{width:clamp(66px,18vw,112px);height:clamp(34px,42vh,58px);margin-left:calc(clamp(66px,18vw,112px)/-2);margin-top:calc(clamp(34px,42vh,58px)/-2);padding:0;border:0;outline:0;background:transparent;box-shadow:none;font-family:inherit;appearance:none;-webkit-appearance:none;cursor:pointer}',
    },
    "shade-control": {
      props: [
        "textColor|Name color|#ffffff",
        "statusColor|Position text color|#04dcb9",
        "frameColor|Frame tint|#045548",
        "shadeColor|Shade color|#121212",
        "glowColor|Glow color|#04aa8e",
        "borderColor|Border color|#94eee2",
      ],
      css: '[data-component="shade-control"] .shade-card{background:linear-gradient(145deg,rgba(255,255,255,.13),color-mix(in srgb,var(--frame-color) 36%,transparent)),color-mix(in srgb,var(--frame-color) 32%,transparent);border-color:color-mix(in srgb,var(--border-color) 54%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--glow-color) 24%,transparent)}[data-component="shade-control"] .panel{background:repeating-linear-gradient(to bottom,var(--shade-color) 0,var(--shade-color) 10px,#2a2a2a 11px,#2a2a2a 13px)}[data-component="shade-control"] .name{color:var(--text-color)}[data-component="shade-control"] .position{color:var(--status-color)}',
    },
  };
  const componentSizes = {
    "folding-menu": {
      props: [],
      css: '[data-component="folding-menu"] .si svg{display:block;width:1em;height:1em}',
    },
    "countdown-selector": {
      props: [],
      css: '[data-component="countdown-selector"] .cd-panel::after{top:calc(50% + clamp(52px,24vh,82px)/2)}',
    },
    "standard-button": {
      props: ["textSize|Text size|24"],
      css: '[data-component="standard-button"] .standard-button-label{font-size:var(--text-size-px)}',
    },
    "power-button": {
      props: ["iconSize|Power icon size|72"],
      css: '[data-component="power-button"] svg{width:var(--icon-size-px);height:var(--icon-size-px)}',
    },
    "rolling-toggle": {
      props: ["textSize|Label size|12"],
      css: '[data-component="rolling-toggle"] .thumb{font-size:var(--text-size-px)}',
    },
    "tsw-toggle": {
      props: ["textSize|Label size|24"],
      css: '[data-component="tsw-toggle"] .mode{font-size:var(--text-size-px)}',
    },
    "volume-up-button": {
      props: ["textSize|Text size|18", "iconSize|Icon size|48"],
      css: '[data-component="volume-up-button"] .oval [data-label]{font-size:var(--text-size-px)}[data-component="volume-up-button"] .oval svg{width:var(--icon-size-px);height:var(--icon-size-px)}',
    },
    "volume-down-button": {
      props: ["textSize|Text size|18", "iconSize|Icon size|48"],
      css: '[data-component="volume-down-button"] .oval [data-label]{font-size:var(--text-size-px)}[data-component="volume-down-button"] .oval svg{width:var(--icon-size-px);height:var(--icon-size-px)}',
    },
    "mute-button": {
      props: ["textSize|Text size|18", "iconSize|Icon size|48"],
      css: '[data-component="mute-button"] .oval [data-label]{font-size:var(--text-size-px)}[data-component="mute-button"] .oval svg{width:var(--icon-size-px);height:var(--icon-size-px)}',
    },
    "wave-button": {
      props: ["textSize|Text size|24", "iconSize|Wave size|100"],
      css: '[data-component="wave-button"] .wave span{font-size:var(--text-size-px)}[data-component="wave-button"] .wave i{width:var(--icon-size-px)}',
    },
    "display-flip": {
      props: ["textSize|Label size|20", "iconSize|Screen size (%)|70"],
      css: '[data-component="display-flip"] .face{font-size:var(--text-size-px)}[data-component="display-flip"] .screen{width:var(--icon-size-percent)}',
    },
    "card-flip": {
      props: ["textSize|Label size|20"],
      css: '[data-component="card-flip"] .face{font-size:var(--text-size-px)}',
    },
    "volume-slider": {
      props: ["textSize|Percentage size|28", "iconSize|Knob size|48"],
      css: '[data-component="volume-slider"] output{font-size:var(--text-size-px)}[data-component="volume-slider"] .knob{width:var(--icon-size-px);height:var(--icon-size-px)}',
    },
    "lighting-control": {
      props: [
        "textSize|Load-name size|18",
        "valueTextSize|Level-value size|26",
      ],
      css: '[data-component="lighting-control"] .name{font-size:var(--text-size-px)}[data-component="lighting-control"] .level{font-size:var(--value-text-size-px)}',
    },
    "microphone-control": {
      props: [
        "textSize|Microphone-label size|15",
        "valueTextSize|Level-value size|22",
        "iconSize|Gauge size|156",
      ],
      css: '[data-component="microphone-control"] .label{font-size:var(--text-size-px)}[data-component="microphone-control"] .value{font-size:var(--value-text-size-px)}[data-component="microphone-control"] .gauge{max-width:var(--icon-size-px)}',
    },
    "shade-control": {
      props: [
        "textSize|Shade-name size|16",
        "valueTextSize|Position-value size|25",
      ],
      css: '[data-component="shade-control"] .name{font-size:var(--text-size-px)}[data-component="shade-control"] .position{font-size:var(--value-text-size-px)}',
    },
    "horizontal-scrolling-text": { props: [], css: "" },
    "vertical-scrolling-text": { props: [], css: "" },
    "horizontal-carousel": {
      props: ["textSize|Slide-label size|28", "iconSize|Arrow size|34"],
      css: '[data-component="horizontal-carousel"] .glass-label{font-size:var(--text-size-px)}[data-component="horizontal-carousel"] .carousel-controls button{font-size:var(--icon-size-px)}',
    },
    "vertical-carousel": {
      props: ["textSize|Slide-label size|28", "iconSize|Arrow size|34"],
      css: '[data-component="vertical-carousel"] .glass-label{font-size:var(--text-size-px)}[data-component="vertical-carousel"] .carousel-controls button{font-size:var(--icon-size-px)}',
    },
  };
  const repeatedItemSelectors = {
    "card-flip": ".card-wrap",
    "display-flip": ".card-wrap",
    "display-control": ".dc-card",
    "horizontal-carousel": ".glass-slide",
    "lighting-control": ".load",
    "microphone-control": ".mic-card",
    "rolling-menu": ".rm-item",
    "shade-control": ".shade-card",
    "vertical-carousel": ".glass-slide",
  };
  const optionalContent = {
    "battery-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
    "card-flip": { showLabel: ".text" },
    "cell-bar-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
    "display-control": { showLabel: ".dc-name" },
    "display-flip": { showLabel: ".text" },
    "lighting-control": { showLabel: ".name", showPercentage: ".level" },
    "microphone-control": { showLabel: ".label", showPercentage: ".value", showToggle: ".toggle" },
    "rotary-knob": { showLabel: ".rotary-name", showPercentage: ".rotary-value" },
    "shade-control": { showLabel: ".name", showPercentage: ".position" },
    "wifi-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
  };
  function register(definition) {
    if (!definition || !definition.id)
      throw new Error("A component definition requires an id");
    definition.properties = definition.properties || [];
    definition.signals = definition.signals || [];
    definition.itemSelector =
      definition.itemSelector || repeatedItemSelectors[definition.id] || "";
    Object.keys(optionalContent[definition.id] || {}).forEach((key) => {
      if (!definition.properties.some((property) => property.key === key))
        definition.properties.push({
          key,
          name: key === "showPercentage" ? "Show percentage / value" : key === "showToggle" ? "Show toggle" : "Show label",
          type: "checkbox",
          defaultValue: true,
        });
    });
    const namespace = definition.id
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    if (!definition.properties.some((property) => property.key === "visibilityEnabled"))
      definition.properties.push({
        key: "visibilityEnabled",
        name: "Enable visibility signal",
        type: "checkbox",
        defaultValue: false,
        signalSetting: true,
      });
    if (!definition.signals.some((signal) => signal.key === "visibility"))
      definition.signals.push({
        key: "visibility",
        name: "Visibility",
        type: "digital",
        direction: "input",
        defaultValue: `${namespace}.Visibility`,
        optionalProperty: "visibilityEnabled",
      });
    let mode = definition.properties.find((p) => p.key === "bindingMode");
    if (!mode) {
      mode = {
        key: "bindingMode",
        name: "Crestron binding mode",
        type: "select",
        options: [
          { value: "contract", label: "Contract names" },
          { value: "join", label: "Join numbers" },
        ],
        defaultValue: "contract",
        affectsBindings: true,
      };
      definition.properties.unshift(mode);
    } else {
      mode.name = "Crestron binding mode";
      mode.defaultValue = "contract";
      mode.affectsBindings = true;
      mode.options = [
        { value: "contract", label: "Contract names" },
        { value: "join", label: "Join numbers" },
      ];
    }
    definition.signals.forEach((signal) => {
      if (!signal.defaultValue || /^\d+$/.test(String(signal.defaultValue)))
        signal.defaultValue =
          namespace +
          "." +
          signal.key
            .split(/(?=[A-Z])|[-_]/)
            .filter(Boolean)
            .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
            .join(".");
    });
    const suffixes = {
      pressBase: "Press",
      feedbackBase: "Feedback",
      labelBase: "Label",
      nameBase: "Name",
      setBase: "Level.Set",
      levelSetBase: "Level.Set",
      levelFeedbackBase: "Level.Value",
      positionSetBase: "Position.Set",
      positionFeedbackBase: "Position.Value",
      togglePressBase: "Toggle.Press",
      toggleFeedbackBase: "Toggle.Value",
      checkedOutBase: "Checked.Set",
      displayChoiceBase: "DisplayChoice",
    };
    const typeFor = (key) =>
        /label|name/i.test(key)
          ? "serial"
          : key === "feedbackBase" &&
              definition.properties.some((property) => property.key === "setBase")
            ? "analog"
          : /set|level|position|displaychoice/i.test(key)
            ? "analog"
            : "digital",
      directionFor = (key) =>
        /feedback|label|name/i.test(key) ? "input" : "output";
    definition.rangeBindings = definition.rangeBindings || [];
    Object.keys(suffixes).forEach((key) => {
      const prop = definition.properties.find((p) => p.key === key);
      if (!prop) return;
      prop.signalSetting = true;
      if (!prop.defaultValue || /^\d+$/.test(String(prop.defaultValue)))
        prop.defaultValue =
          namespace + ".Items[{index}]." + suffixes[key].replace(/\./g, "_");
      else prop.defaultValue = contractPattern(prop.defaultValue);
      const incrementKey = definition.properties.some(
        (p) => p.key === key.replace(/Base$/, "Increment"),
      )
        ? key.replace(/Base$/, "Increment")
        : definition.properties.some((p) => p.key === "signalIncrement")
          ? "signalIncrement"
          : "";
      if (incrementKey) {
        const inc = definition.properties.find((p) => p.key === incrementKey);
        if (inc) inc.signalSetting = true;
      }
      if (!definition.rangeBindings.some((r) => r.baseKey === key))
        definition.rangeBindings.push({
          name: prop.name.replace(/ base.*$/i, "") + " range",
          type: typeFor(key),
          direction: directionFor(key),
          baseKey: key,
          incrementKey,
        });
    });
    definition.addressBindings = definition.addressBindings || [];
    definition.properties
      .filter((p) => /Signal$/.test(p.key))
      .forEach((prop) => {
        prop.signalSetting = true;
        if (!prop.defaultValue || /^\d+$/.test(String(prop.defaultValue)))
          prop.defaultValue =
            namespace +
            "." +
            prop.key
              .replace(/Signal$/, "")
              .split(/(?=[A-Z])|[-_]/)
              .filter(Boolean)
              .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
              .join(".");
        if (!definition.addressBindings.some((a) => a.key === prop.key))
          definition.addressBindings.push({
            name: prop.name,
            type: /count|level|size/i.test(prop.key)
              ? "analog"
              : /label|name|text/i.test(prop.key)
                ? "serial"
                : "digital",
            direction: "input",
            key: prop.key,
          });
      });
    const collectionLabels = {
        "card-flip": ["localLabels", "Card", "Card"],
        "display-flip": ["localLabels", "Card", "Display"],
        "lighting-control": ["localLabels", "Load", "Light Load"],
        "microphone-control": ["localLabels", "Microphone", "Microphone"],
        "shade-control": ["localLabels", "Shade", "Window Shade"],
      },
      collection = collectionLabels[definition.id],
      defaultCount = definition.properties.find(
        (p) => p.key === "defaultCount",
      );
    if (collection && defaultCount) {
      defaultCount.name = "Default " + collection[1].toLowerCase() + "s";
      defaultCount.type = "select";
      defaultCount.options = Array.from({ length: 20 }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      }));
      defaultCount.defaultValue = String(defaultCount.defaultValue);
      defaultCount.affectsProperties = true;
      if (!definition.properties.some((p) => p.key === collection[0]))
        definition.properties.splice(
          definition.properties.indexOf(defaultCount) + 1,
          0,
          {
            key: collection[0],
            name: "Local " + collection[1].toLowerCase() + " labels",
            type: "text-list",
            countKey: "defaultCount",
            itemName: collection[1],
            defaultValue: Array.from(
              { length: Number(defaultCount.defaultValue) || 1 },
              (_, i) => collection[2] + " " + (i + 1),
            ).join("|"),
          },
        );
    }
    const theme = componentThemes[definition.id];
    if (theme) {
      theme.props.forEach((spec) => {
        const [key, name, defaultValue] = spec.split("|");
        if (!definition.properties.some((p) => p.key === key))
          definition.properties.push({
            key,
            name,
            type: "color",
            defaultValue,
          });
      });
      if (theme.css) definition.styles = (definition.styles || "") + theme.css;
    }
    const sizes = componentSizes[definition.id];
    if (sizes) {
      sizes.props.forEach((spec) => {
        const [key, name, defaultValue] = spec.split("|");
        if (!definition.properties.some((p) => p.key === key))
          definition.properties.push({
            key,
            name,
            type: "number",
            defaultValue: Number(defaultValue),
          });
      });
      if (sizes.css) definition.styles = (definition.styles || "") + sizes.css;
    }
    definition.properties.forEach((property) => {
      if (property.signalSetting && typeof property.defaultValue === "string")
        property.defaultValue = contractPattern(property.defaultValue);
    });
    definition.signals.forEach((signal) => {
      if (typeof signal.defaultValue === "string")
        signal.defaultValue = standardContractPattern(
          signal.defaultValue,
          signal.type,
          signal.direction,
        );
    });
    [...(definition.addressBindings || []), ...(definition.rangeBindings || [])].forEach(
      (binding) => {
        const property = definition.properties.find(
          (entry) => entry.key === (binding.key || binding.baseKey),
        );
        if (property && typeof property.defaultValue === "string")
          property.defaultValue = standardContractPattern(
            property.defaultValue,
            binding.type,
            binding.direction,
          );
      },
    );
    definitions.set(definition.id, definition);
  }
  function get(id) {
    return definitions.get(id);
  }
  function mount(root, id, options = {}) {
    const definition = get(id);
    if (!definition) throw new Error("Unknown component: " + id);
    if (options.properties?.bindingMode === "contract")
      options.properties = Object.fromEntries(
        Object.entries(options.properties).map(([key, value]) => [
          key,
          typeof value === "string" ? contractPattern(value) : value,
        ]),
      );
    root.dataset.component = id;
    if (options.scopeStyles) root.dataset.composerComponentScope = "true";
    Object.entries(options.properties || {}).forEach(([key, value]) => {
      const name = "--" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      root.style.setProperty(name, String(value));
      if (typeof value === "number") {
        root.style.setProperty(name + "-px", value + "px");
        root.style.setProperty(name + "-percent", value + "%");
      }
    });
    const componentStyles = options.stylesOverride || definition.styles,
      mountedStyles = options.scopeStyles
        ? `@scope ([data-composer-component-scope]) {${componentStyles}}`
        : componentStyles;
    root.innerHTML =
      "<style>" +
      mountedStyles +
      "</style>" +
      (options.templateOverride || definition.template);
    const cleanups = [],
      lib = options.lib === undefined ? library() : options.lib,
      bindings = options.bindings || {},
      contractPrefix = options.contractPrefix || "";
    function binding(key) {
      return bindings[key] && bindings[key].value ? bindings[key].value : "";
    }
    const signals = {
      publish(key, value) {
        const spec = definition.signals.find((s) => s.key === key),
          signal = contractAddress(
            binding(key),
            spec?.type,
            "output",
            contractPrefix,
          );
        if (!spec || !signal) return;
        if (lib) lib.publishEvent(typeCode(spec.type), signal, value);
        else simulator.publish(typeCode(spec.type), signal, value);
      },
      subscribe(key, callback) {
        const spec = definition.signals.find((s) => s.key === key),
          signal = contractAddress(
            binding(key),
            spec?.type,
            "input",
            contractPrefix,
          ),
          handler =
            key === "selected"
              ? (value) => {
                  const holder = root.closest(".widget,.scoped-widget");
                  if (holder)
                    holder.dataset.assetSelected =
                      value === true || value === 1 || value === "1"
                        ? "true"
                        : "false";
                  callback(value);
                }
              : callback;
        if (!spec || !signal) return;
        if (lib) {
          const result = lib.subscribeState(
            typeCode(spec.type),
            signal,
            handler,
          );
          if (typeof result === "function") cleanups.push(result);
        } else
          cleanups.push(
            simulator.subscribe(typeCode(spec.type), signal, handler),
          );
      },
      publishAddress(type, signal, value) {
        if (!signal) return;
        signal = contractAddress(signal, type, "output", contractPrefix);
        if (lib) lib.publishEvent(typeCode(type), String(signal), value);
        else simulator.publish(typeCode(type), String(signal), value);
      },
      subscribeAddress(type, signal, callback) {
        if (!signal) return;
        signal = contractAddress(signal, type, "input", contractPrefix);
        if (lib) {
          const result = lib.subscribeState(
            typeCode(type),
            String(signal),
            callback,
          );
          if (typeof result === "function") cleanups.push(result);
        } else
          cleanups.push(
            simulator.subscribe(typeCode(type), String(signal), callback),
          );
      },
    };
    if (options.properties?.visibilityEnabled) {
      root.style.visibility = "visible";
      signals.subscribe("visibility", (value) => {
        root.style.visibility =
          value === true || value === 1 || value === "1" ? "visible" : "hidden";
      });
    }
    options.definitionData = definition.data || {};
    let dispose;
    try {
      dispose = definition.mount(root, {
        signals,
        navigate: options.navigate || function () {},
        options,
      });
      const visibility = optionalContent[id],
        style = document.createElement("style"),
        holder = root.closest(".widget,.scoped-widget"),
        scope = holder?.dataset.id
          ? `.widget[data-id="${holder.dataset.id}"] `
          : holder?.dataset.instance
            ? `.scoped-widget[data-instance="${holder.dataset.instance}"] `
            : `[data-component="${id}"] `;
      if (visibility) {
        style.textContent = Object.entries(visibility)
          .filter(([key]) => options.properties?.[key] === false || options.properties?.[key] === 0 || options.properties?.[key] === "0" || String(options.properties?.[key]).toLowerCase() === "false")
          .map(([, selector]) => `${scope}${selector}{display:none!important}`)
          .join("");
        if (style.textContent) root.appendChild(style);
      }
    } catch (error) {
      console.error(`Component “${definition.name || definition.id}” failed to mount`, error);
      root.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.style.cssText =
        "height:100%;padding:12px;border:1px solid #a65050;background:#291718;color:#ffc1c1;overflow:auto";
      fallback.textContent = `Component error: ${error.message || error}`;
      root.appendChild(fallback);
    }
    if (typeof dispose === "function") cleanups.push(dispose);
    if (options.properties && options.properties.localLabels) {
      const apply = () =>
          applyLocalLabels(root, options.properties.localLabels),
        observer = new MutationObserver((mutations) => {
          if (
            mutations.some(
              (m) =>
                m.target.matches &&
                m.target.matches(".cards,.loads,.mic-list,.shade-list"),
            )
          )
            apply();
        });
      apply();
      observer.observe(root, { childList: true, subtree: true });
      cleanups.push(() => observer.disconnect());
    }
    return () =>
      cleanups.splice(0).forEach((fn) => {
        try {
          fn();
        } catch (e) {}
      });
  }
  function applyLocalLabels(root, value) {
    const labels = String(value || "").split("|"),
      id = root.dataset.component;
    let groups = [];
    if (id === "card-flip" || id === "display-flip")
      groups = [...root.querySelectorAll(".card-wrap")].map((el) => [
        ...el.querySelectorAll(".text"),
      ]);
    else if (id === "lighting-control")
      groups = [...root.querySelectorAll(".load")].map((el) => [
        el.querySelector(".name"),
      ]);
    else if (id === "microphone-control")
      groups = [...root.querySelectorAll(".mic-card")].map((el) => [
        el.querySelector(".label"),
      ]);
    else if (id === "shade-control")
      groups = [...root.querySelectorAll(".shade-card")].map((el) => [
        el.querySelector(".name"),
      ]);
    groups.forEach((elements, index) => {
      const text = (labels[index] || "").trim();
      if (text)
        elements.filter(Boolean).forEach((el) => {
          if (el.textContent !== text) el.textContent = text;
        });
    });
  }
  global.ComposerRuntime = {
    register,
    get,
    mount,
    definitions,
    simulator,
    resolveAddress: contractAddress,
    typeCode,
  };
})(window);
