(function (runtime) {
  "use strict";

  const properties = (name) => [
    { key: "text", name: "Default name", type: "text", defaultValue: name },
    { key: "outputScale", name: "Outgoing analog scale", type: "select", options: [{ value: "65535", label: "0–65535" }, { value: "100", label: "0–100" }], defaultValue: "65535" },
  ];
  runtime.register({
    id: "single-light-control", name: "Single Light Control", category: "Sliders & Levels", defaultSize: { width: 160, height: 360 }, properties: properties("Light Load"),
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "SingleLight.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "SingleLight.Selected" },
      { key: "valueSet", name: "Value Set", type: "analog", direction: "output", defaultValue: "SingleLight.ValueSet" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "SingleLight.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "SingleLight.Name" },
    ],
    template: '<button class="load" type="button"><span class="fill"></span><span class="glow"></span><span class="name">Light Load</span><span class="level">0%</span></button>',
    styles: '[data-component="single-light-control"]{display:block;width:100%;height:100%;padding:12px;box-sizing:border-box;touch-action:none}[data-component="single-light-control"] .load{position:relative;width:100%;height:100%;overflow:hidden;padding:0;border:1px solid rgba(255,255,255,.3);border-radius:22px;background:#222;color:#fff;box-shadow:inset 0 1px rgba(255,255,255,.35),0 0 12px rgba(4,170,142,.4);cursor:pointer;touch-action:none}[data-component="single-light-control"] .fill{position:absolute;right:0;bottom:0;left:0;height:0;background:linear-gradient(to top,#f5b700,#fff36a);opacity:.8;pointer-events:none}[data-component="single-light-control"] .glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 90%,rgba(255,230,30,.6),transparent 70%);opacity:0;pointer-events:none}[data-component="single-light-control"] .name,[data-component="single-light-control"] .level{position:absolute;right:10px;left:10px;z-index:2;overflow:hidden;font-family:Segoe UI;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px #000;white-space:nowrap}[data-component="single-light-control"] .name{top:18px;font-size:18px;font-weight:700}[data-component="single-light-control"] .level{bottom:18px;font-size:26px;font-weight:800}[data-component="single-light-control"] .load.pressed,[data-component="single-light-control"] .load.selected{outline:2px solid #fff}',
    mount(root, context) {
      const analog = value => { const number = Number(value) || 0; return Math.max(0, Math.min(100, Math.round(number > 100 ? number / 65535 * 100 : number))); };
      const output = (value, options) => options.outputScale === "100" ? value : Math.round(value / 100 * 65535);
      const truthy = value => value === true || value === 1 || value === "1";
      const p = context.options.properties || {}, button = root.querySelector(".load"), fill = root.querySelector(".fill"), glow = root.querySelector(".glow"), label = root.querySelector(".name"), level = root.querySelector(".level"), fallback = p.text ?? "Light Load";
      let active = false;
      label.textContent = fallback;
      const update = value => { const percent = analog(value); fill.style.height = percent + "%"; glow.style.opacity = String(percent / 100 * .55); level.textContent = percent + "%"; };
      const publish = event => { const rect = button.getBoundingClientRect(), value = Math.round(100 - Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))); update(value); context.signals.publish("valueSet", output(value, p)); };
      const release = () => { if (!active) return; active = false; button.classList.remove("pressed"); context.signals.publish("press", false); };
      button.addEventListener("pointerdown", event => { active = true; button.classList.add("pressed"); context.signals.publish("press", true); if (button.setPointerCapture) button.setPointerCapture(event.pointerId); publish(event); event.preventDefault(); });
      button.addEventListener("pointermove", event => { if (active) publish(event); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(event => button.addEventListener(event, release));
      context.signals.subscribe("selected", value => button.classList.toggle("selected", truthy(value)));
      context.signals.subscribe("feedback", update);
      context.signals.subscribe("name", value => label.textContent = value || fallback);
      update(0);
    },
  });

  runtime.register({
    id: "single-shade-control", name: "Single Shade Control", category: "Sliders & Levels", defaultSize: { width: 170, height: 360 }, properties: properties("Window Shade"),
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "SingleShade.Press" },
      { key: "valueSet", name: "Value Set", type: "analog", direction: "output", defaultValue: "SingleShade.ValueSet" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "SingleShade.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "SingleShade.Name" },
    ],
    template: '<div class="shade-card"><button class="shade" type="button"><span class="panel"></span><span class="name">Window Shade</span><span class="position">0%</span></button></div>',
    styles: '[data-component="single-shade-control"]{display:block;width:100%;height:100%;padding:12px;box-sizing:border-box;font-family:Segoe UI;touch-action:none}[data-component="single-shade-control"] .shade-card{width:100%;height:100%;padding:12px;border:1px solid rgba(148,238,226,.54);border-radius:10px;background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(4,170,142,.18)),rgba(4,85,72,.32);box-shadow:inset 0 0 20px rgba(255,255,255,.08),0 0 14px rgba(4,170,142,.24)}[data-component="single-shade-control"] .shade{position:relative;width:100%;height:100%;overflow:hidden;padding:14px 8px;border:1px solid rgba(4,170,142,.38);border-radius:10px;background:radial-gradient(circle at 36% 24%,#fff,#d2deda 72%,#bccac6);color:#fff;touch-action:none}[data-component="single-shade-control"] .panel{position:absolute;z-index:1;inset:0;background:repeating-linear-gradient(to bottom,#0c0c0c 0,#0c0c0c 10px,#2a2a2a 11px,#2a2a2a 13px);box-shadow:inset 0 0 22px rgba(0,0,0,.82),0 8px 20px rgba(0,0,0,.45);pointer-events:none}[data-component="single-shade-control"] .panel:after{content:"";position:absolute;left:0;right:0;bottom:0;height:9px;border-top:1px solid rgba(255,255,255,.16);background:#121212;box-shadow:0 0 12px rgba(4,170,142,.55)}[data-component="single-shade-control"] .name,[data-component="single-shade-control"] .position{position:absolute;z-index:2;right:8px;left:8px;overflow:hidden;text-align:center;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 2px 5px #000}[data-component="single-shade-control"] .name{top:16px;font-size:16px;font-weight:800}[data-component="single-shade-control"] .position{bottom:16px;color:#04dcb9;font-size:25px;font-weight:900}[data-component="single-shade-control"] .shade.pressed{outline:2px solid #fff;transform:scale(.98)}',
    mount(root, context) {
      const analog = value => { const number = Number(value) || 0; return Math.max(0, Math.min(100, Math.round(number > 100 ? number / 65535 * 100 : number))); };
      const output = (value, options) => options.outputScale === "100" ? value : Math.round(value / 100 * 65535);
      const p = context.options.properties || {}, button = root.querySelector(".shade"), panel = root.querySelector(".panel"), label = root.querySelector(".name"), position = root.querySelector(".position"), fallback = p.text ?? "Window Shade";
      let active = false;
      label.textContent = fallback;
      const update = value => { const percent = analog(value); panel.style.transform = "translateY(-" + percent + "%)"; position.textContent = percent + "%"; };
      const publish = event => { const rect = button.getBoundingClientRect(), value = Math.round(100 - Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))); update(value); context.signals.publish("valueSet", output(value, p)); };
      const release = () => { if (!active) return; active = false; button.classList.remove("pressed"); context.signals.publish("press", false); };
      button.addEventListener("pointerdown", event => { active = true; button.classList.add("pressed"); context.signals.publish("press", true); if (button.setPointerCapture) button.setPointerCapture(event.pointerId); publish(event); event.preventDefault(); });
      button.addEventListener("pointermove", event => { if (active) publish(event); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(event => button.addEventListener(event, release));
      context.signals.subscribe("feedback", update);
      context.signals.subscribe("name", value => label.textContent = value || fallback);
      update(0);
    },
  });

  runtime.register({
    id: "single-mic-control", name: "Single Mic Control", category: "Sliders & Levels", defaultSize: { width: 220, height: 340 }, properties: properties("Microphone"),
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "SingleMic.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "SingleMic.Selected" },
      { key: "valueSet", name: "Value Set", type: "analog", direction: "output", defaultValue: "SingleMic.ValueSet" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "SingleMic.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "SingleMic.Name" },
    ],
    template: '<div class="mic-card"><div class="gauge"><svg viewBox="0 0 300 300"><circle class="track" cx="150" cy="150" r="140"></circle><circle class="progress" cx="150" cy="150" r="140"></circle><line class="pointer" x1="150" y1="92" x2="150" y2="24"></line></svg><div class="value">0%</div></div><div class="label">Microphone</div><button class="toggle" type="button" aria-label="Toggle microphone"><span></span></button></div>',
    styles: '[data-component="single-mic-control"]{display:block;width:100%;height:100%;padding:12px;box-sizing:border-box;font-family:Segoe UI;color:#fff;touch-action:none}[data-component="single-mic-control"] .mic-card{width:100%;height:100%;display:grid;grid-template-rows:1fr auto auto;gap:10px;place-items:center;padding:14px;border:1px solid rgba(148,238,226,.54);border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(4,170,142,.2)),rgba(4,85,72,.32);box-shadow:inset 0 0 20px rgba(255,255,255,.08),0 0 14px rgba(4,170,142,.24)}[data-component="single-mic-control"] .gauge{--rgb:4,170,142;position:relative;width:min(100%,190px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(var(--rgb),.18),transparent 72%);touch-action:none}[data-component="single-mic-control"] svg{width:100%;height:100%;overflow:visible}[data-component="single-mic-control"] .track,[data-component="single-mic-control"] .progress{fill:none;stroke-width:14;stroke-linecap:round;stroke-dasharray:660 880;transform:rotate(135deg);transform-origin:150px 150px}[data-component="single-mic-control"] .track{stroke:rgba(255,255,255,.14)}[data-component="single-mic-control"] .progress{stroke:rgb(var(--rgb));stroke-dashoffset:660;filter:drop-shadow(0 0 8px rgba(var(--rgb),.8))}[data-component="single-mic-control"] .pointer{stroke:rgb(var(--rgb));stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 0 7px rgba(var(--rgb),.8))}[data-component="single-mic-control"] .value{position:absolute;inset:30%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.24);border-radius:50%;background:rgba(0,0,0,.28);font-size:22px;font-weight:900;pointer-events:none}[data-component="single-mic-control"] .label{max-width:100%;overflow:hidden;font-weight:800;text-overflow:ellipsis;white-space:nowrap}[data-component="single-mic-control"] .toggle{position:relative;width:92px;height:42px;padding:0;border:2px solid #7e2a2a;border-radius:24px;background:#8a7c79}[data-component="single-mic-control"] .toggle span{position:absolute;top:5px;left:7px;width:28px;height:28px;border-radius:50%;background:#eee;transition:left .16s}[data-component="single-mic-control"] .toggle.selected{border-color:#04dcb9;background:#04aa8e;box-shadow:0 0 12px rgba(4,220,185,.62)}[data-component="single-mic-control"] .toggle.selected span{left:53px}',
    mount(root, context) {
      const analog = value => { const number = Number(value) || 0; return Math.max(0, Math.min(100, Math.round(number > 100 ? number / 65535 * 100 : number))); };
      const output = (value, options) => options.outputScale === "100" ? value : Math.round(value / 100 * 65535);
      const truthy = value => value === true || value === 1 || value === "1";
      const p = context.options.properties || {}, gauge = root.querySelector(".gauge"), progress = root.querySelector(".progress"), pointer = root.querySelector(".pointer"), valueNode = root.querySelector(".value"), label = root.querySelector(".label"), toggle = root.querySelector(".toggle"), fallback = p.text ?? "Microphone";
      let active = false;
      label.textContent = fallback;
      const color = value => value <= 65 ? [Math.round(4 + 251 * value / 65), Math.round(170 - 5 * value / 65), Math.round(142 - 142 * value / 65)].join(",") : [255, Math.round(165 - 125 * (value - 65) / 35), Math.round(40 * (value - 65) / 35)].join(",");
      const update = input => { const value = analog(input), angle = value / 100 * 270 - 135; gauge.style.setProperty("--rgb", color(value)); progress.style.strokeDashoffset = String(660 - 660 * value / 100); pointer.setAttribute("transform", "rotate(" + angle + ",150,150)"); valueNode.textContent = value + "%"; };
      const publish = event => { const rect = gauge.getBoundingClientRect(), degrees = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI, rotation = (degrees - 135 + 360) % 360; if (rotation > 270) return; const value = Math.round(rotation / 270 * 100); update(value); context.signals.publish("valueSet", output(value, p)); };
      gauge.addEventListener("pointerdown", event => { active = true; if (gauge.setPointerCapture) gauge.setPointerCapture(event.pointerId); publish(event); event.preventDefault(); });
      gauge.addEventListener("pointermove", event => { if (active) publish(event); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(event => gauge.addEventListener(event, () => active = false));
      toggle.addEventListener("pointerdown", event => { context.signals.publish("press", true); event.preventDefault(); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(event => toggle.addEventListener(event, () => context.signals.publish("press", false)));
      context.signals.subscribe("selected", value => toggle.classList.toggle("selected", truthy(value)));
      context.signals.subscribe("feedback", update);
      context.signals.subscribe("name", value => label.textContent = value || fallback);
      update(0);
    },
  });
})(window.ComposerRuntime);
