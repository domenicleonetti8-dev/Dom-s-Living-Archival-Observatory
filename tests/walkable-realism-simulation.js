'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class ET{constructor(){this.l={}}addEventListener(n,f){(this.l[n]??=[]).push(f)}dispatchEvent(e){for(const f of this.l[e.type]||[])f(e);return true}}
class CE{constructor(type,o={}){this.type=type;this.detail=o.detail}}
const bus=new ET(),buttons=[];
const box={style:{},querySelectorAll:()=>buttons,addEventListener(n,f){this.click=f},setAttribute(){},innerHTML:''};
for(const a of['look','fwd','interact','left','back','right'])buttons.push({dataset:{a},style:{}});
const host={appendChild(x){this.child=x}};
const mapEvents={},center={lat:40,lng:-74};
const map={center,zoom:18,pitch:0,bearing:0,getContainer:()=>host,getCenter:()=>map.center,getZoom:()=>map.zoom,getPitch:()=>map.pitch,getBearing:()=>map.bearing,setPitch:v=>map.pitch=v,on:(n,f)=>mapEvents[n]=f,easeTo:o=>{map.center={lat:o.center[1],lng:o.center[0]}},dragPan:{enable(){}},dragRotate:{enable(){},disable(){}},touchZoomRotate:{enableRotation(){}}};
const document={readyState:'complete',createElement:()=>box,getElementById:()=>host,addEventListener(){}};
const poly={type:'Polygon',coordinates:[[[-74,40],[-73.99,40],[-73.99,40.01],[-74,40.01],[-74,40]]]};
const events=[{id:'eq',kind:'earthquake',lat:40.01,lon:-74,mag:6.2,depth:10,truthState:'OBSERVED'},{id:'flood',kind:'flood',lat:40.01,lon:-74,truthState:'MODELED',geometry:poly},{id:'warn',kind:'tornado',lat:40.02,lon:-74,truthState:'WARNING',officialAlert:true,source:'NWS',geometry:poly},{id:'tor',kind:'tornado',lat:40.03,lon:-74,truthState:'OBSERVED',observationVerified:true,source:'authoritative-test-fixture'}];
Object.assign(bus,{DOMCurrentHazardMap:{map},DOMHazardState:{events}});
const sandbox={window:bus,document,CustomEvent:CE,matchMedia:()=>({matches:false}),setInterval:f=>{f();return 1},clearInterval(){},console};bus.window=bus;
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dom-realism-runtime.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('dom-realism-observatory-adapter.js','utf8'),sandbox);
const A=bus.DOMRealismObservatoryAdapter,s=A.state();assert(s.bound);assert(s.walking);assert.equal(s.mode,'WALK');assert(s.controls);assert(map.pitch>=65);assert(host.child);
const physical=[];for(const n of['dom:physical-earthquake','dom:physical-flood','dom:physical-tornado'])bus.addEventListener(n,e=>physical.push(e));mapEvents.moveend();assert(physical.some(e=>e.type==='dom:physical-earthquake'&&e.detail.damageImplied===false));assert(physical.some(e=>e.type==='dom:physical-flood'&&e.detail.label==='MODELED FLOOD EXTENT'));assert.equal(physical.filter(e=>e.type==='dom:physical-tornado').length,1);
const before={...map.center};box.click({target:buttons.find(b=>b.dataset.a==='fwd')});assert.notDeepEqual(map.center,before);
map.zoom=12;mapEvents.zoomend();assert.equal(A.state().mode,'CITY');assert.equal(host.child.style.display,'none');
console.log(JSON.stringify({WALKABLE_REALISM_SIMULATION:'PASS',physicalEvents:physical.map(e=>e.type),state:A.state()},null,2));