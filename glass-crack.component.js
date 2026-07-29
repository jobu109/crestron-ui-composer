(function (global) {
  "use strict";

  global.ComposerRuntime.register({
    id: "glass-crack",
    name: "Glass Crack",
    category: "Visual Only",
    defaultSize: { width: 520, height: 340 },
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "GlassCrack.Press" }
    ],
    properties: [
      { key: "showFrame", name: "Show frame", type: "checkbox", defaultValue: true },
      { key: "backgroundColor", name: "Glass background color", type: "color", defaultValue: "#101719" },
      { key: "backgroundOpacity", name: "Glass background opacity (%)", type: "number", defaultValue: 18 },
      { key: "frameColor", name: "Frame color", type: "color", defaultValue: "#3a2721" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#886d5e" },
      { key: "crackColor", name: "Crack color", type: "color", defaultValue: "#eaf8ff" },
      { key: "highlightColor", name: "Crack highlight color", type: "color", defaultValue: "#ffffff" },
      { key: "flashColor", name: "Impact flash color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#bfeeff" },
      { key: "glowStrength", name: "Glow strength", type: "number", defaultValue: 7 },
      { key: "crackReach", name: "Crack reach (%)", type: "number", defaultValue: 75 },
      { key: "crackDensity", name: "Crack density", type: "number", defaultValue: 16 },
      { key: "lineWidth", name: "Crack line width", type: "number", defaultValue: 1.15 },
      { key: "cornerRadius", name: "Corner radius (px)", type: "number", defaultValue: 12 },
      { key: "clearOnPress", name: "Clear previous cracks on press", type: "checkbox", defaultValue: false }
    ],
    template: '<div class="gc-root"><div class="gc-frame"><canvas class="gc-canvas"></canvas><span class="gc-flash"></span></div></div>',
    styles: '[data-component="glass-crack"],[data-component="glass-crack"] *{box-sizing:border-box}[data-component="glass-crack"]{display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none}.gc-root{width:100%;height:100%;padding:12px;overflow:visible}.gc-frame{position:relative;width:100%;height:100%;overflow:hidden;border-radius:var(--gc-radius);background:rgba(16,23,25,.18);border:1px solid var(--gc-border);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 30px rgba(0,0,0,.45),0 8px 20px rgba(0,0,0,.4)}.gc-root.no-frame{padding:0}.gc-root.no-frame .gc-frame{border-color:transparent;box-shadow:none}.gc-canvas{display:block;width:100%;height:100%;cursor:crosshair;touch-action:none}.gc-flash{position:absolute;width:4px;height:4px;border-radius:50%;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.2);background:var(--gc-flash);box-shadow:0 0 5px 1px var(--gc-flash)}.gc-flash.active{animation:gc-impact .2s ease-out}@keyframes gc-impact{0%{opacity:.82;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(2)}}',
    mount(root, context) {
      const p = context.options.properties || {};
      const host = root.querySelector(".gc-root");
      const frame = root.querySelector(".gc-frame");
      const canvas = root.querySelector(".gc-canvas");
      const flash = root.querySelector(".gc-flash");
      const ctx = canvas.getContext("2d");
      let dpr = 1;

      const number = (value, fallback, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
      const truthy = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
      const rgba = (hex, alpha) => {
        const value = parseInt(hex.slice(1), 16);
        return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
      };
      const background = color(p.backgroundColor, "#101719");
      const crack = color(p.crackColor, "#eaf8ff");
      const highlight = color(p.highlightColor, "#ffffff");
      const glow = color(p.glowColor, "#bfeeff");
      const opacity = number(p.backgroundOpacity, 18, 0, 100) / 100;
      frame.style.background = rgba(background, opacity);
      root.style.setProperty("--gc-border", color(p.borderColor, "#886d5e"));
      root.style.setProperty("--gc-flash", color(p.flashColor, "#ffffff"));
      root.style.setProperty("--gc-radius", `${number(p.cornerRadius, 12, 0, 200)}px`);
      host.classList.toggle("no-frame", !truthy(p.showFrame));
      if (truthy(p.showFrame)) frame.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 30px rgba(0,0,0,.45),0 0 ${number(p.glowStrength, 7, 0, 60)}px ${rgba(color(p.frameColor, "#3a2721"), .75)},0 8px 20px rgba(0,0,0,.4)`;

      function resize() {
        const rect = canvas.getBoundingClientRect();
        const nextDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = Math.max(1, Math.round(rect.width * nextDpr));
        const height = Math.max(1, Math.round(rect.height * nextDpr));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        dpr = nextDpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function jaggedLine(x1, y1, x2, y2, amount) {
        const steps = Math.max(3, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 14));
        const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
        const length = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / length, ny = dx / length;
        const points = [{ x: x1, y: y1 }];
        for (let i = 1; i < steps; i += 1) {
          const jitter = (Math.random() - .5) * amount;
          points.push({ x: x1 + dx * i + nx * jitter, y: y1 + dy * i + ny * jitter });
        }
        points.push({ x: x2, y: y2 });
        return points;
      }
      function stroke(points, width, alpha) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const trace = (offsetX, offsetY) => {
          ctx.beginPath();
          points.forEach((point, index) => index
            ? ctx.lineTo(point.x + offsetX, point.y + offsetY)
            : ctx.moveTo(point.x + offsetX, point.y + offsetY));
        };
        trace(.55, .7);
        ctx.strokeStyle = `rgba(0,0,0,${alpha * .62})`;
        ctx.lineWidth = width + .75;
        ctx.stroke();
        ctx.shadowColor = glow;
        ctx.shadowBlur = Math.min(1.5, number(p.glowStrength, 7, 0, 60) * .14);
        ctx.strokeStyle = rgba(crack, alpha);
        ctx.lineWidth = width;
        trace(0, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(highlight, Math.min(1, alpha * .62));
        ctx.lineWidth = Math.max(.22, width * .28);
        trace(-.28, -.32);
        ctx.stroke();
        ctx.restore();
      }
      function drawCrackAt(x, y) {
        resize();
        if (truthy(p.clearOnPress)) ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        const count = Math.round(number(p.crackDensity, 16, 6, 40));
        const reach = number(p.crackReach, 75, 15, 130) / 100;
        const baseWidth = number(p.lineWidth, 1.15, .35, 6) * .72;
        const radius = Math.min(canvas.clientWidth, canvas.clientHeight) * .48 * reach;
        const spokes = [];
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2 + (Math.random() - .5) * .19;
          const length = radius * (.52 + Math.random() * .56);
          const end = { x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length };
          const points = jaggedLine(x, y, end.x, end.y, 5.5 + length * .016);
          spokes.push(points);
          stroke(points, baseWidth * (.66 + Math.random() * .52), .76 + Math.random() * .22);
          if (i % 2 === 0 && points.length > 3) {
            const start = points[Math.min(points.length - 2, 2 + Math.floor(Math.random() * (points.length - 3)))];
            const branchAngle = angle + (Math.random() > .5 ? 1 : -1) * (.35 + Math.random() * .55);
            const branchLength = length * (.16 + Math.random() * .25);
            stroke(jaggedLine(start.x, start.y, start.x + Math.cos(branchAngle) * branchLength, start.y + Math.sin(branchAngle) * branchLength, 5), baseWidth * .62, .58);
          }
        }
        [0.16, 0.29, 0.43, 0.58].forEach((scale, ringIndex) => {
          for (let i = 0; i < count; i += 1) {
            if (Math.random() < .18 + ringIndex * .04) continue;
            const one = spokes[i], two = spokes[(i + 1) % count];
            const a = one[Math.min(one.length - 1, Math.max(1, Math.round((one.length - 1) * scale)))];
            const b = two[Math.min(two.length - 1, Math.max(1, Math.round((two.length - 1) * scale)))];
            stroke([
              a,
              { x: (a.x + b.x) / 2 + (Math.random() - .5) * 4, y: (a.y + b.y) / 2 + (Math.random() - .5) * 4 },
              b,
            ], baseWidth * .42, .5);
          }
        });
        ctx.save();
        ctx.fillStyle = rgba(highlight, .92);
        ctx.shadowColor = glow;
        ctx.shadowBlur = Math.min(2, number(p.glowStrength, 7, 0, 60) * .18);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.2, baseWidth * 1.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      function eventPoint(event) {
        const touch = event.changedTouches && event.changedTouches[0] || event.touches && event.touches[0];
        const rect = canvas.getBoundingClientRect();
        return { x: (touch ? touch.clientX : event.clientX) - rect.left, y: (touch ? touch.clientY : event.clientY) - rect.top };
      }
      function impact(event) {
        const point = eventPoint(event);
        drawCrackAt(point.x, point.y);
        flash.style.left = `${point.x}px`;
        flash.style.top = `${point.y}px`;
        flash.classList.remove("active");
        void flash.offsetWidth;
        flash.classList.add("active");
        context.signals.publish("press", true);
      }
      function release() { context.signals.publish("press", false); }

      resize();
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
      if (observer) observer.observe(canvas);
      const unbind = context.interactions && context.interactions.bindPrimaryPointer
        ? context.interactions.bindPrimaryPointer(canvas, { down: impact, up: release, cancel: release })
        : null;
      if (!unbind) {
        canvas.addEventListener("pointerdown", impact);
        canvas.addEventListener("pointerup", release);
        canvas.addEventListener("pointercancel", release);
      }
      return function () {
        if (observer) observer.disconnect();
        if (typeof unbind === "function") unbind();
      };
    }
  });
})(window);
