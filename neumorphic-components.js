(function (runtime) {
  "use strict";
  const buttonStyles =
    '[data-component^="neumorphic-"] *{box-sizing:border-box}' +
    '[data-component="neumorphic-circle-button"],[data-component="neumorphic-square-button"]{display:block;width:100%;height:100%;padding:14px;font-family:"Segoe UI",sans-serif}' +
    '[data-component^="neumorphic-"] .neo-button-wrap{display:flex;align-items:center;justify-content:center;width:100%;height:100%}' +
    '[data-component^="neumorphic-"] .neo-button{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;padding:10%;border:0;appearance:none;background:var(--surface-color);box-shadow:var(--shadow-distance-px) var(--shadow-distance-px) calc(var(--shadow-distance-px) * 2) var(--shadow-dark-color),calc(var(--shadow-distance-px) * -1) calc(var(--shadow-distance-px) * -1) calc(var(--shadow-distance-px) * 2) var(--shadow-light-color);color:var(--text-color);cursor:pointer;outline:none;touch-action:none;transition:box-shadow .18s,color .18s,transform .08s}' +
    '[data-component="neumorphic-circle-button"] .neo-button{border-radius:50%}' +
    '[data-component="neumorphic-square-button"] .neo-button{border-radius:var(--corner-radius-px)}' +
    '[data-component^="neumorphic-"] .neo-button-icon{width:38%;height:38%;min-height:20px;stroke:currentColor;fill:none;stroke-width:2;filter:none}' +
    '[data-component^="neumorphic-"] .neo-button-label{display:block;max-width:100%;margin-top:6%;overflow:hidden;font-size:var(--text-size-px);font-weight:700;text-overflow:ellipsis;white-space:nowrap}' +
    '[data-component^="neumorphic-"] .neo-button.pressed,[data-component^="neumorphic-"] .neo-button.active{box-shadow:inset calc(var(--shadow-distance-px) * .75) calc(var(--shadow-distance-px) * .75) calc(var(--shadow-distance-px) * 1.5) var(--shadow-dark-color),inset calc(var(--shadow-distance-px) * -.75) calc(var(--shadow-distance-px) * -.75) calc(var(--shadow-distance-px) * 1.5) var(--shadow-light-color),0 0 var(--glow-strength-px) color-mix(in srgb,var(--glow-color) 75%,transparent);color:var(--selected-color)}' +
    '[data-component^="neumorphic-"] .neo-button.active .neo-button-icon{filter:drop-shadow(0 0 5px var(--glow-color))}';
  function iconMarkup(icon) {
    const paths = {
      play: '<path d="M7 4l12 8-12 8z"/>', stop: '<rect x="6" y="6" width="12" height="12"/>', check: '<path d="M4 12l6 6L20 6"/>', power: '<path d="M12 3v9"/><path d="M7.1 5.8a8 8 0 1 0 9.8 0"/>', pause: '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>'
    };
    return `<svg class="neo-button-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[icon] || ""}</svg>`;
  }
  function registerButton(id, name, shape, defaultIcon) {
    runtime.register({
      id, name, category: "Standard Buttons", defaultSize: { width: 150, height: 150 }, data: { defaultIcon },
      properties: [
        { key: "text", name: "Default label", type: "text", defaultValue: name.replace("Neumorphic ", "").replace(" Button", "") },
        { key: "icon", name: "Icon", type: "select", options: ["play", "pause", "stop", "check", "power", "none"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })), defaultValue: defaultIcon },
        { key: "surfaceColor", name: "Surface color", type: "color", defaultValue: "#2c3038" },
        { key: "shadowDarkColor", name: "Dark shadow", type: "color", defaultValue: "#1a1c21" },
        { key: "shadowLightColor", name: "Light shadow", type: "color", defaultValue: "#3e444f" },
        { key: "textColor", name: "Text / icon color", type: "color", defaultValue: "#aab2bd" },
        { key: "selectedColor", name: "Selected text / icon color", type: "color", defaultValue: "#04dcb9" },
        { key: "glowColor", name: "Selected glow color", type: "color", defaultValue: "#04dcb9" },
        { key: "textSize", name: "Text size", type: "number", min: 8, max: 42, step: 1, defaultValue: 16 },
        { key: "shadowDistance", name: "Shadow distance", type: "number", min: 1, max: 20, step: 1, defaultValue: 6 },
        { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 40, step: 1, defaultValue: 3 },
        ...(shape === "square" ? [{ key: "cornerRadius", name: "Corner radius", type: "number", min: 0, max: 60, step: 1, defaultValue: 22 }] : []),
        { key: "showLabel", name: "Show label", type: "checkbox", defaultValue: true },
      ],
      signals: [
        { key: "press", name: "Press", type: "digital", direction: "output", defaultValue: `${shape === "circle" ? "NeumorphicCircleButton" : "NeumorphicSquareButton"}.Press` },
        { key: "selected", name: "Selected", type: "digital", direction: "input", defaultValue: `${shape === "circle" ? "NeumorphicCircleButton" : "NeumorphicSquareButton"}.Selected` },
        { key: "label", name: "Label", type: "serial", direction: "input", defaultValue: `${shape === "circle" ? "NeumorphicCircleButton" : "NeumorphicSquareButton"}.Name` },
      ],
      template: `<div class="neo-button-wrap"><button class="neo-button" type="button">${iconMarkup(defaultIcon)}<span class="neo-button-label"></span></button></div>`, styles: buttonStyles,
      mount(root, context) {
        function iconMarkup(icon) { const paths = { play: '<path d="M7 4l12 8-12 8z"/>', stop: '<rect x="6" y="6" width="12" height="12"/>', check: '<path d="M4 12l6 6L20 6"/>', power: '<path d="M12 3v9"/><path d="M7.1 5.8a8 8 0 1 0 9.8 0"/>', pause: '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>' }; return `<svg class="neo-button-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[icon] || ""}</svg>`; }
        const button = root.querySelector(".neo-button"), label = root.querySelector(".neo-button-label"), p = context.options.properties || {}, defaultIcon = context.options.definitionData.defaultIcon || "none", fallback = String(p.text ?? "Button");
        button.querySelector(".neo-button-icon").outerHTML = iconMarkup(p.icon || defaultIcon); label.textContent = fallback; if (p.showLabel === false || String(p.showLabel).toLowerCase() === "false") label.style.display = "none";
        function release() { button.classList.remove("pressed"); context.signals.publish("press", false); }
        function press(event) { button.classList.add("pressed"); context.signals.publish("press", true); event.preventDefault(); }
        button.addEventListener("pointerdown", press); button.addEventListener("pointerup", release); button.addEventListener("pointerleave", release); button.addEventListener("pointercancel", release);
        context.signals.subscribe("selected", value => button.classList.toggle("active", value === true || value === 1 || value === "1"));
        context.signals.subscribe("label", value => { label.textContent = value == null || value === "" ? fallback : String(value); });
        return () => { button.removeEventListener("pointerdown", press); button.removeEventListener("pointerup", release); button.removeEventListener("pointerleave", release); button.removeEventListener("pointercancel", release); };
      },
    });
  }
  registerButton("neumorphic-circle-button", "Neumorphic Circle Button", "circle", "play");
  registerButton("neumorphic-square-button", "Neumorphic Square Button", "square", "stop");
  runtime.register({
    id: "neumorphic-volume-knob", name: "Neumorphic Volume Knob", category: "Sliders & Levels", defaultSize: { width: 260, height: 290 },
    properties: [
      { key: "localName", name: "Local name", type: "text", defaultValue: "Volume" }, { key: "defaultPercent", name: "Default percentage", type: "number", min: 0, max: 100, step: 1, defaultValue: 40 },
      { key: "outputScale", name: "Outgoing analog scale", type: "select", options: [{ value: "65535", label: "0–65535" }, { value: "100", label: "0–100" }], defaultValue: "65535" },
      { key: "surfaceColor", name: "Surface color", type: "color", defaultValue: "#2c3038" }, { key: "shadowDarkColor", name: "Dark shadow", type: "color", defaultValue: "#1a1c21" }, { key: "shadowLightColor", name: "Light shadow", type: "color", defaultValue: "#3e444f" },
      { key: "lowColor", name: "Gauge low color", type: "color", defaultValue: "#4caf50" }, { key: "middleColor", name: "Gauge middle color", type: "color", defaultValue: "#ffeb3b" }, { key: "highColor", name: "Gauge high color", type: "color", defaultValue: "#f44336" }, { key: "inactiveColor", name: "Inactive color", type: "color", defaultValue: "#3e444f" },
      { key: "textColor", name: "Text color", type: "color", defaultValue: "#ffffff" }, { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 30, step: 1, defaultValue: 8 }, { key: "showLabel", name: "Show label", type: "checkbox", defaultValue: true }, { key: "showPercentage", name: "Show percentage", type: "checkbox", defaultValue: true },
    ],
    signals: [{ key: "set", name: "Value Set", type: "analog", direction: "output", defaultValue: "NeumorphicVolumeKnob.ValueSet" }, { key: "feedback", name: "Feedback", type: "analog", direction: "input", defaultValue: "NeumorphicVolumeKnob.Feedback" }, { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "NeumorphicVolumeKnob.Name" }],
    template: '<div class="neo-knob-control"><div class="neo-knob-wrap"><svg viewBox="0 0 220 220"><circle class="neo-track" cx="110" cy="110" r="104"/><path class="neo-arc-bg"/><path class="neo-arc"/><g class="neo-dots"></g><polygon class="neo-position"/></svg><div class="neo-knob-face"><div class="neo-knob-inner"><span class="neo-knob-value">40%</span></div></div></div><div class="neo-knob-name">Volume</div></div>',
    styles: '[data-component="neumorphic-volume-knob"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box;font-family:"Segoe UI",sans-serif;touch-action:none}[data-component="neumorphic-volume-knob"] *{box-sizing:border-box}[data-component="neumorphic-volume-knob"] .neo-knob-control{display:grid;grid-template-rows:minmax(0,1fr) auto;place-items:center;width:100%;height:100%}[data-component="neumorphic-volume-knob"] .neo-knob-wrap{position:relative;height:100%;max-width:100%;aspect-ratio:1;touch-action:none}[data-component="neumorphic-volume-knob"] svg{position:absolute;z-index:2;inset:0;width:100%;height:100%;pointer-events:none}[data-component="neumorphic-volume-knob"] .neo-track{fill:none;stroke:var(--shadow-dark-color);stroke-width:14;opacity:.55}[data-component="neumorphic-volume-knob"] .neo-arc-bg{fill:none;stroke:var(--shadow-dark-color);stroke-width:6}[data-component="neumorphic-volume-knob"] .neo-arc{fill:none;stroke-width:6;stroke-linecap:round}[data-component="neumorphic-volume-knob"] .neo-knob-face{position:absolute;z-index:1;inset:11%;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--surface-color);box-shadow:8px 8px 16px var(--shadow-dark-color),-8px -8px 16px var(--shadow-light-color);cursor:grab}[data-component="neumorphic-volume-knob"] .neo-knob-inner{display:flex;align-items:center;justify-content:center;width:70%;height:70%;border-radius:50%;background:var(--surface-color);box-shadow:inset 4px 4px 8px var(--shadow-dark-color),inset -4px -4px 8px var(--shadow-light-color)}[data-component="neumorphic-volume-knob"] .neo-knob-value{color:var(--text-color);font-size:22px;font-weight:700}[data-component="neumorphic-volume-knob"] .neo-knob-name{color:var(--text-color);font-size:16px;font-weight:700;text-align:center}',
    mount(root, context) {
      const wrap = root.querySelector(".neo-knob-wrap"), arcBg = root.querySelector(".neo-arc-bg"), arc = root.querySelector(".neo-arc"), dots = root.querySelector(".neo-dots"), position = root.querySelector(".neo-position"), valueElement = root.querySelector(".neo-knob-value"), name = root.querySelector(".neo-knob-name"), p = context.options.properties || {};
      const start = 225, sweep = 270, radius = 92, count = 14; let value = clamp(Number(p.defaultPercent) || 0), dragging = false, lastAngle = 0;
      if (p.showLabel === false || String(p.showLabel).toLowerCase() === "false") name.style.display = "none"; if (p.showPercentage === false || String(p.showPercentage).toLowerCase() === "false") valueElement.style.display = "none"; name.textContent = p.localName || "Volume";
      function clamp(input) { return Math.max(0, Math.min(100, input)); } function polar(r, degrees) { const angle = (degrees - 90) * Math.PI / 180; return { x: 110 + r * Math.cos(angle), y: 110 + r * Math.sin(angle) }; }
      function path(from, to) { const a = polar(radius, to), b = polar(radius, from); return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${to - from <= 180 ? 0 : 1} 0 ${b.x} ${b.y}`; }
      function color(amount) { const low = p.lowColor || "#4caf50", middle = p.middleColor || "#ffeb3b", high = p.highColor || "#f44336", mix = (a,b,t) => { const x=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)),y=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));return `rgb(${x.map((n,i)=>Math.round(n+(y[i]-n)*t)).join(",")})`; }; return amount <= 58 ? low : amount <= 82 ? mix(low,middle,(amount-58)/24) : mix(middle,high,(amount-82)/18); }
      arcBg.setAttribute("d", path(start, start + sweep)); const dotElements = [];
      for (let index=0; index<count; index++) { const point=polar(104,start+sweep*index/(count-1)),dot=document.createElementNS("http://www.w3.org/2000/svg","circle");dot.setAttribute("cx",point.x);dot.setAttribute("cy",point.y);dot.setAttribute("r","3.2");dots.appendChild(dot);dotElements.push(dot); }
      function render() { const gauge=color(value); arc.setAttribute("d",path(start,start+sweep*value/100));arc.style.stroke=gauge;arc.style.filter=`drop-shadow(0 0 ${Number(p.glowStrength||8)}px ${gauge})`;dotElements.forEach((dot,index)=>{const lit=index<=Math.round(value/100*(count-1));dot.style.fill=lit?gauge:(p.inactiveColor||"#3e444f");dot.style.filter=lit?`drop-shadow(0 0 3px ${gauge})`:"none";});const markerAngle=start+sweep*value/100,tip=polar(88,markerAngle),left=polar(66,markerAngle-5.5),right=polar(66,markerAngle+5.5);position.setAttribute("points",`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`);position.style.fill="#fff";position.style.stroke="rgba(0,0,0,.85)";position.style.strokeWidth="1";position.style.filter="drop-shadow(0 0 4px #fff)";valueElement.textContent=`${Math.round(value)}%`; }
      function angle(event){const rect=wrap.getBoundingClientRect();return Math.atan2(event.clientY-rect.top-rect.height/2,event.clientX-rect.left-rect.width/2)*180/Math.PI;} function publish(){context.signals.publish("set",p.outputScale==="100"?Math.round(value):Math.round(value/100*65535));}
      function down(event){dragging=true;lastAngle=angle(event);wrap.setPointerCapture?.(event.pointerId);event.preventDefault();} function move(event){if(!dragging)return;const current=angle(event);let delta=current-lastAngle;if(delta>180)delta-=360;if(delta<-180)delta+=360;value=clamp(value+delta*100/sweep);lastAngle=current;render();publish();event.preventDefault();} function up(){dragging=false;}
      wrap.addEventListener("pointerdown",down);wrap.addEventListener("pointermove",move);wrap.addEventListener("pointerup",up);wrap.addEventListener("pointercancel",up);context.signals.subscribe("feedback",input=>{const n=Number(input)||0;value=clamp(n>100?n/65535*100:n);render();});context.signals.subscribe("name",input=>{name.textContent=input==null||input===""?(p.localName||"Volume"):String(input);});render();
      return()=>{wrap.removeEventListener("pointerdown",down);wrap.removeEventListener("pointermove",move);wrap.removeEventListener("pointerup",up);wrap.removeEventListener("pointercancel",up);};
    },
  });
})(window.ComposerRuntime);
