(()=>{
'use strict';
let map=null,terrainOn=false,lastTune=0,replaying=false;
const extensionBuckets=new Map();
const legacy=[
 'dom-integrity-environment-pulse','dom-integrity-volcano-pulse','dom-integrity-tsunami-pulse','dom-integrity-storm-pulse','dom-integrity-wildfire-pulse','dom-integrity-wildfire','dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2',
 'dom-hazard-rings','dom-hazard-earthquake-wave','dom-hazard-storm-wave','dom-hazard-wildfire-glow','dom-hazard-wildfire-flame'
];
function removeLegacy(){if(!map)return;for(const id of legacy)try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}}
function tuneRaster(){if(!map||!map.loaded())return;for(const id of ['satellite','place-labels']){try{if(!map.getLayer(id))continue;map.setPaintProperty(id,'raster-resampling','linear');map.setPaintProperty(id,'raster-fade-duration',id==='satellite'?850:500)}catch(_){}}}
function syncTerrain(){if(!map||!map.loaded())return;const z=map.getZoom();try{if(z<4.35&&terrainOn){map.setTerrain(null);terrainOn=false}else if(z>4.85&&!terrainOn&&map.getSource('terrain')){map.setTerrain({source:'terrain',exaggeration:1.05});terrainOn=true}}catch(_){}}
function settle(){const now=performance.now();if(now-lastTune<120)return;lastTune=now;removeLegacy();tuneRaster();syncTerrain()}
function attach(m){map=m;terrainOn=!!map.getTerrain?.();removeLegacy();tuneRaster();syncTerrain();try{map.on('zoomend',settle);map.on('moveend',settle);map.on('styledata',()=>setTimeout(settle,0));map.on('idle',()=>{removeLegacy();tuneRaster()})}catch(_){}}
function sourceKey(d={}){return String(d.source||d.agency||d.lineageId||'global-extension')}
function rememberExtension(d={}){if(replaying||!Array.isArray(d.events)||!d.events.length)return;extensionBuckets.set(sourceKey(d),{...d,events:d.events.slice()})}
function replayExtensions(){if(replaying||!extensionBuckets.size)return;replaying=true;setTimeout(()=>{try{for(const d of extensionBuckets.values())window.dispatchEvent(new CustomEvent('dom:hazard-extension',{detail:d}))}finally{replaying=false}},40)}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
window.addEventListener('dom:hazard-extension',e=>{rememberExtension(e.detail||{});setTimeout(()=>{removeLegacy();tuneRaster()},0)});
window.addEventListener('dom:verified-global-events',e=>{rememberExtension(e.detail||{});setTimeout(()=>{removeLegacy();tuneRaster()},0)});
window.addEventListener('dom:hazard-refresh',()=>{setTimeout(()=>{removeLegacy();tuneRaster();replayExtensions()},0)});
window.addEventListener('pageshow',()=>setTimeout(settle,0));
window.DOMHazardAnimationIntegrity=Object.freeze({state:()=>({attached:!!map,continuousLegacyAnimation:false,terrainOn,orbitalTerrainSuppressed:!!map&&map.getZoom()<4.35,persistentGlobalSources:[...extensionBuckets.keys()],persistentGlobalSourceCount:extensionBuckets.size}),ensure:()=>{settle();return !!map}});
})();