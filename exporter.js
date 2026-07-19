(function (global) {
  "use strict";
  function escapeAttr(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }
  function propertyStyle(properties) {
    return Object.entries(properties || {})
      .flatMap(([key, value]) => {
        const name = `--${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`,
          clean = String(value).replace(/[;<>]/g, "");
        return typeof value === "number"
          ? [
              `${name}:${clean}`,
              `${name}-px:${clean}px`,
              `${name}-percent:${clean}%`,
            ]
          : [`${name}:${clean}`];
      })
      .join(";");
  }
  function contractPattern(value) {
    return String(value || "").replace(
      /^(.*)\.\{(?:n|index)\}\.(.+)$/,
      (_, prefix, attribute) =>
        `${prefix}[{index}].${attribute.replace(/\./g, "_")}`,
    );
  }
  function contractProperties(item) {
    const properties = Object.fromEntries(
      Object.entries(item.properties || {}).map(([key, value]) => [
        key,
        item.properties?.bindingMode === "contract" && typeof value === "string"
          ? contractPattern(value)
          : value,
      ]),
    );
    if (item.componentId === "rolling-menu" && properties.bindingMode === "contract") {
      properties.itemCountSignal = "RollingMenu.ItemCount";
      properties.selectedSetSignal = "RollingMenu.SelectedSet";
      properties.selectedOutSignal = "RollingMenu.SelectedFeedback";
      ["pressBase", "feedbackBase", "labelBase"].forEach((key) => {
        const attribute = String(properties[key] || "").split(".").pop();
        properties[key] = `RollingMenu.Items[{index}].${attribute}`;
      });
    }
    return properties;
  }
  function contractIdentifier(value) {
    const clean = String(value || "")
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return /^[A-Za-z_]/.test(clean) ? clean : `_${clean}`;
  }
  function contractPrefix(project, item) {
    const page = project.pages.find((entry) => entry.id === item.pageId),
      configuredPageName =
        page?.bindingMode === "contract" && String(page.binding || "").trim()
          ? String(page.binding).trim().replace(/\.Selected$/i, "")
          : page?.name || "Main",
      pageName = item.master
        ? "Global"
        : contractIdentifier(configuredPageName) || "Main",
      base = contractIdentifier(item.name || "Widget"),
      peers = project.items.filter(
        (entry) =>
          entry.componentId === item.componentId &&
          entry.pageId === item.pageId &&
          !!entry.master === !!item.master,
      ),
      number = peers.indexOf(item) + 1;
    return `${pageName}.${base}${number > 1 ? number : ""}`;
  }
  function widgetDocument(html, targetPage) {
    const bridge = targetPage
      ? `<script>document.addEventListener("pointerup",function(){parent.postMessage({type:"crestron-local-page",page:${JSON.stringify(targetPage)}},"*")});<\/script>`
      : "";
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}${bridge}</body></html>`;
  }
  function exportProject(project) {
    const assetUrl = (id) =>
        ((project.assets || []).find((asset) => asset.id === id) || {})
          .dataUrl || "",
      backgroundStyle = (id) => {
        const url = assetUrl(id);
        return url
          ? `background-image:url(&quot;${url}&quot;);background-size:cover;background-position:center;`
          : "";
      };
    const pages = project.pages
      .map((page) => {
        const widgets = project.items
          .filter((item) => item.pageId === page.id || item.master)
          .map((item) =>
            item.componentId
              ? `<div class="scoped-widget" data-instance="${item.master ? `${item.id}--${page.id}` : item.id}" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z};display:${item.hidden ? "none" : "block"};${backgroundStyle(item.backgroundAsset)}${propertyStyle(item.properties)}"></div>`
              : `<iframe title="${escapeAttr(item.name)}" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;border:0;z-index:${item.z};display:${item.hidden ? "none" : "block"};${backgroundStyle(item.backgroundAsset)}" srcdoc="${escapeAttr(widgetDocument(item.source, item.targetPage))}"></iframe>`,
          )
          .join("\n");
        return `<section class="page" id="${page.id}" style="background-color:${page.background};${backgroundStyle(page.backgroundAsset)}">${widgets}</section>`;
      })
      .join("\n");
    const config = JSON.stringify(
      project.pages.map((page) => ({
        id: page.id,
        mode: page.bindingMode,
        signal:
          page.bindingMode === "contract"
            ? `${contractIdentifier(String(page.binding || page.name || "Main").replace(/\.Selected$/i, "")) || "Main"}.Selected`
            : page.binding,
      })),
    );
    const firstPage = JSON.stringify(project.pages[0].id);
    const diagnostics = !!project.diagnostics;
    const diagnosticMarkup = diagnostics
      ? '<aside id="ch5-diagnostics"><strong>CH5 Signal Diagnostics</strong><pre id="ch5-diagnostic-log"></pre></aside>'
      : "";
    const scopedItems = project.pages.flatMap((page) =>
      project.items
        .filter(
          (item) =>
            item.componentId && (item.pageId === page.id || item.master),
        )
        .map((item) => ({
          instance: item.master ? `${item.id}--${page.id}` : item.id,
          componentId: item.componentId,
          bindings: item.signalBindings || {},
          properties: contractProperties(item),
          contractPrefix: contractPrefix(project, item),
          targetPage: item.targetPage || "",
        })),
    );
    const usedDefinitions = [
      ...new Set(scopedItems.map((item) => item.componentId)),
    ]
      .map((id) => {
        const d = global.ComposerRuntime.get(id);
        let mount = d.mount.toString().replace(/^mount/, "function");
        if ((d.properties || []).some((p) => p.key === "localLabels")) {
          const config = {
              "card-flip": [".cards", ".card-wrap", ".text", true],
              "lighting-control": [".loads", ".load", ".name", false],
              "microphone-control": [".mic-list", ".mic-card", ".label", false],
              "shade-control": [".shade-list", ".shade-card", ".name", false],
            }[id],
            original = mount;
          mount = `function(root,context){var cleanup=(${original})(root,context),labels=String(context.options.properties.localLabels||'').split('|');function apply(){root.querySelectorAll(${JSON.stringify(config[1])}).forEach(function(group,index){var text=(labels[index]||'').trim();if(!text)return;${config[3] ? `group.querySelectorAll(${JSON.stringify(config[2])}).forEach(function(el){el.textContent=text})` : `var el=group.querySelector(${JSON.stringify(config[2])});if(el)el.textContent=text`}})}var observer=new MutationObserver(function(mutations){if(mutations.some(function(m){return m.target.matches&&m.target.matches(${JSON.stringify(config[0])})}))apply()});apply();observer.observe(root,{childList:true,subtree:true});return function(){observer.disconnect();if(typeof cleanup==='function')cleanup()}}`;
        }
        const data = d.data || {},
          keys = Object.keys(data).filter((key) =>
            /^[A-Za-z_$][\w$]*$/.test(key),
          );
        if (keys.length)
          mount = `(function(${keys.join(",")}){return (${mount})})(${keys.map((key) => JSON.stringify(data[key])).join(",")})`;
        return `${JSON.stringify(id)}:{template:${JSON.stringify(d.template)},styles:${JSON.stringify(d.styles)},signals:${JSON.stringify(d.signals)},data:${JSON.stringify(data)},mount:${mount}}`;
      })
      .join(",");
    const controller = `(function(){var pages=${config},items=${JSON.stringify(scopedItems)},definitions={${usedDefinitions}},debug=${JSON.stringify(diagnostics)},debugLog=document.getElementById('ch5-diagnostic-log');function diag(message){if(!debug)return;var line=new Date().toLocaleTimeString()+' '+message;if(debugLog){debugLog.textContent+=line+'\\n';debugLog.scrollTop=debugLog.scrollHeight}console.log('[CH5 Diagnostic]',message)}function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});diag('Page: '+id)}function code(type){return type==='digital'?'b':type==='analog'?'n':'s'}function appearance(root,p){var glow=Math.max(0,Number(p.glowStrength)||0),radius=Math.max(0,Number(p.cornerRadius)||0),font=Math.max(0,Number(p.fontSize)||0),style=document.createElement('style');style.textContent='[data-component] .panel,[data-component] .card,[data-component] .mic-card,[data-component] .shade-card{background-color:'+p.backgroundColor+'!important;border-color:'+p.borderColor+'!important;border-radius:'+radius+'px!important;box-shadow:0 0 '+glow+'px '+p.glowColor+'!important}[data-component] button,[data-component] .load,[data-component] .shade{background-color:'+p.buttonColor+'!important;border-color:'+p.borderColor+'!important;border-radius:'+radius+'px!important}[data-component] button.active,[data-component] button.selected,[data-component] .selected,[data-component] .pressed{border-color:'+p.accentColor+'!important;box-shadow:0 0 '+glow+'px '+p.glowColor+'!important}[data-component] button,[data-component] .label,[data-component] .name,[data-component] .note,[data-component] .big,[data-component] .value,[data-component] .position,[data-component] .status,[data-component] .btn-txt,[data-component] .mic-text,[data-component] .mic-label,[data-component] .shade-name{color:'+p.textColor+'!important;'+(font?'font-size:'+font+'px!important;':'')+'}';root.appendChild(style);if(p.localText){var values=String(p.localText).split('|'),targets=root.querySelectorAll('[data-local-text],.label,.name,.note,.big,.btn-txt,.mic-label,.shade-name,button');values.forEach(function(v,i){if(targets[i]&&v.trim())targets[i].textContent=v.trim()})}}var lib=null;try{lib=window.CrComLib||(window.parent&&window.parent.CrComLib)}catch(e){diag('CrComLib lookup error: '+e.message)}diag('CrComLib: '+(lib?'AVAILABLE':'MISSING'));diag('User agent: '+navigator.userAgent);function mount(item){var root=document.querySelector('[data-instance="'+item.instance+'"]'),def=definitions[item.componentId];if(!root||!def)return;root.dataset.component=item.componentId;root.innerHTML='<style>'+def.styles+'</style>'+def.template;function publishAddress(type,signal,value){diag('Publish '+code(type)+' '+signal+' = '+value);if(lib&&signal)lib.publishEvent(code(type),String(signal),value)}function subscribeAddress(type,signal,callback){diag('Subscribe '+code(type)+' '+signal);if(lib&&signal)lib.subscribeState(code(type),String(signal),function(value){diag('Feedback '+code(type)+' '+signal+' = '+JSON.stringify(value));callback(value)})}var signals={publish:function(key,value){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value){diag('Publish skipped: '+key+' has no binding');return}publishAddress(spec.type,binding.value,value)},subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,callback)},publishAddress:publishAddress,subscribeAddress:subscribeAddress};def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}});appearance(root,item.properties||{})}window.addEventListener('message',function(e){if(e.data&&e.data.type==='crestron-local-page')show(e.data.page)});if(lib)pages.forEach(function(p){if(p.mode!=='none'&&p.signal)lib.subscribeState('b',String(p.signal),function(v){diag('Page feedback '+p.signal+' = '+v);if(v===true||v===1||v==='1')show(p.id)})});items.forEach(mount);show(${firstPage});})();`;
    const contractController = controller
        .replace(
          "function appearance(root,p){",
          "function standardAttribute(type,direction,value){if(/^Visibility$/i.test(String(value||'').replace(/[^A-Za-z0-9_]/g,'_')))return 'Visibility';var suffix=type==='digital'?(direction==='output'?'Press':'Selected'):type==='analog'?(direction==='output'?'ValueSet':'Feedback'):(direction==='output'?'Text':'Name'),pattern=type==='digital'?/(?:_?(?:Press|Selected|Feedback|Value|Button|Btn))$/i:type==='analog'?(direction==='output'?/(?:_?(?:ValueSet|LevelSet|PositionSet|Set|Value))$/i:/(?:_?(?:Feedback|LevelValue|PositionValue|Value|Level))$/i):/(?:_?(?:IndirectText|Label|Name|Text))$/i,prefix=String(value||'').replace(/[^A-Za-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'').replace(pattern,'').replace(/_+$/g,'');if(/^(?:Level|Value|Position|Selected|Indirect|Signal)$/i.test(prefix))prefix='';return prefix+suffix}function contractAddress(value,type,direction,prefix){var address=String(value||'').replace(/^(.*)\\\\.(\\\\d+)\\\\.(.+)$/,function(_,prefix,index,attribute){return prefix+'['+Math.max(0,Number(index)-1)+'].'+attribute.replace(/\\\\./g,'_')}),array=address.match(/^([A-Za-z_][A-Za-z0-9_.]*\\\\[\\\\d+\\\\])\\\\.([A-Za-z0-9_.]+)$/),structured=array?array[1]+'.'+array[2].replace(/\\\\./g,'_'):'',parts=address.split('.');if(!structured)structured=parts.length>2?parts[0]+'.'+parts.slice(1).join('_'):address;if(prefix&&structured.indexOf('.')>=0)structured=prefix+'.'+(structured.indexOf('[')>=0?structured.slice(structured.indexOf('.')+1):address.split('.').pop());var separator=structured.lastIndexOf('.');return separator<0||!type||!direction?structured:structured.slice(0,separator)+'.'+standardAttribute(type,direction,structured.slice(separator+1))}function appearance(root,p){",
        )
        .replace(
          "function publishAddress(type,signal,value){",
          "function publishAddress(type,signal,value){signal=contractAddress(signal,type,'output',item.contractPrefix);",
        )
        .replace(
          "function subscribeAddress(type,signal,callback){",
          "function subscribeAddress(type,signal,callback){signal=contractAddress(signal,type,'input',item.contractPrefix);",
        )
        .replace(
          "properties:item.properties||{},definitionData:def.data||{}",
          "properties:item.properties||{},contractPrefix:item.contractPrefix||'',definitionData:def.data||{}",
        )
        .replace(
          "def.mount(root,{signals:signals",
          "if(item.properties.visibilityEnabled){root.style.visibility='visible';signals.subscribe('visibility',function(value){root.style.visibility=value===true||value===1||value==='1'?'visible':'hidden'})}def.mount(root,{signals:signals",
        ),
      restoredController = contractController.replace(
      "function appearance(root,p){",
      "function appearance(root,p){return;",
    );
    return `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}*{box-sizing:border-box}.page{display:none;position:relative;width:${project.width}px;height:${project.height}px;overflow:hidden}.page.active{display:block}#ch5-diagnostics{position:fixed;top:30px;right:30px;z-index:999999;width:920px;max-height:500px;padding:18px;border:2px solid #24d5b8;border-radius:10px;background:rgba(0,0,0,.88);color:#fff;font:22px/1.35 Consolas,monospace;pointer-events:none}#ch5-diagnostics strong{color:#55f2d7}#ch5-diagnostic-log{height:400px;margin:10px 0 0;overflow:auto;color:#d8fffa;white-space:pre-wrap}</style><script src="cr-com-lib.js"><\/script></head><body>${pages}${diagnosticMarkup}<script>${restoredController}<\/script></body></html>`;
  }
  global.ComposerExporter = { exportProject };
})(window);
