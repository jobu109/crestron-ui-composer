(function (global) {
  "use strict";
  global.ComposerRuntime.register({
    id: "analog-clock",
    name: "Analog Clock",
    category: "Status & Information",
    defaultSize: { width: 280, height: 280 },
    signals: [
      { key: "time", name: "Time", type: "serial", direction: "input", defaultValue: "AnalogClock.Time" },
      { key: "city", name: "City label", type: "serial", direction: "input", defaultValue: "AnalogClock.City" }
    ],
    properties: [
      { key: "bindingMode", name: "Crestron binding mode", type: "select", options: [{ value: "contract", label: "Contract names" }, { value: "join", label: "Join numbers" }], defaultValue: "contract", affectsBindings: true },
      { key: "localCity", name: "Local city text", type: "text", defaultValue: "Default City" },
      { key: "previewMode", name: "Editor preview time", type: "select", options: [{ value: "live", label: "Live PC time" }, { value: "fixed", label: "Fixed time" }], defaultValue: "live" },
      { key: "fixedTime", name: "Fixed time (HH:MM:SS)", type: "text", defaultValue: "10:10:30" },
      { key: "faceColor", name: "Clock face color", type: "color", defaultValue: "#000000" },
      { key: "accentColor", name: "Face accent color", type: "color", defaultValue: "#04aa8e" },
      { key: "handColor", name: "Hour/minute hand color", type: "color", defaultValue: "#ffffff" },
      { key: "secondColor", name: "Second hand color", type: "color", defaultValue: "#ffa500" },
      { key: "textColor", name: "Number/city text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "cityTextSize", name: "City text size (px)", type: "number", defaultValue: 24 },
      { key: "numberTextSize", name: "Number text size (px)", type: "number", defaultValue: 16 },
      { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 40 }
    ],
    template: '<div class="ak-root"><div class="ak-city"></div><div class="ak-face"><div class="ak-glow"></div><div class="ak-points"></div><div class="ak-hand ak-minute"></div><div class="ak-hand ak-second"></div><div class="ak-hand ak-hour"></div><div class="ak-pivot"></div></div></div>',
    styles: '[data-component="analog-clock"],[data-component="analog-clock"] *{box-sizing:border-box}[data-component="analog-clock"]{display:block;width:100%;height:100%;font-family:"Segoe UI",sans-serif}.ak-root{--face-size:min(78%,70vh);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(4px,3%,20px);overflow:hidden}.ak-city{max-width:96%;color:var(--text-color);font-size:var(--city-text-size-px);font-weight:600;line-height:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ak-face{width:var(--face-size);height:var(--face-size);aspect-ratio:1;flex:none;position:relative;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent-color) 25%,transparent),color-mix(in srgb,var(--face-color) 60%,transparent) 50%,color-mix(in srgb,var(--face-color) 90%,transparent));box-shadow:0 0 calc(var(--glow-strength)*1px) color-mix(in srgb,var(--glow-color) 40%,transparent)}.ak-glow{position:absolute;width:90%;height:90%;left:5%;top:5%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent-color) 30%,transparent),transparent 70%);box-shadow:0 0 calc(var(--glow-strength)*.7px) color-mix(in srgb,var(--glow-color) 60%,transparent)}.ak-point{width:1px;height:4%;background:color-mix(in srgb,var(--text-color) 70%,transparent);position:absolute;top:48%;left:calc(50% - .5px);transform-origin:center}.ak-point.big{height:5%;top:47.5%;background:var(--text-color)}.ak-point .text{position:absolute;top:100%;left:-3.5em;width:7em;color:var(--text-color);font-size:var(--number-text-size-px);font-weight:600;text-align:center}.ak-hand{width:2px;position:absolute;left:calc(50% - 1px)}.ak-second{height:61%;top:41.3%;transform-origin:1px 8.7%;background:var(--second-color)}.ak-minute,.ak-hour{top:50%;transform-origin:1px 0;background:var(--hand-color)}.ak-hour{height:37%}.ak-minute{height:44%}.ak-minute::before,.ak-hour::before{content:"";position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:clamp(4px,4%,12px);min-width:4px;height:calc(100% - 22px);background:var(--hand-color);border-radius:10px}.ak-pivot{position:absolute;width:clamp(8px,6%,16px);height:clamp(8px,6%,16px);background:var(--face-color);border:3px solid var(--hand-color);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%)}.ak-pivot::before{content:"";position:absolute;width:5px;height:5px;border:3px solid var(--second-color);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%)}',
    mount(root, context) {
      const p = context.options.properties || {}, city = root.querySelector(".ak-city"), face = root.querySelector(".ak-face"), seconds = root.querySelector(".ak-second"), minutes = root.querySelector(".ak-minute"), hours = root.querySelector(".ak-hour"), points = root.querySelector(".ak-points"), pointElements = [];
      city.textContent = p.localCity || "Default City";
      let label = 12;
      for (let angle = 0; angle < 360; angle += 6) { const point = document.createElement("span"); point.className = "ak-point"; point.dataset.angle = String(angle); if ((angle / 6) % 5 === 0) { point.classList.add("big"); const text = document.createElement("span"); text.className = "text"; text.textContent = label; text.style.transform = `rotate(${-angle}deg) translateY(2px)`; point.appendChild(text); label = label === 12 ? 1 : label + 1; } points.appendChild(point); pointElements.push(point); }
      function layoutPoints() { const radius = face.clientWidth * .46; pointElements.forEach(point => { point.style.transform = `rotate(${point.dataset.angle}deg) translateY(${-radius}px)`; }); }
      function setTime(value) { if (!value) return false; const raw = String(value).trim(); let h, m, s; if (raw.includes(":")) { const parts = raw.split(":"); if (parts.length < 2) return false; h = Number(parts[0]); m = Number(parts[1]); s = Number(parts[2] || 0); } else if (/^\d{14,}$/.test(raw)) { h = Number(raw.substring(8, 10)); m = Number(raw.substring(10, 12)); s = Number(raw.substring(12, 14)); } else return false; if (![h, m, s].every(Number.isFinite)) return false; const hourDeg = ((h % 12) + m / 60) * 30, minuteDeg = m * 6, secondDeg = s * 6; seconds.style.transition = s === 0 ? "none" : "transform .25s"; minutes.style.transition = m === 0 ? "none" : "transform .25s"; hours.style.transition = h === 0 ? "none" : "transform .25s"; seconds.style.transform = `rotate(${secondDeg - 180}deg)`; minutes.style.transform = `rotate(${minuteDeg - 180}deg)`; hours.style.transform = `rotate(${hourDeg - 180}deg)`; return true; }
      let externalTime = false;
      context.signals.subscribe("time", value => { externalTime = setTime(value) || externalTime; });
      context.signals.subscribe("city", value => { city.textContent = value || p.localCity || "City"; });
      function tick() { if (externalTime) return; if (p.previewMode === "fixed") { setTime(p.fixedTime || "10:10:30"); return; } const now = new Date(); setTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`); }
      const observer = new ResizeObserver(layoutPoints); observer.observe(face); layoutPoints(); tick(); const timer = setInterval(tick, 1000); return () => { clearInterval(timer); observer.disconnect(); };
    }
  });
})(window);
