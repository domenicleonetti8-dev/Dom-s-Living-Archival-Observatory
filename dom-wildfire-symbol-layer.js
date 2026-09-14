(()=>{
'use strict';
let map=null;
const SOURCE='dom-wildfire-symbols-source',LAYER='dom-wildfire-symbols',ICON='dom-wildfire-flame';
const valid=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Number(a)>=-90&&Number(a)<=90&&Number(b)>=-180&&Number(b)<=180;
function rows(){const r=window.DOMHazardRenderReconciler?.rows?.()||[];return r.filter(e=>String(e?.kind||'').toLowerCase()==='wildfire'&&e?.geometryIntegrity!=='QUARANTINED'&&valid(e?.lat,e?.lon));}
function data(){return{type:'FeatureCollection',features:rows().map(e=>({type:'Feature',geometry:{type:'Point',coordinates:[Number(e.lon),Number(e.lat)]},properties:{id:String(e.id||''),title:String(e.title||'Wildfire'),source:String(e.source||e.agency||'')}}))};}
function addFlame(){if(!map||map.hasImage?.(ICON))return;const c=document.createElement('canvas');c.width=40;c.height=48;const x=c.getContext('2d');x.clearRect(0,0,40,48);x.lineJoin='round';x.beginPath();x.moveTo(20,3);x.bezierCurveTo(28,13,34,20,33,29);x.bezierCurveTo(32,40,25,46,19,46);x.bezierCurveTo(9,46,4,39,6,31);x.bezierCurveTo(8,23,15,19,15,10);x.bezierCurveTo(15,7,17,5,20,3);x.closePath();x.fillStyle='#ff5b22';x.fill();x.strokeStyle='#7a2200';x.lineWidth=2;x.stroke();x.beginPath();x.moveTo(21,18);x.bezierCurveTo(26,24,27,29,25,34);x.bezierCurveTo(24,39,20,42,17,40);x.bezierCurveTo(13,38,12,34,14,30);x.bezierCurveTo(16,26,20,24,21,18);x.closePath();x.fillStyle='#ffd43b';x.fill();const img=x.getImageData(0,0,40,48);try{map.addImage(ICON,img,{pixelRatio:2})}catch(_){}}
function ensure(){if(!map||!map.loaded?.())return;addFlame();const d=data();if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:d});else map.getSource(SOURCE).setData(d);if(!map.getLayer(LAYER))map.addLayer({id:LAYER,type:'symbol',source:SOURCE,layout:{'icon-image':ICON,'icon-size':['interpolate',['linear'],['zoom'],0,.62,4,.72,8,.9,12,1.05],'icon-allow-overlap':true,'icon-ignore-placement':true},paint:{'icon-opacity':.98}});try{map.moveLayer(LAYER)}catch(_){} }
function schedule(){queueMicrotask(ensure)}
window.addEventListener('dom:map-ready',e=>{map=e.detail?.map||null;ensure();try{map.on('styledata',ensure)}catch(_){}});
for(const n of ['dom:hazard-refresh','dom:hazard-extension','dom:verified-global-events'])window.addEventListener(n,schedule);
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.DOMWildfireSymbolLayer=Object.freeze({refresh:ensure,state:()=>({wildfires:rows().length,source:SOURCE,layer:LAYER,icon:ICON})});
})();
