(()=>{
'use strict';
let map=null,terrainOn=false,lastTune=0,reconcileTimer=null;
const legacy=[
 'dom-integrity-environment-pulse','dom-integrity-volcano-pulse','dom-integrity-tsunami-pulse','dom-integrity-storm-pulse','dom-integrity-wildfire-pulse','dom-integrity-wildfire','dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2',
 'dom-hazard-rings','dom-hazard-earthquake-wave','dom-hazard-storm-wave','dom-hazard-wildfire-glow','dom-hazard-wildfire-flame',
 'dom-explicit-flood','dom-explicit-severe-weather','dom-explicit-tropical','dom-explicit-tornado','dom-explicit-earthquake'
];
function removeLegacy(){if(!map)return;for(const id of legacy)try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}}
function tuneRaster(){if(!map||!map.loaded())return;for(const id of ['satellite','place-labels'])try{if(map.getLayer(id)){map.setPaintProperty(id,'raster-resampling','linear');map.setPaintProperty(id,'raster-fade-duration',0)}}catch(_){}}
function syncTerrain(){if(!map||!map.loaded())return;const z=map.getZoom();try{if(z<4.35&&terrainOn){map.setTerrain(null);terrainOn=false}else if(z>4.85&&!terrainOn&&map.getSource('terrain')){map.setTerrain({source:'terrain',exaggeration:1.05});terrainOn=true}}catch(_){}}
function settle(){if(!map||map.isMoving?.())return;const now=performance.now();if(now-lastTune<500)return;lastTune=now;removeLegacy();tuneRaster();syncTerrain()}
function schedule(){if(reconcileTimer)clearTimeout(reconcileTimer);reconcileTimer=setTimeout(()=>{reconcileTimer=null;settle()},500)}
function attach(m){map=m;terrainOn=!!map.getTerrain?.();settle();try{map.on('zoomend',schedule);map.on('moveend',schedule)}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
for(const n of ['dom:hazard-extension','dom:hazard-refresh','dom:verified-global-events'])window.addEventListener(n,schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('pagehide',()=>{if(reconcileTimer)clearTimeout(reconcileTimer)});
window.DOMHazardAnimationIntegrity=Object.freeze({state:()=>({attached:!!map,continuousLegacyAnimation:false,terrainOn,orbitalTerrainSuppressed:!!map&&map.getZoom()<4.35,duplicateExplicitLayers:false,reconciliationMs:500}),ensure:()=>{schedule();return !!map}});
})();