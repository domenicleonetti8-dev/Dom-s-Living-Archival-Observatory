(()=>{
'use strict';
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const STEP=600000,REFRESH=60000,TRANSITION=55000;
const PRODUCTS=[
 {id:'goes-east',layer:'GOES-East_ABI_GeoColor',coverage:'Americas / Atlantic'},
 {id:'goes-west',layer:'GOES-West_ABI_GeoColor',coverage:'Pacific / western Americas'},
 {id:'himawari',layer:'Himawari_AHI_Band3_Red_Visible_1km',coverage:'western Pacific / Asia'}
];
const state={map:null,timer:0,frameTime:null,previousTime:null,layers:[],lastError:null,phase:'idle'};
const frameDate=(offset=1)=>new Date(Math.floor(Date.now()/STEP)*STEP-offset*STEP).toISOString().replace(/\.000Z$/,'Z');
const tile=(layer,t)=>`${GIBS}/${layer}/default/${encodeURIComponent(t)}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.jpg`;
function opacity(z){return z<2?.94:z<5?.86:z<8?.66:z<10?.42:.16}
function addFrame(p,t,slot){const m=state.map,sid=`dom-worldview-${p.id}-${slot}`,lid=`${sid}-atmosphere`;if(!m||!m.loaded?.())return null;try{if(m.getLayer?.(lid))m.removeLayer(lid);if(m.getSource?.(sid))m.removeSource(sid);m.addSource(sid,{type:'raster',tiles:[tile(p.layer,t)],tileSize:256,attribution:'NASA Worldview / GIBS'});const before=m.getLayer?.('dom-live-points-layer')?'dom-live-points-layer':undefined;m.addLayer({id:lid,type:'raster',source:sid,paint:{'raster-opacity':slot==='previous'?0:opacity(m.getZoom?.()??0),'raster-fade-duration':TRANSITION}},before);state.layers.push({id:lid,slot,product:p.id});return lid}catch(e){state.lastError=String(e?.message||e);return null}}
function clean(){const m=state.map;if(!m)return;for(const x of state.layers){try{if(m.getLayer?.(x.id))m.removeLayer(x.id);const sid=x.id.replace(/-atmosphere$/,'');if(m.getSource?.(sid))m.removeSource(sid)}catch(_){}}state.layers=[]}
function setLOD(){const m=state.map;if(!m)return;const z=m.getZoom?.()??0;for(const id of['dom-live-points-layer','dom-live-touch-layer','dom-eira-quake-origin','dom-live-pulse'])try{if(m.getLayer?.(id))m.setLayoutProperty(id,'visibility',z<2.2?'none':'visible')}catch(_){};for(const x of state.layers)try{if(m.getLayer?.(x.id))m.setPaintProperty(x.id,'raster-opacity',x.slot==='previous'?0:opacity(z))}catch(_){}}
function refresh(){const m=state.map;if(!m||!m.loaded?.())return false;const current=frameDate(1),previous=frameDate(2);if(current===state.frameTime&&state.layers.length){setLOD();return true}state.phase='transition';clean();state.previousTime=previous;state.frameTime=current;for(const p of PRODUCTS){addFrame(p,previous,'previous');addFrame(p,current,'current')}setLOD();state.phase='observed';window.dispatchEvent(new CustomEvent('dom:worldview-atmosphere-frame',{detail:{source:'NASA Worldview / GIBS',previousFrameTime:previous,frameTime:current,truth:'OBSERVED_FRAMES_WITH_RENDER_INTERPOLATION',interpolation:'visual cross-frame transition only; never classified as observation',gapPolicy:'transparent-underlay; no synthetic cloud fill',products:PRODUCTS.map(p=>p.layer)}}));return true}
function attach(m){if(!m)return;state.map=m;const run=()=>{refresh();setLOD()};m.on?.('load',run);m.on?.('zoom',setLOD);m.on?.('zoomend',setLOD);if(m.loaded?.())run();clearInterval(state.timer);state.timer=setInterval(refresh,REFRESH)}
window.addEventListener('dom:map-ready',e=>attach(e.detail?.map));window.addEventListener('pagehide',()=>clearInterval(state.timer));
window.DOMLiveEarthSpaceView=Object.freeze({attach,refresh,state:()=>({frameTime:state.frameTime,previousTime:state.previousTime,layers:state.layers.map(x=>x.id),phase:state.phase,lastError:state.lastError,products:PRODUCTS})});
if(window.DOMCurrentHazardMap?.map)attach(window.DOMCurrentHazardMap.map);
})();