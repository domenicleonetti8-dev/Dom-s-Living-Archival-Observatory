import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null;
let refreshTimer=null;
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const SRC='dom-earth-viirs';
const LYR='dom-earth-viirs';

const EARTH_STYLE={
 version:8,
 sources:{
  imagery:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
  labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Reference labels © Esri and contributors'},
  terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain: Mapzen / AWS Open Data'}
 },
 layers:[
  {id:'space',type:'background',paint:{'background-color':'#01070b'}},
  {id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':0.08,'raster-contrast':0.08}},
  {id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,0.03,2,0.10,5,0.42,8,0.72,12,0.94]}}
 ]
};

function setState(text){const el=$('#providerState');if(el)el.textContent=text;}
function dateUTC(offset=0){const d=new Date(Date.now()+offset*86400000);return d.toISOString().slice(0,10);}
function tileURL(date){return `${GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;}

function installCloudContext(){
 if(!map||!map.isStyleLoaded())return false;
 const date=dateUTC(-1);
 try{
  if(map.getLayer(LYR))map.removeLayer(LYR);
  if(map.getSource(SRC))map.removeSource(SRC);
  map.addSource(SRC,{type:'raster',tiles:[tileURL(date)],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'});
  map.addLayer({id:LYR,type:'raster',source:SRC,paint:{
   'raster-opacity':['interpolate',['linear'],['zoom'],0,0.94,2,0.92,4,0.84,6,0.62,8,0.34,10,0],
   'raster-saturation':0.02,
   'raster-contrast':0.10,
   'raster-fade-duration':250
  }},'place-labels');
  setState(`Observed Earth layer active · NASA VIIRS ${date} context · geographic terrain underneath · not represented as real-time.`);
  return true;
 }catch(err){
  setState(`Observed Earth layer unavailable · ${err&&err.message?err.message:String(err)}`);
  return false;
 }
}

function initializeLoadedMap(){
 try{map.setProjection({type:'globe'});}catch(e){}
 try{map.setTerrain({source:'terrain',exaggeration:1.12});}catch(e){}
 try{map.setFog({range:[0.4,8],color:'#8bb7c8','horizon-blend':0.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':0.18});}catch(e){}
 installCloudContext();
 if(!refreshTimer)refreshTimer=setInterval(installCloudContext,10*60*1000);
}

function build(){
 setState('Starting Geographical Earth renderer…');
 try{
  map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:1.15,minZoom:0.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
  map.once('load',initializeLoadedMap);
  map.on('error',event=>{
   const msg=event&&event.error&&event.error.message?event.error.message:(event&&event.message?event.message:'map resource error');
   if(!map.getLayer(LYR))setState(`Geographical Earth resource notice · ${msg}`);
  });
 }catch(err){setState(`Geographical Earth failed to initialize · ${err&&err.message?err.message:String(err)}`);}
}

function reset(){if(map)map.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500});}
function refresh(){if(!map)return;setState('Refreshing observed Earth layer…');installCloudContext();map.triggerRepaint();}
function locate(){
 if(!navigator.geolocation){setState('Location unavailable.');return;}
 navigator.geolocation.getCurrentPosition(p=>{if(map)map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,duration:900});},()=>setState('Location unavailable.'));
}

window.addEventListener('pagehide',()=>{if(refreshTimer)clearInterval(refreshTimer);},{once:true});
window.addEventListener('error',e=>setState(`Geographical Earth script error · ${e.message||'unknown error'}`));
window.addEventListener('unhandledrejection',e=>setState(`Geographical Earth script rejection · ${e.reason&&e.reason.message?e.reason.message:String(e.reason||'unknown')}`));

build();
$('#resetEarth')?.addEventListener('click',reset);
$('#refreshEarth')?.addEventListener('click',refresh);
$('#locateMe')?.addEventListener('click',locate);
