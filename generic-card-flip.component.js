(function (runtime) {
  "use strict";
  const display = runtime.get("display-flip");
  runtime.register({
    ...display,
    id: "card-flip",
    name: "Card Flip",
    signals: display.signals.map((signal) => signal.key === "visibility"
      ? { ...signal, defaultValue: "CardFlip.Visibility" }
      : { ...signal }),
    properties: display.properties
      .filter((property) => !["iconX", "iconY", "iconSize", "screenColor", "selectedColor"].includes(property.key))
      .map((property) => {
        const defaults = {
          cardCountSignal: "CardFlip.Count",
          pressBase: "CardFlip.Items[{index}].Press",
          feedbackBase: "CardFlip.Items[{index}].Selected",
          labelBase: "CardFlip.Items[{index}].Name",
          textY: 50,
        };
        return property.key in defaults
          ? { ...property, defaultValue: defaults[property.key] }
          : { ...property };
      }),
    styles: display.styles
      .replaceAll('[data-component="display-flip"]', '[data-component="card-flip"]'),
    mount(root, context) {
      const host = root.querySelector(".cards"), p = context.options.properties || {}, mode = p.bindingMode || "join", max = Math.max(1, Math.min(100, Number(p.maxCards) || 20)), fallback = Math.max(1, Math.min(max, Number(p.defaultCount) || 2)), labels = Array.from({ length: max }, (_, i) => "Card " + (i + 1)), selected = Array(max).fill(false);
      let count = fallback;
      root.style.setProperty("--card-text-x", Math.max(0, Math.min(100, Number(p.textX ?? 50))) + "%");
      root.style.setProperty("--card-text-y", Math.max(0, Math.min(100, Number(p.textY ?? 50))) + "%");
      function address(base, index) { return mode === "join" ? String((Number(base) || 0) + index) : String(base || "").replace(/\{n\}/g, String(index + 1)).replace(/\{index\}/g, String(index)); }
      function render() { host.innerHTML = ""; for (let i = 0; i < count; i++) { const wrap = document.createElement("div"); wrap.className = "card-wrap" + (selected[i] ? " flipped" : ""); wrap.innerHTML = '<div class="card"><div class="face front"><span class="text"></span></div><div class="face back"><span class="text"></span></div></div>'; wrap.querySelectorAll(".text").forEach((el) => el.textContent = labels[i]); wrap.addEventListener("click", () => { const signal = address(p.pressBase, i); context.signals.publishAddress("digital", signal, true); setTimeout(() => context.signals.publishAddress("digital", signal, false), 100); if (context.options.targetPage) context.navigate(context.options.targetPage); }); host.appendChild(wrap); } }
      context.signals.subscribeAddress("analog", p.cardCountSignal, (value) => { const next = Math.round(Number(value)); count = Number.isFinite(next) && next > 0 ? Math.max(1, Math.min(max, next)) : fallback; render(); });
      for (let i = 0; i < max; i++) { context.signals.subscribeAddress("digital", address(p.feedbackBase, i), (value) => { selected[i] = value === true || value === 1 || value === "1"; const card = host.querySelectorAll(".card-wrap")[i]; if (card) card.classList.toggle("flipped", selected[i]); }); context.signals.subscribeAddress("serial", address(p.labelBase, i), (value) => { if (value) { labels[i] = value; const card = host.querySelectorAll(".card-wrap")[i]; if (card) card.querySelectorAll(".text").forEach((el) => el.textContent = value); } }); }
      render();
    },
  });
})(window.ComposerRuntime);
