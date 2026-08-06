(function (runtime) {
  "use strict";

  runtime.register({
    id: "bluetooth-pairing-button",
    name: "Bluetooth Pairing Button",
    category: "Advanced Buttons",
    defaultSize: { width: 280, height: 280 },
    properties: [
      { key: "idleText", name: "Idle text", type: "text", defaultValue: "PRESS TO PAIR BLUETOOTH" },
      { key: "pairingText", name: "Pairing text", type: "text", defaultValue: "PAIR YOUR DEVICE TO" },
      { key: "connectedText", name: "Connected text", type: "text", defaultValue: "CONNECTED, PRESS TO DISCONNECT" },
      { key: "defaultState", name: "Default editor state", type: "select", options: [{ value: "0", label: "Idle" }, { value: "1", label: "Pairing" }, { value: "2", label: "Connected" }], defaultValue: "0" },
      { key: "idleColor", name: "Idle ring / glow color", type: "color", defaultValue: "#2563eb" },
      { key: "pairingColor", name: "Pairing ring / glow color", type: "color", defaultValue: "#3b82f6" },
      { key: "connectedColor", name: "Connected ring / glow color", type: "color", defaultValue: "#0ea5e9" },
      { key: "faceColor", name: "Center face color", type: "color", defaultValue: "#111111" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#93c5fd" },
      { key: "textSize", name: "Text size", type: "number", min: 8, max: 72, step: 1, defaultValue: 20 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 50, step: 1, defaultValue: 22 },
      { key: "ringThickness", name: "Ring thickness", type: "number", min: 6, max: 40, step: 1, defaultValue: 18 },
      { key: "pairingPulseSpeed", name: "Pairing pulse speed (seconds)", type: "number", min: 0.3, max: 5, step: 0.05, defaultValue: 1.15 },
      { key: "orbitSpeed", name: "Pairing orbit speed (seconds)", type: "number", min: 0.3, max: 5, step: 0.05, defaultValue: 1.2 },
      { key: "connectedPulseSpeed", name: "Connected pulse speed (seconds)", type: "number", min: 0.3, max: 5, step: 0.05, defaultValue: 1.45 },
      { key: "wrapText", name: "Wrap text", type: "checkbox", defaultValue: true },
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "BluetoothPairingButton.Press" },
      { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "BluetoothPairingButton.Feedback" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "BluetoothPairingButton.Name" },
    ],
    template: '<div class="btp-root"><button class="btp-button state-idle" type="button" aria-label="Press to pair Bluetooth"><span class="btp-ring"></span><span class="btp-orbit"></span><span class="btp-face"><span class="btp-label">PRESS TO PAIR BLUETOOTH</span></span></button></div>',
    styles: '[data-component="bluetooth-pairing-button"]{display:block;width:100%;height:100%;padding:7%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="bluetooth-pairing-button"] *{box-sizing:border-box}[data-component="bluetooth-pairing-button"] .btp-root{display:grid;width:100%;height:100%;place-items:center}[data-component="bluetooth-pairing-button"] .btp-button{--state-color:var(--idle-color);position:relative;width:min(100%,100vh);height:min(100%,100vw);max-width:100%;max-height:100%;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:transparent;appearance:none;cursor:pointer;touch-action:none}[data-component="bluetooth-pairing-button"] .btp-ring{position:absolute;inset:2%;border:var(--ring-thickness-px) solid var(--state-color);border-radius:50%;background:radial-gradient(circle,transparent 52%,rgba(255,255,255,.06) 54%,transparent 72%);box-shadow:0 0 calc(var(--glow-strength-px) * .85) var(--state-color),0 0 calc(var(--glow-strength-px) * 1.8) var(--state-color),inset 0 0 calc(var(--glow-strength-px) * .7) rgba(255,255,255,.1);transition:filter .18s ease,transform .18s ease,border-color .5s ease,box-shadow .5s ease}[data-component="bluetooth-pairing-button"] .btp-orbit{position:absolute;inset:1%;border-radius:50%;opacity:0;pointer-events:none}[data-component="bluetooth-pairing-button"] .btp-orbit:before{content:"";position:absolute;top:0;left:45%;width:10%;height:6%;border-radius:999px;background:#7dd3fc;box-shadow:0 0 8px #7dd3fc,0 0 18px #3b82f6,0 0 34px #2563eb}[data-component="bluetooth-pairing-button"] .btp-face{position:absolute;inset:19%;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:50%;background:radial-gradient(ellipse at 45% 38%,#242424 0%,var(--face-color) 58%,#020202 100%);box-shadow:inset 0 5px 10px rgba(255,255,255,.06),inset 0 -12px 20px rgba(0,0,0,.95),0 5px 18px rgba(0,0,0,.55);transition:transform .16s ease,filter .16s ease}[data-component="bluetooth-pairing-button"] .btp-label{width:72%;max-width:72%;overflow:hidden;color:var(--text-color);font-size:var(--text-size-px);font-weight:800;line-height:1.18;letter-spacing:.035em;text-align:center;text-overflow:ellipsis;text-transform:uppercase;text-shadow:0 0 calc(var(--glow-strength-px) * .55) var(--state-color);white-space:nowrap}[data-component="bluetooth-pairing-button"].wrap-text .btp-label{overflow-wrap:normal;text-overflow:clip;white-space:normal;word-break:normal}[data-component="bluetooth-pairing-button"] .btp-button.state-idle{--state-color:var(--idle-color)}[data-component="bluetooth-pairing-button"] .btp-button.state-pairing{--state-color:var(--pairing-color)}[data-component="bluetooth-pairing-button"] .btp-button.state-connected{--state-color:var(--connected-color)}[data-component="bluetooth-pairing-button"] .btp-button.state-pairing .btp-ring{animation:btp-pulse var(--pairing-pulse-speed-s) ease-in-out infinite}[data-component="bluetooth-pairing-button"] .btp-button.state-pairing .btp-orbit{opacity:1;animation:btp-orbit var(--orbit-speed-s) linear infinite}[data-component="bluetooth-pairing-button"] .btp-button.state-connected .btp-ring{animation:btp-pulse var(--connected-pulse-speed-s) ease-in-out infinite}[data-component="bluetooth-pairing-button"] .btp-button.pressed .btp-face{transform:scale(.95);filter:brightness(1.18)}[data-component="bluetooth-pairing-button"] .btp-button.pressed .btp-ring{transform:scale(.96)}@keyframes btp-pulse{0%,100%{filter:brightness(.82);transform:scale(.985)}50%{filter:brightness(1.32);transform:scale(1.015)}}@keyframes btp-orbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    mount(root, context) {
      const button = root.querySelector(".btp-button"),
        label = root.querySelector(".btp-label"),
        p = context.options.properties || {},
        labels = [p.idleText || "PRESS TO PAIR BLUETOOTH", p.pairingText || "PAIR YOUR DEVICE TO", p.connectedText || "CONNECTED, PRESS TO DISCONNECT"];
      let state = 0, remoteName = "";
      root.style.setProperty("--pairing-pulse-speed-s", `${Math.max(.3, Number(p.pairingPulseSpeed) || 1.15)}s`);
      root.style.setProperty("--orbit-speed-s", `${Math.max(.3, Number(p.orbitSpeed) || 1.2)}s`);
      root.style.setProperty("--connected-pulse-speed-s", `${Math.max(.3, Number(p.connectedPulseSpeed) || 1.45)}s`);

      function normalize(value) {
        const next = Math.round(Number(value));
        return next === 1 || next === 2 ? next : 0;
      }
      function render(value) {
        state = normalize(value);
        button.classList.remove("state-idle", "state-pairing", "state-connected");
        button.classList.add(["state-idle", "state-pairing", "state-connected"][state]);
        label.textContent = remoteName || labels[state];
        button.setAttribute("aria-label", label.textContent);
      }
      function down(event) {
        button.classList.add("pressed");
        context.signals.publish("press", true);
        event.preventDefault();
      }
      function up() {
        button.classList.remove("pressed");
        context.signals.publish("press", false);
      }
      let unbind;
      if (context.interactions && context.interactions.bindPrimaryPointer)
        unbind = context.interactions.bindPrimaryPointer(button, { down, up, cancel: up });
      else {
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointercancel", up);
        button.addEventListener("lostpointercapture", up);
        unbind = () => {
          button.removeEventListener("pointerdown", down);
          button.removeEventListener("pointerup", up);
          button.removeEventListener("pointercancel", up);
          button.removeEventListener("lostpointercapture", up);
        };
      }
      context.signals.subscribe("feedback", render);
      context.signals.subscribe("name", (value) => {
        remoteName = value == null || value === "" ? "" : String(value);
        render(state);
      });
      render(p.defaultState);
      return unbind;
    },
  });
})(window.ComposerRuntime);
