(()=>{
'use strict';
let map=null;
const PINK='#ff4fa3',SRC='dom-integrity-hazards',CORE='dom-eira-quake-origin';
const LEGACY=['dom-live-pulse','dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2','dom-earthquake-visual-core','dom-earthquake-visual-wave-0','dom-earthquake-visual-wave-1','dom-earthquake-visual-wave-2','dom-hazard-earthquake-wave','dom-animated-earthquake','dom-eira-quake-wave-0','dom-eira-quake-wave-1','dom-eira-quake-wave-2'];
function has(id){return !!map?.getLayer?.(id)}
function suppress(){for(const id of LEGACY)try{if(has(id))map.setLayoutProperty(id,'visibility','none')}catch(_){} }
function ensure(){if(!map||!map.loaded?.()||!map.getSource?.(SRC))return;suppress();try{if(!has(CORE))map.addLayer({id:CORE,type:'circle',source:SRC,filter:['==',['get','kind'],'Earthquake'],paint:{'circle-color':PINK,'circle-radius':['interpolate',['linear'],['zoom'],0,2.2,4,2.8,8,3.8,12,5.2,17,6.2],'circle-opacity':['interpolate',['linear'],['zoom'],0,.7,4,.78,10,.9,17,.98],'circle-stroke-color':'#ffd5ec','circle-stroke-width':['interpolate',['linear'],['zoom'],0,.65,8,1,17,1.4],'circle-stroke-opacity':.9}});map.moveLayer(CORE)}catch(_){} }
function attach(m){if(!m)return;map=m;ensure();try{map.on('styledata',()=>setTimeout(ensure,0));map.on('sourcedata',e=>{if(e.sourceId===SRC)ensure()});map.on('zoomend',ensure)}catch(_){} }
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});for(const n of ['dom:hazard-refresh','dom:hazard-extension','dom:verified-global-events'])window.addEventListener(n,()=>setTimeout(ensure,0));
window.DOMEarthquakeVisualRestoration=Object.freeze({attach,apply:ensure,state:()=>({attached:!!map,pink:PINK,source:SRC,core:CORE,mode:'verified epicenter dot only; no default planetary pulse rings; physical response delegated to qualified realism runtime'})});if(window.DOMCurrentHazardMap?.map)attach(window.DOMCurrentHazardMap.map);
})();