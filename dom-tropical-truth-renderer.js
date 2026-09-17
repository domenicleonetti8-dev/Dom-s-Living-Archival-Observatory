(()=>{
'use strict';
let map=null;
const SOURCE='dom-live-points';
const SYNTHETIC=['dom-hurricane-cloud','dom-hurricane-outer','dom-hurricane-band','dom-hurricane-inner-band','dom-hurricane-eye'];
function hideSynthetic(){if(!map)return;for(const id of SYNTHETIC){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}}}
function ensure(){if(!map||!map.loaded()||!map.getSource(SOURCE))return false;hideSynthetic();if(!map.getLayer('dom-tropical-source-point'))map.addLayer({id:'dom-tropical-source-point',type:'circle',source:SOURCE,filter:['all',['==',['get','kind'],'event'],['==',['get','hazardKind'],'hurricane']],paint:{'circle-color':'#dffaff','circle-radius':['interpolate',['linear'],['zoom'],0,5.5,3,6.5,7,8.5,11,12],'circle-opacity':.98,'circle-stroke-color':'#007ea8','circle-stroke-width':['interpolate',['linear'],['zoom'],0,1.2,6,2,11,3]}});else try{map.setLayoutProperty('dom-tropical-source-point','visibility','visible')}catch(_){}return true}
function attach(m){map=m;const reconcile=()=>{try{ensure()}catch(_){}};reconcile();setTimeout(reconcile,250);setTimeout(reconcile,1000);try{map.on('styledata',reconcile)}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
for(const n of ['dom:hazard-extension','dom:hazard-refresh','dom:verified-global-events'])window.addEventListener(n,()=>setTimeout(ensure,0));
window.DOMTropicalTruthRenderer=Object.freeze({ensure,state:()=>({attached:!!map,sourcePointLayer:!!map?.getLayer?.('dom-tropical-source-point'),syntheticStormExtentSuppressed:true,policy:'Render source-qualified tropical-system position only. No eye, cloud field, wind radius, rainband or storm extent is invented.'})});
})();