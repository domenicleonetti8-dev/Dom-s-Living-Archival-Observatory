import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';
const $=s=>document.querySelector(s); let map=null,refreshTimer=null,installed=false;
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const SRC='geographical-earth-observation'; const LYR='geographical-earth-observation';
const EARTH_STYLE={version:8,sources:{imagery:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Reference labels © Esri and contributors'},terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain: Mapzen / AWS Open Data'}},layers:[{id:'space',type:'background',paint:{'background-color':'#01070b'}},{id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':.08,'raster-contrast':.08}},{id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.06,2,.12,5,.42,8,.72,12,.94]}}]};
function setState(s){const e=$('#providerState');if(e)e.textContent=s}
function day(n=0){return new Date(Date.now()+n*86400000).toISOString().slice(0,10)}
function viirs(d){return `${GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
function installObservation(){
 if(!map||!map.isStyleLoaded())return false;
 try{
  if(map.getLayer(LYR))map.removeLayer(LYR); if(map.getSource(SRC))map.removeSource(SRC);
  const d=day(-1);
  map.addSource(SRC,{type:'raster',tiles:[viirs(d)],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'});
  map.addLayer({id:LYR,type:'raster',source:SRC,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.88,2,.86,4,.76,6,.56,8,.30,10,0],'raster-saturation':-.03,'raster-contrast':.12,'raster-fade-duration':500}},'place-labels');
  installed=true; setState(`Geographical Earth · NASA observed cloud/true-colour context ${d} loaded · geographic terrain underneath · rapid GOES/Himawari/MTG adapter in progress; no false real-time claim.`); map.triggerRepaint(); return true;
 }catch(e){installed=false;setState(`Satellite observation layer failed: ${e?.message||e}`);return false}
}
function arm(){
 try{map.setProjection({type:'globe'})}catch(_){} try{map.setTerrain({source:'terrain',exaggeration:1.12})}catch(_){} try{map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18})}catch(_){}
 installObservation(); if(!installed)setTimeout(installObservation,500); if(!refreshTimer)refreshTimer=setInterval(()=>{if(map?.isStyleLoaded())installObservation()},10*60*1000);
}
function build(){
 try{map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:1.15,minZoom:.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
 map.on('style.load',arm); map.on('load',arm); map.on('idle',()=>{if(!installed&&map.isStyleLoaded())installObservation()}); map.on('error',e=>{const m=e?.error?.message||e?.message||'';if(m)setState(`Geographical Earth imagery notice: ${m}`)});
 }catch(e){setState(`Geographical Earth failed to initialize: ${e?.message||e}`)}
}
function reset(){map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500})} function refresh(){installed=false;installObservation()} function locate(){if(!navigator.geolocation){setState('Location unavailable.');return}navigator.geolocation.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,duration:900}),()=>setState('Location unavailable.'))}
window.addEventListener('pagehide',()=>refreshTimer&&clearInterval(refreshTimer),{once:true});build();$('#resetEarth')?.addEventListener('click',reset);$('#refreshEarth')?.addEventListener('click',refresh);$('#locateMe')?.addEventListener('click',locate);