(()=>{
'use strict';
let map=null,raf=0,boundMap=null;
const PINK='#ff4fa3',SRC='dom-integrity-hazards',CORE='dom-eira-quake-origin',WAVES=['dom-eira-quake-wave-0','dom-eira-quake-wave-1','dom-eira-quake-wave-2'];
function has(id){return !!map?.getLayer?.(id)}
function hideLegacy(){for(const id of ['dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2','dom-earthquake-visual-core','dom-earthquake-visual-wave-0','dom-earthquake-visual-wave-1','dom-earthquake-visual-wave-2','dom-hazard-earthquake-wave','dom-animated-earthquake'])try{if(has(id))map.setLayoutProperty(id,'visibility','none')}catch(_){} }
function add(id,def){try{if(!has(id))map.addLayer(def)}catch(_){} }
function ensure(){if(!map||!map.loaded?.()||!map.getSource?.(SRC))return;hideLegacy();
  add(CORE,{id:CORE,type:'circle',source:SRC,filter:['==',['get','kind'],'Earthquake'],paint:{'circle-color':PINK,'circle-radius':['interpolate',['linear'],['coalesce',['get','magVisual'],0],0,3.2,1,3.5,3,4.4,5,5.8,7,7.3,9,9],'circle-opacity':.98,'circle-stroke-color':'#ffd5ec','circle-stroke-width':1.15,'circle-stroke-opacity':.96}});
  WAVES.forEach((id,i)=>add(id,{id,type:'circle',source:SRC,filter:['==',['get','kind'],'Earthquake'],paint:{'circle-color':'rgba(0,0,0,0)','circle-opacity':0,'circle-radius':6,'circle-stroke-color':PINK,'circle-stroke-width':['interpolate',['linear'],['coalesce',['get','magVisual'],0],0,.9,1,1.05,3,1.35,5,1.75,7,2.2,9,2.6],'circle-stroke-opacity':.5}}));
  for(const id of [...WAVES,CORE])try{if(has(id))map.moveLayer(id)}catch(_){};start();
}
function animate(ts){raf=0;if(map?.loaded?.()){for(let i=0;i<WAVES.length;i++){const id=WAVES[i],t=((ts/2200)+(i/3))%1;if(!has(id))continue;const mag=['max',0,['coalesce',['get','magVisual'],0]],zoomScale=['interpolate',['linear'],['zoom'],0,.65,3,.78,6,1,10,1.25];const expansion=['*',zoomScale,['+',5,['*',t,['+',8,['*',3.2,mag]]]]];try{map.setPaintProperty(id,'circle-radius',expansion);map.setPaintProperty(id,'circle-stroke-opacity',['*',.72,['-',1,t]])}catch(_){}}}start()}
function start(){if(raf||document.visibilityState==='hidden'||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;raf=requestAnimationFrame(animate)}
function attach(m){if(!m)return;if(map===m){ensure();return}map=m;boundMap=m;ensure();try{map.on('styledata',()=>setTimeout(ensure,0));map.on('sourcedata',e=>{if(e.sourceId===SRC)ensure()})}catch(_){}start()}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});for(const n of ['dom:hazard-refresh','dom:hazard-extension','dom:verified-global-events'])window.addEventListener(n,()=>setTimeout(ensure,0));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){ensure();start()}else if(raf){cancelAnimationFrame(raf);raf=0}});window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0},{once:true});
window.DOMEarthquakeVisualRestoration=Object.freeze({attach,apply:ensure,state:()=>({attached:!!map,pink:PINK,source:SRC,core:CORE,waves:WAVES,mode:'USGS all-magnitude epicenter dot + magnitude-scaled deconflicted ping rings'})});if(window.DOMCurrentHazardMap?.map)attach(window.DOMCurrentHazardMap.map);
})();