import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null;
let atmosphereTimer=null;
const NASA_GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const ATM_SOURCE='geographical-earth-viirs-source';
const ATM_LAYER='geographical-earth-viirs';

const EARTH_STYLE={
  version:8,
  sources:{
    imagery:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
    labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Reference labels © Esri and contributors'},
    terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain: Mapzen / AWS Open Data'}
  },
  layers:[
    {id:'space',type:'background',paint:{'background-color':'#01070b'}},
    {id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':.08,'raster-contrast':.08}},
    {id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.10,2,.18,5,.45,8,.72,12,.94]}}
  ]
};

function setState(message){const el=$('#providerState');if(el)el.textContent=message}
function utcDate(days=0){return new Date(Date.now()+days*86400000).toISOString().slice(0,10)}
function viirsTiles(date){return `${NASA_GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}

function installLivingEarth(){
  if(!map||!map.loaded())return false;
  const date=utcDate(-1);
  try{
    if(map.getLayer(ATM_LAYER))map.removeLayer(ATM_LAYER);
    if(map.getSource(ATM_SOURCE))map.removeSource(ATM_SOURCE);
    map.addSource(ATM_SOURCE,{type:'raster',tiles:[viirsTiles(date)],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'});
    map.addLayer({id:ATM_LAYER,type:'raster',source:ATM_SOURCE,paint:{
      'raster-opacity':['interpolate',['linear'],['zoom'],0,.82,2,.80,4,.72,6,.55,8,.32,10,0],
      'raster-saturation':-.04,'raster-contrast':.10,'raster-fade-duration':700
    }},'place-labels');
    setState(`Geographical Earth · living NASA VIIRS space view (${date}) over geographic Earth · surface detail progressively revealed as you zoom.`);
    return true;
  }catch(e){
    setState(`Geographical Earth satellite atmosphere unavailable · geographic Earth remains active · ${e?.message||e}`);
    return false;
  }
}

function build(){
  try{
    map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:1.15,minZoom:.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});
    map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
    map.on('load',()=>{
      try{map.setProjection({type:'globe'})}catch(_){ }
      try{map.setTerrain({source:'terrain',exaggeration:1.12})}catch(_){ }
      try{map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18})}catch(_){ }
      installLivingEarth();
      atmosphereTimer=setInterval(installLivingEarth,10*60*1000);
    });
    map.on('styledata',()=>{if(map.loaded()&&!map.getLayer(ATM_LAYER))setTimeout(installLivingEarth,100)});
    map.on('error',e=>{const m=e?.error?.message||e?.message||'unknown map error';setState(`Geographical Earth imagery error: ${m}`)});
  }catch(e){setState(`Geographical Earth failed to initialize: ${e?.message||e}`)}
}

function reset(){map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500})}
function refresh(){if(!map)return;installLivingEarth();map.triggerRepaint()}
function locate(){if(!navigator.geolocation){setState('Location unavailable. Geographical Earth remains in global view.');return}navigator.geolocation.getCurrentPosition(p=>{map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,bearing:0,duration:900})},()=>setState('Location unavailable. Geographical Earth remains in global view.'))}

window.addEventListener('pagehide',()=>{if(atmosphereTimer)clearInterval(atmosphereTimer)},{once:true});
build();
$('#resetEarth')?.addEventListener('click',reset);
$('#refreshEarth')?.addEventListener('click',refresh);
$('#locateMe')?.addEventListener('click',locate);
