(()=>{
'use strict';
let map=null,raf=0,lastFrame=0;
const reduced=()=>typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const has=id=>!!(map&&map.getLayer&&map.getLayer(id));
const add=(id,def)=>{try{if(map&&map.loaded()&&!map.getLayer(id))map.addLayer(def)}catch(_){}};
const paint=(id,prop,val)=>{try{if(has(id))map.setPaintProperty(id,prop,val)}catch(_){}};
const kinds=(...a)=>['in',['get','kind'],['literal',a]];
const eventColor=['match',['get','kind'],'Wildfire','#ff5b22','Severe Storm','#5de7ff','Volcano','#ff7a1a','Flood','#2f8cff','Drought','#d8a95b','Atmospheric Hazard','#d6b47f','Extreme Temperature','#ffcc4d','Sea / Lake Ice','#a9e8ff','Winter Weather','#d7f8ff','Landslide','#b38a68','Tsunami','#ffd43b','#d7f8ff'];
const promoted=['dom-integrity-environment-pulse','dom-integrity-volcano-pulse','dom-integrity-tsunami-pulse','dom-integrity-storm-pulse','dom-integrity-wildfire-pulse','dom-integrity-wildfire','dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2'];
function promote(){for(const id of promoted)try{if(has(id))map.moveLayer(id)}catch(_){}}
function ensure(){if(!map||!map.loaded()||!map.getSource('dom-integrity-hazards'))return false;
 add('dom-integrity-wildfire-pulse',{id:'dom-integrity-wildfire-pulse',type:'circle',source:'dom-integrity-hazards',filter:['==',['get','kind'],'Wildfire'],paint:{'circle-color':'rgba(0,0,0,0)','circle-radius':12,'circle-opacity':0,'circle-stroke-color':'#ff9d2e','circle-stroke-width':2.6,'circle-stroke-opacity':.72}});
 add('dom-integrity-storm-pulse',{id:'dom-integrity-storm-pulse',type:'circle',source:'dom-integrity-hazards',filter:['==',['get','kind'],'Severe Storm'],paint:{'circle-color':'rgba(0,0,0,0)','circle-radius':13,'circle-opacity':0,'circle-stroke-color':'#5de7ff','circle-stroke-width':2.8,'circle-stroke-opacity':.76}});
 add('dom-integrity-volcano-pulse',{id:'dom-integrity-volcano-pulse',type:'circle',source:'dom-integrity-hazards',filter:['==',['get','kind'],'Volcano'],paint:{'circle-color':'rgba(0,0,0,0)','circle-radius':12,'circle-opacity':0,'circle-stroke-color':'#ff7a1a','circle-stroke-width':2.7,'circle-stroke-opacity':.72}});
 add('dom-integrity-tsunami-pulse',{id:'dom-integrity-tsunami-pulse',type:'circle',source:'dom-integrity-hazards',filter:['==',['get','kind'],'Tsunami'],paint:{'circle-color':'rgba(0,0,0,0)','circle-radius':14,'circle-opacity':0,'circle-stroke-color':'#ffd43b','circle-stroke-width':3,'circle-stroke-opacity':.78}});
 add('dom-integrity-environment-pulse',{id:'dom-integrity-environment-pulse',type:'circle',source:'dom-integrity-hazards',filter:kinds('Flood','Drought','Atmospheric Hazard','Extreme Temperature','Sea / Lake Ice','Winter Weather','Landslide'),paint:{'circle-color':'rgba(0,0,0,0)','circle-radius':10,'circle-opacity':0,'circle-stroke-color':eventColor,'circle-stroke-width':2,'circle-stroke-opacity':.58}});
 promote();start();return true}
function wave(ms,offset=0){return((performance.now()+offset)%ms)/ms}
function animate(ts){raf=0;if(!map||!map.loaded()){start();return}if(ts-lastFrame<28){start();return}lastFrame=ts;
 const fire=wave(1500),storm=wave(1900,430),volcano=wave(2500,870),tsunami=wave(2100,220),env=wave(3200,1200);
 paint('dom-integrity-wildfire-pulse','circle-radius',10+fire*30);paint('dom-integrity-wildfire-pulse','circle-stroke-opacity',.88*(1-fire));
 paint('dom-integrity-wildfire','circle-radius',['interpolate',['linear'],['zoom'],0,4.8+Math.sin(fire*Math.PI)*2.3,5,7+Math.sin(fire*Math.PI)*2.6,10,9.5+Math.sin(fire*Math.PI)*3]);paint('dom-integrity-wildfire','circle-opacity',.65+Math.sin(fire*Math.PI)*.25);
 paint('dom-integrity-storm-pulse','circle-radius',11+storm*32);paint('dom-integrity-storm-pulse','circle-stroke-opacity',.90*(1-storm));
 paint('dom-integrity-volcano-pulse','circle-radius',10+volcano*26);paint('dom-integrity-volcano-pulse','circle-stroke-opacity',.80*(1-volcano));
 paint('dom-integrity-tsunami-pulse','circle-radius',12+tsunami*40);paint('dom-integrity-tsunami-pulse','circle-stroke-opacity',.92*(1-tsunami));
 paint('dom-integrity-environment-pulse','circle-radius',9+env*18);paint('dom-integrity-environment-pulse','circle-stroke-opacity',.62*(1-env));
 promote();start()}
function start(){if(raf||reduced()||document.visibilityState==='hidden')return;raf=requestAnimationFrame(animate)}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function attach(m){map=m;ensure();try{map.on('styledata',()=>setTimeout(ensure,0));map.on('sourcedata',e=>{if(e.sourceId==='dom-integrity-hazards')ensure()})}catch(_){}start()}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
for(const n of ['dom:hazard-extension','dom:hazard-refresh','dom:verified-global-events'])window.addEventListener(n,()=>setTimeout(()=>{ensure();start()},0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){ensure();start()}else stop()});
window.addEventListener('pagehide',stop,{once:true});
window.DOMHazardAnimationIntegrity=Object.freeze({state:()=>({attached:!!map,running:!!raf,reducedMotion:reduced(),layers:promoted.filter(has)}),ensure});
})();