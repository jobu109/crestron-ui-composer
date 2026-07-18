(function(runtime){
  "use strict";
  runtime.register({
    id:"standard-button",
    name:"Standard Button",
    category:"Buttons",
    defaultSize:{width:220,height:100},
    properties:[{key:"text",name:"Default label",type:"text",defaultValue:"Button"},{key:"textColor",name:"Text color",type:"color",defaultValue:"#ffffff"},{key:"faceColor",name:"Button tint",type:"color",defaultValue:"#04aa8e"},{key:"borderColor",name:"Border color",type:"color",defaultValue:"#ffffff"},{key:"glowColor",name:"Glow color",type:"color",defaultValue:"#04aa8e"},{key:"selectedColor",name:"Selected tint",type:"color",defaultValue:"#04aa8e"}],
    signals:[
      {key:"press",name:"Press",type:"digital",direction:"output",defaultValue:"81"},
      {key:"selected",name:"Selected",type:"digital",direction:"input",defaultValue:"91"},
      {key:"label",name:"Label",type:"serial",direction:"input",defaultValue:"101"}
    ],
    template:'<button class="standard-button" type="button"><span class="standard-button-label">Button</span></button>',
    styles:'[data-component="standard-button"]{display:block;width:100%;height:100%;padding:10px;box-sizing:border-box}[data-component="standard-button"] *{box-sizing:border-box}[data-component="standard-button"] .standard-button{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;padding:12px;border:1px solid rgba(255,255,255,.36);border-radius:24px;appearance:none;background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(52,68,68,.26) 42%,rgba(4,170,142,.16));box-shadow:inset 0 1px 0 rgba(255,255,255,.42),inset 0 -20px 34px rgba(4,170,142,.1),0 0 10px rgba(4,170,142,.35),0 6px 12px rgba(0,0,0,.22);color:#fff;font-family:"Segoe UI",sans-serif;cursor:pointer;touch-action:none}[data-component="standard-button"] .standard-button-label{overflow:hidden;color:#fff;font-size:clamp(16px,20%,42px);font-weight:800;text-align:center;text-overflow:ellipsis;text-shadow:0 2px 5px rgba(0,0,0,.65);white-space:nowrap}[data-component="standard-button"] .standard-button.pressed{filter:brightness(1.14)}[data-component="standard-button"] .standard-button.active{border-color:rgba(4,170,142,.95);background:linear-gradient(145deg,rgba(255,255,255,.28),rgba(52,68,68,.24) 38%,rgba(4,170,142,.36));box-shadow:inset 0 1px 0 rgba(255,255,255,.46),0 0 16px rgba(4,170,142,.72),0 6px 12px rgba(0,0,0,.22)}',
    mount(root,context){
      const button=root.querySelector(".standard-button"),label=root.querySelector(".standard-button-label"),defaultLabel=(context.options.properties&&context.options.properties.text)||"Button",theme=document.createElement("style");theme.textContent='[data-component="standard-button"] .standard-button{color:var(--text-color);border-color:color-mix(in srgb,var(--border-color) 36%,transparent);background:linear-gradient(145deg,rgba(255,255,255,.24),rgba(52,68,68,.26) 42%,color-mix(in srgb,var(--face-color) 16%,transparent));box-shadow:inset 0 1px rgba(255,255,255,.42),inset 0 -20px 34px color-mix(in srgb,var(--face-color) 10%,transparent),0 0 10px color-mix(in srgb,var(--glow-color) 35%,transparent),0 6px 12px rgba(0,0,0,.22)}[data-component="standard-button"] .standard-button-label{color:var(--text-color)}[data-component="standard-button"] .standard-button.active{border-color:var(--selected-color);background:linear-gradient(145deg,rgba(255,255,255,.28),rgba(52,68,68,.24) 38%,color-mix(in srgb,var(--selected-color) 36%,transparent));box-shadow:inset 0 1px rgba(255,255,255,.46),0 0 16px color-mix(in srgb,var(--glow-color) 72%,transparent),0 6px 12px rgba(0,0,0,.22)}';root.appendChild(theme);label.textContent=defaultLabel;
      function release(){button.classList.remove("pressed");context.signals.publish("press",false)}
      function press(event){button.classList.add("pressed");context.signals.publish("press",true);if(event)event.preventDefault()}
      function navigate(){if(context.options.targetPage)context.navigate(context.options.targetPage)}
      button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointerup",navigate);button.addEventListener("pointerleave",release);button.addEventListener("pointercancel",release);
      context.signals.subscribe("selected",value=>button.classList.toggle("active",value===true||value===1||value==="1"));context.signals.subscribe("label",value=>{label.textContent=value||defaultLabel;button.setAttribute("aria-label",label.textContent)});
      return()=>{button.removeEventListener("pointerdown",press);button.removeEventListener("pointerup",release);button.removeEventListener("pointerup",navigate);button.removeEventListener("pointerleave",release);button.removeEventListener("pointercancel",release)};
    }
  });
})(window.ComposerRuntime);
