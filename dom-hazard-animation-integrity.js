(()=>{
'use strict';
let map=null,terrainOn=false,lastTune=0,reconcileTimer=null,replaying=false;
const extensionBuckets=new Map();
function tuneRaster(){if(!map||!map.loaded())return;for(const id of ['satellite','place-labels'])try{if(map.getLayer(id)){map.setPaintProperty(id,'raster-resampling','linear');map.setPaintProperty(id,'raster-fade-duration',0)}}catch(_){}}
function syncTerrain(){if(!map||!map.loaded())return;const z=map.getZoom();try{if(z<4.35&&terrainOn){map.setTerrain(null);terrainOn=false}else if(z>4.85&&!terrainOn&&map.getSource('terrain')){map.setTerrain({source:'terrain',exaggeration:1.05});terrainOn=true}}catch(_){}}
function settle(){if(!map||map.isMoving?.())return;const now=performance.now();if(now-lastTune<500)return;lastTune=now;tuneRaster();syncTerrain()}
function schedule(){if(reconcileTimer)clearTimeout(reconcileTimer);reconcileTimer=setTimeout(()=>{reconcileTimer=null;settle()},500)}
function sourceKey(d={}){return String(d.source||d.agency||d.lineageId||'global-extension')}
function remember(d={}){if(replaying||!Array.isArray(d.events)||!d.events.length)return;extensionBuckets.set(sourceKey(d),{...d,events:d.events.slice()})}
function replay(){if(replaying||!extensionBuckets.size)return;replaying=true;setTimeout(()=>{try{for(const d of extensionBuckets.values())window.dispatchEvent(new CustomEvent('dom:hazard-extension',{detail:d}))}finally{replaying=false}},60)}
function attach(m){map=m;terrainOn=!!map.getTerrain?.();settle();try{map.on('zoomend',schedule);map.on('moveend',schedule)}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
window.addEventListener('dom:hazard-extension',e=>{remember(e.detail||{});schedule()});
window.addEventListener('dom:verified-global-events',e=>{remember(e.detail||{});schedule()});
window.addEventListener('dom:hazard-refresh',()=>{schedule();replay()});
window.addEventListener('pageshow',()=>{schedule();replay()});
window.addEventListener('pagehide',()=>{if(reconcileTimer)clearTimeout(reconcileTimer)});
window.DOMHazardAnimationIntegrity=Object.freeze({state:()=>({attached:!!map,terrainOn,orbitalTerrainSuppressed:!!map&&map.getZoom()<4.35,preservedHazardLayers:true,persistentGlobalSources:[...extensionBuckets.keys()],persistentGlobalSourceCount:extensionBuckets.size,reconciliationMs:500}),ensure:()=>{schedule();replay();return !!map}});
})();