(()=>{
'use strict';
let map=null,terrainOn=false,lastTune=0;
const legacy=[
 'dom-integrity-environment-pulse','dom-integrity-volcano-pulse','dom-integrity-tsunami-pulse','dom-integrity-storm-pulse','dom-integrity-wildfire-pulse','dom-integrity-wildfire','dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2',
 'dom-hazard-rings','dom-hazard-earthquake-wave','dom-hazard-storm-wave','dom-hazard-wildfire-glow','dom-hazard-wildfire-flame'
];
function removeLegacy(){if(!map)return;for(const id of legacy)try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}}
function tuneRaster(){if(!map||!map.loaded())return;for(const id of ['satellite','place-labels']){try{if(!map.getLayer(id))continue;map.setPaintProperty(id,'raster-resampling','linear');map.setPaintProperty(id,'raster-fade-duration',id==='satellite'?850:500)}catch(_){}}}
function syncTerrain(){if(!map||!map.loaded())return;const z=map.getZoom();try{if(z<4.35&&terrainOn){map.setTerrain(null);terrainOn=false}else if(z>4.85&&!terrainOn&&map.getSource('terrain')){map.setTerrain({source:'terrain',exaggeration:1.05});terrainOn=true}}catch(_){}}
function settle(){const now=performance.now();if(now-lastTune<120)return;lastTune=now;removeLegacy();tuneRaster();syncTerrain()}
function attach(m){map=m;terrainOn=!!map.getTerrain?.();removeLegacy();tuneRaster();syncTerrain();try{map.on('zoomend',settle);map.on('moveend',settle);map.on('styledata',()=>setTimeout(settle,0));map.on('idle',()=>{removeLegacy();tuneRaster()})}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
for(const n of ['dom:hazard-extension','dom:hazard-refresh','dom:verified-global-events'])window.addEventListener(n,()=>setTimeout(()=>{removeLegacy();tuneRaster()},0));
window.addEventListener('pageshow',()=>setTimeout(settle,0));
window.DOMHazardAnimationIntegrity=Object.freeze({state:()=>({attached:!!map,continuousLegacyAnimation:false,terrainOn,orbitalTerrainSuppressed:!!map&&map.getZoom()<4.35}),ensure:()=>{settle();return !!map}});
})();