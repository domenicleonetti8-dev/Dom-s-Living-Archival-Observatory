import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null,ready=false;
const orbital=$('#earthOrbital'),detail=$('#earthMap'),state=$('#providerState');
const EARTH_STYLE={version:8,sources:{
 imagery:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
 labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Reference labels © Esri and contributors'},
 terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain: Mapzen / AWS Open Data'}
},layers:[
 {id:'space',type:'background',paint:{'background-color':'#01070b'}},
 {id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':.08,'raster-contrast':.08}},
 {id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,0,2,0,3,.08,5,.42,8,.72,12,.94]}}
]};
function setState(t){if(state)state.textContent=t;}
function build(){
 try{
  map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:2.2,minZoom:.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
  map.once('load',()=>{try{map.setProjection({type:'globe'});map.setTerrain({source:'terrain',exaggeration:1.12});map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18});}catch(e){}ready=true;});
 }catch(err){setState(`Geographic detail failed to initialize · ${err?.message||String(err)}`);}
}
function enter(lng=0,lat=15,zoom=3.2){
 if(!map)return;
 detail.classList.add('active');orbital?.classList.add('detail-active');
 setTimeout(()=>{map.resize();map.jumpTo({center:[lng,lat],zoom});setState('Geographical Earth · geographic terrain descent active · labels progressively appear as you descend.');},40);
}
function exit(){detail?.classList.remove('active');orbital?.classList.remove('detail-active');window.DOM_ORBITAL?.resume?.();}
function locate(){if(!navigator.geolocation){setState('Location unavailable.');return;}navigator.geolocation.getCurrentPosition(p=>enter(p.coords.longitude,p.coords.latitude,10),()=>setState('Location unavailable.'));}
build();
window.DOM_DETAIL={enter,exit,locate,get ready(){return ready;},reset(){exit();map?.jumpTo({center:[0,15],zoom:2.2,pitch:0,bearing:0});}};
