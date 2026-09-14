(()=>{
'use strict';
let map=null,timer=null;
const PINK='#ff4fa3';
function has(id){return !!(map&&map.getLayer&&map.getLayer(id));}
function excludeEarthquakes(id){if(!has(id))return;try{const f=map.getFilter(id);const noEq=['!=',['get','kind'],'earthquake'];if(!f){map.setFilter(id,noEq);return}const s=JSON.stringify(f);if(!s.includes('earthquake'))map.setFilter(id,['all',f,noEq]);}catch(_){}}
function apply(){if(!map||!map.loaded?.())return;
  excludeEarthquakes('dom-hazard-core');
  excludeEarthquakes('dom-hazard-rings');
  excludeEarthquakes('dom-live-points-layer');
  try{if(has('dom-integrity-quake-core')){
    map.setPaintProperty('dom-integrity-quake-core','circle-color',PINK);
    map.setPaintProperty('dom-integrity-quake-core','circle-radius',['interpolate',['linear'],['get','magVisual'],0,5.5,2.5,7.5,5,10.5,7,14.5,9,18]);
    map.setPaintProperty('dom-integrity-quake-core','circle-stroke-color',PINK);
    map.setPaintProperty('dom-integrity-quake-core','circle-stroke-width',2.2);
    map.setPaintProperty('dom-integrity-quake-core','circle-opacity',.98);
  }}catch(_){}
  for(let i=0;i<3;i++)try{const id=`dom-integrity-quake-wave-${i}`;if(has(id)){
    map.setPaintProperty(id,'circle-stroke-color',PINK);
    map.setPaintProperty(id,'circle-stroke-width',['interpolate',['linear'],['get','magVisual'],0,2.2,3,3.2,5,4.3,7,5.5,9,6.5]);
  }}catch(_){}
  for(const id of ['dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2'])try{if(has(id))map.moveLayer(id)}catch(_){}
}
function attach(m){map=m;apply();try{map.on('styledata',()=>setTimeout(apply,0));map.on('zoomend',()=>setTimeout(apply,0));map.on('moveend',()=>setTimeout(apply,0));}catch(_){}if(timer)clearInterval(timer);timer=setInterval(apply,1500);}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
for(const n of ['dom:hazard-refresh','dom:hazard-extension','dom:verified-global-events'])window.addEventListener(n,()=>setTimeout(apply,0));
window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);timer=null},{once:true});
window.DOMEarthquakeVisualRestoration=Object.freeze({apply,state:()=>({attached:!!map,pink:PINK,mode:'authoritative-USGS-only'})});
})();
