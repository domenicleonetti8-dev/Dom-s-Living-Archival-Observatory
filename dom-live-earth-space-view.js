(()=>{
'use strict';
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const STEP=10*60*1000,REFRESH=60*1000;
const state={map:null,timer:0,frameTime:null,layers:[],lastError:null};
const PRODUCTS=[
 {id:'goes-east',layer:'GOES-East_ABI_GeoColor',coverage:'western hemisphere'},
 {id:'goes-west',layer:'GOES-West_ABI_GeoColor',coverage:'eastern Pacific'},
 {id:'himawari',layer:'Himawari_AHI_Band3_Red_Visible_1km',coverage:'western Pacific / Asia'}
];
function frameDate(){return new Date(Math.floor((Date.now()-STEP)/STEP)*STEP).toISOString().replace(/\.000Z$/,'Z')}
function tile(layer,t){return `${GIBS}/${layer}/default/${encodeURIComponent(t)}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.jpg`}
function ensureLayer(p,t){const m=state.map,sid=`dom-worldview-${p.id}`,lid=`${sid}-atmosphere`;if(!m||!m.loaded?.())return;const url=tile(p.layer,t);try{if(m.getLayer?.(lid))m.removeLayer(lid);if(m.getSource?.(sid))m.removeSource(sid);m.addSource(sid,{type:'raster',tiles:[url],tileSize:256,attribution:'NASA Worldview / GIBS'});const before=m.getLayer?.('dom-live-points-layer')?'dom-live-points-layer':undefined;m.addLayer({id:lid,type:'raster',source:sid,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.92,3,.88,6,.78,9,.5,12,.18],'raster-fade-duration':900}},before);state.layers.push(lid)}catch(e){state.lastError=String(e?.message||e)}}
function setLOD(){const m=state.map;if(!m)return;const z=m.getZoom?.()??0;for(const id of['dom-live-points-layer','dom-live-touch-layer','dom-eira-quake-origin','dom-live-pulse'])try{if(m.getLayer?.(id))m.setLayoutProperty(id,'visibility',z<2.2?'none':'visible')}catch(_){};for(const id of state.layers)try{if(m.getLayer?.(id))m.setPaintProperty(id,'raster-opacity',z<2?.92:z<6?.82:z<9?.55:.18)}catch(_){}}
function refresh(){const m=state.map;if(!m||!m.loaded?.())return false;const t=frameDate();if(t===state.frameTime&&state.layers.length){setLOD();return true}state.layers=[];state.frameTime=t;PRODUCTS.forEach(p=>ensureLayer(p,t));setLOD();window.dispatchEvent(new CustomEvent('dom:worldview-atmosphere-frame',{detail:{source:'NASA Worldview / GIBS',frameTime:t,truth:'OBSERVED_WHERE_IMAGERY_EXISTS',gapPolicy:'transparent-underlay',products:PRODUCTS.map(p=>p.layer)}}));return true}
function attach(m){if(!m)return;state.map=m;const run=()=>{refresh();setLOD()};m.on?.('load',run);m.on?.('zoom',setLOD);m.on?.('zoomend',setLOD);if(m.loaded?.())run();clearInterval(state.timer);state.timer=setInterval(refresh,REFRESH)}
window.addEventListener('dom:map-ready',e=>attach(e.detail?.map));window.addEventListener('pagehide',()=>clearInterval(state.timer));
window.DOMLiveEarthSpaceView=Object.freeze({attach,refresh,state:()=>({frameTime:state.frameTime,layers:[...state.layers],lastError:state.lastError,products:PRODUCTS})});
if(window.DOMCurrentHazardMap?.map)attach(window.DOMCurrentHazardMap.map);
})();