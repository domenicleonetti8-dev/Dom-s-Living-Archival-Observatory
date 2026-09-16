import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null;
let refreshTimer=null;
const NASA_GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const ATM_SOURCE='geographical-earth-viirs-source';
const ATM_LAYER='geographical-earth-viirs';
const RAPID_REFRESH_MS=60*1000;

const EARTH_STYLE={version:8,sources:{
 imagery:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
 labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Reference labels © Esri and contributors'},
 terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain: Mapzen / AWS Open Data'}
},layers:[
 {id:'space',type:'background',paint:{'background-color':'#01070b'}},
 {id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':.08,'raster-contrast':.08}},
 {id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.10,2,.18,5,.45,8,.72,12,.94]}}
]};

function setState(message){const el=$('#providerState');if(el)el.textContent=message}
function utcDate(days=0){return new Date(Date.now()+days*86400000).toISOString().slice(0,10)}
function viirsTiles(date){return `${NASA_GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
function rapidDomain(lng,lat){
 if(lat>-60&&lat<60&&lng>-150&&lng<-20)return 'GOES East/West rapid-scan territory';
 if(lat>-60&&lat<60&&lng>=80&&lng<=180)return 'Himawari rapid-regional territory';
 if(lat>-70&&lat<70&&lng>=-70&&lng<80)return 'Meteosat/MTG territory';
 return 'polar/global context';
}
function status(){
 const c=map?.getCenter?.(); const domain=c?rapidDomain(c.lng,c.lat):'global';
 setState(`Geographical Earth · ${domain} · rapid-source discovery checks every 60 s · NASA VIIRS is background context only, not claimed real-time. Acquisition timestamps must be verified before any rapid image is rendered.`);
}

function installContext(){
 if(!map||!map.loaded())return false;
 const date=utcDate(-1);
 try{
  if(map.getLayer(ATM_LAYER))map.removeLayer(ATM_LAYER);
  if(map.getSource(ATM_SOURCE))map.removeSource(ATM_SOURCE);
  map.addSource(ATM_SOURCE,{type:'raster',tiles:[viirsTiles(date)],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'});
  map.addLayer({id:ATM_LAYER,type:'raster',source:ATM_SOURCE,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.72,2,.68,4,.58,6,.42,8,.22,10,0],'raster-saturation':-.04,'raster-contrast':.10,'raster-fade-duration':700}},'place-labels');
  status(); return true;
 }catch(e){setState(`Geographical Earth observation context unavailable · ${e?.message||e}`);return false}
}

// Rapid imagery is intentionally not fabricated from a nominal cadence. NOAA publishes GOES
// mesoscale imagery at 1-minute cadence when a mesoscale sector is active. The next adapter
// must discover the current sector, fetch its actual acquisition timestamp, verify freshness,
// then place only its true footprint. Until that contract is satisfied, the map says so.
function rapidDiscoveryTick(){status();map?.triggerRepaint()}

function build(){
 try{
  map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:1.15,minZoom:.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
  map.on('load',()=>{
   try{map.setProjection({type:'globe'})}catch(_){}
   try{map.setTerrain({source:'terrain',exaggeration:1.12})}catch(_){}
   try{map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18})}catch(_){}
   installContext(); refreshTimer=setInterval(rapidDiscoveryTick,RAPID_REFRESH_MS);
  });
  map.on('moveend',status);
  map.on('styledata',()=>{if(map.loaded()&&!map.getLayer(ATM_LAYER))setTimeout(installContext,100)});
  map.on('error',e=>setState(`Geographical Earth imagery error: ${e?.error?.message||e?.message||'unknown map error'}`));
 }catch(e){setState(`Geographical Earth failed to initialize: ${e?.message||e}`)}
}
function reset(){map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500})}
function refresh(){if(!map)return;installContext();rapidDiscoveryTick()}
function locate(){if(!navigator.geolocation){setState('Location unavailable. Geographical Earth remains in global view.');return}navigator.geolocation.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,bearing:0,duration:900}),()=>setState('Location unavailable. Geographical Earth remains in global view.'))}
window.addEventListener('pagehide',()=>{if(refreshTimer)clearInterval(refreshTimer)},{once:true});
build();
$('#resetEarth')?.addEventListener('click',reset);$('#refreshEarth')?.addEventListener('click',refresh);$('#locateMe')?.addEventListener('click',locate);
