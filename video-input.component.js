(function (runtime) {
  "use strict";

  runtime.register({
    id: "video-input",
    name: "Video Input",
    category: "Status & Information",
    defaultSize: { width: 640, height: 360 },
    properties: [
      { key: "aspectRatio", name: "Aspect ratio", type: "select", options: [{ value: "16:9", label: "16:9" }, { value: "4:3", label: "4:3" }, { value: "stretch", label: "Stretch" }], defaultValue: "16:9" },
      { key: "sourceType", name: "Source type", type: "select", options: [{ value: "Network", label: "Network" }, { value: "HDMI", label: "HDMI" }], defaultValue: "Network" },
      { key: "url", name: "URL", type: "text", defaultValue: "" },
      { key: "userId", name: "User ID", type: "text", defaultValue: "" },
      { key: "password", name: "Password", type: "text", defaultValue: "" },
      { key: "snapshotUserId", name: "Snapshot user ID", type: "text", defaultValue: "" },
      { key: "snapshotPassword", name: "Snapshot password", type: "text", defaultValue: "" },
      { key: "snapshotUrl", name: "Snapshot URL", type: "text", defaultValue: "" },
      { key: "snapshotRefreshRate", name: "Snapshot refresh rate (seconds)", type: "number", min: 0, max: 60, step: 1, defaultValue: 5 },
      { key: "showControls", name: "Show camera navigation overlay", type: "checkbox", defaultValue: true },
      { key: "controlPosition", name: "Navigation position", type: "select", options: [{ value: "bottom-right", label: "Bottom right" }, { value: "bottom-left", label: "Bottom left" }, { value: "top-right", label: "Top right" }, { value: "top-left", label: "Top left" }, { value: "center", label: "Center" }], defaultValue: "bottom-right" },
      { key: "controlColor", name: "Navigation button color", type: "color", defaultValue: "#263b3a" },
      { key: "controlIconColor", name: "Navigation icon color", type: "color", defaultValue: "#ffffff" },
      { key: "controlGlowColor", name: "Navigation glow color", type: "color", defaultValue: "#04aa8e" },
      { key: "controlOpacity", name: "Navigation opacity", type: "number", min: 10, max: 100, step: 1, defaultValue: 82 },
    ],
    signals: [
      { key: "snapshotRefreshRate", name: "Snapshot Refresh Rate", type: "analog", direction: "input", defaultValue: "Video.SnapshotRefreshRate" },
      { key: "visibility", name: "Visibility", type: "digital", direction: "input", defaultValue: "Video.Visibility" },
      { key: "enable", name: "Enable", type: "digital", direction: "input", defaultValue: "Video.Enable" },
      { key: "play", name: "Play", type: "digital", direction: "input", defaultValue: "Video.Play" },
      { key: "url", name: "URL", type: "serial", direction: "input", defaultValue: "Video.URL" },
      { key: "sourceType", name: "Source Type", type: "serial", direction: "input", defaultValue: "Video.SourceType" },
      { key: "userId", name: "User ID", type: "serial", direction: "input", defaultValue: "Video.UserId" },
      { key: "password", name: "Password", type: "serial", direction: "input", defaultValue: "Video.Password" },
      { key: "snapshotUrl", name: "Snapshot URL", type: "serial", direction: "input", defaultValue: "Video.SnapshotURL" },
      { key: "snapshotUserId", name: "Snapshot User ID", type: "serial", direction: "input", defaultValue: "Video.SnapshotUserId" },
      { key: "snapshotPassword", name: "Snapshot Password", type: "serial", direction: "input", defaultValue: "Video.SnapshotPassword" },
      { key: "upPress", name: "Up Press", type: "digital", direction: "output", defaultValue: "Video.Up.Press" },
      { key: "downPress", name: "Down Press", type: "digital", direction: "output", defaultValue: "Video.Down.Press" },
      { key: "leftPress", name: "Left Press", type: "digital", direction: "output", defaultValue: "Video.Left.Press" },
      { key: "rightPress", name: "Right Press", type: "digital", direction: "output", defaultValue: "Video.Right.Press" },
    ],
    template: '<div class="video-shell"><div class="video-placeholder"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="16" width="36" height="32" rx="5"/><path d="M44 27l12-7v24l-12-7z"/></svg><span>CAMERA STREAM</span></div><ch5-video class="native-video"></ch5-video><div class="ptz" aria-label="Camera navigation"><button data-signal="upPress" class="up" type="button" aria-label="Camera up"><span></span></button><button data-signal="leftPress" class="left" type="button" aria-label="Camera left"><span></span></button><button data-signal="rightPress" class="right" type="button" aria-label="Camera right"><span></span></button><button data-signal="downPress" class="down" type="button" aria-label="Camera down"><span></span></button></div></div>',
    styles: '[data-component="video-input"]{display:block;width:100%;height:100%;padding:4px;box-sizing:border-box;font-family:Segoe UI,sans-serif}[data-component="video-input"] *{box-sizing:border-box}[data-component="video-input"] .video-shell{position:relative;width:100%;height:100%;overflow:hidden;border:1px solid rgba(148,238,226,.5);border-radius:12px;background:#050909;box-shadow:inset 0 0 24px rgba(0,0,0,.8),0 0 12px rgba(4,170,142,.3)}[data-component="video-input"] .native-video{position:absolute;inset:0;display:block;width:100%;height:100%;z-index:1;background:transparent}[data-component="video-input"] .video-placeholder{position:absolute;inset:0;z-index:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(circle at 50% 42%,rgba(4,170,142,.2),transparent 52%),linear-gradient(145deg,#172323,#071010);color:rgba(255,255,255,.72);font-weight:800;letter-spacing:.12em;transition:opacity .2s}[data-component="video-input"] .video-placeholder svg{width:min(20%,84px);fill:none;stroke:#04aa8e;stroke-width:3;filter:drop-shadow(0 0 7px rgba(4,170,142,.75))}[data-component="video-input"] .configured .video-placeholder{opacity:0}[data-component="video-input"] .ptz{position:absolute;z-index:3;display:grid;grid-template-columns:repeat(3,clamp(32px,7vmin,58px));grid-template-rows:repeat(3,clamp(32px,7vmin,58px));gap:4px;pointer-events:none}[data-component="video-input"] .ptz.bottom-right{right:3%;bottom:4%}[data-component="video-input"] .ptz.bottom-left{left:3%;bottom:4%}[data-component="video-input"] .ptz.top-right{right:3%;top:4%}[data-component="video-input"] .ptz.top-left{left:3%;top:4%}[data-component="video-input"] .ptz.center{left:50%;top:50%;transform:translate(-50%,-50%)}[data-component="video-input"] .ptz button{position:relative;display:grid;place-items:center;width:100%;height:100%;padding:0;border:1px solid color-mix(in srgb,var(--control-glow-color) 55%,#fff);border-radius:14px;background:color-mix(in srgb,var(--control-color) calc(var(--control-opacity) * 1%),transparent);box-shadow:inset 0 1px rgba(255,255,255,.35),0 0 9px color-mix(in srgb,var(--control-glow-color) 55%,transparent);color:var(--control-icon-color);pointer-events:auto;cursor:pointer;touch-action:none}[data-component="video-input"] .ptz button:active,[data-component="video-input"] .ptz button.pressed{transform:scale(.92);background:color-mix(in srgb,var(--control-glow-color) 55%,var(--control-color))}[data-component="video-input"] .ptz button span{width:0;height:0;border-style:solid;filter:drop-shadow(0 0 3px var(--control-glow-color))}[data-component="video-input"] .ptz .up{grid-column:2;grid-row:1}[data-component="video-input"] .ptz .left{grid-column:1;grid-row:2}[data-component="video-input"] .ptz .right{grid-column:3;grid-row:2}[data-component="video-input"] .ptz .down{grid-column:2;grid-row:3}[data-component="video-input"] .ptz .up span{border-width:0 9px 14px;border-color:transparent transparent currentColor}[data-component="video-input"] .ptz .down span{border-width:14px 9px 0;border-color:currentColor transparent transparent}[data-component="video-input"] .ptz .left span{border-width:9px 14px 9px 0;border-color:transparent currentColor transparent transparent}[data-component="video-input"] .ptz .right span{border-width:9px 0 9px 14px;border-color:transparent transparent transparent currentColor}[data-component="video-input"] .video-shell.disabled .ptz{opacity:.35;pointer-events:none}',
    mount(root, context) {
      const shell = root.querySelector(".video-shell"), video = root.querySelector("ch5-video"), ptz = root.querySelector(".ptz"), p = context.options.properties || {};
      const bool = value => value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
      const set = (name, value) => { const text = value == null ? "" : String(value); video.setAttribute(name, text); try { video[name] = value; } catch (_) {} };
      const setUrl = value => { set("url", value); shell.classList.toggle("configured", Boolean(value || video.getAttribute("snapshoturl"))); };
      set("aspectratio", p.aspectRatio === "stretch" ? "16:9" : p.aspectRatio || "16:9");
      set("stretch", p.aspectRatio === "stretch");
      set("sourcetype", p.sourceType || "Network");
      setUrl(p.url || "");
      set("userid", p.userId || ""); set("password", p.password || "");
      set("snapshoturl", p.snapshotUrl || ""); set("snapshotuserid", p.snapshotUserId || ""); set("snapshotpassword", p.snapshotPassword || "");
      set("snapshotrefreshrate", Math.max(0, Math.min(60, Number(p.snapshotRefreshRate) || 0)));
      shell.classList.toggle("configured", Boolean(p.url || p.snapshotUrl));
      ptz.hidden = p.showControls === false || String(p.showControls).toLowerCase() === "false";
      ptz.classList.add(p.controlPosition || "bottom-right");
      const releaseHandlers = [];
      ptz.querySelectorAll("button").forEach(button => {
        const key = button.dataset.signal;
        const release = () => { button.classList.remove("pressed"); context.signals.publish(key, false); };
        button.addEventListener("pointerdown", event => { button.classList.add("pressed"); context.signals.publish(key, true); if (button.setPointerCapture) button.setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation(); });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(event => button.addEventListener(event, release));
        releaseHandlers.push([button, release]);
      });
      context.signals.subscribe("snapshotRefreshRate", value => set("snapshotrefreshrate", Math.max(0, Math.min(60, Math.round(Number(value) > 60 ? Number(value) / 65535 * 60 : Number(value) || 0)))));
      context.signals.subscribe("visibility", value => { const show = bool(value); shell.style.visibility = show ? "visible" : "hidden"; set("show", show); });
      context.signals.subscribe("enable", value => { const enabled = bool(value); shell.classList.toggle("disabled", !enabled); set("disabled", !enabled); });
      context.signals.subscribe("play", value => set("play", bool(value)));
      context.signals.subscribe("url", setUrl);
      context.signals.subscribe("sourceType", value => set("sourcetype", value || p.sourceType || "Network"));
      context.signals.subscribe("userId", value => set("userid", value));
      context.signals.subscribe("password", value => set("password", value));
      context.signals.subscribe("snapshotUrl", value => { set("snapshoturl", value); shell.classList.toggle("configured", Boolean(value || video.getAttribute("url"))); });
      context.signals.subscribe("snapshotUserId", value => set("snapshotuserid", value));
      context.signals.subscribe("snapshotPassword", value => set("snapshotpassword", value));
      return () => releaseHandlers.forEach(([button, release]) => ["pointerup", "pointercancel", "lostpointercapture"].forEach(event => button.removeEventListener(event, release)));
    },
  });
})(window.ComposerRuntime);
