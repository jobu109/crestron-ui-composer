(function (runtime) {
  "use strict";
  runtime.register({
    id: "system-start-stop",
    name: "System Start / Stop",
    category: "Buttons",
    defaultSize: { width: 300, height: 300 },
    properties: [
      { key: "systemText", name: "Default system name", type: "text", defaultValue: "SYSTEM" },
      { key: "startText", name: "Start text", type: "text", defaultValue: "START" },
      { key: "stopText", name: "Stop text", type: "text", defaultValue: "STOP" },
      { key: "offColor", name: "Stopped / start color", type: "color", defaultValue: "#dc2626" },
      { key: "offGlowColor", name: "Stopped glow color", type: "color", defaultValue: "#fca5a5" },
      { key: "onColor", name: "Running / stop color", type: "color", defaultValue: "#22c55e" },
      { key: "onGlowColor", name: "Running glow color", type: "color", defaultValue: "#86efac" },
      { key: "faceColor", name: "Button face color", type: "color", defaultValue: "#080808" },
      { key: "systemTextColor", name: "System name color", type: "color", defaultValue: "#c0305a" },
      { key: "labelSize", name: "Start / stop text size", type: "number", min: 10, max: 60, step: 1, defaultValue: 22 },
      { key: "systemTextSize", name: "System name size", type: "number", min: 7, max: 36, step: 1, defaultValue: 11 },
      { key: "ringWidth", name: "Ring width", type: "number", min: 5, max: 42, step: 1, defaultValue: 22 },
      { key: "glowStrength", name: "Glow strength", type: "number", min: 0, max: 50, step: 1, defaultValue: 30 },
      { key: "swirlIntensity", name: "Morph / swirl intensity", type: "number", min: 0, max: 100, step: 1, defaultValue: 72 },
      { key: "vortexIntensity", name: "Inner metal vortex intensity", type: "number", min: 0, max: 100, step: 1, defaultValue: 78 },
      { key: "startDuration", name: "Start animation (ms)", type: "number", min: 300, max: 8000, step: 100, defaultValue: 2600 },
      { key: "stopDuration", name: "Stop animation (ms)", type: "number", min: 300, max: 8000, step: 100, defaultValue: 1900 },
      { key: "defaultRunning", name: "Default running state", type: "checkbox", defaultValue: false },
    ],
    signals: [
      { key: "startPress", name: "Start Press", type: "digital", direction: "output", defaultValue: "SystemStartStop.StartPress" },
      { key: "stopPress", name: "Stop Press", type: "digital", direction: "output", defaultValue: "SystemStartStop.StopPress" },
      { key: "selected", name: "Running Selected", type: "digital", direction: "input", defaultValue: "SystemStartStop.Selected" },
      { key: "name", name: "Name", type: "serial", direction: "input", defaultValue: "SystemStartStop.Name" },
    ],
    template: '<div class="sss-root"><button class="sss-button" type="button" aria-label="System start stop"><canvas width="300" height="300"></canvas><span class="sss-face"><span class="sss-vortex"><span class="sss-panel sss-panel-left"></span><span class="sss-panel sss-panel-right"></span></span><span class="sss-pill"></span><span class="sss-system">SYSTEM</span><span class="sss-label sss-start">START</span><span class="sss-label sss-stop">STOP</span></span></button></div>',
    styles: '[data-component="system-start-stop"]{display:block;width:100%;height:100%;padding:3%;box-sizing:border-box;font-family:"Segoe UI",sans-serif}[data-component="system-start-stop"] *{box-sizing:border-box}[data-component="system-start-stop"] .sss-root{display:flex;align-items:center;justify-content:center;width:100%;height:100%}[data-component="system-start-stop"] .sss-button{position:relative;width:min(100%,100vh);height:min(100%,100vw);max-width:100%;max-height:100%;aspect-ratio:1;padding:0;border:0;border-radius:50%;appearance:none;background:transparent;cursor:pointer;touch-action:none}[data-component="system-start-stop"] canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}[data-component="system-start-stop"] .sss-face{position:absolute;inset:17%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #181818;border-radius:50%;background:radial-gradient(ellipse at 45% 38%,color-mix(in srgb,var(--face-color) 72%,#fff) 0%,var(--face-color) 62%,#020202 100%);box-shadow:inset 0 5px 10px rgba(255,255,255,.06),inset 0 -12px 20px #000;user-select:none;pointer-events:none;transition:transform .14s}[data-component="system-start-stop"] .sss-button.pressed .sss-face{transform:scale(.95);filter:brightness(1.18)}[data-component="system-start-stop"] .sss-pill{width:19%;height:5.5%;margin-bottom:5%;border-radius:999px;background:var(--off-color);box-shadow:0 0 calc(var(--glow-strength-px) * .45) var(--off-color);transition:background .7s,box-shadow .7s}[data-component="system-start-stop"] .sss-system{margin-bottom:2.5%;color:var(--system-text-color);font:700 var(--system-text-size-px)/1 "Segoe UI",sans-serif;letter-spacing:.22em}[data-component="system-start-stop"] .sss-label{font:800 var(--label-size-px)/1.22 "Segoe UI",sans-serif;letter-spacing:.18em;transition:color .65s,text-shadow .65s,opacity .65s}[data-component="system-start-stop"] .sss-start{color:var(--off-color);text-shadow:0 0 calc(var(--glow-strength-px) * .5) var(--off-color)}[data-component="system-start-stop"] .sss-stop{color:color-mix(in srgb,var(--on-color) 14%,#070707);opacity:.35}[data-component="system-start-stop"] .sss-button.on .sss-pill{background:var(--on-color);box-shadow:0 0 calc(var(--glow-strength-px) * .45) var(--on-color)}[data-component="system-start-stop"] .sss-button.on .sss-start{color:color-mix(in srgb,var(--off-color) 14%,#070707);text-shadow:none;opacity:.35}[data-component="system-start-stop"] .sss-button.on .sss-stop{color:var(--on-color);text-shadow:0 0 calc(var(--glow-strength-px) * .5) var(--on-color);opacity:1}',
    mount(root, context) {
      const button = root.querySelector(".sss-button"), canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d"), face = root.querySelector(".sss-face"), vortex = root.querySelector(".sss-vortex"), leftPanel = root.querySelector(".sss-panel-left"), rightPanel = root.querySelector(".sss-panel-right"), pill = root.querySelector(".sss-pill"), system = root.querySelector(".sss-system"), startLabel = root.querySelector(".sss-start"), stopLabel = root.querySelector(".sss-stop"), p = context.options.properties || {};
      let running = p.defaultRunning === true || String(p.defaultRunning).toLowerCase() === "true", targetRunning = running, frame = 0, pressedKey = "";
      system.textContent = p.systemText || "SYSTEM"; startLabel.textContent = p.startText || "START"; stopLabel.textContent = p.stopText || "STOP";
      face.style.overflow = "hidden";
      vortex.style.cssText = "position:absolute;z-index:0;inset:0;border-radius:50%;overflow:hidden;opacity:0;transform:rotate(0deg);transform-origin:center;will-change:transform,opacity";
      leftPanel.style.cssText = "position:absolute;left:0;top:0;width:51%;height:100%;border-radius:100% 0 0 100%;background:linear-gradient(105deg,#111519 0%,#778188 22%,#252b30 48%,#aeb8be 72%,#171b1e 100%);border-right:2px solid #07090a;box-shadow:inset 8px 0 15px rgba(255,255,255,.2),inset -10px 0 18px rgba(0,0,0,.72),4px 0 8px #000;transform:translateX(-108%);will-change:transform";
      rightPanel.style.cssText = "position:absolute;right:0;top:0;width:51%;height:100%;border-radius:0 100% 100% 0;background:linear-gradient(75deg,#171b1e 0%,#aeb8be 28%,#252b30 52%,#778188 78%,#111519 100%);border-left:2px solid #07090a;box-shadow:inset -8px 0 15px rgba(255,255,255,.2),inset 10px 0 18px rgba(0,0,0,.72),-4px 0 8px #000;transform:translateX(108%);will-change:transform";
      [pill,system,startLabel,stopLabel].forEach(element=>{element.style.position="relative";element.style.zIndex="1";});
      const off = p.offColor || "#dc2626", offGlow = p.offGlowColor || "#fca5a5", on = p.onColor || "#22c55e", onGlow = p.onGlowColor || "#86efac", intensity = Math.max(0, Math.min(1, Number(p.swirlIntensity || 72) / 100)), vortexIntensity = Math.max(0, Math.min(1, Number(p.vortexIntensity || 78) / 100));
      function rgb(hex) { const value = String(hex).replace("#", ""); return [parseInt(value.slice(0,2),16)||0,parseInt(value.slice(2,4),16)||0,parseInt(value.slice(4,6),16)||0]; }
      function mix(a,b,t) { const x=rgb(a),y=rgb(b); return "rgb("+x.map((v,i)=>Math.round(v+(y[i]-v)*t)).join(",")+")"; }
      function ease(t) { return t < .5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
      function ring(color, glow, progress, angle) {
        const size=300,c=150,base=116,width=Math.max(5,Number(p.ringWidth||22)), warp=Math.sin(Math.PI*progress)*intensity;
        ctx.clearRect(0,0,size,size); ctx.lineJoin="round"; ctx.lineCap="round";
        for (const layer of [[Number(p.glowStrength||30),.35,width+10],[Number(p.glowStrength||30)*.55,.7,width+4],[7,1,width]]) {
          ctx.beginPath(); ctx.shadowColor=glow; ctx.shadowBlur=layer[0]; ctx.globalAlpha=layer[1];
          for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,r=base+Math.sin(a*3-angle*1.6)*10*warp+Math.sin(a*5+angle)*4*warp,x=c+Math.cos(a)*r,y=c+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.strokeStyle=color; ctx.lineWidth=layer[2]; ctx.stroke();
        }
        ctx.globalAlpha=1;
        if(warp>.01){for(let arm=0;arm<3;arm++){const head=angle+arm*Math.PI*2/3,span=.6+warp*1.35;ctx.beginPath();ctx.shadowColor=glow;ctx.shadowBlur=28+warp*24;ctx.arc(c,c,base,head-span,head);ctx.strokeStyle=arm===0?"#fff":glow;ctx.lineWidth=width*(arm===0?.28:.52);ctx.stroke();}}
        ctx.shadowBlur=0;ctx.globalAlpha=1;
      }
      function stable(value){running=targetRunning=!!value;button.classList.toggle("on",running);button.setAttribute("aria-pressed",running?"true":"false");vortex.style.opacity="0";vortex.style.transform="rotate(0deg)";leftPanel.style.transform="translateX(-108%)";rightPanel.style.transform="translateX(108%)";ring(running?on:off,running?onGlow:offGlow,0,-Math.PI/2);}
      function animate(next){next=!!next;if(frame)cancelAnimationFrame(frame);targetRunning=next;const from=running?on:off,to=next?on:off,fromGlow=running?onGlow:offGlow,toGlow=next?onGlow:offGlow,duration=Math.max(300,Number(next?p.startDuration:p.stopDuration)||2000),spins=next?3.6:3,t0=performance.now();function step(now){const raw=Math.min(1,(now-t0)/duration),e=ease(raw),angle=-Math.PI/2+Math.PI*2*spins*e,panelPhase=raw<.5?ease(raw*2):ease((1-raw)*2),travel=108*(1-panelPhase),turn=240*e+45*panelPhase;ring(mix(from,to,e),mix(fromGlow,toGlow,e),raw,angle);vortex.style.opacity=String(Math.min(1,panelPhase*1.8)*vortexIntensity);vortex.style.transform="rotate("+turn+"deg)";leftPanel.style.transform="translateX(-"+travel+"%)";rightPanel.style.transform="translateX("+travel+"%)";if(raw>=.5)button.classList.toggle("on",next);if(raw<1)frame=requestAnimationFrame(step);else{frame=0;stable(next);}}frame=requestAnimationFrame(step);}
      function release(){button.classList.remove("pressed");if(pressedKey)context.signals.publish(pressedKey,false);pressedKey="";}
      function press(event){release();pressedKey=running?"stopPress":"startPress";button.classList.add("pressed");context.signals.publish(pressedKey,true);animate(!running);event.preventDefault();}
      button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointerleave",release);button.addEventListener("pointercancel",release);
      context.signals.subscribe("selected",value=>{const next=value===true||value===1||value==="1";if(next!==targetRunning)animate(next);});
      context.signals.subscribe("name",value=>{system.textContent=value==null||value===""?(p.systemText||"SYSTEM"):String(value);});
      stable(running);
      return()=>{if(frame)cancelAnimationFrame(frame);button.removeEventListener("pointerdown",press);button.removeEventListener("pointerup",release);button.removeEventListener("pointerleave",release);button.removeEventListener("pointercancel",release);};
    },
  });
})(window.ComposerRuntime);
