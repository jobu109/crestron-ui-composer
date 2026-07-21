(function (runtime) {
  "use strict";
  runtime.register({
    id: "display-flip",
    name: "Display Flip",
    category: "Buttons",
    defaultSize: { width: 620, height: 360 },
    signals: [],
    signalGroups: [
      { name: "Card count", type: "analog", direction: "input" },
      { name: "Card press range", type: "digital", direction: "output" },
      { name: "Card feedback range", type: "digital", direction: "input" },
      { name: "Card label range", type: "serial", direction: "input" },
    ],
    properties: [
      { key: "bindingMode", name: "Range binding mode", type: "select", options: [{ value: "join", label: "Join numbers" }, { value: "contract", label: "Contract patterns" }], defaultValue: "join" },
      { key: "cardCountSignal", name: "Card count signal", type: "text", defaultValue: "140" },
      { key: "pressBase", name: "Press base / pattern", type: "text", defaultValue: "141" },
      { key: "feedbackBase", name: "Feedback base / pattern", type: "text", defaultValue: "151" },
      { key: "labelBase", name: "Label base / pattern", type: "text", defaultValue: "161" },
      { key: "defaultCount", name: "Default card count", type: "number", defaultValue: 2 },
      { key: "maxCards", name: "Maximum cards", type: "number", defaultValue: 20 },
      { key: "textX", name: "Text horizontal position %", type: "number", defaultValue: 50 },
      { key: "textY", name: "Text vertical position %", type: "number", defaultValue: 76 },
      { key: "iconX", name: "Display icon horizontal position %", type: "number", defaultValue: 50 },
      { key: "iconY", name: "Display icon vertical position %", type: "number", defaultValue: 38 },
    ],
    template: '<div class="cards"></div>',
    styles: '[data-component="display-flip"]{display:block;width:100%;height:100%;padding:12px;overflow:auto;box-sizing:border-box}[data-component="display-flip"] .cards{display:flex;align-items:stretch;gap:16px;width:100%;height:100%}[data-component="display-flip"] .card-wrap{min-width:180px;flex:1 0 180px;max-width:280px;height:100%;min-height:150px;perspective:1000px;cursor:pointer}[data-component="display-flip"] .card{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .6s ease}[data-component="display-flip"] .card-wrap.flipped .card{transform:rotateY(180deg)}[data-component="display-flip"] .face{position:absolute;inset:0;overflow:hidden;border-radius:12px;backface-visibility:hidden;box-shadow:0 8px 16px rgba(0,0,0,.3),0 0 18px rgba(4,170,142,.3);color:#fff;font:700 clamp(14px,4vmin,24px) Segoe UI;text-align:center}[data-component="display-flip"] .front{background:#333}[data-component="display-flip"] .back{background:linear-gradient(145deg,#126c5d,#424);transform:rotateY(180deg)}[data-component="display-flip"] .screen,[data-component="display-flip"] .text{position:absolute;left:var(--card-icon-x,50%);top:var(--card-icon-y,38%);transform:translate(-50%,-50%)}[data-component="display-flip"] .text{left:var(--card-text-x,50%);top:var(--card-text-y,76%);width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}[data-component="display-flip"] .screen{display:block;width:70%;aspect-ratio:16/9;border:4px solid #aaa;border-radius:5px;background:#090909;box-shadow:0 0 10px #04aa8e}[data-component="display-flip"] .back .screen{background:#04aa8e;box-shadow:0 0 30px #04aa8e}',
    mount(root, context) {
      const host = root.querySelector(".cards"), p = context.options.properties || {}, mode = p.bindingMode || "join", max = Math.max(1, Math.min(100, Number(p.maxCards) || 20)), fallback = Math.max(1, Math.min(max, Number(p.defaultCount) || 2)), labels = Array.from({ length: max }, (_, i) => "Display " + (i + 1)), selected = Array(max).fill(false);
      let count = fallback;
      root.style.setProperty("--card-text-x", Math.max(0, Math.min(100, Number(p.textX ?? 50))) + "%");
      root.style.setProperty("--card-text-y", Math.max(0, Math.min(100, Number(p.textY ?? 76))) + "%");
      root.style.setProperty("--card-icon-x", Math.max(0, Math.min(100, Number(p.iconX ?? 50))) + "%");
      root.style.setProperty("--card-icon-y", Math.max(0, Math.min(100, Number(p.iconY ?? 38))) + "%");
      function address(base, index) { return mode === "join" ? String((Number(base) || 0) + index) : String(base || "").replace(/\{n\}/g, String(index + 1)).replace(/\{index\}/g, String(index)); }
      function render() { host.innerHTML = ""; for (let i = 0; i < count; i++) { const wrap = document.createElement("div"); wrap.className = "card-wrap" + (selected[i] ? " flipped" : ""); wrap.innerHTML = '<div class="card"><div class="face front"><span class="screen"></span><span class="text"></span></div><div class="face back"><span class="screen"></span><span class="text"></span></div></div>'; wrap.querySelectorAll(".text").forEach((el) => el.textContent = labels[i]); wrap.addEventListener("click", () => { const signal = address(p.pressBase, i); context.signals.publishAddress("digital", signal, true); setTimeout(() => context.signals.publishAddress("digital", signal, false), 100); if (context.options.targetPage) context.navigate(context.options.targetPage); }); host.appendChild(wrap); } }
      context.signals.subscribeAddress("analog", p.cardCountSignal, (value) => { const next = Math.round(Number(value)); count = Number.isFinite(next) && next > 0 ? Math.max(1, Math.min(max, next)) : fallback; render(); });
      for (let i = 0; i < max; i++) { context.signals.subscribeAddress("digital", address(p.feedbackBase, i), (value) => { selected[i] = value === true || value === 1 || value === "1"; const card = host.querySelectorAll(".card-wrap")[i]; if (card) card.classList.toggle("flipped", selected[i]); }); context.signals.subscribeAddress("serial", address(p.labelBase, i), (value) => { if (value) { labels[i] = value; const card = host.querySelectorAll(".card-wrap")[i]; if (card) card.querySelectorAll(".text").forEach((el) => el.textContent = value); } }); }
      render();
    },
  });
})(window.ComposerRuntime);
