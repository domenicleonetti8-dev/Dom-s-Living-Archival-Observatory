import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null;

const EARTH_STYLE={
  version:8,
  sources:{
    imagery:{
      type:'raster',
      tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize:256,
      maxzoom:19,
      attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    },
    labels:{
      type:'raster',
      tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
      tileSize:256,
      maxzoom:19,
      attribution:'Reference labels © Esri and contributors'
    },
    terrain:{
      type:'raster-dem',
      tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize:256,
      maxzoom:15,
      encoding:'terrarium',
      attribution:'Terrain: Mapzen / AWS Open Data'
    }
  },
  layers:[
    {id:'space',type:'background',paint:{'background-color':'#01070b'}},
    {id:'satellite',type:'raster',source:'imagery',paint:{'raster-opacity':1,'raster-saturation':.08,'raster-contrast':.08}},
    {id:'place-labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.45,2,.62,6,.82,12,.94]}}
  ]
};

function setState(message){const el=$('#providerState');if(el)el.textContent=message}

function build(){
  try{
    map=new maplibregl.Map({
      container:'earthMap',
      style:EARTH_STYLE,
      center:[0,15],
      zoom:1.15,
      minZoom:.35,
      maxZoom:19,
      pitch:0,
      bearing:0,
      attributionControl:true,
      renderWorldCopies:false,
      antialias:true,
      pitchWithRotate:true,
      touchPitch:true
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
    map.on('load',()=>{
      try{map.setProjection({type:'globe'})}catch(_){ }
      try{map.setTerrain({source:'terrain',exaggeration:1.12})}catch(_){ }
      try{map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18})}catch(_){ }
      setState('Geographical Earth active · photoreal satellite imagery + global terrain + geographic labels · no paid Google Maps key required.');
    });
    map.on('error',e=>{
      const m=e?.error?.message||e?.message||'unknown map error';
      setState(`Geographical Earth imagery error: ${m}`);
    });
  }catch(e){setState(`Geographical Earth failed to initialize: ${e?.message||e}`)}
}

function reset(){map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500})}
function refresh(){if(!map)return;map.triggerRepaint();setState('Geographical Earth refreshed · satellite + terrain globe active.')}
function locate(){
  if(!navigator.geolocation){setState('Location unavailable. Geographical Earth remains in global view.');return}
  navigator.geolocation.getCurrentPosition(p=>{
    map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,bearing:0,duration:900});
  },()=>setState('Location unavailable. Geographical Earth remains in global view.'));
}

build();
$('#resetEarth')?.addEventListener('click',reset);
$('#refreshEarth')?.addEventListener('click',refresh);
$('#locateMe')?.addEventListener('click',locate);
