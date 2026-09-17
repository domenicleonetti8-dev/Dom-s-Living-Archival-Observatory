(()=>{
'use strict';
let map=null,terrainOn=false,lastTune=0,reconcileTimer=null;
const legacy=[
 'dom-integrity-environment-pulse','dom-integrity-volcano-pulse','dom-integrity-tsunami-pulse','dom-integrity-storm-pulse','dom-integrity-wildfire-pulse','dom-integrity-wildfire','dom-integrity-quake-core','dom-integrity-quake-wave-0','dom-integrity-quake-wave-1','dom-integrity-quake-wave-2',
 'dom-hazard-rings','dom-hazard-earthquake-wave','dom-hazard-storm-wave','dom-hazard-wildfire-glow','dom-hazard-wildfire-flame'
];
function removeLegacy(){if(!map)return;for(const id of legacy)try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}}
function tuneRaster(){if(!map||!map.loaded())return;for(const id of ['satellite','place-labels'])try{if(map.getLayer(id)){map.setPaintProperty(id,'raster-resampling','linear');map.setPaintProperty(id,'raster-fade-duration',id==='satellite'?450:250)}}catch(_){}}
function syncTerrain(){if(!map||!map.loaded())return;const z=map.getZoom();try{if(z<4.35&&terrainOn){map.setTerrain(null);terrainOn=false}else if(z>4.85&&!terrainOn&&map.getSource('terrain')){map.setTerrain({source:'terrain',exaggeration:1.05});terrainOn=true}}catch(_){}}
function addExplicitHazards(){if(!map||!map.loaded()||!map.getSource('dom-live-points'))return;const add=(id,def)=>{try{if(!map.getLayer(id))map.addLayer(def)}catch(_){}};const event=['==',['get','kind'],'event'];
 add('dom-explicit-flood',{id:'dom-explicit-flood',type:'circle',source:'dom-live-points',filter:['all',event,['==',['get','hazardKind'],'flood']],paint:{'circle-color':'#1ea7ff','circle-radius':['interpolate',['linear'],['zoom'],0,3.8,4,6,9,10],'circle-opacity':.9,'circle-stroke-color':'#bcecff','circle-stroke-width':1.5}});
 add('dom-explicit-severe-weather',{id:'dom-explicit-severe-weather',type:'circle',source:'dom-live-points',filter:['all',event,['==',['get','hazardKind'],'weather']],paint:{'circle-color':'#ffd43b','circle-radius':['interpolate',['linear'],['zoom'],0,3.6,4,5.8,9,9.5],'circle-opacity':.9,'circle-stroke-color':'#fff3a6','circle-stroke-width':1.4}});
 add('dom-explicit-tropical',{id:'dom-explicit-tropical',type:'circle',source:'dom-live-points',filter:['all',event,['==',['get','hazardKind'],'hurricane']],paint:{'circle-color':'rgba(235,251,255,.24)','circle-radius':['interpolate',['linear'],['zoom'],0,8,4,14,9,28],'circle-stroke-color':'#dffaff','circle-stroke-width':['interpolate',['linear'],['zoom'],0,1.2,7,2.6],'circle-stroke-opacity':.95}});
 add('dom-explicit-tornado',{id:'dom-explicit-tornado',type:'circle',source:'dom-live-points',filter:['all',event,['==',['get','hazardKind'],'tornado']],paint:{'circle-color':'#cbd7dc','circle-radius':['interpolate',['linear'],['zoom'],0,3.2,5,5.5,10,9],'circle-opacity':.92,'circle-stroke-color':'#ffffff','circle-stroke-width':1.5}});
 add('dom-explicit-earthquake',{id:'dom-explicit-earthquake',type:'circle',source:'dom-live-points',filter:['all',event,['==',['get','hazardKind'],'earthquake']],paint:{'circle-color':'#ff4fa3','circle-radius':['interpolate',['linear'],['zoom'],0,2.2,5,4,10,7],'circle-opacity':.94,'circle-stroke-color':'#ffd7ec','circle-stroke-width':1.2}});
}
function settle(){if(!map||map.isMoving?.())return;const now=performance.now();if(now-lastTune<180)return;lastTune=now;removeLegacy();tuneRaster();syncTerrain();addExplicitHazards()}
function schedule(){if(reconcileTimer)clearTimeout(reconcileTimer);reconcileTimer=setTimeout(()=>{reconcileTimer=null;settle()},180)}
function attach(m){map=m;terrainOn=!!map.getTerrain?.();settle();try{map.on('zoomend',schedule);map.on('moveend',schedule);map.on('styledata',schedule);map.on('idle',schedule)}catch(_){}}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
for(const n of ['dom:hazard-extension','dom:hazard-refresh','dom:verified-global-events'])window.addEventListener(n,schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('pagehide',()=>{if(reconcileTimer)clearTimeout(reconcileTimer)});
window.DOMHazardAnimationIntegrity=Object.freeze({state:()=>({attached:!!map,continuousLegacyAnimation:false,terrainOn,orbitalTerrainSuppressed:!!map&&map.getZoom()<4.35,explicitGlobalHazards:true,debouncedReconciliation:true}),ensure:()=>{schedule();return !!map}});
})();