(function (runtime) {
  "use strict";

  runtime.register({
    id: "music-card",
    name: "Music Card",
    category: "Status & Information",
    defaultSize: { width: 220, height: 300 },
    properties: [
      { key: "localTitle", name: "Default title", type: "text", defaultValue: "ROSE MUSIC" },
      { key: "localArtist", name: "Default artist", type: "text", defaultValue: "Steven Blake" },
      { key: "icon", name: "Icon", type: "select", options: [
        { value: "music", label: "Music notes" }, { value: "album", label: "Album" },
        { value: "play", label: "Play" }, { value: "radio", label: "Radio" },
        { value: "headphones", label: "Headphones" }, { value: "none", label: "None" }
      ], defaultValue: "music" },
      { key: "showIcon", name: "Show icon", type: "checkbox", defaultValue: true },
      { key: "showTitle", name: "Show title", type: "checkbox", defaultValue: true },
      { key: "showArtist", name: "Show artist", type: "checkbox", defaultValue: true },
      { key: "showWave", name: "Show equalizer", type: "checkbox", defaultValue: true },
      { key: "animateWhileIdle", name: "Animate while idle", type: "checkbox", defaultValue: true },
      { key: "barCount", name: "Equalizer bars", type: "number", min: 6, max: 40, step: 1, defaultValue: 26 },
      { key: "animationSpeed", name: "Animation speed", type: "number", min: 80, max: 1200, step: 20, defaultValue: 260 },
      { key: "titleSize", name: "Title size", type: "number", min: 8, max: 42, step: 1, defaultValue: 16 },
      { key: "artistSize", name: "Artist size", type: "number", min: 8, max: 36, step: 1, defaultValue: 13 },
      { key: "iconSize", name: "Icon size", type: "number", min: 20, max: 100, step: 1, defaultValue: 48 },
      { key: "surfaceColor", name: "Surface color", type: "color", defaultValue: "#2c3038" },
      { key: "shadowColor", name: "Dark shadow", type: "color", defaultValue: "#171a20" },
      { key: "highlightColor", name: "Light shadow", type: "color", defaultValue: "#444b57" },
      { key: "accentColor", name: "Accent / wave color", type: "color", defaultValue: "#ff4d6d" },
      { key: "titleColor", name: "Title color", type: "color", defaultValue: "#f2f4f7" },
      { key: "artistColor", name: "Artist color", type: "color", defaultValue: "#ff4d6d" },
      { key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 70, step: 1, defaultValue: 34 },
      { key: "shadowSize", name: "Shadow size", type: "number", min: 0, max: 24, step: 1, defaultValue: 8 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 30, step: 1, defaultValue: 8 }
    ],
    signals: [
      { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: "MusicCard.Press" },
      { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: "MusicCard.Selected" },
      { key: "playing", name: "Playing", type: "digital", direction: "input", defaultValue: "MusicCard.Playing" },
      { key: "level", name: "Feedback", type: "analog", direction: "input", defaultValue: "MusicCard.Feedback" },
      { key: "title", name: "Name", type: "serial", direction: "input", defaultValue: "MusicCard.Name" },
      { key: "artist", name: "Artist Name", type: "serial", direction: "input", defaultValue: "MusicCard.ArtistName" }
    ],
    template: '<div class="music-card"><button class="music-icon-wrap" type="button"><svg class="music-icon" viewBox="0 0 24 24" aria-hidden="true"></svg></button><span class="music-title"></span><span class="music-artist"></span><span class="music-wave"></span></div>',
    styles: '[data-component="music-card"]{display:block;width:100%;height:100%;padding:14px;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="music-card"] *{box-sizing:border-box}[data-component="music-card"] .music-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;padding:12% 9%;overflow:hidden;border-radius:var(--corner);background:var(--surface);box-shadow:var(--shadow-size) var(--shadow-size) calc(var(--shadow-size) * 2) var(--shadow),calc(var(--shadow-size) * -1) calc(var(--shadow-size) * -1) calc(var(--shadow-size) * 2) var(--highlight);color:var(--title)}[data-component="music-card"] .music-icon-wrap{display:flex;align-items:center;justify-content:center;width:min(48%,100px);aspect-ratio:1;flex:0 1 auto;margin-bottom:2%;border:0;padding:0;border-radius:27%;background:var(--surface);box-shadow:5px 5px 10px var(--shadow),-5px -5px 10px var(--highlight);cursor:pointer;touch-action:none;transition:transform .1s,box-shadow .2s}[data-component="music-card"] .music-icon-wrap.pressed,[data-component="music-card"] .music-icon-wrap.active{transform:scale(.96);box-shadow:inset 5px 5px 10px var(--shadow),inset -5px -5px 10px var(--highlight),0 0 var(--glow) color-mix(in srgb,var(--accent) 70%,transparent)}[data-component="music-card"] .music-icon{width:var(--icon-size);height:var(--icon-size);max-width:72%;max-height:72%;fill:none;stroke:var(--accent);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 calc(var(--glow) * .65) var(--accent))}[data-component="music-card"] .music-title{display:block;max-width:100%;overflow:hidden;color:var(--title);font-size:var(--title-size);font-weight:800;letter-spacing:.08em;text-overflow:ellipsis;white-space:nowrap}[data-component="music-card"] .music-artist{display:block;max-width:100%;margin-top:-4px;overflow:hidden;color:var(--artist);font-size:var(--artist-size);letter-spacing:.04em;text-overflow:ellipsis;white-space:nowrap}[data-component="music-card"] .music-wave{display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:18%;min-height:22px;margin-top:3%}[data-component="music-card"] .music-wave i{display:block;flex:1 1 2px;max-width:4px;min-width:1px;height:12%;border-radius:3px;background:var(--accent);box-shadow:0 0 calc(var(--glow) * .5) var(--accent);transition:height .18s ease}[data-component="music-card"] .music-card:not(.playing) .music-wave i{height:10% !important;opacity:.45}',
    mount(root, context) {
      const p = context.options.properties || {}, card = root.querySelector(".music-card"), icon = root.querySelector(".music-icon"), iconWrap = root.querySelector(".music-icon-wrap"), title = root.querySelector(".music-title"), artist = root.querySelector(".music-artist"), wave = root.querySelector(".music-wave"), truthy = (value, fallback) => value == null ? fallback : value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true", paths = { music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', album: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6"/>', play: '<path d="M8 5l11 7-11 7z"/>', radio: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7l10-4M7 12h4"/><circle cx="16" cy="14" r="3"/>', headphones: '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1v-5zm16 0h-3v6h2a1 1 0 0 0 1-1v-5z"/>', none: "" }; let playing = truthy(p.animateWhileIdle, true), level = 100, timer = 0;
      root.style.setProperty("--surface", p.surfaceColor || "#2c3038"); root.style.setProperty("--shadow", p.shadowColor || "#171a20"); root.style.setProperty("--highlight", p.highlightColor || "#444b57"); root.style.setProperty("--accent", p.accentColor || "#ff4d6d"); root.style.setProperty("--title", p.titleColor || "#f2f4f7"); root.style.setProperty("--artist", p.artistColor || p.accentColor || "#ff4d6d"); root.style.setProperty("--corner", `${Number(p.cornerRadius ?? 34)}px`); root.style.setProperty("--shadow-size", `${Number(p.shadowSize ?? 8)}px`); root.style.setProperty("--glow", `${Number(p.glowStrength ?? 8)}px`); root.style.setProperty("--title-size", `${Number(p.titleSize ?? 16)}px`); root.style.setProperty("--artist-size", `${Number(p.artistSize ?? 13)}px`); root.style.setProperty("--icon-size", `${Number(p.iconSize ?? 48)}px`);
      title.textContent = String(p.localTitle ?? "ROSE MUSIC"); artist.textContent = String(p.localArtist ?? "Steven Blake"); icon.innerHTML = paths[p.icon || "music"] || ""; iconWrap.style.display = truthy(p.showIcon, true) && p.icon !== "none" ? "" : "none"; title.style.display = truthy(p.showTitle, true) ? "" : "none"; artist.style.display = truthy(p.showArtist, true) ? "" : "none"; wave.style.display = truthy(p.showWave, true) ? "" : "none";
      const count = Math.max(6, Math.min(40, Number(p.barCount) || 26)), bars = []; for (let index = 0; index < count; index++) { const bar = document.createElement("i"); wave.appendChild(bar); bars.push(bar); }
      function renderWave() { card.classList.toggle("playing", playing); bars.forEach((bar, index) => { const phase = Date.now() / 210 + index * .82, variation = .28 + Math.abs(Math.sin(phase) * .72), height = playing ? Math.max(7, variation * level) : 10; bar.style.height = `${height}%`; }); }
      function restart() { if (timer) clearInterval(timer); renderWave(); timer = setInterval(renderWave, Math.max(80, Number(p.animationSpeed) || 260)); }
      const down = event => { iconWrap.classList.add("pressed"); context.signals.publish("press", true); event.preventDefault(); }, up = () => { iconWrap.classList.remove("pressed"); context.signals.publish("press", false); }; iconWrap.addEventListener("pointerdown", down); iconWrap.addEventListener("pointerup", up); iconWrap.addEventListener("pointerleave", up); iconWrap.addEventListener("pointercancel", up);
      context.signals.subscribe("selected", value => { const selected = truthy(value, false); iconWrap.classList.toggle("active", selected); if (!selected) iconWrap.classList.remove("pressed"); }); context.signals.subscribe("playing", value => { playing = truthy(value, false); renderWave(); }); context.signals.subscribe("level", value => { const input = Number(value) || 0; level = Math.max(0, Math.min(100, input > 100 ? input / 65535 * 100 : input)); renderWave(); }); context.signals.subscribe("title", value => { if (value != null) title.textContent = String(value); }); context.signals.subscribe("artist", value => { if (value != null) artist.textContent = String(value); }); restart(); return () => { clearInterval(timer); iconWrap.removeEventListener("pointerdown", down); iconWrap.removeEventListener("pointerup", up); iconWrap.removeEventListener("pointerleave", up); iconWrap.removeEventListener("pointercancel", up); };
    }
  });
})(window.ComposerRuntime);
