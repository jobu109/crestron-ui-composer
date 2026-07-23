(function (global) {
  "use strict";
  const optionalContent = {
    "battery-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
    "card-flip": { showLabel: ".text" },
    "cell-bar-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
    "display-control": { showLabel: ".dc-name" },
    "display-flip": { showLabel: ".text" },
    "lighting-control": { showLabel: ".name", showPercentage: ".level" },
    "microphone-control": { showLabel: ".label", showPercentage: ".value", showToggle: ".toggle" },
    "rotary-knob": { showLabel: ".rotary-name", showPercentage: ".rotary-value" },
    "shade-control": { showLabel: ".name", showPercentage: ".position" },
    "wifi-gauge": { showLabel: ".signal-label", showPercentage: ".signal-value" },
  };
  function escapeAttr(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }
  function wireCipText(root, signals) {
    const pattern = /<cip([sda])>([\s\S]*?)<\/cip\1>/gi, walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    function analogText(value, format) {
      const number = Number(value) || 0, spec = String(format || "%r");
      if (/%x/i.test(spec)) return Math.round(number).toString(16).toUpperCase().padStart(2, "0");
      if (/%t/i.test(spec)) { const seconds = Math.max(0, Math.round(number)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
      const percent = spec.match(/%(\d+(?:\.\d+)?)\.(\d+)p/i); if (percent) return `${((number / Math.max(1, Number(percent[1]))) * 100).toFixed(Number(percent[2]))}%`;
      const fixed = spec.match(/%(\d+)\.(\d+)f/i); if (fixed) return number.toFixed(Number(fixed[2])).padStart(Number(fixed[1]) + Number(fixed[2]) + 1, "0");
      const integer = spec.match(/%(\d+)?[du]/i); if (integer) return String(Math.round(number)).padStart(Number(integer[1]) || 0, "0");
      return String(Math.round(number));
    }
    while (walker.nextNode()) if (/<cip[sda]>/i.test(walker.currentNode.nodeValue || "")) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const tokens = [], values = [], template = String(node.nodeValue || "").replace(pattern, (match, kind, content) => {
        let address = String(content).trim(), format = "", trueText = "True", falseText = "False", fallback = ""; kind = kind.toLowerCase();
        if (kind === "d") { const question = address.indexOf("?"), colon = address.indexOf(":", question + 1); if (question >= 0) { trueText = address.slice(question + 1, colon >= 0 ? colon : undefined); falseText = colon >= 0 ? address.slice(colon + 1) : ""; address = address.slice(0, question); } }
        else if (kind === "a") { const question = address.indexOf("?"); if (question >= 0) { format = address.slice(question + 1); address = address.slice(0, question); } }
        else { const colon = address.indexOf(":"); if (colon >= 0) { fallback = address.slice(colon + 1); address = address.slice(0, colon); } }
        const index = tokens.length; tokens.push({ kind, address: address.trim(), format: format.trim(), trueText, falseText, fallback }); values.push(kind === "s" ? fallback : kind === "d" ? falseText : "0"); return `\u0000${index}\u0000`;
      });
      function render() { node.nodeValue = template.replace(/\u0000(\d+)\u0000/g, (_, index) => values[Number(index)] ?? ""); }
      tokens.forEach((token, index) => signals.subscribeExact(token.kind === "s" ? "serial" : token.kind === "d" ? "digital" : "analog", token.address, (value) => { values[index] = token.kind === "s" ? String(value == null || value === "" ? token.fallback : value) : token.kind === "d" ? (value === true || value === 1 || value === "1" ? token.trueText : token.falseText) : analogText(value, token.format); render(); })); render();
    });
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
      pageName = item.master
        ? "Global"
        : contractIdentifier(page?.name || "Main") || "Main",
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
    const bridge = `<script>document.addEventListener("pointerdown",function(){parent.postMessage({type:"composer-interaction",phase:"press"},"*")});document.addEventListener("pointerup",function(){parent.postMessage({type:"composer-interaction",phase:"release"},"*")${targetPage ? `;parent.postMessage({type:"crestron-local-page",page:${JSON.stringify(targetPage)}},"*")` : ""}});<\/script>`;
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
      },
      pageBackgroundStyle = (page) => {
        const url = assetUrl(page.backgroundAsset);
        return url
          ? `background-image:url(&quot;${url}&quot;);background-size:${page.backgroundAssetFit || "cover"};background-position:${Number(page.backgroundAssetX ?? 50)}% ${Number(page.backgroundAssetY ?? 50)}%;background-repeat:no-repeat;`
          : "";
      },
      graphicBackgroundStyle = (item) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          repeats = item.graphicAssetPlacement === "items" && !!definition?.itemSelector,
          url = item.graphicAssetMode === "background" && !repeats ? assetUrl(item.graphicAsset) : "";
        return url ? `background-image:url(&quot;${url}&quot;);background-size:${item.graphicAssetFit || "contain"};background-position:${Number(item.graphicAssetX ?? 50)}% ${Number(item.graphicAssetY ?? 50)}%;background-repeat:no-repeat;` : "";
      },
      graphicOverlay = (item, selected = false) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          repeats = item.graphicAssetPlacement === "items" && !!definition?.itemSelector,
          url = item.graphicAssetMode === "overlay" && !repeats
          ? assetUrl(selected ? item.selectedGraphicAsset : item.graphicAsset)
          : "";
        return url ? `<img class="widget-asset-overlay widget-asset-overlay-${selected ? "selected" : "normal"}" alt="" style="position:absolute;z-index:50;left:${Number(item.graphicAssetX ?? 50)}%;top:${Number(item.graphicAssetY ?? 50)}%;width:${Number(item.graphicAssetWidth ?? 35)}%;height:${Number(item.graphicAssetHeight ?? 35)}%;max-width:none;object-fit:${item.graphicAspectLocked ? item.graphicAssetFit || "contain" : "fill"};opacity:${Math.max(0,Math.min(100,Number(item.graphicAssetOpacity ?? 100)))/100};pointer-events:none;transform:translate(-50%,-50%)" src="${url}">` : "";
      },
      repeatedGraphicStyle = (item, instance) => {
        const definition = item.componentId
            ? global.ComposerRuntime.get(item.componentId)
            : null,
          selector = definition?.itemSelector;
        if (item.graphicAssetPlacement !== "items" || !selector) return "";
        const normal = assetUrl(item.graphicAsset),
          selected = assetUrl(item.selectedGraphicAsset) || normal;
        if (!normal && !selected) return "";
        const scope = `.scoped-widget[data-instance=${JSON.stringify(instance)}] .scoped-preview `,
          normalUrl = normal ? `url(${JSON.stringify(normal)})` : "none",
          selectedUrl = selected ? `url(${JSON.stringify(selected)})` : normalUrl,
          size = item.graphicAspectLocked
            ? item.graphicAssetFit || "contain"
            : "100% 100%",
          common = `background-repeat:no-repeat;background-position:center;background-size:${size};`,
          selectedSelectors = [".active", ".selected", ".flipped", '[aria-selected="true"]']
            .map((state) => `${scope}${selector}${state}`)
            .join(",");
        const css = item.graphicAssetMode === "background"
          ? `${scope}${selector}{background-image:${normalUrl}!important;${common}}${selectedSelectors}{background-image:${selectedUrl}!important}`
          : item.graphicAssetMode === "overlay"
            ? `${scope}${selector}{position:relative!important}${scope}${selector}::after{content:"";position:absolute;z-index:50;pointer-events:none;left:${Number(item.graphicAssetX ?? 50)}%;top:${Number(item.graphicAssetY ?? 50)}%;width:${Number(item.graphicAssetWidth ?? 35)}%;height:${Number(item.graphicAssetHeight ?? 35)}%;opacity:${Math.max(0, Math.min(100, Number(item.graphicAssetOpacity ?? 100))) / 100};transform:translate(-50%,-50%);background-image:${normalUrl};${common}}${selectedSelectors.split(",").map((entry) => `${entry}::after`).join(",")}{background-image:${selectedUrl}}`
            : "";
        return css ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : "";
      },
      selectedGraphicStyle = (item) => {
        const url = assetUrl(item.selectedGraphicAsset);
        return `--selected-graphic-url:${url ? `url(&quot;${url}&quot;)` : "none"};`;
      };
    const pages = project.pages
      .map((page) => {
        const widgets = project.items
          .filter((item) => item.pageId === page.id || item.master)
          .map((item) => {
            const instance = item.master ? `${item.id}--${page.id}` : item.id;
            return item.componentId
              ? `<div class="scoped-widget" data-instance="${instance}" data-graphic-mode="${item.graphicAssetMode || "none"}" data-asset-selected="false" data-has-selected-graphic="${assetUrl(item.selectedGraphicAsset) ? "true" : "false"}" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${item.z};display:${item.hidden ? "none" : "block"};${backgroundStyle(item.backgroundAsset)}${graphicBackgroundStyle(item)}${selectedGraphicStyle(item)}${propertyStyle(item.properties)}"><div class="scoped-preview"></div>${graphicOverlay(item)}${graphicOverlay(item, true)}${repeatedGraphicStyle(item, instance)}</div>`
              : `<iframe data-instance="${item.master ? `${item.id}--${page.id}` : item.id}" title="${escapeAttr(item.name)}" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;border:0;z-index:${item.z};display:${item.hidden ? "none" : "block"};${backgroundStyle(item.backgroundAsset)}" srcdoc="${escapeAttr(widgetDocument(item.source, item.targetPage))}"></iframe>`;
          })
          .join("\n");
        return `<section class="page" id="${page.id}" style="background-color:${page.background};${pageBackgroundStyle(page)}">${widgets}</section>`;
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
        transition: page.transition || "none",
        transitionDuration: Number(page.transitionDuration) || 350,
      })),
    );
    const firstPage = JSON.stringify(project.pages[0].id);
    const diagnostics = !!project.diagnostics;
    const diagnosticMarkup = diagnostics
      ? '<aside id="ch5-diagnostics"><strong onclick="var p=this.parentElement;if(p.style.left){p.style.left=\'\';p.style.bottom=\'\';p.style.right=\'30px\';p.style.top=\'30px\'}else{p.style.right=\'\';p.style.top=\'\';p.style.left=\'30px\';p.style.bottom=\'30px\'}">CH5 Signal Diagnostics — tap here to move</strong><pre id="ch5-diagnostic-log"></pre></aside>'
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
          interaction: item.interaction || null,
          pageId: page.id,
          templateOverride: item.componentTemplate || "",
          stylesOverride: item.componentStyles || "",
        })),
    );
    const interactionItems = project.pages.flatMap((page) =>
      project.items
        .filter((item) => item.pageId === page.id || item.master)
        .map((item) => ({
          instance: item.master ? `${item.id}--${page.id}` : item.id,
          pageId: page.id,
          interaction: item.interaction || null,
          interactions: item.interactions || [],
          actions: item.actions || [],
        })),
    );
    const usedComponentIds = [
      ...new Set(scopedItems.map((item) => item.componentId)),
    ];
    // Keep the base component CSS in the document head as well as beside each
    // mounted template. Some WebView/browser paths can briefly or permanently
    // lose styles created through an innerHTML mount, which leaves controls
    // such as the oval buttons and toggles rendered as bare native content.
    // A static copy also makes Preview use the same dependable stylesheet path
    // as the editor canvas.
    const componentCss =
      ".scoped-widget,.scoped-preview,.scoped-preview>[data-component]{overflow:visible!important}\n" +
      usedComponentIds
        .map((id) => global.ComposerRuntime.get(id)?.styles || "")
        .join("\n");
    const usedDefinitions = usedComponentIds
      .map((id) => {
        const d = global.ComposerRuntime.get(id);
        let mount = d.mount.toString().replace(/^mount/, "function");
        if ((d.properties || []).some((p) => p.key === "localLabels")) {
          const config = {
              "card-flip": [".cards", ".card-wrap", ".text", true],
              "display-flip": [".cards", ".card-wrap", ".text", true],
              "lighting-control": [".loads", ".load", ".name", false],
              "microphone-control": [".mic-list", ".mic-card", ".label", false],
              "shade-control": [".shade-list", ".shade-card", ".name", false],
            }[id],
            original = mount;
          mount = `function(root,context){var cleanup=(${original})(root,context),labels=String(context.options.properties.localLabels??'').split('|');function apply(){root.querySelectorAll(${JSON.stringify(config[1])}).forEach(function(group,index){if(index>=labels.length)return;var text=String(labels[index]??'').trim();${config[3] ? `group.querySelectorAll(${JSON.stringify(config[2])}).forEach(function(el){el.textContent=text})` : `var el=group.querySelector(${JSON.stringify(config[2])});if(el)el.textContent=text`}})}var observer=new MutationObserver(function(mutations){if(mutations.some(function(m){return m.target.matches&&m.target.matches(${JSON.stringify(config[0])})}))apply()});apply();observer.observe(root,{childList:true,subtree:true});return function(){observer.disconnect();if(typeof cleanup==='function')cleanup()}}`;
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
    const controller = `(function(){var pages=${config},items=${JSON.stringify(scopedItems)},definitions={${usedDefinitions}},optional=${JSON.stringify(optionalContent)},debug=${JSON.stringify(diagnostics)},debugLog=document.getElementById('ch5-diagnostic-log');function diag(message){if(!debug)return;var line=new Date().toLocaleTimeString()+' '+message;if(debugLog){debugLog.textContent+=line+'\\n';debugLog.scrollTop=debugLog.scrollHeight}console.log('[CH5 Diagnostic]',message)}function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});diag('Page: '+id)}function code(type){return type==='digital'?'b':type==='analog'?'n':'s'}function appearance(root,p){var glow=Math.max(0,Number(p.glowStrength)||0),radius=Math.max(0,Number(p.cornerRadius)||0),font=Math.max(0,Number(p.fontSize)||0),style=document.createElement('style');style.textContent='[data-component] .panel,[data-component] .card,[data-component] .mic-card,[data-component] .shade-card{background-color:'+p.backgroundColor+'!important;border-color:'+p.borderColor+'!important;border-radius:'+radius+'px!important;box-shadow:0 0 '+glow+'px '+p.glowColor+'!important}[data-component] button,[data-component] .load,[data-component] .shade{background-color:'+p.buttonColor+'!important;border-color:'+p.borderColor+'!important;border-radius:'+radius+'px!important}[data-component] button.active,[data-component] button.selected,[data-component] .selected,[data-component] .pressed{border-color:'+p.accentColor+'!important;box-shadow:0 0 '+glow+'px '+p.glowColor+'!important}[data-component] button,[data-component] .label,[data-component] .name,[data-component] .note,[data-component] .big,[data-component] .value,[data-component] .position,[data-component] .status,[data-component] .btn-txt,[data-component] .mic-text,[data-component] .mic-label,[data-component] .shade-name{color:'+p.textColor+'!important;'+(font?'font-size:'+font+'px!important;':'')+'}';root.appendChild(style);if(p.localText){var values=String(p.localText).split('|'),targets=root.querySelectorAll('[data-local-text],.label,.name,.note,.big,.btn-txt,.mic-label,.shade-name,button');values.forEach(function(v,i){if(targets[i]&&v.trim())targets[i].textContent=v.trim()})}}var lib=null;try{lib=window.CrComLib||(window.parent&&window.parent.CrComLib)}catch(e){diag('CrComLib lookup error: '+e.message)}diag('CrComLib: '+(lib?'AVAILABLE':'MISSING'));diag('User agent: '+navigator.userAgent);function mount(item){var root=document.querySelector('[data-instance="'+item.instance+'"]'),def=definitions[item.componentId];if(!root||!def)return;root.dataset.component=item.componentId;root.innerHTML='<style>'+def.styles+'</style>'+def.template;function publishAddress(type,signal,value){diag('Publish '+code(type)+' '+signal+' = '+value);if(lib&&signal)lib.publishEvent(code(type),String(signal),value)}function subscribeAddress(type,signal,callback){diag('Subscribe '+code(type)+' '+signal);if(lib&&signal)lib.subscribeState(code(type),String(signal),function(value){diag('Feedback '+code(type)+' '+signal+' = '+JSON.stringify(value));callback(value)})}var signals={publish:function(key,value){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value){diag('Publish skipped: '+key+' has no binding');return}publishAddress(spec.type,binding.value,value)},subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,callback)},publishAddress:publishAddress,subscribeAddress:subscribeAddress,subscribeExact:subscribeAddress};def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}});appearance(root,item.properties||{});var visibility=optional[item.componentId],visibilityStyle=document.createElement('style');if(visibility){visibilityStyle.textContent=Object.keys(visibility).filter(function(key){var value=item.properties&&item.properties[key];return value===false||value===0||value==='0'||String(value).toLowerCase()==='false'}).map(function(key){return '[data-instance="'+item.instance+'"] '+visibility[key]+'{display:none!important}'}).join('');if(visibilityStyle.textContent)root.appendChild(visibilityStyle)}}window.addEventListener('message',function(e){if(e.data&&e.data.type==='crestron-local-page')show(e.data.page)});if(lib)pages.forEach(function(p){if(p.mode!=='none'&&p.signal)lib.subscribeState('b',String(p.signal),function(v){diag('Page feedback '+p.signal+' = '+v);if(v===true||v===1||v==='1')show(p.id)})});items.forEach(mount);show(${firstPage});})();`;
    const interactionRuntime =
        `var interactionItems=${JSON.stringify(interactionItems)};` +
        "function motion(c,reverse){c=c||{};var preset=c.preset||'fade',direction=c.direction||'left',move={left:'translateX(-48px)',right:'translateX(48px)',up:'translateY(-48px)',down:'translateY(48px)'},frames=preset==='slide'?[{opacity:0,transform:move[direction]},{opacity:1,transform:'translate(0,0)'}]:preset==='scale'?[{opacity:.35,transform:'scale(.72)'},{opacity:1,transform:'scale(1)'}]:preset==='glow'?[{filter:'drop-shadow(0 0 0 rgba(4,220,185,0))'},{filter:'drop-shadow(0 0 18px rgba(4,220,185,.95))'},{filter:'drop-shadow(0 0 0 rgba(4,220,185,0))'}]:preset==='press'?[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.94)',filter:'brightness(1.14)'}]:[{opacity:0},{opacity:1}];return reverse?frames.reverse():frames}" +
        "function play(root,c,reverse){if(!root||!c||c.trigger==='none')return;root.animate(motion(c,reverse),{duration:Math.max(50,Number(c.duration)||300),delay:reverse?0:Math.max(0,Number(c.start==null?c.delay:c.start)||0),easing:c.easing||'ease-out'})}" +
        "function tracks(entry){return entry.interactions&&entry.interactions.length?entry.interactions:(entry.interaction?[entry.interaction]:[])}function targetRoot(entry,id){return document.querySelector('[data-instance=\"'+id+'\"]')||document.querySelector('[data-instance=\"'+id+'--'+entry.pageId+'\"]')}function actionValue(value,type){return type==='digital'?/^(true|1|on|yes)$/i.test(String(value)):type==='analog'?(Number(value)||0):String(value==null?'':value)}function conditionMatches(a,actual){var op=a.condition||'always',expected=a.compareValue,n=Number(actual),e=Number(expected),truth=actual===true||actual===1||actual==='1'||actual==='true';if(op==='always'||op==='changed')return true;if(op==='truthy')return truth;if(op==='falsy')return !truth;if(op==='equals')return String(actual)===String(expected);if(op==='not-equals')return String(actual)!==String(expected);if(op==='greater')return n>e;if(op==='greater-equal')return n>=e;if(op==='less')return n<e;if(op==='less-equal')return n<=e;return true}function executeAction(entry,a){var root=targetRoot(entry,a.target),v=String(a.value==null?'':a.value);if(a.type==='navigate'){show(a.target);return}if(a.type.indexOf('signal-')===0){var type=a.type.slice(7);if(lib&&a.target)lib.publishEvent(code(type),String(a.target),actionValue(v,type));return}if(!root)return;if(a.type==='show'||a.type==='hide')root.style.display=a.type==='hide'?'none':'block';else if(a.type==='animate'){var targetEntry=interactionItems.find(function(i){return i.instance===root.dataset.instance});if(targetEntry)tracks(targetEntry).forEach(function(c){play(root,c)})}else if(a.type==='text'){var nodes=root.querySelectorAll('[data-local-text],.label,.name,.note,.big,.btn-txt,.mic-label,.shade-name,button');if(nodes[0])nodes[0].textContent=v}else if(a.type==='property'){var at=v.indexOf('='),key=at<0?'local-text':v.slice(0,at).trim().replace(/[A-Z]/g,function(m){return '-'+m.toLowerCase()}),val=at<0?v:v.slice(at+1);root.style.setProperty('--'+key,val)}else if(a.type==='enable'||a.type==='disable'){root.style.pointerEvents=a.type==='disable'?'none':'';root.style.opacity=a.type==='disable'?'.45':''}else if(a.type==='select')root.classList.toggle('action-selected',actionValue(v||'true','digital'))}function runActions(entry,eventName,signal,eventValue){var at=0;(entry.actions||[]).filter(function(a){return a.event===eventName&&(!signal||a.triggerSignal===signal)&&conditionMatches(a,eventValue)}).forEach(function(a){var delay=Math.max(0,Number(a.delay)||0);if(a.timing==='after')at+=delay;setTimeout(function(){executeAction(entry,a)},a.timing==='after'?at:delay)})}function runInteraction(root,c,phase){if(!root||!c)return;if(phase==='press'&&c.trigger==='press')play(root,c);if(phase==='release'&&c.trigger==='release')play(root,c);if(phase==='release'&&c.trigger==='press'&&c.preset==='press')play(root,c,true)}function wireInteraction(entry){var root=document.querySelector('[data-instance=\"'+entry.instance+'\"]'),list=tracks(entry),hold=0;if(!root)return;list.forEach(function(c){if(c.trigger==='delayed')play(root,c)});if((entry.actions||[]).some(function(a){return a.event==='timer'}))runActions(entry,'timer');(entry.actions||[]).filter(function(a){return a.event==='signal-change'&&a.triggerSignal}).forEach(function(a){if(lib)lib.subscribeState(code(a.triggerType||'digital'),String(a.triggerSignal),function(value){runActions(entry,'signal-change',a.triggerSignal,value)})});root.addEventListener('pointerdown',function(){list.forEach(function(c){runInteraction(root,c,'press')});runActions(entry,'press');clearTimeout(hold);hold=setTimeout(function(){runActions(entry,'hold')},600)});root.addEventListener('pointerup',function(){clearTimeout(hold);list.forEach(function(c){runInteraction(root,c,'release')});runActions(entry,'release')})}",
      originalShow =
        "function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});diag('Page: '+id)}",
      animatedShow =
        "function show(id){document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id===id)});var page=document.getElementById(id),config=pages.find(function(p){return p.id===id});if(page&&config&&config.transition!=='none'){var preset=config.transition.indexOf('slide')===0?'slide':config.transition,direction=config.transition==='slide-right'?'right':'left';page.animate(motion({preset:preset,direction:direction}),{duration:config.transitionDuration||350,easing:'ease-out'})}interactionItems.forEach(function(entry){if(entry.pageId===id){tracks(entry).filter(function(c){return c.trigger==='page-enter'}).forEach(function(c){play(document.querySelector('[data-instance=\"'+entry.instance+'\"]'),c)});runActions(entry,'page-enter')}});diag('Page: '+id)}",
      layeredController = controller
        .replace("(function(){var pages=", `(function(){${wireCipText.toString()};var pages=`)
        .replace(
          "function mount(item){var root=document.querySelector('[data-instance=\"'+item.instance+'\"]'),def=definitions[item.componentId];",
          "function mount(item){var holder=document.querySelector('[data-instance=\"'+item.instance+'\"]'),root=holder&&holder.querySelector('.scoped-preview'),def=definitions[item.componentId];",
        ),
      animatedController = layeredController
        .replace(
          "root.innerHTML='<style>'+def.styles+'</style>'+def.template;",
          "root.innerHTML='<style>'+(item.stylesOverride||def.styles)+'</style>'+(item.templateOverride||def.template);",
        )
        .replace(
          "subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key];if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,callback)}",
          "subscribe:function(key,callback){var spec=def.signals.find(function(s){return s.key===key}),binding=item.bindings[key],handler=key==='selected'?function(value){holder.dataset.assetSelected=value===true||value===1||value==='1'?'true':'false';callback(value)}:callback;if(!spec||!binding||!binding.value)return;subscribeAddress(spec.type,binding.value,handler)}",
        )
        .replace(
          "function show(id){",
          interactionRuntime + "function show(id){",
        )
        .replace(originalShow, animatedShow)
        .replace(
          "items.forEach(mount);show(",
          "items.forEach(mount);interactionItems.forEach(wireInteraction);show(",
        )
        .replace(
          "subscribeExact:subscribeAddress",
          "subscribeExact:function(type,signal,callback){diag('Subscribe '+code(type)+' '+signal);if(lib&&signal)lib.subscribeState(code(type),String(signal),function(value){diag('Feedback '+code(type)+' '+signal+' = '+JSON.stringify(value));callback(value)})}",
        )
        .replace(
          "def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}});appearance(root,item.properties||{})",
          "try{def.mount(root,{signals:signals,navigate:show,options:{targetPage:item.targetPage,properties:item.properties||{},definitionData:def.data||{}}})}catch(error){diag('Component '+item.componentId+' failed: '+error.message);root.innerHTML='<div style=\"height:100%;padding:12px;border:1px solid #a65050;background:#291718;color:#ffc1c1;overflow:auto\"></div>';root.firstChild.textContent='Component error: '+(error.message||error)}wireCipText(root,signals);appearance(root,item.properties||{})",
        )
        .replace(
          "window.addEventListener('message',function(e){",
          "window.addEventListener('message',function(e){if(e.data&&e.data.type==='composer-interaction'){var root=Array.prototype.find.call(document.querySelectorAll('[data-instance]'),function(el){return el.contentWindow===e.source||(el.querySelector&&el.querySelector('iframe')&&el.querySelector('iframe').contentWindow===e.source)}),entry=root&&interactionItems.find(function(item){return item.instance===root.dataset.instance});if(entry){tracks(entry).forEach(function(c){runInteraction(root,c,e.data.phase)});runActions(entry,e.data.phase)}}",
        );
    const contractController = animatedController
        .replace(
          "function appearance(root,p){",
          "function standardAttribute(type,direction,value){if(/^Visibility$/i.test(String(value||'').replace(/[^A-Za-z0-9_]/g,'_')))return 'Visibility';var suffix=type==='digital'?(direction==='output'?'Press':'Selected'):type==='analog'?(direction==='output'?'ValueSet':'Feedback'):(direction==='output'?'Text':'Name'),pattern=type==='digital'?/(?:_?(?:Press|Selected|Feedback|Value|Button|Btn))$/i:type==='analog'?(direction==='output'?/(?:_?(?:ValueSet|LevelSet|PositionSet|Set|Value))$/i:/(?:_?(?:Feedback|LevelValue|PositionValue|Value|Level))$/i):/(?:_?(?:IndirectText|Label|Name|Text))$/i,prefix=String(value||'').replace(/[^A-Za-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'').replace(pattern,'').replace(/_+$/g,'');if(/^(?:Level|Value|Position|Selected|Indirect|Signal)$/i.test(prefix))prefix='';return prefix+suffix}function contractAddress(value,type,direction,prefix){var address=String(value||'').replace(/^(.*)\\.(\\d+)\\.(.+)$/,function(_,prefix,index,attribute){return prefix+'['+Math.max(0,Number(index)-1)+'].'+attribute.replace(/\\./g,'_')}),array=address.match(/^([A-Za-z_][A-Za-z0-9_.]*\\[\\d+\\])\\.([A-Za-z0-9_.]+)$/),structured=array?array[1]+'.'+array[2].replace(/\\./g,'_'):'',parts=address.split('.');if(!structured)structured=parts.length>2?parts[0]+'.'+parts.slice(1).join('_'):address;if(prefix&&structured.indexOf('.')>=0)structured=prefix+'.'+(structured.indexOf('[')>=0?structured.slice(structured.indexOf('.')+1):address.split('.').pop());var separator=structured.lastIndexOf('.');return separator<0||!type||!direction?structured:structured.slice(0,separator)+'.'+standardAttribute(type,direction,structured.slice(separator+1))}function appearance(root,p){",
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
      restoredController = contractController
        .replace(
          "function appearance(root,p){",
          "function appearance(root,p){return;",
        )
        .replace("Number(index)-1", "Number(index)")
        .replace(
          "if(prefix&&structured.indexOf('.')>=0)",
          "var legacyCollection=structured.match(/^[A-Za-z_][A-Za-z0-9_]*_([A-Za-z][A-Za-z0-9_]*)(\\[\\d+\\])\\.([A-Za-z0-9_.]+)$/);if(prefix&&legacyCollection){structured=prefix+'.'+legacyCollection[1]+legacyCollection[2]+'.'+legacyCollection[3];prefix=''}if(prefix&&structured.indexOf('.')>=0)",
        ),
      safeController = restoredController.replace(/<\/script/gi, "<\\/script");
    return `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}*{box-sizing:border-box}.page{display:none;position:relative;width:${project.width}px;height:${project.height}px;overflow:hidden}.page.active{display:block}.scoped-preview{display:block;width:100%;height:100%;min-width:0;min-height:0}.widget-asset-overlay-selected{display:none}.scoped-widget[data-has-selected-graphic="true"][data-asset-selected="true"]>.widget-asset-overlay-normal{display:none}.scoped-widget[data-has-selected-graphic="true"][data-asset-selected="true"]>.widget-asset-overlay-selected{display:block}.scoped-widget[data-has-selected-graphic="true"][data-asset-selected="true"][data-graphic-mode="background"]{background-image:var(--selected-graphic-url)!important}#ch5-diagnostics{position:fixed;top:30px;right:30px;z-index:999999;width:920px;max-height:500px;padding:18px;border:2px solid #24d5b8;border-radius:10px;background:rgba(0,0,0,.88);color:#fff;font:22px/1.35 Consolas,monospace;pointer-events:none}#ch5-diagnostics strong{display:block;color:#55f2d7;pointer-events:auto;touch-action:manipulation}#ch5-diagnostic-log{height:400px;margin:10px 0 0;overflow:auto;color:#d8fffa;white-space:pre-wrap}</style><style id="composer-component-styles">${componentCss}</style><script src="ch5-webxpanel.js"><\/script><script src="cr-com-lib.js"><\/script></head><body>${pages}${diagnosticMarkup}<script>${safeController}<\/script><script>(function startComposerCommunication(){try{var bundle=window.WebXPanel;if(!bundle||typeof bundle.getWebXPanel!=='function')throw new Error('WebXPanel runtime did not load');var inContainer=typeof bundle.runsInContainerApp==='function'&&bundle.runsInContainerApp();var api=bundle.getWebXPanel(!inContainer),panel=api.WebXPanel&&(api.WebXPanel.default||api.WebXPanel);window.__composerWebXPanel=api;window.__composerRunsInContainer=inContainer;window.__composerWebXPanelActive=!!api.isActive;window.__composerCommunicationMode=inContainer?'CH5 Desktop native container':(api.isActive?'Web XPanel':'touch panel');if(!inContainer&&api.isActive&&panel&&typeof panel.initialize==='function'){panel.initialize({host:window.location.hostname,port:49200,roomId:'',ipId:'0x03',tokenSource:'',tokenUrl:'',authToken:''});}if(panel&&api.WebXPanelEvents&&typeof panel.addEventListener==='function'){Object.keys(api.WebXPanelEvents).forEach(function(key){var eventName=api.WebXPanelEvents[key];panel.addEventListener(eventName,function(event){window.__composerWebXPanelLastEvent={name:key,detail:event&&event.detail||null,time:new Date().toISOString()};console.log('[WebXPanel]',key,event&&event.detail||'');});});}console.log('[Composer communication]',window.__composerCommunicationMode);}catch(error){window.__composerWebXPanelError=String(error&&error.message||error);console.error('CH5 communication initialization failed:',error);}})();<\/script></body></html>`;
  }
  global.ComposerExporter = { exportProject };
})(window);
