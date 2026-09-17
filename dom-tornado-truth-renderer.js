(()=>{
'use strict';
let map=null;
const IDS=['dom-tornado-vortex','dom-tornado-debris','dom-tornado-core'];
function suppressSynthetic(){if(!map)return;for(const id of IDS){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}}}
function truthData(){const src=map?.getSource?.('dom-live-points');if(!src)return;/* Canonical event source remains authoritative; this module changes semantics only, never event coordinates. */}
function install(){if(!map||!map.loaded())return;suppressSynthetic();if(!map.getLayer('dom-tornado-source-point'))map.addLayer({id:'dom-tornado-source-point',type:'circle',source:'dom-live-points',filter:['all',['==',['get','kind'],'event'],['==',['get','hazardKind'],'tornado']],paint:{'circle-color':'#ffffff','circle-radius':['interpolate',['linear'],['zoom'],0,2,5,3,9,5,13,7],'circle-stroke-color':'#18242a','circle-stroke-width':2,'circle-opacity':.95}});}
function attach(m){map=m;const apply=()=>{try{install()}catch(_){}};if(map.loaded())apply();else map.once('load',apply);try{map.on('styledata',()=>setTimeout(apply,0));map.on('sourcedata',e=>{if(e.sourceId==='dom-live-points')setTimeout(apply,0)})}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
window.addEventListener('dom:hazard-extension',()=>setTimeout(()=>{suppressSynthetic();truthData()},40));
window.DOMTornadoTruthRenderer=Object.freeze({state:()=>({attached:!!map,syntheticFootprintSuppressed:true,semantics:'official/source tornado point or source-supplied alert geometry only; no inferred path, width, vortex, debris field, or damage footprint'})});
})();