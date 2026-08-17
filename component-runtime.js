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
  const feedbackState =
    global.__composerFeedbackState instanceof Map
      ? global.__composerFeedbackState
      : new Map();
  global.__composerFeedbackState = feedbackState;
  function subscribeFeedback(lib, type, signal, callback) {
    const code = /^[bns]$/.test(String(type)) ? String(type) : typeCode(type),
      address = String(signal),
      key = code + ":" + address;
    let delivered = false;
    const handler = (value) => {
      delivered = true;
      feedbackState.set(key, value);
      callback(value);
    };
    const result = lib.subscribeState(code, address, handler);
    if (!delivered && feedbackState.has(key)) {
      const retained = feedbackState.get(key);
      if (typeof queueMicrotask === "function")
        queueMicrotask(() => callback(retained));
      else Promise.resolve().then(() => callback(retained));
    }
    return typeof result === "function" && result !== handler && result !== callback
      ? result
      : function () {};
  }
  function wireCipText(root, signals) {
    const pattern = /<cip([sda])>([\s\S]*?)<\/cip\1>/gi,
      cleanups = [];
    function analogText(value, format) {
      const number = Number(value) || 0, spec = String(format || "%r");
      if (/%x/i.test(spec)) return Math.round(number).toString(16).toUpperCase().padStart(2, "0");
      if (/%t/i.test(spec)) { const seconds = Math.max(0, Math.round(number)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
      const percent = spec.match(/%(\d+(?:\.\d+)?)\.(\d+)p/i);
      if (percent) return `${((number / Math.max(1, Number(percent[1]))) * 100).toFixed(Number(percent[2]))}%`;
      const fixed = spec.match(/%(\d+)\.(\d+)f/i);
      if (fixed) return number.toFixed(Number(fixed[2])).padStart(Number(fixed[1]) + Number(fixed[2]) + 1, "0");
      const integer = spec.match(/%(\d+)?[du]/i);
      if (integer) return String(Math.round(number)).padStart(Number(integer[1]) || 0, "0");
      return String(Math.round(number));
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) if (/<cip[sda]>/i.test(walker.currentNode.nodeValue || "")) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const tokens = [], values = [], template = String(node.nodeValue || "").replace(pattern, (match, kind, content) => {
        let address = String(content).trim(), format = "", trueText = "True", falseText = "False", fallback = "";
        kind = kind.toLowerCase();
        if (kind === "d") { const question = address.indexOf("?"), colon = address.indexOf(":", question + 1); if (question >= 0) { trueText = address.slice(question + 1, colon >= 0 ? colon : undefined); falseText = colon >= 0 ? address.slice(colon + 1) : ""; address = address.slice(0, question); } }
        else if (kind === "a") { const question = address.indexOf("?"); if (question >= 0) { format = address.slice(question + 1); address = address.slice(0, question); } }
        else { const colon = address.indexOf(":"); if (colon >= 0) { fallback = address.slice(colon + 1); address = address.slice(0, colon); } }
        const index = tokens.length; tokens.push({ kind, address: address.trim(), format: format.trim(), trueText, falseText, fallback }); values.push(kind === "s" ? fallback : kind === "d" ? falseText : "0"); return `\u0000${index}\u0000`;
      });
      function render() { node.nodeValue = template.replace(/\u0000(\d+)\u0000/g, (_, index) => values[Number(index)] ?? ""); }
      tokens.forEach((token, index) => signals.subscribeExact(token.kind === "s" ? "serial" : token.kind === "d" ? "digital" : "analog", token.address, (value) => { values[index] = token.kind === "s" ? String(value == null || value === "" ? token.fallback : value) : token.kind === "d" ? (value === true || value === 1 || value === "1" ? token.trueText : token.falseText) : analogText(value, token.format); render(); }));
      render();
    });
    return () => cleanups.forEach((cleanup) => cleanup());
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
    const normalized = String(value || "").replace(/[^A-Za-z0-9_]/g, "_");
    if (/^(?:Visibility|Disabled)$/i.test(normalized))
      return /^Visibility$/i.test(normalized) ? "Visibility" : "Disabled";
    const suffix = type === "digital" ? (direction === "output" ? "Press" : "Selected") : type === "analog" ? (direction === "output" ? "ValueSet" : "Feedback") : direction === "output" ? "Text" : "Label",
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
        "selectedTextColor|Selected text color|#ffffff",
        "waveColor|Wave color|#04aa8e",
        "glowColor|Glow color|#04aa8e",
        "selectedGlowColor|Selected glow color|#04aa8e",
        "borderColor|Border color|#ffffff",
        "selectedBorderColor|Selected border color|#04aa8e",
      ],
      css: '[data-component="wave-button"] .wave{color:var(--text-color);border-color:var(--border-color);box-shadow:inset 0 1px rgba(255,255,255,.42),0 0 10px var(--glow-color),0 6px 12px rgba(0,0,0,.22)}[data-component="wave-button"] .wave i{background:radial-gradient(circle,color-mix(in srgb,var(--wave-color) 40%,transparent),transparent 70%)}[data-component="wave-button"] .wave.active{color:var(--selected-text-color);border-color:var(--selected-border-color);box-shadow:0 0 18px var(--selected-glow-color)}',
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
      css: '[data-component="password-entry"] .pw-display,[data-component="password-entry"] .pw-grid{transition:opacity .6s ease,transform .6s ease}[data-component="password-entry"] .pw-enter-row{transition:all .72s cubic-bezier(.67,.17,.4,.83)}[data-component="password-entry"] .pw-enter{transition:background .6s cubic-bezier(.67,.17,.4,.83),box-shadow .6s cubic-bezier(.67,.17,.4,.83),transform .72s cubic-bezier(.67,.17,.4,.83),border-radius .72s cubic-bezier(.67,.17,.4,.83),width .72s cubic-bezier(.67,.17,.4,.83),height .72s cubic-bezier(.67,.17,.4,.83)}[data-component="password-entry"] .pw-keypad.success .pw-display,[data-component="password-entry"] .pw-keypad.error .pw-display,[data-component="password-entry"] .pw-keypad.success .pw-grid,[data-component="password-entry"] .pw-keypad.error .pw-grid{transform:scale(.94)}[data-component="password-entry"] .pw-keypad.success .pw-enter,[data-component="password-entry"] .pw-keypad.error .pw-enter{transform:rotate(-360deg)}[data-component="password-entry"] .pw-message{width:min(92vw,720px);line-height:1.05;text-shadow:0 2px 5px rgba(0,0,0,.82),0 0 14px rgba(255,255,255,.58)}',
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
    "single-light-control": {
      props: [
        "textColor|Name color|#ffffff", "valueColor|Level-value color|#ffffff",
        "selectedTextColor|Selected name color|#ffffff",
        "faceColor|Load face color|#222222", "levelLowColor|Level low color|#f5b700",
        "selectedFaceColor|Selected load face color|#222222",
        "levelHighColor|Level high color|#fff36a", "glowColor|Glow color|#ffe61e",
        "selectedGlowColor|Selected glow color|#ffe61e",
        "borderColor|Border color|#ffffff",
        "selectedBorderColor|Selected border color|#ffffff",
      ],
      css: '[data-component="single-light-control"] .load{background:var(--face-color);color:var(--text-color);border-color:color-mix(in srgb,var(--border-color) 30%,transparent);box-shadow:inset 0 1px rgba(255,255,255,.35),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 45%,transparent)}[data-component="single-light-control"] .load.selected{background:var(--selected-face-color);color:var(--selected-text-color);border-color:var(--selected-border-color);box-shadow:inset 0 1px rgba(255,255,255,.35),0 0 var(--glow-strength-px) var(--selected-glow-color)}[data-component="single-light-control"] .fill{background:linear-gradient(to top,var(--level-low-color),var(--level-high-color))}[data-component="single-light-control"] .glow{background:radial-gradient(circle at 50% 90%,color-mix(in srgb,var(--glow-color) 60%,transparent),transparent 70%)}[data-component="single-light-control"] .name{color:var(--text-color)}[data-component="single-light-control"] .load.selected .name{color:var(--selected-text-color)}[data-component="single-light-control"] .level{color:var(--value-color)}',
    },
    "single-shade-control": {
      props: [
        "textColor|Name color|#ffffff", "statusColor|Position-value color|#04dcb9",
        "frameColor|Frame tint|#045548", "shadeColor|Shade color|#121212",
        "glowColor|Glow color|#04aa8e", "borderColor|Border color|#94eee2",
      ],
      css: '[data-component="single-shade-control"] .shade-card{background:linear-gradient(145deg,rgba(255,255,255,.13),color-mix(in srgb,var(--frame-color) 36%,transparent)),color-mix(in srgb,var(--frame-color) 32%,transparent);border-color:color-mix(in srgb,var(--border-color) 54%,transparent);box-shadow:inset 0 0 20px rgba(255,255,255,.08),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 35%,transparent)}[data-component="single-shade-control"] .panel{background:repeating-linear-gradient(to bottom,var(--shade-color) 0,var(--shade-color) 10px,color-mix(in srgb,var(--shade-color) 72%,#fff) 11px,color-mix(in srgb,var(--shade-color) 72%,#fff) 13px)}[data-component="single-shade-control"] .panel:after{background:var(--shade-color);box-shadow:0 0 var(--glow-strength-px) var(--glow-color)}[data-component="single-shade-control"] .name{color:var(--text-color)}[data-component="single-shade-control"] .position{color:var(--status-color)}',
    },
    "single-mic-control": {
      props: [
        "textColor|Name/value color|#ffffff", "cardColor|Card tint|#045548",
        "selectedTextColor|Selected name/value color|#ffffff", "selectedCardColor|Selected card tint|#045548",
        "gaugeColor|Gauge color|#04aa8e", "toggleOffColor|Toggle off color|#8a7c79",
        "toggleOnColor|Toggle on color|#04aa8e", "glowColor|Glow color|#04dcb9", "selectedGlowColor|Selected glow color|#04dcb9",
      ],
      css: '[data-component="single-mic-control"]{color:var(--text-color)}[data-component="single-mic-control"] .mic-card{background:linear-gradient(145deg,rgba(255,255,255,.15),color-mix(in srgb,var(--card-color) 40%,transparent)),color-mix(in srgb,var(--card-color) 32%,transparent);box-shadow:inset 0 0 20px rgba(255,255,255,.08),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 35%,transparent)}[data-component="single-mic-control"].state-selected .mic-card{background:linear-gradient(145deg,rgba(255,255,255,.15),color-mix(in srgb,var(--selected-card-color) 40%,transparent)),color-mix(in srgb,var(--selected-card-color) 32%,transparent);box-shadow:inset 0 0 20px rgba(255,255,255,.08),0 0 var(--glow-strength-px) var(--selected-glow-color)}[data-component="single-mic-control"] .label,[data-component="single-mic-control"] .value{color:var(--text-color)}[data-component="single-mic-control"].state-selected .label{color:var(--selected-text-color)}[data-component="single-mic-control"] .toggle{background:var(--toggle-off-color)}[data-component="single-mic-control"] .toggle.selected{background:var(--toggle-on-color);border-color:var(--selected-glow-color);box-shadow:0 0 var(--glow-strength-px) var(--selected-glow-color)}',
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
    "single-light-control": {
      props: ["textSize|Load-name size|18", "valueTextSize|Level-value size|26", "glowStrength|Glow strength|12"],
      css: '[data-component="single-light-control"] .name{font-size:var(--text-size-px)}[data-component="single-light-control"] .level{font-size:var(--value-text-size-px)}',
    },
    "single-shade-control": {
      props: ["textSize|Shade-name size|16", "valueTextSize|Position-value size|25", "glowStrength|Glow strength|12"],
      css: '[data-component="single-shade-control"] .name{font-size:var(--text-size-px)}[data-component="single-shade-control"] .position{font-size:var(--value-text-size-px)}',
    },
    "single-mic-control": {
      props: ["textSize|Microphone-label size|15", "valueTextSize|Level-value size|22", "iconSize|Gauge size|190", "glowStrength|Glow strength|12"],
      css: '[data-component="single-mic-control"] .label{font-size:var(--text-size-px)}[data-component="single-mic-control"] .value{font-size:var(--value-text-size-px)}[data-component="single-mic-control"] .gauge{max-width:var(--icon-size-px)}',
    },
    "rolling-toggle-vertical": {
      props: ["textSize|Label size|12"],
      css: '[data-component="rolling-toggle-vertical"] .thumb{font-size:var(--text-size-px)}',
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
  const perItemVisibilityConfigs = {
    "display-control": [{ selector: ".dc-card", countKey: "defaultCount" }],
    "lighting-control": [{ selector: ".load", countKey: "defaultCount" }],
    "microphone-control": [{ selector: ".mic-card", countKey: "defaultCount" }],
    "shade-control": [{ selector: ".shade-card", countKey: "defaultCount" }],
    "video-switcher": [
      { keyPrefix: "source", label: "Source", selector: ".vs-source", countKey: "defaultSourceCount" },
      { keyPrefix: "tv", label: "TV", selector: ".vs-tv", countKey: "defaultTvCount" },
    ],
    "directional-pad": [{ selector: ".dpad-button", countKey: "buttonCount" }],
    "hamburger-popup": [{ selector: ".hp-item", countKey: "defaultCount" }],
    "menu-item": [{ selector: ".mi-button", countKey: "defaultCount" }],
    "neumorphic-glass-nav": [{ selector: ".ngn-icon", countKey: "buttonCount" }],
    "neumorphic-glass-nav-vertical": [{ selector: ".ngn-icon", countKey: "buttonCount" }],
    "neumorphic-icon-nav": [{ selector: ".nnb-icon", countKey: "buttonCount" }],
    "neumorphic-icon-nav-vertical": [{ selector: ".nnb-icon", countKey: "buttonCount" }],
    "neumorphic-dpad-square": [{ selector: ".nd-button", countKey: "buttonCount" }],
    "neumorphic-dpad-circular": [{ selector: ".nd-sector,.nd-center", countKey: "buttonCount" }],
    "split-button": [{ selector: ".split-item", countKey: "defaultCount" }],
    "wizard-steps": [{ selector: ".wiz-step", countKey: "defaultCount" }],
    "folding-menu": [
      { keyPrefix: "primary", label: "Primary item", selector: ".pbtn", countKey: "primaryCount" },
      { keyPrefix: "submenu", label: "Submenu item", selector: ".sbtn", countKey: "submenuCount", activeGroupSelector: ".pbtn.active", groupSelector: ".pbtn", groupSize: 3 },
    ],
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
    "single-light-control": { showLabel: ".name", showPercentage: ".level" },
    "wall-dimmer-light-load": { showLabel: ".wdl-name", showPercentage: ".wdl-value" },
    "single-shade-control": { showLabel: ".name", showPercentage: ".position" },
    "single-mic-control": { showLabel: ".label", showPercentage: ".value", showToggle: ".toggle" },
    "wifi-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
  };
  function wireUniformScrollbars(root, holder, axes) {
    holder = holder || root;
    if (!axes.length || root.querySelector(".dc-scroll")) return function () {};
    const bars = [], cleanups = [];
    const style = document.createElement("style");
    style.textContent =
      ".composer-scrollbar-source{scrollbar-width:none!important}" +
      ".composer-scrollbar-source::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}" +
      ".composer-uniform-scrollbar{position:absolute;z-index:8999;border-radius:99px;background:#2a2a2a61;pointer-events:auto;touch-action:none}" +
      ".composer-uniform-scrollbar.horizontal{left:14px;right:14px;bottom:4px;height:7px}" +
      ".composer-uniform-scrollbar.vertical{top:14px;right:4px;bottom:14px;width:7px}" +
      ".composer-uniform-scrollbar>i{position:absolute;display:block;border-radius:inherit;background:#707070c2;touch-action:none}" +
      ".composer-uniform-scrollbar.horizontal>i{left:0;top:0;height:100%;min-width:36px}" +
      ".composer-uniform-scrollbar.vertical>i{left:0;top:0;width:100%;min-height:36px}";
    holder.appendChild(style);
    function findTarget(axis) {
      const candidates = [root, ...root.querySelectorAll("*")].filter((element) => {
        const computed = getComputedStyle(element),
          overflow = axis === "vertical" ? computed.overflowY : computed.overflowX,
          excess = axis === "vertical" ? element.scrollHeight - element.clientHeight : element.scrollWidth - element.clientWidth;
        return /(auto|scroll)/.test(overflow) && excess > 2;
      });
      return candidates.sort((a, b) => {
        const aExcess = axis === "vertical" ? a.scrollHeight - a.clientHeight : a.scrollWidth - a.clientWidth,
          bExcess = axis === "vertical" ? b.scrollHeight - b.clientHeight : b.scrollWidth - b.clientWidth;
        return bExcess - aExcess;
      })[0] || null;
    }
    function attach(axis, target) {
      if (!target || String(target.dataset.composerUniformScrollbar || "").includes(axis)) return;
      target.dataset.composerUniformScrollbar = [target.dataset.composerUniformScrollbar, axis].filter(Boolean).join(" ");
      target.classList.add("composer-scrollbar-source");
      const bar = document.createElement("span"), thumb = document.createElement("i");
      bar.className = `composer-uniform-scrollbar ${axis}`;
      bar.setAttribute("aria-hidden", "true");
      bar.appendChild(thumb); holder.appendChild(bar); bars.push(bar);
      const update = () => {
        const horizontal = axis === "horizontal",
          viewport = horizontal ? target.clientWidth : target.clientHeight,
          content = horizontal ? target.scrollWidth : target.scrollHeight,
          track = horizontal ? bar.clientWidth : bar.clientHeight,
          maximum = Math.max(0, content - viewport),
          thumbSize = Math.max(36, Math.min(track, track * viewport / Math.max(viewport, content))),
          travel = Math.max(0, track - thumbSize),
          position = maximum ? (horizontal ? target.scrollLeft : target.scrollTop) / maximum * travel : 0;
        bar.style.display = maximum > 2 ? "block" : "none";
        thumb.style[horizontal ? "width" : "height"] = `${thumbSize}px`;
        thumb.style.transform = horizontal ? `translateX(${position}px)` : `translateY(${position}px)`;
      };
      target.addEventListener("scroll", update, { passive: true });
      let start = 0, startScroll = 0;
      const down = (event) => {
        event.preventDefault(); event.stopPropagation();
        start = axis === "horizontal" ? event.clientX : event.clientY;
        startScroll = axis === "horizontal" ? target.scrollLeft : target.scrollTop;
        thumb.setPointerCapture?.(event.pointerId);
      };
      const move = (event) => {
        if (!thumb.hasPointerCapture?.(event.pointerId)) return;
        event.preventDefault();
        const track = axis === "horizontal" ? bar.clientWidth : bar.clientHeight,
          thumbSize = axis === "horizontal" ? thumb.offsetWidth : thumb.offsetHeight,
          viewport = axis === "horizontal" ? target.clientWidth : target.clientHeight,
          content = axis === "horizontal" ? target.scrollWidth : target.scrollHeight,
          ratio = Math.max(0, content - viewport) / Math.max(1, track - thumbSize),
          delta = (axis === "horizontal" ? event.clientX : event.clientY) - start;
        if (axis === "horizontal") target.scrollLeft = startScroll + delta * ratio;
        else target.scrollTop = startScroll + delta * ratio;
      };
      thumb.addEventListener("pointerdown", down);
      thumb.addEventListener("pointermove", move);
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
      observer?.observe(target); observer?.observe(holder); requestAnimationFrame(update);
      cleanups.push(() => {
        target.removeEventListener("scroll", update);
        thumb.removeEventListener("pointerdown", down);
        thumb.removeEventListener("pointermove", move);
        observer?.disconnect();
        target.classList.remove("composer-scrollbar-source");
        delete target.dataset.composerUniformScrollbar;
      });
    }
    requestAnimationFrame(() => axes.forEach((axis) => attach(axis, findTarget(axis))));
    return () => { cleanups.forEach((cleanup) => cleanup()); bars.forEach((bar) => bar.remove()); style.remove(); };
  }
  function wireScrollReturn(root, holder, definition, properties) {
    const axes = definition.scrollReturnAxes || [];
    holder = holder || root;
    if (!axes.length) return function () {};
    const uniformScrollbarCleanup = wireUniformScrollbars(root, holder, axes);
    if (properties.scrollReturnEnabled === false || properties.scrollReturnEnabled === 0 || properties.scrollReturnEnabled === "0" || String(properties.scrollReturnEnabled).toLowerCase() === "false") return uniformScrollbarCleanup;
    holder.querySelectorAll(":scope > .composer-scroll-return").forEach((button) => button.remove());
    const threshold = Math.max(0, Number(properties.scrollReturnThreshold) || 80),
      size = Math.max(28, Math.min(80, Number(properties.scrollReturnSize) || 44)),
      color = properties.scrollReturnColor || "#04aa8e",
      textColor = properties.scrollReturnTextColor || "#071210",
      glowColor = properties.scrollReturnGlowColor || color,
      buttons = [], cleanups = [], targets = new Map(), semanticPosition = { vertical: 0, horizontal: 0 };
    function findTarget(axis) {
      const candidates = [root, ...root.querySelectorAll("*")].filter((element) => {
        const style = getComputedStyle(element), overflow = axis === "vertical" ? style.overflowY : style.overflowX;
        return /(auto|scroll)/.test(overflow) && (axis === "vertical" ? element.scrollHeight - element.clientHeight : element.scrollWidth - element.clientWidth) > 2;
      });
      return candidates.sort((a, b) => (axis === "vertical" ? b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight) : b.scrollWidth - b.clientWidth - (a.scrollWidth - a.clientWidth)))[0] || null;
    }
    function update(button, axis) {
      const target = targets.get(axis), position = target ? (axis === "vertical" ? target.scrollTop : target.scrollLeft) : semanticPosition[axis];
      button.classList.toggle("show", target ? position > threshold : position > 0);
    }
    axes.forEach((axis, axisIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `composer-scroll-return ${axis}`;
      button.setAttribute("aria-label", axis === "vertical" ? "Jump to top" : "Jump to beginning");
      button.textContent = axis === "vertical" ? "↑" : "←";
      button.style.cssText = `position:absolute;right:${14 + axisIndex * (size + 8)}px;bottom:14px;width:${size}px;height:${size}px;padding:0;border:1px solid rgba(255,255,255,.46);border-radius:50%;background:${color};color:${textColor};font:800 ${Math.round(size * .5)}px/1 "Segoe UI",sans-serif;display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.38),0 0 12px ${glowColor};opacity:0;transform:translateY(10px) scale(.84);pointer-events:none;transition:opacity .2s ease,transform .2s ease,filter .15s ease;z-index:9000;cursor:pointer;`;
      button.addEventListener("pointerdown", (event) => { event.preventDefault(); event.stopPropagation(); });
      button.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        const target = targets.get(axis);
        if (target) target.scrollTo(axis === "vertical" ? { top: 0, behavior: "smooth" } : { left: 0, behavior: "smooth" });
        else root.dispatchEvent(new CustomEvent("composer-scroll-return", { detail: { axis }, bubbles: false }));
      });
      holder.appendChild(button); buttons.push(button);
      const target = findTarget(axis);
      if (target) {
        targets.set(axis, target);
        const listener = () => update(button, axis);
        target.addEventListener("scroll", listener, { passive: true });
        cleanups.push(() => target.removeEventListener("scroll", listener));
      }
      update(button, axis);
    });
    const positionListener = (event) => {
      const axis = event.detail?.axis;
      if (!axes.includes(axis)) return;
      semanticPosition[axis] = Math.max(0, Number(event.detail?.value) || 0);
      const button = buttons[axes.indexOf(axis)];
      if (button) update(button, axis);
    };
    root.addEventListener("composer-scroll-position", positionListener);
    cleanups.push(() => root.removeEventListener("composer-scroll-position", positionListener));
    requestAnimationFrame(() => buttons.forEach((button, index) => {
      const axis = axes[index], target = findTarget(axis);
      if (target && !targets.has(axis)) {
        targets.set(axis, target);
        const listener = () => update(button, axis);
        target.addEventListener("scroll", listener, { passive: true });
        cleanups.push(() => target.removeEventListener("scroll", listener));
      }
      update(button, axis);
    }));
    const style = document.createElement("style");
    style.textContent = ".composer-scroll-return.show{opacity:1!important;transform:translateY(0) scale(1)!important;pointer-events:auto!important}.composer-scroll-return:active{filter:brightness(1.2);transform:translateY(0) scale(.92)!important}";
    holder.appendChild(style);
    return () => { cleanups.forEach((cleanup) => cleanup()); buttons.forEach((button) => button.remove()); style.remove(); uniformScrollbarCleanup(); };
  }
  function register(definition) {
    if (!definition || !definition.id)
      throw new Error("A component definition requires an id");
    definition.properties = definition.properties || [];
    definition.optionalContent = { ...(optionalContent[definition.id] || {}), ...(definition.optionalContent || {}) };
    definition.signals = definition.signals || [];
    const holdExcludedComponents = new Set([
        "hold-button",
        "circular-hold-button",
        "countdown-auto-fire",
        "safety-armed-on-off",
        "system-start-stop",
        "display-flip",
        "card-flip",
        "power-rocker",
        "illuminated-power-button",
        "neumorphic-rocker-vertical",
        "neumorphic-rocker-horizontal",
        "neumorphic-rocker-v2-vertical",
        "neumorphic-rocker-v2-horizontal",
      ]),
      digitalOutputs = definition.signals.filter(
        (signal) => signal.type === "digital" && signal.direction === "output",
      ),
      pressOutputs = digitalOutputs.filter((signal) => /press$/i.test(signal.key)),
      buttonCategory = /^(?:Standard|Toggle|Advanced) Buttons$/i.test(
        definition.category || "",
      ),
      standardHoldCapable =
        buttonCategory &&
        digitalOutputs.length === 1 &&
        pressOutputs.length === 1 &&
        !holdExcludedComponents.has(definition.id) &&
        !definition.signals.some((signal) => /held|completed/i.test(signal.key));
    if (standardHoldCapable) {
      definition.standardHoldCapability = {
        pressKey: pressOutputs[0].key,
        heldKey: "held",
      };
      if (!definition.properties.some((property) => property.key === "heldDuration"))
        definition.properties.push({
          key: "heldDuration",
          name: "Held duration (seconds)",
          type: "number",
          min: 0.1,
          max: 10,
          step: 0.1,
          defaultValue: 3,
        });
      if (!definition.signals.some((signal) => signal.key === "held"))
        definition.signals.push({
          key: "held",
          name: "Held",
          type: "digital",
          direction: "output",
          standardHoldOutput: true,
          defaultValue: `${definition.id
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("")}.Held`,
        });
    }
    definition.itemSelector =
      definition.itemSelector || repeatedItemSelectors[definition.id] || "";
    Object.keys(definition.optionalContent || {}).forEach((key) => {
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
    else {
      const visibilityProperty = definition.properties.find(
        (property) => property.key === "visibilityEnabled",
      );
      visibilityProperty.signalSetting = true;
      visibilityProperty.name = "Enable visibility signal";
      visibilityProperty.type = "checkbox";
    }
    if (!definition.signals.some((signal) => signal.key === "visibility"))
      definition.signals.push({
        key: "visibility",
        name: "Visibility",
        type: "digital",
        direction: "input",
        defaultValue: `${namespace}.Visibility`,
        optionalProperty: "visibilityEnabled",
      });
    if (!definition.properties.some((property) => property.key === "disabledEnabled"))
      definition.properties.push({
        key: "disabledEnabled",
        name: "Enable disabled signal",
        type: "checkbox",
        defaultValue: false,
        signalSetting: true,
      });
    else {
      const disabledProperty = definition.properties.find(
        (property) => property.key === "disabledEnabled",
      );
      disabledProperty.signalSetting = true;
      disabledProperty.name = "Enable disabled signal";
      disabledProperty.type = "checkbox";
      disabledProperty.defaultValue = false;
    }
    let disabledSignal = definition.signals.find(
      (signal) => signal.key === "disabled",
    );
    if (!disabledSignal) {
      disabledSignal = {
        key: "disabled",
        name: "Disabled",
        type: "digital",
        direction: "input",
        defaultValue: `${namespace}.Disabled`,
      };
      definition.signals.push(disabledSignal);
    }
    disabledSignal.name = "Disabled";
    disabledSignal.type = "digital";
    disabledSignal.direction = "input";
    disabledSignal.optionalProperty = "disabledEnabled";
    const itemVisibilityConfigs = perItemVisibilityConfigs[definition.id] || [];
    if (itemVisibilityConfigs.length) {
      if (!definition.properties.some((property) => property.key === "itemVisibilityEnabled"))
        definition.properties.push({ key: "itemVisibilityEnabled", name: "Enable per-item visibility signals", type: "checkbox", defaultValue: false, signalSetting: true });
      itemVisibilityConfigs.forEach((config) => {
        const prefix = config.keyPrefix || "",
          baseKey = prefix ? `${prefix}VisibilityBase` : "visibilityBase",
          incrementKey = prefix ? `${prefix}VisibilityIncrement` : "visibilityIncrement",
          collection = prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "Items";
        if (!definition.properties.some((property) => property.key === baseKey))
          definition.properties.push({ key: baseKey, name: `${config.label || "Per-item"} Visibility`, type: "text", defaultValue: `${namespace}.${collection}[{index}].Visibility`, signalSetting: true });
        if (!definition.properties.some((property) => property.key === incrementKey))
          definition.properties.push({ key: incrementKey, name: `${config.label || "Per-item"} visibility join increment`, type: "number", defaultValue: 1, signalSetting: true });
      });
    }
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
    itemVisibilityConfigs.forEach((config) => {
      const prefix = config.keyPrefix || "",
        baseKey = prefix ? `${prefix}VisibilityBase` : "visibilityBase",
        incrementKey = prefix ? `${prefix}VisibilityIncrement` : "visibilityIncrement";
      if (!definition.rangeBindings.some((range) => range.baseKey === baseKey))
        definition.rangeBindings.push({ name: `${config.label || "Per-item"} Visibility range`, type: "digital", direction: "input", baseKey, incrementKey, countKey: config.countKey, visibilitySelector: config.selector, activeGroupSelector: config.activeGroupSelector, groupSelector: config.groupSelector, groupSize: config.groupSize, optionalProperty: "itemVisibilityEnabled" });
    });
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
    const selectedPairs = {
        selectedText: "text",
        selectedTitle: "localTitle",
        selectedArtist: "localArtist",
        selectedLabel: "localLabel",
        selectedIcon: "icon",
        selectedContentMode: "contentMode",
        selectedSymbol: "symbol",
      },
      stateLabelPairs = {
        ...selectedPairs,
        selectedTextColor: "textColor",
        selectedFaceColor: "faceColor",
        selectedBorderColor: "borderColor",
        selectedGlowColor: "glowColor",
        selectedSurfaceColor: "surfaceColor",
        selectedShadowDarkColor: "shadowDarkColor",
        selectedShadowLightColor: "shadowLightColor",
        selectedAccentColor: "accentColor",
        selectedTitleColor: "titleColor",
        selectedArtistColor: "artistColor",
        selectedLabelColor: "labelColor",
        selectedCardColor: "cardColor",
        selectedBackgroundColor: "backgroundColor",
      },
      hasSelectedState = definition.signals.some(
        (signal) =>
          signal.type === "digital" &&
          signal.direction === "input" &&
          /selected$/i.test(signal.key),
      ) || definition.properties.some((property) => property.key === "selectedBase");
    if (hasSelectedState) {
      if (definition.properties.some((property) => property.key === "selectedColor"))
        stateLabelPairs.selectedColor =
          definition.properties.some((property) => property.key === "trackColor")
            ? "trackColor"
            : definition.properties.some((property) => property.key === "faceColor")
              ? "faceColor"
              : definition.properties.some((property) => property.key === "surfaceColor")
                ? "surfaceColor"
                : "textColor";
      if (definition.properties.some((property) => property.key === "selectedIconColor"))
        stateLabelPairs.selectedIconColor = "iconColor";
      if (definition.properties.some((property) => property.key === "activeLabelColor"))
        stateLabelPairs.activeLabelColor = "inactiveLabelColor";
      const pairedProperties = definition.properties.filter(
        (property) => selectedPairs[property.key],
      );
      const hasIndependentHoldStates = definition.id === "hold-button" || definition.id === "circular-hold-button" || definition.id === "countdown-auto-fire" || definition.id === "safety-armed-on-off";
      if (!hasIndependentHoldStates && !definition.properties.some((property) => property.key === "selectedSameAsStandard")) {
        const insertion = pairedProperties.length
          ? definition.properties.indexOf(pairedProperties[0])
          : Math.min(1, definition.properties.length);
        definition.properties.splice(insertion, 0, {
          key: "selectedSameAsStandard",
          name: "Selected state same as Standard state",
          type: "checkbox",
          defaultValue: true,
          affectsProperties: true,
        });
      }
      definition.properties.forEach((property) => {
        const standardKey = stateLabelPairs[property.key];
        if (standardKey) {
          property.name = `Selected state — ${String(property.name || property.key).replace(/^(?:Selected|Active)\s*/i, "").replace(/^state\s*[—:-]?\s*/i, "")}`;
          if (selectedPairs[property.key] && !hasIndependentHoldStates)
            property.disabledWhen = { key: "selectedSameAsStandard", value: true };
          else delete property.disabledWhen;
          const standard = definition.properties.find((entry) => entry.key === standardKey);
          if (standard)
            standard.name = `Standard state — ${String(standard.name || standard.key).replace(/^(?:Default|Standard|Inactive)\s*/i, "").replace(/^state\s*[—:-]?\s*/i, "")}`;
        }
        if (/^Active\s/i.test(property.name || ""))
          property.name = String(property.name).replace(/^Active\s*/i, "Selected state — ");
        else if (/^Inactive\s/i.test(property.name || ""))
          property.name = String(property.name).replace(/^Inactive\s*/i, "Standard state — ");
      });
      definition.selectedStatePairs = hasIndependentHoldStates ? {} : { ...selectedPairs };
    }
    const textCapable = definition.properties.some(
      (property) =>
        !property.signalSetting &&
        (property.type === "text" || property.type === "cip-text" || property.key === "textSize") &&
        /text|label|name|title|message|font/i.test(property.key),
    );
    if (textCapable && !definition.properties.some((property) => property.key === "fontAsset")) {
      definition.properties.push({
        key: "fontAsset",
        name: "Font family",
        type: "font",
        defaultValue: "",
      });
      definition.styles += `[data-component="${definition.id}"],[data-component="${definition.id}"] *:not(svg):not(path):not(use){font-family:var(--font-asset),"Segoe UI",sans-serif!important}`;
    }
    if (textCapable && !definition.properties.some((property) => property.key === "wrapText")) {
      definition.properties.push({
        key: "wrapText",
        name: "Wrap text to next line",
        type: "checkbox",
        defaultValue: false,
      });
      definition.styles += `[data-component="${definition.id}"].wrap-text button,[data-component="${definition.id}"].wrap-text button *,[data-component="${definition.id}"].wrap-text [data-local-text],[data-component="${definition.id}"].wrap-text .label,[data-component="${definition.id}"].wrap-text .name,[data-component="${definition.id}"].wrap-text .note,[data-component="${definition.id}"].wrap-text .big,[data-component="${definition.id}"].wrap-text .value,[data-component="${definition.id}"].wrap-text .position,[data-component="${definition.id}"].wrap-text .status,[data-component="${definition.id}"].wrap-text .btn-txt,[data-component="${definition.id}"].wrap-text .mic-text,[data-component="${definition.id}"].wrap-text .mic-label,[data-component="${definition.id}"].wrap-text .shade-name,[data-component="${definition.id}"].wrap-text .hold-label,[data-component="${definition.id}"].wrap-text .countdown-label,[data-component="${definition.id}"].wrap-text .safety-label{white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;text-overflow:clip!important}`;
    }
    const wrapTextProperty = definition.properties.find((property) => property.key === "wrapText");
    if (wrapTextProperty) {
      definition.properties.splice(definition.properties.indexOf(wrapTextProperty), 1);
      const textOptionIndexes = definition.properties
        .map((property, index) => ({ property, index }))
        .filter(({ property }) =>
          !property.signalSetting &&
          property.key !== "visibilityEnabled" &&
          /text|label|name|title|message|font/i.test(`${property.key} ${property.name || ""}`),
        )
        .map(({ index }) => index);
      const insertionIndex = textOptionIndexes.length
        ? Math.max(...textOptionIndexes) + 1
        : definition.properties.length;
      definition.properties.splice(insertionIndex, 0, wrapTextProperty);
    }
    const semanticScrollAxes = {
        "vertical-carousel": ["vertical"],
        "horizontal-carousel": ["horizontal"],
        "rolling-menu": ["vertical"],
        "swiping-cards": ["horizontal"],
      },
      styleText = String(definition.styles || ""), axes = new Set(semanticScrollAxes[definition.id] || []);
    if (/overflow-x\s*:\s*(?:auto|scroll)/i.test(styleText) || /overflow\s*:\s*(?:auto|scroll)/i.test(styleText)) axes.add("horizontal");
    if (/overflow-y\s*:\s*(?:auto|scroll)/i.test(styleText) || /overflow\s*:\s*(?:auto|scroll)/i.test(styleText)) axes.add("vertical");
    definition.scrollReturnAxes = [...axes];
    if (definition.scrollReturnAxes.length) {
      const scrollProperties = [
        { key: "scrollReturnEnabled", name: "Show jump-to-start button", type: "checkbox", defaultValue: true },
        { key: "scrollReturnThreshold", name: "Jump button appearance threshold", type: "number", defaultValue: 80 },
        { key: "scrollReturnSize", name: "Jump button size", type: "number", defaultValue: 44 },
        { key: "scrollReturnColor", name: "Jump button color", type: "color", defaultValue: "#04aa8e" },
        { key: "scrollReturnTextColor", name: "Jump arrow color", type: "color", defaultValue: "#071210" },
        { key: "scrollReturnGlowColor", name: "Jump button glow color", type: "color", defaultValue: "#04aa8e" },
      ];
      scrollProperties.forEach((property) => { if (!definition.properties.some((entry) => entry.key === property.key)) definition.properties.push(property); });
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
  function bindPrimaryPointer(element, handlers = {}) {
    let active = null,
      suppressPointerUntil = 0;
    const preventNative = (event) => event.preventDefault();
    const pointerDown = (event) => {
      if (
        active !== null ||
        performance.now() < suppressPointerUntil ||
        event.pointerType === "touch" ||
        event.isPrimary === false ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      active = { kind: "pointer", id: event.pointerId };
      try {
        element.setPointerCapture?.(event.pointerId);
      } catch (_) {}
      handlers.down?.(event);
    };
    const finishPointer = (event, cancelled) => {
      if (active?.kind !== "pointer" || event.pointerId !== active.id) return;
      event.preventDefault();
      const pointerId = active.id;
      active = null;
      if (cancelled) handlers.cancel?.(event);
      else handlers.up?.(event);
      try {
        if (element.hasPointerCapture?.(pointerId))
          element.releasePointerCapture(pointerId);
      } catch (_) {}
    };
    const pointerUp = (event) => finishPointer(event, false);
    const pointerCancel = (event) => finishPointer(event, true);
    const pointerLost = (event) => {
      if (active?.kind !== "pointer" || event.pointerId !== active.id) return;
      active = null;
      handlers.cancel?.(event);
    };
    const changedTouch = (event) =>
      [...event.changedTouches].find((touch) => touch.identifier === active?.id);
    const touchStart = (event) => {
      if (active !== null || !event.changedTouches.length) return;
      event.preventDefault();
      suppressPointerUntil = performance.now() + 800;
      active = { kind: "touch", id: event.changedTouches[0].identifier };
      handlers.down?.(event);
    };
    const finishTouch = (event, cancelled) => {
      if (active?.kind !== "touch" || !changedTouch(event)) return;
      event.preventDefault();
      suppressPointerUntil = performance.now() + 800;
      active = null;
      if (cancelled) handlers.cancel?.(event);
      else handlers.up?.(event);
    };
    const touchEnd = (event) => finishTouch(event, false);
    const touchCancel = (event) => finishTouch(event, true);
    element.style.touchAction = "none";
    element.style.webkitUserSelect = "none";
    element.style.userSelect = "none";
    element.addEventListener("touchstart", touchStart, { passive: false });
    element.addEventListener("touchend", touchEnd, { passive: false });
    element.addEventListener("touchcancel", touchCancel, { passive: false });
    element.addEventListener("pointerdown", pointerDown);
    element.addEventListener("pointerup", pointerUp);
    element.addEventListener("pointercancel", pointerCancel);
    element.addEventListener("lostpointercapture", pointerLost);
    element.addEventListener("contextmenu", preventNative);
    return () => {
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchend", touchEnd);
      element.removeEventListener("touchcancel", touchCancel);
      element.removeEventListener("pointerdown", pointerDown);
      element.removeEventListener("pointerup", pointerUp);
      element.removeEventListener("pointercancel", pointerCancel);
      element.removeEventListener("lostpointercapture", pointerLost);
      element.removeEventListener("contextmenu", preventNative);
    };
  }
  function mount(root, id, options = {}) {
    const definition = get(id);
    if (!definition) throw new Error("Unknown component: " + id);
    options.properties = { ...(options.properties || {}) };
    if (id === "countdown-auto-fire") {
      if (options.properties.text === "ARM") options.properties.text = "Shutdown";
      if (options.properties.completedText === "FIRED")
        options.properties.completedText = "Shutting Down...";
      if (String(options.properties.faceColor || "").toLowerCase() === "#203332")
        options.properties.faceColor = "#04aa8e";
    }
    const sameAsStandard =
      options.properties.selectedSameAsStandard == null ||
      options.properties.selectedSameAsStandard === true ||
      options.properties.selectedSameAsStandard === 1 ||
      options.properties.selectedSameAsStandard === "1" ||
      String(options.properties.selectedSameAsStandard).toLowerCase() === "true";
    if (sameAsStandard && definition.selectedStatePairs)
      Object.entries(definition.selectedStatePairs).forEach(([selectedKey, standardKey]) => {
        if (Object.prototype.hasOwnProperty.call(options.properties, standardKey))
          options.properties[selectedKey] = options.properties[standardKey];
      });
    if (options.properties?.bindingMode === "contract")
      options.properties = Object.fromEntries(
        Object.entries(options.properties).map(([key, value]) => [
          key,
          typeof value === "string" ? contractPattern(value) : value,
        ]),
      );
    root.dataset.component = id;
    const scrollAxes = definition.scrollReturnAxes || [];
    root.classList.toggle(
      "composer-scroll-horizontal",
      scrollAxes.includes("horizontal"),
    );
    root.classList.toggle(
      "composer-scroll-vertical",
      scrollAxes.includes("vertical"),
    );
    root.classList.toggle(
      "wrap-text",
      options.properties.wrapText === true ||
        options.properties.wrapText === 1 ||
        options.properties.wrapText === "1" ||
        String(options.properties.wrapText).toLowerCase() === "true",
    );
    Object.entries(options.properties || {}).forEach(([key, value]) => {
      const name = "--" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      root.style.setProperty(name, String(value));
      if (typeof value === "number") {
        root.style.setProperty(name + "-px", value + "px");
        root.style.setProperty(name + "-percent", value + "%");
      }
    });
    root.innerHTML =
      '<style data-composer-touch-reset>[data-component],[data-component] *{-webkit-tap-highlight-color:transparent!important;-webkit-touch-callout:none}[data-component] :focus{outline:none!important}</style>' +
      "<style>" +
      (options.stylesOverride || definition.styles) +
      "</style>" +
      (options.templateOverride || definition.template);
    const cleanups = [],
      lib = options.lib === undefined ? library() : options.lib,
      bindings = options.bindings || {},
      contractPrefix = options.contractPrefix || "";
    function binding(key) {
      return bindings[key] && bindings[key].value ? bindings[key].value : "";
    }
    const selectedSignalValues = new Map(),
      updateSelectedAssetState = (key, value) => {
        selectedSignalValues.set(key, value === true || value === 1 || value === "1");
        const holder = root.closest(".widget,.scoped-widget");
        if (holder)
          holder.dataset.assetSelected = [...selectedSignalValues.values()].some(Boolean)
              ? "true"
              : "false";
      },
      standardHold = definition.standardHoldCapability
        ? {
            active: false,
            completed: false,
            timer: 0,
            duration: Math.max(
              100,
              Math.min(
                10000,
                (Number(options.properties.heldDuration) || 3) * 1000,
              ),
            ),
          }
        : null,
      publishRaw = (key, value) => {
        const spec = definition.signals.find((signal) => signal.key === key),
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
      signals = {
      publish(key, value) {
        if (standardHold && key === definition.standardHoldCapability.pressKey) {
          const pressed =
            value === true ||
            value === 1 ||
            value === "1" ||
            String(value).toLowerCase() === "true";
          if (pressed) {
            if (standardHold.active) return;
            standardHold.active = true;
            standardHold.completed = false;
            clearTimeout(standardHold.timer);
            standardHold.timer = setTimeout(() => {
              if (!standardHold.active) return;
              standardHold.completed = true;
              publishRaw(definition.standardHoldCapability.heldKey, true);
            }, standardHold.duration);
          } else {
            if (!standardHold.active) return;
            standardHold.active = false;
            clearTimeout(standardHold.timer);
            standardHold.timer = 0;
            if (standardHold.completed)
              publishRaw(definition.standardHoldCapability.heldKey, false);
            else {
              publishRaw(definition.standardHoldCapability.pressKey, true);
              publishRaw(definition.standardHoldCapability.pressKey, false);
            }
            standardHold.completed = false;
          }
          return;
        }
        publishRaw(key, value);
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
            spec?.type === "digital" && spec?.direction === "input" && /selected$/i.test(key)
              ? (value) => {
                  updateSelectedAssetState(key, value);
                  callback(value);
                }
              : callback;
        if (!spec || !signal) return;
        if (lib) {
          cleanups.push(
            subscribeFeedback(lib, spec.type, signal, handler),
          );
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
          cleanups.push(
            subscribeFeedback(lib, type, String(signal), callback),
          );
        } else
          cleanups.push(
            simulator.subscribe(typeCode(type), String(signal), callback),
          );
      },
      subscribeExact(type, signal, callback) {
        if (!signal) return;
        if (lib) {
          cleanups.push(
            subscribeFeedback(lib, type, String(signal), callback),
          );
        } else cleanups.push(simulator.subscribe(typeCode(type), String(signal), callback));
      },
    };
    if (standardHold)
      cleanups.push(() => {
        clearTimeout(standardHold.timer);
        if (standardHold.completed)
          publishRaw(definition.standardHoldCapability.heldKey, false);
        standardHold.active = false;
        standardHold.completed = false;
      });
    if (options.properties?.visibilityEnabled) {
      root.style.visibility = "visible";
      signals.subscribe("visibility", (value) => {
        root.style.visibility =
          value === true || value === 1 || value === "1" ? "visible" : "hidden";
      });
    }
    if (options.properties?.disabledEnabled) {
      root.classList.remove("composer-disabled");
      root.removeAttribute("aria-disabled");
      signals.subscribe("disabled", (value) => {
        const disabled =
          value === true || value === 1 || value === "1";
        root.classList.toggle("composer-disabled", disabled);
        root.setAttribute("aria-disabled", String(disabled));
        root.style.pointerEvents = disabled ? "none" : "";
        root.style.opacity = disabled ? ".55" : "";
      });
    }
    options.definitionData = definition.data || {};
    let dispose;
    try {
      dispose = definition.mount(root, {
        signals,
        interactions: { bindPrimaryPointer },
        resolveComponent: get,
        navigate: options.navigate || function () {},
        options,
      });
      if (options.properties?.itemVisibilityEnabled) {
        (definition.rangeBindings || []).filter((range) => range.visibilitySelector).forEach((range) => {
          const base = String(options.properties[range.baseKey] || "").trim(),
            increment = Math.max(1, Math.round(Number(options.properties[range.incrementKey]) || 1)),
            configuredCount = Number(options.properties[range.countKey]),
            initialCount = root.querySelectorAll(range.visibilitySelector).length,
            count = Math.max(1, Math.min(100, Math.round(configuredCount || initialCount || 1))),
            states = new Map(),
            apply = () => root.querySelectorAll(range.visibilitySelector).forEach((item, domIndex) => {
              const activeGroup = range.activeGroupSelector ? root.querySelector(range.activeGroupSelector) : null,
                groupIndex = activeGroup && range.groupSelector ? [...root.querySelectorAll(range.groupSelector)].indexOf(activeGroup) : 0,
                index = Number(item.dataset.visibilityIndex ?? (domIndex + Math.max(0, groupIndex) * (Number(range.groupSize) || 0)));
              if (states.has(index)) item.style.visibility = states.get(index) ? "visible" : "hidden";
            }),
            observer = new MutationObserver(apply);
          observer.observe(root, { childList: true, subtree: true });
          cleanups.push(() => observer.disconnect());
          for (let index = 0; index < count; index += 1) {
            const address = options.properties.bindingMode === "join" || /^\d+$/.test(base)
              ? String(Math.max(1, Math.round(Number(base) || 1)) + index * increment)
              : base.replaceAll("{index}", String(index)).replaceAll("{n}", String(index + 1));
            signals.subscribeAddress("digital", address, (value) => {
              states.set(index, value === true || value === 1 || value === "1");
              apply();
            });
          }
        });
      }
      cleanups.push(wireScrollReturn(root, root.closest(".widget,.scoped-widget") || root, definition, options.properties || {}));
      const disposeCip = wireCipText(root, signals);
      cleanups.push(disposeCip);
      const visibility = definition.optionalContent,
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
      if (index >= labels.length) return;
      const text = String(labels[index] ?? "").trim();
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
    feedbackState,
    subscribeFeedback,
    bindPrimaryPointer,
    wireUniformScrollbars,
    wireScrollReturn,
    resolveAddress: contractAddress,
    typeCode,
  };
})(window);
