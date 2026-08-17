(function (runtime) {
  "use strict";
  runtime.register({
    id: "ptz-joystick",
    name: "PTZ Joystick",
    category: "Navigation & Menus",
    defaultSize: { width: 220, height: 250 },
    properties: [
      { key: "text", name: "Label", type: "text", defaultValue: "PTZ" },
      { key: "showLabel", name: "Show label", type: "checkbox", defaultValue: true },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 80, defaultValue: 22 },
      { key: "stickSize", name: "Stick size (%)", type: "number", min: 20, max: 70, defaultValue: 38 },
      { key: "travel", name: "Stick travel (%)", type: "number", min: 20, max: 48, defaultValue: 36 },
      { key: "deadZone", name: "Center dead zone (%)", type: "number", min: 0, max: 60, defaultValue: 14 },
      { key: "baseColor", name: "Base color", type: "color", defaultValue: "#203332" },
      { key: "stickColor", name: "Stick color", type: "color", defaultValue: "#52615f" },
      { key: "activeColor", name: "Active stick color", type: "color", defaultValue: "#04aa8e" },
      { key: "borderColor", name: "Border color", type: "color", defaultValue: "#7bd9c9" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" },
      { key: "glowColor", name: "Glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 100, defaultValue: 16 },
    ],
    signals: [
      { key: "up", name: "Up press", type: "digital", direction: "output", defaultValue: "PTZJoystick.UpPress" },
      { key: "upRight", name: "Up right press", type: "digital", direction: "output", defaultValue: "PTZJoystick.UpRightPress" },
      { key: "right", name: "Right press", type: "digital", direction: "output", defaultValue: "PTZJoystick.RightPress" },
      { key: "downRight", name: "Down right press", type: "digital", direction: "output", defaultValue: "PTZJoystick.DownRightPress" },
      { key: "down", name: "Down press", type: "digital", direction: "output", defaultValue: "PTZJoystick.DownPress" },
      { key: "downLeft", name: "Down left press", type: "digital", direction: "output", defaultValue: "PTZJoystick.DownLeftPress" },
      { key: "left", name: "Left press", type: "digital", direction: "output", defaultValue: "PTZJoystick.LeftPress" },
      { key: "upLeft", name: "Up left press", type: "digital", direction: "output", defaultValue: "PTZJoystick.UpLeftPress" },
      { key: "label", name: "Name", type: "serial", direction: "input", defaultValue: "PTZJoystick.Label" },
    ],
    template: '<div class="ptz-root"><div class="ptz-base"><span class="ptz-guide up">▲</span><span class="ptz-guide up-right">↗</span><span class="ptz-guide right">▶</span><span class="ptz-guide down-right">↘</span><span class="ptz-guide down">▼</span><span class="ptz-guide down-left">↙</span><span class="ptz-guide left">◀</span><span class="ptz-guide up-left">↖</span><button class="ptz-stick" type="button" aria-label="PTZ joystick"></button></div><div class="ptz-label">PTZ</div></div>',
    styles: '[data-component="ptz-joystick"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box}[data-component="ptz-joystick"] *{box-sizing:border-box}[data-component="ptz-joystick"] .ptz-root{display:grid;width:100%;height:100%;grid-template-rows:minmax(0,1fr) auto;gap:8px;place-items:center;color:var(--text-color)}[data-component="ptz-joystick"] .ptz-base{position:relative;width:min(100%,100vh);height:min(100%,100vw);max-width:100%;max-height:100%;aspect-ratio:1;border:1px solid var(--border-color);border-radius:50%;background:radial-gradient(circle at 38% 34%,rgba(255,255,255,.18),transparent 42%),var(--base-color);box-shadow:inset 0 0 24px rgba(0,0,0,.55),0 0 var(--glow-strength-px,16px) color-mix(in srgb,var(--glow-color) 45%,transparent);touch-action:none}[data-component="ptz-joystick"] .ptz-stick{position:absolute;left:50%;top:50%;width:var(--stick-size-percent,38%);height:var(--stick-size-percent,38%);padding:0;border:1px solid rgba(255,255,255,.34);border-radius:50%;appearance:none;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.35),transparent 42%),var(--stick-color);box-shadow:0 8px 14px rgba(0,0,0,.45),0 0 8px color-mix(in srgb,var(--glow-color) 35%,transparent);transform:translate(-50%,-50%);cursor:grab;touch-action:none}[data-component="ptz-joystick"] .ptz-stick.dragging{background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.35),transparent 42%),var(--active-color);box-shadow:0 8px 14px rgba(0,0,0,.45),0 0 var(--glow-strength-px) var(--glow-color);cursor:grabbing}[data-component="ptz-joystick"] .ptz-guide{position:absolute;color:color-mix(in srgb,var(--text-color) 55%,transparent);font:700 12px/1 sans-serif;pointer-events:none}[data-component="ptz-joystick"] .ptz-guide.up{left:50%;top:7%;transform:translateX(-50%)}[data-component="ptz-joystick"] .ptz-guide.up-right{right:16%;top:16%}[data-component="ptz-joystick"] .ptz-guide.right{right:7%;top:50%;transform:translateY(-50%)}[data-component="ptz-joystick"] .ptz-guide.down-right{right:16%;bottom:16%}[data-component="ptz-joystick"] .ptz-guide.down{left:50%;bottom:7%;transform:translateX(-50%)}[data-component="ptz-joystick"] .ptz-guide.down-left{left:16%;bottom:16%}[data-component="ptz-joystick"] .ptz-guide.left{left:7%;top:50%;transform:translateY(-50%)}[data-component="ptz-joystick"] .ptz-guide.up-left{left:16%;top:16%}[data-component="ptz-joystick"] .ptz-label{font:800 var(--text-size-px,22px)/1 "Segoe UI",sans-serif;text-align:center;text-shadow:0 2px 5px #000}',
    visibilityProperties: { showLabel: ".ptz-label" },
    mount(root, context) {
      const base = root.querySelector(".ptz-base"), stick = root.querySelector(".ptz-stick"), label = root.querySelector(".ptz-label"), p = context.options.properties || {};
      const keys = ["right", "downRight", "down", "downLeft", "left", "upLeft", "up", "upRight"];
      let active = "", remoteLabel = "", dragging = false;
      function publish(key) { if (key === active) return; if (active) context.signals.publish(active, false); active = key; if (active) context.signals.publish(active, true); }
      function move(event) {
        if (!dragging) return;
        const rect = base.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2, dx = event.clientX - cx, dy = event.clientY - cy;
        const max = Math.min(rect.width, rect.height) * Math.max(0.2, Math.min(0.48, Number(p.travel) / 100 || .36));
        const distance = Math.hypot(dx, dy), scale = distance > max ? max / distance : 1, x = dx * scale, y = dy * scale;
        stick.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
        const dead = Math.min(rect.width, rect.height) * Math.max(0, Math.min(.6, Number(p.deadZone) / 100 || .14));
        if (distance < dead) publish("");
        else { const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; publish(keys[Math.round(angle / 45) % 8]); }
      }
      function down(event) { dragging = true; stick.classList.add("dragging"); if (stick.setPointerCapture) stick.setPointerCapture(event.pointerId); move(event); event.preventDefault(); }
      function up() { dragging = false; publish(""); stick.classList.remove("dragging"); stick.style.transition = "transform .16s ease"; stick.style.transform = "translate(-50%,-50%)"; setTimeout(() => stick.style.transition = "", 180); }
      stick.addEventListener("pointerdown", down); stick.addEventListener("pointermove", move); stick.addEventListener("pointerup", up); stick.addEventListener("pointercancel", up); stick.addEventListener("lostpointercapture", up);
      context.signals.subscribe("label", value => { remoteLabel = value == null ? "" : String(value); label.textContent = remoteLabel || (p.text == null ? "PTZ" : String(p.text)); });
      label.textContent = p.text == null ? "PTZ" : String(p.text);
      return () => { publish(""); };
    },
  });
})(window.ComposerRuntime);
