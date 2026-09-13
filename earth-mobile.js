import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
const OSM_STYLE={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]};
let map=null;
function setState(message){const el=$('#providerState');if(el)el.textContent=message}
function buildMap(){
  try{
    map=new maplibregl.Map({container:'earthMap',style:OSM_STYLE,center:[0,15],zoom:1.15,minZoom:.35,maxZoom:18,attributionControl:true,renderWorldCopies:false,antialias:false,pitchWithRotate:false,touchPitch:false});
    map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:false}),'top-right');
    map.on('load',()=>{
      try{map.setProjection({type:'globe'})}catch(_){ }
      setState('Geographic Earth active · planet map only · hazard, alert and sensor overlays are kept in the Hazard Observatory.');
    });
    map.on('error',e=>setState(`Geographic map error: ${e?.error?.message||e?.message||'unknown error'}`));
  }catch(e){setState(`Geographic Earth failed to initialize: ${e.message||e}`)}
}
buildMap();
$('#resetEarth')?.addEventListener('click',()=>map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:400}));
$('#refreshEarth')?.addEventListener('click',()=>{if(!map)return;map.triggerRepaint();setState('Geographic Earth refreshed · planet map only.')});
$('#locateMe')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:9,duration:700}),()=>setState('Location unavailable. Geographic Earth remains in global view.')));
