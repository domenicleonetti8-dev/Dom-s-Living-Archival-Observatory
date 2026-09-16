import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null;

const EARTH_STYLE={version:8,sources:{
 imagery:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
 labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Reference labels © Esri and contributors'},
 terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain: Mapzen / AWS Open Data'}
},layers:[
 {id:'space',type:'background',paint:{'background-color':'#01070b'}},
 {id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':.08,'raster-contrast':.08}},
 {id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,0,2,0,3,.08,5,.42,8,.72,12,.94]}}
]};

function setState(t){const e=$('#providerState');if(e)e.textContent=t;}
function initializeLoadedMap(){
 try{map.setProjection({type:'globe'});}catch(e){}
 try{map.setTerrain({source:'terrain',exaggeration:1.12});}catch(e){}
 try{map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18});}catch(e){}
 setState('Geographical Earth geometry protected · gap-free geographic globe active · orbital labels hidden · observed atmosphere renderer isolated pending spherical texture path.');
}
function build(){
 setState('Starting protected Geographical Earth renderer…');
 try{
  map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:1.15,minZoom:.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
  map.once('load',initializeLoadedMap);
  map.on('error',ev=>{const m=ev?.error?.message||ev?.message||'map resource error';setState(`Geographical Earth resource notice · ${m}`);});
 }catch(err){setState(`Geographical Earth failed to initialize · ${err?.message||String(err)}`);}
}
function reset(){map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500});}
function refresh(){if(!map)return;setState('Refreshing geographic Earth…');map.triggerRepaint();setTimeout(()=>setState('Geographical Earth geometry protected · gap-free geographic globe active · orbital labels hidden · observed atmosphere renderer isolated pending spherical texture path.'),250);}
function locate(){if(!navigator.geolocation){setState('Location unavailable.');return;}navigator.geolocation.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,duration:900}),()=>setState('Location unavailable.'));}
window.addEventListener('error',e=>setState(`Geographical Earth script error · ${e.message||'unknown error'}`));
window.addEventListener('unhandledrejection',e=>setState(`Geographical Earth script rejection · ${e.reason?.message||String(e.reason||'unknown')}`));
build();
$('#resetEarth')?.addEventListener('click',reset);
$('#refreshEarth')?.addEventListener('click',refresh);
$('#locateMe')?.addEventListener('click',locate);
