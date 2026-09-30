"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
global.window=global;
for(const file of ['component-runtime.js','flat-controls.component.js','exporter.js'])vm.runInThisContext(read(file),{filename:file});
const ids=['flat-standard-button','flat-toggle-button','flat-hold-button','flat-horizontal-slider','flat-vertical-slider','flat-standard-button','flat-slide-toggle'];
const items=ids.map((id,index)=>{const d=ComposerRuntime.get(id);return {id:'flat-'+index,pageId:'page',componentId:id,name:d.name,x:(index%3)*300,y:Math.floor(index/3)*300,w:d.defaultSize.width,h:d.defaultSize.height,z:index+1,properties:{...Object.fromEntries(d.properties.map(p=>[p.key,p.defaultValue])),showLabel:true,selectedSameAsStandard:false,holdDuration:.1,text:'Flat '+index,selectedText:'Selected '+index,...(index===0?{faceColor:'#123456'}:{})},signalBindings:Object.fromEntries(d.signals.map((s,j)=>[s.key,{mode:'join',value:String(100+index*20+j)}]))};});
items[0].properties.optionalLabelText='Additional label';items[0].properties.labelColor='#ff0000';items[0].properties.labelFontSize=11;items[0].properties.labelPlacement='right';items[5].properties.showLabel=false;
const project={version:4,width:1000,height:650,pages:[{id:'page',name:'Flat controls',bindingMode:'none'}],items,assets:[]};
const html=ComposerExporter.exportProject(project);
const mock='<script>window.flatItems='+JSON.stringify(items)+';window.published=[];window.subscriptions=[];window.CrComLib={publishEvent(type,address,value){published.push({type,address,value})},subscribeState(type,address,callback){subscriptions.push({type,address,callback});return callback},unsubscribeState(){}};</script>';
const probe=async function(){
try{
const items=window.flatItems,roots=items.map(i=>document.querySelector('[data-instance="'+i.id+'"] [data-component]'));
const eq=(a,b)=>{if(a!==b)throw Error(String(a)+' != '+String(b))};
const address=(i,key)=>items[i].signalBindings[key].value;
const feedback=(i,key,value)=>{const list=subscriptions.filter(s=>s.address===address(i,key));if(!list.length)throw Error('Missing '+key+' subscription');list.forEach(s=>s.callback(value));};
const has=(i,key,value)=>published.some(p=>p.address===address(i,key)&&p.value===value);
const pointer=(element,type,x=10,y=10)=>element.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,clientX:x,clientY:y}));
eq(getComputedStyle(roots[0].querySelector('button')).backgroundColor,'rgb(18, 52, 86)');
eq(getComputedStyle(roots[5].querySelector('button')).backgroundColor,'rgb(43, 47, 56)');
for(let i=0;i<3;i++)eq(getComputedStyle(roots[i].querySelector('button')).boxShadow,'none');
const optional=roots[0].querySelector('.composer-button-label');eq(optional.textContent,'Additional label');eq(getComputedStyle(optional).color,'rgb(255, 0, 0)');eq(getComputedStyle(optional).fontSize,'11px');eq(getComputedStyle(roots[0].querySelector('.flat-label')).fontSize,'16px');eq(roots[5].querySelector('.flat-label').textContent,'Flat 5');eq(getComputedStyle(roots[5].querySelector('.flat-label')).display,'inline');eq(getComputedStyle(roots[5].querySelector('.composer-button-label')).display,'none');feedback(0,'optionalLabel','Remote additional');eq(optional.textContent,'Remote additional');eq(roots[0].querySelector('.flat-label').textContent,'Flat 0');
const slide=roots[6].querySelector('button');eq(slide.getAttribute('aria-checked'),'false');eq(Math.round(slide.querySelector('.knob').getBoundingClientRect().width),40);slide.click();eq(slide.getAttribute('aria-checked'),'true');if(!has(6,'value',true))throw Error('Slide toggle output failed');feedback(6,'selected',false);eq(slide.getAttribute('aria-checked'),'false');feedback(6,'label','Slide label');eq(slide.getAttribute('aria-label'),'Slide label');
const standard=roots[0].querySelector('button');pointer(standard,'pointerdown');pointer(standard,'pointerup');if(!has(0,'press',true)||!has(0,'press',false))throw Error('Momentary output failed');
feedback(0,'label','Remote standard');feedback(0,'selectedLabel','Remote selected');eq(standard.textContent,'Remote standard');feedback(0,'selected',true);eq(standard.textContent,'Remote selected');
eq(optional.textContent,'Remote additional');
const toggle=roots[1].querySelector('button');pointer(toggle,'pointerdown');pointer(toggle,'pointerup');eq(toggle.getAttribute('aria-pressed'),'true');if(!has(1,'value',true))throw Error('Toggle output failed');feedback(1,'selected',false);eq(toggle.getAttribute('aria-pressed'),'false');
const hold=roots[2].querySelector('button');pointer(hold,'pointerdown');await new Promise(resolve=>setTimeout(resolve,180));pointer(hold,'pointerup');await new Promise(resolve=>setTimeout(resolve,120));if(!has(2,'held',true)||!has(2,'held',false))throw Error('Held output failed');
for(const i of [3,4]){
const slider=roots[i].querySelector('[role="slider"]'),r=slider.getBoundingClientRect();pointer(slider,'pointerdown',r.left+r.width/2,r.top+r.height/2);pointer(slider,'pointerup',r.left+r.width/2,r.top+r.height/2);if(!has(i,'value',32768))throw Error('Slider midpoint output failed');
feedback(i,'feedback',65535);eq(slider.getAttribute('aria-valuenow'),'100');slider.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));eq(slider.getAttribute('aria-valuenow'),'0');if(!has(i,'value',0))throw Error('Slider keyboard output failed');feedback(i,'label','Remote level');eq(slider.getAttribute('aria-label'),'Remote level');
}
document.body.dataset.flatResult='passed';
}catch(error){document.body.dataset.flatResult=error.message;}
};
const chrome=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file=>file&&fs.existsSync(file));assert.ok(chrome,'Chrome required');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'composer-flat-'));
try{
const file=path.join(directory,'index.html');fs.writeFileSync(file,html.replace('</head>',mock+'</head>').replace('</body>','<script>('+probe.toString()+')();</script></body>'));
const result=cp.spawnSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--user-data-dir='+path.join(directory,'profile'),'--virtual-time-budget=1500','--dump-dom','file:///'+file.replace(/\\/g,'/')],{encoding:'utf8',timeout:20000,maxBuffer:5000000});
assert.equal(result.stdout?.match(/data-flat-result="([^"]*)"/)?.[1],'passed',result.stderr);
}finally{fs.rmSync(directory,{recursive:true,force:true,maxRetries:3});}
console.log('PASS exported Flat controls: instance styling, momentary/toggle/held outputs, serial labels, analog feedback, pointer and keyboard control');
