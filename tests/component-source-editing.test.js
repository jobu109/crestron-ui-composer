"use strict";
const assert=require('node:assert/strict'),childProcess=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
global.window = global;
for (const name of ['component-runtime.js','standard-button.component.js','exporter.js']) vm.runInThisContext(read(name), {filename:name});
const editor=read('editor.js');
const helpers=editor.slice(editor.indexOf('  function formatComponentSource('),editor.indexOf('  function splitCustomSource('));
const chrome=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file=>file&&fs.existsSync(file));
assert.ok(chrome,'Chrome required for source editing browser test');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'composer-source-edit-'));
function browser(html, name) {
  const file=path.join(directory,name+'.html');fs.writeFileSync(file,html);
  const result=childProcess.spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--user-data-dir='+path.join(directory,name+'-profile'),'--virtual-time-budget=1000','--dump-dom','file:///'+file.replace(/\\/g,'/')],{encoding:'utf8',timeout:20000,maxBuffer:10000000});
  const outcome=result.stdout?.match(/data-result="([^"]*)"/)?.[1];
  assert.ok(outcome,result.stderr);const data=JSON.parse(decodeURIComponent(outcome));assert.equal(data.error,undefined,data.error);return data;
}
const verify=String.raw`
const roots=[...document.querySelectorAll('[data-component="standard-button"]')];
const first=roots[0].querySelector('.standard-button-label'),second=roots[1].querySelector('.standard-button-label');
function equal(a,b){if(a!==b)throw Error(String(a)+' != '+String(b))}
equal(first.textContent,'Edited locally');
equal(getComputedStyle(first).fontSize,'37px');
equal(getComputedStyle(first).letterSpacing,'3px');
if(!/^source-\d+-sourceProbe$/.test(getComputedStyle(roots[0].querySelector('.standard-button')).animationName))throw Error('Animation was not instance-scoped');
equal(getComputedStyle(roots[1].querySelector('.standard-button')).animationName,'none');
equal(getComputedStyle(first).color,'rgb(255, 0, 255)');
roots[0].querySelector('.standard-button').classList.add('active');
equal(getComputedStyle(first).color,'rgb(0, 0, 255)');
roots[0].querySelector('.standard-button').classList.remove('active');
equal(getComputedStyle(first).color,'rgb(255, 0, 255)');
equal(second.textContent,'Other instance');
equal(getComputedStyle(second).fontSize,'18px');
equal(getComputedStyle(second).color,'rgb(0, 255, 0)');
`;
try {
 const setup=String.raw`
 const d=ComposerRuntime.get('standard-button'),defaults=Object.fromEntries(d.properties.map(p=>[p.key,p.defaultValue]));
 const properties={...defaults,text:'Inspector text',showLabel:true,textColor:'#00ff00',labelFontSize:18,selectedTextColor:'#0000ff',selectedSameAsStandard:false};
 const source={html:d.template.replace('>Button</span>','>Edited locally</span>'),css:d.styles.replace('font-size:clamp(16px,20%,42px)', 'font-size:37px')+'\n[data-component="standard-button"] .standard-button-label {color:#ff00ff;}'};
 source.css += '@media (min-width:1px){[data-component="standard-button"] .standard-button-label{letter-spacing:3px}} @keyframes sourceProbe{from{opacity:.99}to{opacity:1}} [data-component="standard-button"] .standard-button{animation:sourceProbe 10s linear infinite}';
 const formatted=formatComponentSource('<style>'+source.css+'</style>'+source.html);
 if(!formatted.includes('\n  ')||!formatted.includes('font-size:37px;\n'))throw Error('Source not formatted');
 const edits=collectComponentSourceEdits(d,source,properties);
 const items=[{id:'edited',pageId:'page',componentId:d.id,componentTemplate:source.html,componentStyles:source.css,componentSourceEdits:edits,properties,x:0,y:0,w:220,h:100,z:1,signalBindings:{}},{id:'peer',pageId:'page',componentId:d.id,properties:{...defaults,showLabel:true,text:'Other instance',textColor:'#00ff00',labelFontSize:18},x:240,y:0,w:220,h:100,z:2,signalBindings:{}}];
 const mount=(item,root)=>ComposerRuntime.mount(root,item.componentId,{properties:item.properties,templateOverride:item.componentTemplate,stylesOverride:item.componentStyles,sourceEdits:item.componentSourceEdits});
 items.forEach(item=>{const root=document.createElement('div');document.body.appendChild(root);const dispose=mount(item,root);dispose();mount(JSON.parse(JSON.stringify(item)),root);});
 `;
 const script=['component-runtime.js','standard-button.component.js'].map(name=>'<script>'+read(name)+'</script>').join('');
 const result=browser('<!doctype html><html><body>'+script+'<script>'+helpers+'\ntry{'+setup+verify+'document.body.dataset.result=encodeURIComponent(JSON.stringify({items}));}catch(error){document.body.dataset.result=encodeURIComponent(JSON.stringify({error:error.stack}));}</script></body></html>','editor');
 const project={version:4,width:800,height:500,pages:[{id:'page',name:'Page',bindingMode:'none'}],items:result.items,assets:[]};
 const exported=ComposerExporter.exportProject(JSON.parse(JSON.stringify(project)));
 browser(exported.replace('</body>','<script>try{'+verify+'document.body.dataset.result=encodeURIComponent(JSON.stringify({passed:true}));}catch(error){document.body.dataset.result=encodeURIComponent(JSON.stringify({error:error.stack}));}</script></body>'),'export');
 console.log('PASS formatted source edits survive remount, project round trip, and export without affecting peers');
} finally { fs.rmSync(directory,{recursive:true,force:true,maxRetries:3}); }
