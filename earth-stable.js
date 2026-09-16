import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.9.1/dist/maplibre-gl.mjs';
const $=s=>document.querySelector(s);let map;
const now=new Date();now.setUTCSeconds(0,0);now.setUTCMinutes(Math.floor(now.getUTCMinutes()/10)*10-30);const liveTime=now.toISOString().replace('.000','');
const fallbackDay=new Date(Date.now()-86400000).toISOString().slice(0,10);
const wmts=(layer,time,level=6,ext='png')=>`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${time}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`;
const viirs=`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${fallbackDay}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
const opacity=['interpolate',['linear'],['zoom'],0,.96,2,.92,4,.72,6,.34,7.5,0];
const style={version:8,projection:{type:['interpolate',['linear'],['zoom'],9,'vertical-perspective',11.5,'mercator']},sources:{
base:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Esri World Imagery'},
viirs:{type:'raster',tiles:[viirs],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'},
east:{type:'raster',tiles:[wmts('GOES-East_ABI_GeoColor',liveTime)],tileSize:256,minzoom:0,maxzoom:6,attribution:'NASA EOSDIS GIBS / NOAA GOES-East'},
west:{type:'raster',tiles:[wmts('GOES-West_ABI_GeoColor',liveTime)],tileSize:256,minzoom:0,maxzoom:6,attribution:'NASA EOSDIS GIBS / NOAA GOES-West'},
labels:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19},
terrain:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium'}},layers:[
{id:'space',type:'background',paint:{'background-color':'#000207'}},
{id:'ground',type:'raster',source:'base',paint:{'raster-opacity':1,'raster-saturation':.05,'raster-contrast':.06}},
{id:'viirs',type:'raster',source:'viirs',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.72,3,.62,5,.38,7,0],'raster-fade-duration':0}},
{id:'west',type:'raster',source:'west',paint:{'raster-opacity':opacity,'raster-fade-duration':0}},
{id:'east',type:'raster',source:'east',paint:{'raster-opacity':opacity,'raster-fade-duration':0}},
{id:'labels',type:'raster',source:'labels',paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,0,4,0,6,.12,8,.42,11,.76,14,.94]}}]};
const status=t=>{const e=$('#providerState');if(e)e.textContent=t};
try{
 map=new maplibregl.Map({container:'earthMapStable',style,center:[-35,12],zoom:.72,minZoom:.2,maxZoom:19,maxPitch:80,pitch:0,bearing:0,renderWorldCopies:false,canvasContextAttributes:{antialias:true},attributionControl:true});
 map.addControl(new maplibregl.NavigationControl(),'top-right');
 map.once('load',()=>{try{map.setTerrain({source:'terrain',exaggeration:1.08});map.setFog({range:[.35,9],color:'#8bb7c8','horizon-blend':.1,'high-color':'#103b55','space-color':'#000207','star-intensity':.2})}catch(e){}status(`Geographical Earth · current GOES observation ${liveTime} · globe-to-ground satellite geography`)});
 map.on('zoom',()=>{const z=map.getZoom();if(z>8&&map.getPitch()<25)map.setPitch(Math.min(58,(z-8)*10));});
 map.on('error',e=>{const m=String(e?.error?.message||'');if(m&&/GOES|GIBS|tile/i.test(m))status(`Geographical Earth · satellite layer notice · ${m.slice(0,110)}`)});
}catch(e){status(`Geographical Earth initialization error · ${e.message}`)}
$('#resetEarth')?.addEventListener('click',()=>map?.easeTo({center:[-35,12],zoom:.72,pitch:0,bearing:0,duration:500}));
$('#refreshEarth')?.addEventListener('click',()=>location.reload());
$('#locateMe')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:13,pitch:60,duration:1200}),()=>status('Location unavailable.')));
