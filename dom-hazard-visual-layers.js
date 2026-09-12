(()=>{
'use strict';
let map=null,maplibre=null,events=[],nhc=[],animationTimer=null,phase=0,nhcTimer=null;
const valid=(lat,lon)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180;
const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const text=v=>String(v??'');
const kindOf=e=>{
  const s=`${text(e.kind)} ${text(e.title)} ${text(e.hazardClass)} ${text(e.severityText)}`.toLowerCase();
  if(/wildfire|forest fire|bushfire/.test(s))return'wildfire';
  if(/hurricane|typhoon|cyclone|tropical storm/.test(s))return'cyclone';
  if(/tornado/.test(s))return'tornado';
  if(/flash flood|flood/.test(s))return'flood';
  if(/tsunami/.test(s))return'tsunami';
  if(/volcano|eruption/.test(s))return'volcano';
  if(/earthquake/.test(s))return'earthquake';
  if(/severe storm|thunderstorm|storm/.test(s))return'storm';
  return'other';
};
const colorOf=k=>({wildfire:'#ff5c22',cyclone:'#67e8ff',tornado:'#d59cff',flood:'#40a9ff',tsunami:'#3bd6ff',volcano:'#ff3d6e',earthquake:'#55dfff',storm:'#ffd43b'}[k]||'#8ea6b5');
const zoomFloor=k=>({cyclone:.35,tsunami:.35,volcano:1,earthquake:1,wildfire:2,storm:2,tornado:3,flood:3}[k]??4);
function sev(e){const n=Number(e.score);if(Number.isFinite(n))return Math.max(0,Math.min(100,n));const m=Number(e.mag);if(Number.isFinite(m))return Math.max(10,Math.min(100,(m-2)*18));return 48}
function rows(){const out=[];for(const e of events){if(!valid(e.lat,e.lon))continue;const k=kindOf(e);if(k==='other')continue;out.push({type:'Feature',geometry:{type:'Point',coordinates:[Number(e.lon),Number(e.lat)]},properties:{id:text(e.id),kind:k,title:text(e.title||e.kind||k),source:text(e.agency||e.source||''),score:sev(e),color:colorOf(k),minZoom:zoomFloor(k),official:e.officialAlert?1:0,precision:text(e.locationPrecision||'source position')}})}for(const s of nhc){if(!valid(s.lat,s.lon))continue;out.push({type:'Feature',geometry:{type:'Point',coordinates:[s.lon,s.lat]},properties:{id:text(s.id),kind:'cyclone',title:text(s.title),source:'NOAA/NHC',score:s.score,color:colorOf('cyclone'),minZoom:.35,official:1,precision:'official storm center'}})}return{type:'FeatureCollection',features:out}}
function safeAdd(id,def,before){if(!map.getLayer(id))map.addLayer(def,before)}
function ensure(){if(!map||!map.loaded())return;const data=rows();if(!map.getSource('dom-hazard-visuals'))map.addSource('dom-hazard-visuals',{type:'geojson',data});else map.getSource('dom-hazard-visuals').setData(data);
  safeAdd('dom-hazard-area',{id:'dom-hazard-area',type:'circle',source:'dom-hazard-visuals',filter:['in',['get','kind'],['literal',['wildfire','storm','flood','tsunami']]],minzoom:1,paint:{'circle-color':['get','color'],'circle-radius':['interpolate',['linear'],['zoom'],1,7,4,['interpolate',['linear'],['get','score'],0,10,100,34],8,['interpolate',['linear'],['get','score'],0,16,100,70]],'circle-opacity':.13,'circle-blur':.35,'circle-stroke-color':['get','color'],'circle-stroke-opacity':.28,'circle-stroke-width':1}});
  safeAdd('dom-hazard-core',{id:'dom-hazard-core',type:'circle',source:'dom-hazard-visuals',paint:{'circle-color':['get','color'],'circle-radius':['interpolate',['linear'],['zoom'],.35,4,3,6,8,10],'circle-opacity':['case',['==',['get','official'],1],.86,.72],'circle-stroke-color':'#06131b','circle-stroke-width':1.2}});
  safeAdd('dom-hazard-rings',{id:'dom-hazard-rings',type:'circle',source:'dom-hazard-visuals',filter:['in',['get','kind'],['literal',['cyclone','tornado','tsunami','wildfire']]],paint:{'circle-color':['get','color'],'circle-radius':12,'circle-opacity':.08,'circle-blur':.5,'circle-stroke-color':['get','color'],'circle-stroke-opacity':.45,'circle-stroke-width':1.4}});
  applyLazy();startAnimation();renderLegend();
}
function applyLazy(){if(!map)return;const z=map.getZoom();for(const id of ['dom-hazard-area','dom-hazard-core','dom-hazard-rings']){if(!map.getLayer(id))continue;map.setFilter(id,['all',['<=',['get','minZoom'],z],id==='dom-hazard-area'?['in',['get','kind'],['literal',['wildfire','storm','flood','tsunami']]]:id==='dom-hazard-rings'?['in',['get','kind'],['literal',['cyclone','tornado','tsunami','wildfire']]]:['!=',['get','kind'],'other']])}}
function animate(){if(!map||!map.loaded())return;phase=(phase+1)%40;const w=(Math.sin(phase/40*Math.PI*2)+1)/2;try{if(map.getLayer('dom-hazard-rings')){map.setPaintProperty('dom-hazard-rings','circle-radius',10+w*9);map.setPaintProperty('dom-hazard-rings','circle-opacity',.05+w*.13);map.setPaintProperty('dom-hazard-rings','circle-stroke-opacity',.28+w*.42)}if(map.getLayer('dom-hazard-area'))map.setPaintProperty('dom-hazard-area','circle-opacity',.09+w*.08)}catch(_){}}
function startAnimation(){if(animationTimer||reduced())return;animationTimer=setInterval(animate,240)}
function renderLegend(){const host=document.getElementById('map');if(!host||document.getElementById('domHazardVisualLegend'))return;const el=document.createElement('div');el.id='domHazardVisualLegend';el.style.cssText='position:absolute;right:10px;top:10px;z-index:9;max-width:220px;padding:8px 10px;border-radius:12px;background:rgba(2,14,22,.72);border:1px solid rgba(105,231,255,.22);backdrop-filter:blur(8px);font:600 10px system-ui;color:#eafcff;line-height:1.45;pointer-events:none';el.innerHTML='<b>LIVE VISUAL LAYERS</b><br><span style="color:#ff5c22">● wildfire</span> · <span style="color:#67e8ff">◉ cyclone</span> · <span style="color:#d59cff">◉ tornado</span><br><span style="color:#40a9ff">◉ flood</span> · <span style="color:#3bd6ff">◉ tsunami</span> · <span style="color:#ff3d6e">● volcano</span><br><small style="opacity:.72">Lazy-rendered by zoom. Point/centroid markers never imply an observed perimeter.</small>';host.appendChild(el)}
async function refreshNHC(){try{const r=await fetch('https://www.nhc.noaa.gov/CurrentStorms.json',{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json(),a=Array.isArray(j.activeStorms)?j.activeStorms:[];nhc=a.map(s=>{const lat=Number(s.latitudeNumeric),lon=Number(s.longitudeNumeric),kt=Number(s.intensity);return{id:s.id||s.name,title:`${s.classification||'Tropical system'} ${s.name||''}`.trim(),lat,lon,score:Number.isFinite(kt)?Math.min(100,Math.max(35,kt)):65}}).filter(x=>valid(x.lat,x.lon));ensure()}catch(e){console.warn('D.O.M. NHC visual layer unavailable',e)}}
function loadCoralLayer(){if(window.DOMCoralLiveLayer||document.querySelector('script[data-dom-coral-live]'))return;const s=document.createElement('script');s.src='./dom-coral-live-layer.js?v=1';s.defer=true;s.dataset.domCoralLive='1';document.head.appendChild(s)}
function attach(m,ml){map=m;maplibre=ml;ensure();map.on('zoomend',applyLazy);map.on('moveend',applyLazy);refreshNHC();loadCoralLayer();if(nhcTimer)clearInterval(nhcTimer);nhcTimer=setInterval(refreshNHC,120000)}
window.addEventListener('dom:map-ready',ev=>{const d=ev.detail||{};if(d.map)attach(d.map,d.maplibre)});
window.addEventListener('dom:hazard-refresh',ev=>{events=Array.isArray(ev.detail?.events)?ev.detail.events:[];ensure()});
window.addEventListener('pagehide',()=>{if(animationTimer)clearInterval(animationTimer);if(nhcTimer)clearInterval(nhcTimer)},{once:true});
window.DOMHazardVisualLayers=Object.freeze({state:()=>({eventCount:events.length,nhcCount:nhc.length,attached:!!map})});
})();