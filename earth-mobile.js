import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
let map=null,refreshTimer=null;
const WMS='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const PREFIX='dom-observed-cell-';
const STEP=30;

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
function dateUTC(offset=0){return new Date(Date.now()+offset*86400000).toISOString().slice(0,10);}
function wmsURL(date,w,s,e,n){
 const q=new URLSearchParams({SERVICE:'WMS',REQUEST:'GetMap',VERSION:'1.3.0',LAYERS:'VIIRS_SNPP_CorrectedReflectance_TrueColor',STYLES:'',FORMAT:'image/jpeg',CRS:'EPSG:4326',WIDTH:'512',HEIGHT:'512',TIME:date,BBOX:`${s},${w},${n},${e}`});
 return `${WMS}?${q}`;
}
function removeObservationMesh(){
 if(!map)return;
 const style=map.getStyle();
 for(const l of [...(style.layers||[])].reverse())if(l.id.startsWith(PREFIX))try{map.removeLayer(l.id);}catch(e){}
 for(const id of Object.keys((map.getStyle()||{}).sources||{}))if(id.startsWith(PREFIX))try{map.removeSource(id);}catch(e){}
}
function installObservationMesh(){
 if(!map||!map.isStyleLoaded())return false;
 const date=dateUTC(-1);
 try{
  removeObservationMesh();
  let i=0;
  // Geographic WMS cells avoid feeding one global EPSG:3857 raster through the globe
  // reprojector. Small spherical patches also keep the poles/dateline from collapsing
  // into the black wedges seen on iPhone Safari.
  for(let s=-90;s<90;s+=STEP){
   const n=Math.min(90,s+STEP);
   for(let w=-180;w<180;w+=STEP){
    const e=Math.min(180,w+STEP),id=`${PREFIX}${i++}`;
    const pad=.04,ww=Math.max(-180,w-pad),ee=Math.min(180,e+pad),ss=Math.max(-89.999,s-pad),nn=Math.min(89.999,n+pad);
    map.addSource(id,{type:'image',url:wmsURL(date,ww,ss,ee,nn),coordinates:[[ww,nn],[ee,nn],[ee,ss],[ww,ss]]});
    map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.94,2,.92,4,.84,6,.62,8,.34,10,0],'raster-fade-duration':0}},'place-labels');
   }
  }
  setState(`Observed Earth active · NASA VIIRS ${date} geographic observation mesh · orbital labels hidden · geographic Earth fills true coverage gaps.`);
  return true;
 }catch(err){setState(`Observed Earth mesh unavailable · ${err?.message||String(err)}`);return false;}
}
function initializeLoadedMap(){
 try{map.setProjection({type:'globe'});}catch(e){}
 try{map.setTerrain({source:'terrain',exaggeration:1.12});}catch(e){}
 try{map.setFog({range:[.4,8],color:'#8bb7c8','horizon-blend':.12,'high-color':'#0d3550','space-color':'#000207','star-intensity':.18});}catch(e){}
 installObservationMesh();
 if(!refreshTimer)refreshTimer=setInterval(installObservationMesh,10*60*1000);
}
function build(){
 setState('Starting Geographical Earth renderer…');
 try{
  map=new maplibregl.Map({container:'earthMap',style:EARTH_STYLE,center:[0,15],zoom:1.15,minZoom:.35,maxZoom:19,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true,pitchWithRotate:true,touchPitch:true});
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
  map.once('load',initializeLoadedMap);
  map.on('error',ev=>{const m=ev?.error?.message||ev?.message||'map resource error';if(!Object.keys((map.getStyle()||{}).sources||{}).some(x=>x.startsWith(PREFIX)))setState(`Geographical Earth resource notice · ${m}`);});
 }catch(err){setState(`Geographical Earth failed to initialize · ${err?.message||String(err)}`);}
}
function reset(){map?.easeTo({center:[0,15],zoom:1.15,pitch:0,bearing:0,duration:500});}
function refresh(){if(!map)return;setState('Refreshing observed Earth mesh…');installObservationMesh();map.triggerRepaint();}
function locate(){if(!navigator.geolocation){setState('Location unavailable.');return;}navigator.geolocation.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:10,pitch:55,duration:900}),()=>setState('Location unavailable.'));}
window.addEventListener('pagehide',()=>{if(refreshTimer)clearInterval(refreshTimer);},{once:true});
window.addEventListener('error',e=>setState(`Geographical Earth script error · ${e.message||'unknown error'}`));
window.addEventListener('unhandledrejection',e=>setState(`Geographical Earth script rejection · ${e.reason?.message||String(e.reason||'unknown')}`));
build();
$('#resetEarth')?.addEventListener('click',reset);
$('#refreshEarth')?.addEventListener('click',refresh);
$('#locateMe')?.addEventListener('click',locate);
