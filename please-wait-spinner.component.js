(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "please-wait-spinner", name: "Please Wait Spinner", category: "Status & Information", defaultSize: { width: 220, height: 180 },
    signals: [
      { key: "text", name: "Message", type: "serial", direction: "input", defaultValue: "PleaseWait.Message" },
      { key: "visibility", name: "Visibility", type: "digital", direction: "input", defaultValue: "PleaseWait.Visibility" },
      { key: "running", name: "Animation running feedback", type: "digital", direction: "input", defaultValue: "PleaseWait.Running" }
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "localText", name: "Local wait text", type: "text", defaultValue: "Please Wait......." },
      { key: "frontColor", name: "Front text color", type: "color", defaultValue: "#ffffff" },
      { key: "middleColor", name: "Middle text color", type: "color", defaultValue: "#999999" },
      { key: "backColor", name: "Back text color", type: "color", defaultValue: "#000000" },
      { key: "shadowColor", name: "Text shadow color", type: "color", defaultValue: "#000000" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "textSize", name: "Text size (px)", type: "number", defaultValue: 34 },
      { key: "spinnerSize", name: "Spinner size (%)", type: "number", defaultValue: 86 },
      { key: "rotationSpeed", name: "Rotation duration (seconds)", type: "number", defaultValue: 10 },
      { key: "layerDelay", name: "Layer delay (seconds)", type: "number", defaultValue: 0.1 },
      { key: "depth", name: "Layer depth (%)", type: "number", defaultValue: 2.5 },
      { key: "radius", name: "Letter radius (%)", type: "number", defaultValue: 37.5 }
    ],
    template: '<div class="pws-root"><div class="pws-center"></div></div>',
    styles: '[data-component="please-wait-spinner"],[data-component="please-wait-spinner"] *{box-sizing:border-box}[data-component="please-wait-spinner"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.pws-root{width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:opacity .2s}.pws-root.hidden{opacity:0;pointer-events:none}.pws-center{position:relative;width:calc(var(--spinner-size)*1%);height:calc(var(--spinner-size)*1%);width:min(calc(var(--spinner-size)*1%),86vh);height:min(calc(var(--spinner-size)*1%),86vh);aspect-ratio:1;display:flex;align-items:center;justify-content:center}.pws-circle{position:absolute;width:100%;height:100%;border-radius:50%;transform-style:preserve-3d;animation:pws-rotate calc(var(--rotation-speed)*1s) ease-in-out infinite var(--delay);filter:drop-shadow(0 0 3px var(--glow-color))}.pws-letter{position:absolute;left:50%;top:50%;display:block;color:var(--layer-color);font-size:calc(var(--text-size-px)*var(--layer-scale));font-weight:900;line-height:1;text-shadow:1px 1px var(--shadow-color);transform-origin:0 0}.pws-circle:first-child .pws-letter{text-shadow:1px 1px var(--shadow-color),2px 2px var(--shadow-color),2px 4px var(--shadow-color)}@keyframes pws-rotate{0%,100%{transform:rotate(0)}50%{transform:rotate(180deg)}}',
    mount(root, context) {
      const p = context.options.properties || {}, host = root.querySelector(".pws-root"), center = root.querySelector(".pws-center"), circles = [];
      root.style.setProperty("--shadow-color", p.shadowColor || "#000000");
      function mixColor(first, second, amount) { const expand = value => { const text = String(value || "").replace("#", ""); return text.length === 3 ? text.split("").map(part => part + part).join("") : text; }, a = expand(first), b = expand(second), ratio = Math.max(0, Math.min(1, Number(amount) || 0)); if (!/^[0-9a-f]{6}$/i.test(a) || !/^[0-9a-f]{6}$/i.test(b)) return ratio < .5 ? first : second; return `#${[0, 2, 4].map(index => Math.round(parseInt(a.slice(index, index + 2), 16) * (1 - ratio) + parseInt(b.slice(index, index + 2), 16) * ratio).toString(16).padStart(2, "0")).join("")}`; }
      for (let layer = 0; layer < 6; layer++) { const circle = document.createElement("div"); circle.className = "pws-circle"; circle.style.setProperty("--delay", `${layer * (Number(p.layerDelay) || .1)}s`); circle.style.setProperty("--layer-scale", String(1 - layer * .06)); const mix = layer / 5, front = p.frontColor || "#ffffff", middle = p.middleColor || "#999999", back = p.backColor || "#000000"; circle.style.setProperty("--layer-color", layer < 3 ? mixColor(front, middle, mix * 2) : mixColor(middle, back, mix * 2 - 1)); center.appendChild(circle); circles.push(circle); }
      let currentText = p.localText || "Please Wait.......";
      function render(value) { currentText = String(value || p.localText || "Please Wait......."); const width = center.clientWidth || 180, step = 360 / Math.max(1, currentText.length), radiusBase = width * ((Number(p.radius) || 37.5) / 100), depth = width * ((Number(p.depth) || 2.5) / 100); circles.forEach((circle, layer) => { circle.innerHTML = ""; for (let i = 0; i < currentText.length; i++) { const letter = document.createElement("span"); letter.className = "pws-letter"; letter.textContent = currentText[i]; letter.style.transform = `rotate(${i * step - 175}deg) translateY(${-Math.max(0, radiusBase - layer * depth)}px)`; circle.appendChild(letter); } circle.style.zIndex = String(1000 - layer); }); }
      context.signals.subscribe("text", value => render(value)); context.signals.subscribe("running", value => { const running = value === true || value === 1 || value === "1"; circles.forEach(circle => circle.style.animationPlayState = running ? "running" : "paused"); }); const resize = () => render(currentText), observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null; if (observer) observer.observe(center); else window.addEventListener("resize", resize); render(currentText); return () => { if (observer) observer.disconnect(); else window.removeEventListener("resize", resize); };
    }
  });
})(window);
