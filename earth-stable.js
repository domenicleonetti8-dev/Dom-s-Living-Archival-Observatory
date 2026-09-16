import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.9.1/dist/maplibre-gl.mjs';
const $=s=>document.querySelector(s);let map;
const style={version:8,projection:{type:['interpolate',['linear'],['zoom'],9,'vertical-perspective',11.5,'mercator']},sources:{
base:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Esri World Imagery'},
labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19},
terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium'}},layers:[
{id:'space',type:'background',paint:{'background-color':'#000207'}},
{id:'ground',type:'raster',source:'base',paint:{'raster-opacity':1,'raster-saturation':.05,'raster-contrast':.06}},
{id:'labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,0,4,0,6,.12,8,.42,11,.76,14,.94]}}]};
const status=t=>{const e=$('#providerState');if(e)e.textContent=t};
try{
 map=new maplibregl.Map({container:'earthMapStable',style,center:[-35,12],zoom:.72,minZoom:.2,maxZoom:19,maxPitch:80,pitch:0,bearing:0,renderWorldCopies:false,canvasContextAttributes:{antialias:true},attributionControl:true});
 map.addControl(new maplibregl.NavigationControl(),'top-right');
 map.once('load',()=>{try{map.setTerrain({source:'terrain',exaggeration:1.08});map.setFog({range:[.35,9],color:'#8bb7c8','horizon-blend':.1,'high-color':'#103b55','space-color':'#000207','star-intensity':.2})}catch(e){}status('Geographical Earth · continuous globe-to-ground geography · live atmosphere renderer rebuilding')});
 map.on('zoom',()=>{const z=map.getZoom();if(z>8&&map.getPitch()<25)map.setPitch(Math.min(58,(z-8)*10));});
 map.on('error',e=>{const m=String(e?.error?.message||'');if(m)status(`Geographical Earth · geography resource notice · ${m.slice(0,110)}`)});
}catch(e){status(`Geographical Earth initialization error · ${e.message}`)}
$('#resetEarth')?.addEventListener('click',()=>map?.easeTo({center:[-35,12],zoom:.72,pitch:0,bearing:0,duration:500}));
$('#refreshEarth')?.addEventListener('click',()=>location.reload());
$('#locateMe')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:13,pitch:60,duration:1200}),()=>status('Location unavailable.')));
