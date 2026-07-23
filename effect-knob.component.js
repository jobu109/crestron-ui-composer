(function (runtime) {
  "use strict";
  runtime.register({
    id: "effect-knob",
    name: "Effect Knob",
    category: "Sliders & Levels",
    defaultSize: { width: 260, height: 270 },
    properties: [
      { key: "localName", name: "Local name", type: "text", defaultValue: "Effect" },
      { key: "defaultPercent", name: "Default percentage", type: "number", min: 0, max: 100, step: 1, defaultValue: 50 },
      { key: "outputScale", name: "Outgoing analog scale", type: "select", options: [{ value: "65535", label: "0–65535" }, { value: "100", label: "0–100" }], defaultValue: "65535" },
      { key: "lowColor", name: "Gauge low color", type: "color", defaultValue: "#4caf50" },
      { key: "middleColor", name: "Gauge middle color", type: "color", defaultValue: "#ffeb3b" },
      { key: "highColor", name: "Gauge high color", type: "color", defaultValue: "#f44336" },
      { key: "inactiveColor", name: "Inactive gauge color", type: "color", defaultValue: "#263442" },
      { key: "markerColor", name: "Position marker color", type: "color", defaultValue: "#00e9e0" },
      { key: "metalLightColor", name: "Metal highlight color", type: "color", defaultValue: "#ffffff" },
      { key: "metalDarkColor", name: "Metal shadow color", type: "color", defaultValue: "#696d72" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowStrength", name: "Gauge glow strength", type: "number", min: 0, max: 30, step: 1, defaultValue: 9 },
      { key: "labelSize", name: "Label size", type: "number", min: 8, max: 36, step: 1, defaultValue: 15 },
      { key: "valueSize", name: "Percentage size", type: "number", min: 8, max: 36, step: 1, defaultValue: 15 },
      { key: "showLabel", name: "Show label", type: "checkbox", defaultValue: true },
      { key: "showPercentage", name: "Show percentage", type: "checkbox", defaultValue: false },
    ],
    signals: [
      { key: "set", name: "Value Set", type: "analog", direction: "output", defaultValue: "EffectKnob.ValueSet" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "EffectKnob.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "EffectKnob.Name" },
    ],
    template: '<div class="effect-knob-control"><canvas width="360" height="360" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></canvas><div class="effect-knob-caption"><span class="effect-knob-name">Effect</span><output class="effect-knob-value">50%</output></div></div>',
    styles:
      '[data-component="effect-knob"]{display:block;width:100%;height:100%;padding:7px;box-sizing:border-box;font-family:"Segoe UI",sans-serif;touch-action:none}' +
      '[data-component="effect-knob"] *{box-sizing:border-box}' +
      '[data-component="effect-knob"] .effect-knob-control{display:grid;grid-template-rows:minmax(0,1fr) auto;width:100%;height:100%;place-items:center;gap:2px}' +
      '[data-component="effect-knob"] canvas{display:block;width:auto;height:100%;max-width:100%;max-height:100%;aspect-ratio:1;cursor:grab;outline:none;touch-action:none}' +
      '[data-component="effect-knob"] canvas:active{cursor:grabbing}' +
      '[data-component="effect-knob"] .effect-knob-caption{display:flex;align-items:baseline;justify-content:center;max-width:100%;gap:9px;color:var(--text-color);font-weight:700;line-height:1.1;text-align:center;text-shadow:0 2px 4px #000}' +
      '[data-component="effect-knob"] .effect-knob-name{max-width:100%;overflow:hidden;font-size:var(--label-size-px);text-overflow:ellipsis;white-space:nowrap}' +
      '[data-component="effect-knob"] .effect-knob-value{color:var(--text-color);font-size:var(--value-size-px);font-weight:800}',
    mount(root, context) {
      const canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d"), name = root.querySelector(".effect-knob-name"), valueText = root.querySelector(".effect-knob-value"), p = context.options.properties || {};
      const W = 360, X = 180, Y = 180, knobRadius = 105, innerRadius = 126, outerRadius = 153, startAngle = Math.PI * .75, rangeAngle = Math.PI * 1.5;
      let value = clamp(Number(p.defaultPercent) || 0, 0, 100) / 100, dragging = false, lastAngle = 0;
      name.textContent = String(p.localName || "Effect");
      name.style.display = truthy(p.showLabel, true) ? "" : "none";
      valueText.style.display = truthy(p.showPercentage, false) ? "" : "none";
      function truthy(input, fallback) { return input == null ? fallback : input === true || input === 1 || input === "1" || String(input).toLowerCase() === "true"; }
      function clamp(input, minimum, maximum) { return Math.max(minimum, Math.min(maximum, input)); }
      function parseColor(color) { const hex = String(color || "#000000").replace("#", ""); return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) || 0); }
      function mix(first, second, amount) { const a = parseColor(first), b = parseColor(second), t = clamp(amount, 0, 1); return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * t)).join(",")})`; }
      function gaugeColor(amount) { return amount <= .65 ? mix(p.lowColor || "#4caf50", p.middleColor || "#ffeb3b", amount / .65) : mix(p.middleColor || "#ffeb3b", p.highColor || "#f44336", (amount - .65) / .35); }
      function point(radius, angle) { return [X + radius * Math.cos(angle), Y + radius * Math.sin(angle)]; }
      function drawGauge() {
        ctx.beginPath(); ctx.arc(X, Y, outerRadius, startAngle, startAngle + rangeAngle); ctx.arc(X, Y, innerRadius, startAngle + rangeAngle, startAngle, true); ctx.closePath();
        ctx.fillStyle = p.inactiveColor || "#263442"; ctx.fill();
        const slices = 240, activeSlices = Math.ceil(value * slices);
        for (let index = 0; index < activeSlices; index++) {
          const t0 = index / slices, t1 = Math.min(value, (index + 1.15) / slices), a0 = startAngle + t0 * rangeAngle, a1 = startAngle + t1 * rangeAngle;
          ctx.beginPath(); ctx.arc(X, Y, outerRadius, a0, a1); ctx.arc(X, Y, innerRadius, a1, a0, true); ctx.closePath();
          ctx.fillStyle = gaugeColor((t0 + t1) / 2); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = Number(p.glowStrength || 9); ctx.fill();
        }
        ctx.shadowBlur = 0;
        for (let index = 0; index <= 30; index++) {
          const t = index / 30, angle = startAngle + t * rangeAngle, major = index % 5 === 0, from = point(innerRadius + 3, angle), to = point(innerRadius + (major ? 15 : 10), angle);
          ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.strokeStyle = t <= value ? "rgba(255,255,255,.72)" : "rgba(130,145,160,.45)"; ctx.lineWidth = major ? 2 : 1; ctx.stroke();
        }
      }
      function drawMetal() {
        ctx.beginPath(); ctx.arc(X, Y, knobRadius + 8, 0, Math.PI * 2); ctx.fillStyle = "#11151a"; ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 9; ctx.fill(); ctx.shadowBlur = 0;
        ctx.save(); ctx.beginPath(); ctx.arc(X, Y, knobRadius, 0, Math.PI * 2); ctx.clip();
        for (let index = 0; index < 72; index++) {
          const angle = index / 72 * Math.PI * 2, highlight = (.5 + .5 * Math.sin(angle * 6 + .6)), edge = point(knobRadius + 2, angle);
          const gradient = ctx.createLinearGradient(X, Y, edge[0], edge[1]); gradient.addColorStop(0, mix(p.metalLightColor || "#ffffff", p.metalDarkColor || "#696d72", .42)); gradient.addColorStop(1, mix(p.metalDarkColor || "#696d72", p.metalLightColor || "#ffffff", highlight * .72));
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, knobRadius + 2, angle, angle + Math.PI * 2 / 72 + .012); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
        }
        const sheen = ctx.createRadialGradient(X - 30, Y - 38, 5, X, Y, knobRadius); sheen.addColorStop(0, "rgba(255,255,255,.5)"); sheen.addColorStop(.45, "rgba(255,255,255,.07)"); sheen.addColorStop(1, "rgba(0,0,0,.42)"); ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, W); ctx.restore();
        ctx.beginPath(); ctx.arc(X, Y, knobRadius, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(X, Y, knobRadius + 5, 0, Math.PI * 2); ctx.strokeStyle = "rgba(0,0,0,.8)"; ctx.lineWidth = 5; ctx.stroke();
        const angle = startAngle + value * rangeAngle, tip = point(knobRadius - 8, angle), left = point(knobRadius - 28, angle - .11), right = point(knobRadius - 28, angle + .11);
        ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(left[0], left[1]); ctx.lineTo(right[0], right[1]); ctx.closePath(); ctx.fillStyle = p.markerColor || "#00e9e0"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      }
      function drawEndpoints() {
        ctx.fillStyle = p.textColor || "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 22px Segoe UI, sans-serif";
        let location = point(outerRadius + 20, startAngle); ctx.fillText("−", location[0], location[1]); location = point(outerRadius + 20, startAngle + rangeAngle); ctx.fillText("+", location[0], location[1]);
      }
      function draw() { ctx.clearRect(0, 0, W, W); drawGauge(); drawMetal(); drawEndpoints(); valueText.textContent = `${Math.round(value * 100)}%`; canvas.setAttribute("aria-valuenow", String(Math.round(value * 100))); }
      function angleFromEvent(event) { const rect = canvas.getBoundingClientRect(); return Math.atan2((event.clientY - rect.top) * W / rect.height - Y, (event.clientX - rect.left) * W / rect.width - X); }
      function publish() { const amount = Math.round(value * 100); context.signals.publish("set", p.outputScale === "100" ? amount : Math.round(value * 65535)); }
      function pointerDown(event) { dragging = true; lastAngle = angleFromEvent(event); canvas.setPointerCapture?.(event.pointerId); event.preventDefault(); }
      function pointerMove(event) { if (!dragging) return; const angle = angleFromEvent(event); let delta = angle - lastAngle; if (delta > Math.PI) delta -= Math.PI * 2; if (delta < -Math.PI) delta += Math.PI * 2; value = clamp(value + delta / rangeAngle, 0, 1); lastAngle = angle; draw(); publish(); event.preventDefault(); }
      function pointerUp() { dragging = false; }
      function feedback(input) { const number = Number(input) || 0; value = clamp(number > 100 ? number / 65535 : number / 100, 0, 1); draw(); }
      canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointermove", pointerMove); canvas.addEventListener("pointerup", pointerUp); canvas.addEventListener("pointercancel", pointerUp);
      canvas.addEventListener("keydown", event => { if (!/Arrow(Up|Right|Down|Left)/.test(event.key)) return; value = clamp(value + (/Up|Right/.test(event.key) ? .01 : -.01), 0, 1); draw(); publish(); event.preventDefault(); });
      context.signals.subscribe("feedback", feedback); context.signals.subscribe("name", input => { name.textContent = String(input == null || input === "" ? (p.localName || "Effect") : input); });
      draw();
      return () => { canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove); canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerUp); };
    },
  });
})(window.ComposerRuntime);
