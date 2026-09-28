"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

global.window = global;
for (const name of ["component-runtime.js", "standard-button.component.js", "widget-list.component.js", "exporter.js"]) vm.runInThisContext(read(name), { filename: name });
const props = (id, overrides) => Object.assign(Object.fromEntries(ComposerRuntime.get(id).properties.map(p => [p.key, p.defaultValue])), overrides);
const items = [
  { id: "first", componentId: "standard-button", properties: props("standard-button", {text:"First", backgroundColor:"#ff0000", backgroundOpacity:25, selectedSameAsStandard:false, selectedBackgroundColor:"#00ff00", selectedBackgroundOpacity:50}) },
  { id: "second", componentId: "standard-button", properties: props("standard-button", {text:"Second", backgroundColor:"#0000ff", backgroundOpacity:75, selectedSameAsStandard:false, selectedBackgroundColor:"#ffffff", selectedBackgroundOpacity:100}) }
].map((item, i) => ({...item, pageId:"page", x:i*240, y:0, w:220, h:100, z:i+1, signalBindings:{}}));
const project = {version:4,width:900,height:500,pages:[{id:"page",name:"Page",bindingMode:"none"}],items,assets:[]};
const probe = function () {
  try {
    const buttons = [...document.querySelectorAll('.standard-button')];
    const equal = (actual, expected) => { if (actual !== expected) throw Error(actual + " != " + expected); };
    equal(getComputedStyle(buttons[0]).backgroundColor, "rgba(255, 0, 0, 0.25)");
    equal(getComputedStyle(buttons[1]).backgroundColor, "rgba(0, 0, 255, 0.75)");
    buttons.forEach(button => button.classList.add('active'));
    equal(getComputedStyle(buttons[0]).backgroundColor, "rgba(0, 255, 0, 0.5)");
    equal(getComputedStyle(buttons[1]).backgroundColor, "rgb(255, 255, 255)");
    if (window.ComposerRuntime) {
      const runtime = window.ComposerRuntime;
      runtime.mount(buttons[0].parentElement, 'standard-button', {properties:{text:'Edited',backgroundColor:'#ffff00',backgroundOpacity:100}});
      equal(getComputedStyle(buttons[1]).backgroundColor, "rgb(255, 255, 255)");
      equal(buttons[1].textContent, 'Second');
      runtime.register({id:'isolation-probe',name:'Probe',properties:[{key:'showPart',type:'checkbox',defaultValue:true}],signals:[],optionalContent:{showPart:'.part'},styles:'',template:'<span class="part">Part</span>',mount(){}});
      const mount = (id, properties) => {const root=document.createElement('div');document.body.append(root);runtime.mount(root,id,{properties});return root;};
      const visible = mount('isolation-probe',{showPart:true});
      const hidden = mount('isolation-probe',{showPart:false});
      equal(getComputedStyle(hidden.querySelector('.part')).display,'none');
      equal(getComputedStyle(visible.querySelector('.part')).display,'inline');
      const list = mount('widget-list',{widgetType:'isolation-probe',defaultCount:1,includedWidget__showPart:false});
      equal(getComputedStyle(list.querySelector('.part')).display,'none');
      equal(getComputedStyle(visible.querySelector('.part')).display,'inline');
    }
    document.body.dataset.isolation = 'passed';
  } catch(error) { document.body.dataset.isolation = error.message; }
};
const scripts = ['component-runtime.js','standard-button.component.js','widget-list.component.js'].map(name => '<script>'+read(name)+'</script>').join('');
const setup = '<script>const items='+JSON.stringify(items)+';items.forEach(item=>{const root=document.createElement("div");document.body.append(root);ComposerRuntime.mount(root,item.componentId,{properties:item.properties})});</script>';
const pages = ['<!doctype html><html><body>'+scripts+setup+'</body></html>', ComposerExporter.exportProject(project)];
const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => candidate && fs.existsSync(candidate));

assert.ok(chrome, 'Chrome is required for the instance isolation regression');
for (const [index, html] of pages.entries()) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-isolation-'));
  try {
    const file = path.join(directory,'index.html');
    fs.writeFileSync(file,html.replace('</body>','<script>('+probe.toString()+')();</script></body>'));
    const result = childProcess.spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--user-data-dir='+path.join(directory,'profile'),'--virtual-time-budget=1000','--dump-dom','file:///'+file.replace(/\\/g,'/')],{encoding:'utf8',timeout:20000});
    assert.equal(result.stdout?.match(/data-isolation="([^"]*)"/)?.[1], 'passed', 'Instance isolation in '+(index ? 'export' : 'editor runtime')+': '+result.stderr);
  } finally { fs.rmSync(directory,{recursive:true,force:true}); }
}
console.log('PASS component instance isolation in editor runtime and export');
