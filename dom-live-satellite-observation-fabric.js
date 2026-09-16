(()=>{
'use strict';
const NASA_GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const SOURCES=Object.freeze([
 {id:'goes-east',agency:'NOAA',satellite:'GOES-East',instrument:'ABI',cadenceMin:10,coverage:'Americas / Atlantic'},
 {id:'goes-west',agency:'NOAA',satellite:'GOES-West',instrument:'ABI',cadenceMin:10,coverage:'Americas / Pacific'},
 {id:'meteosat',agency:'EUMETSAT',satellite:'Meteosat',instrument:'FCI',cadenceMin:10,coverage:'Europe / Africa / Atlantic'},
 {id:'himawari',agency:'JMA',satellite:'Himawari-9',instrument:'AHI',cadenceMin:10,coverage:'Asia / Oceania / Western Pacific'},
 {id:'worldview',agency:'NASA EOSDIS',satellite:'polar-orbiting constellation',instrument:'VIIRS',cadenceMin:240,coverage:'global / polar reinforcement'}
]);
const state={bound:false,map:null,lastRefresh:null,sources:SOURCES.map(x=>({...x,status:'UNVERIFIED',truth:'COVERAGE_GAP',acquiredAt:null,ageMin:null})),timer:0,worldview:{mapLayer:'dom-satellite-worldview',mapSource:'dom-satellite-worldview-source',date:null,lastError:null}};
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
function freshness(acquiredAt,cadenceMin){if(!acquiredAt)return{status:'TIMESTAMP_PENDING',truth:'COVERAGE_GAP',ageMin:null};const t=Date.parse(acquiredAt);if(!Number.isFinite(t))return{status:'BAD_TIMESTAMP',truth:'COVERAGE_GAP',ageMin:null};const ageMin=Math.max(0,(Date.now()-t)/60000),fresh=ageMin<=Math.max(cadenceMin*3,45);return{ageMin,status:fresh?'OBSERVED':'STALE',truth:fresh?'OBSERVED':'COVERAGE_GAP'};}
function publish(){state.lastRefresh=new Date().toISOString();emit('dom:satellite-observation-fabric',{classification:'BACKGROUND',generatedAt:state.lastRefresh,sources:state.sources.map(x=>({...x}))});renderLedger();}
function ingest(meta){if(!meta||!meta.id)return false;const i=state.sources.findIndex(x=>x.id===meta.id);if(i<0)return false;const base=state.sources[i],f=freshness(meta.acquiredAt,base.cadenceMin);state.sources[i]={...base,...meta,...f,classification:'BACKGROUND'};publish();return f.truth==='OBSERVED';}
function markGap(id,reason){const i=state.sources.findIndex(x=>x.id===id);if(i<0)return;state.sources[i]={...state.sources[i],status:'COVERAGE_GAP',truth:'COVERAGE_GAP',gapReason:String(reason||'fresh authoritative observation unavailable'),acquiredAt:null,ageMin:null};publish();}
function dateUTC(offsetDays=0){const d=new Date(Date.now()+offsetDays*86400000);return d.toISOString().slice(0,10)}
function worldviewTiles(date){return `${NASA_GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;}
function beforeHazards(m){for(const id of['dom-integrity-hazards-fill','dom-live-pulse','dom-live-points-layer','dom-eira-quake-origin'])if(m.getLayer?.(id))return id;return undefined;}
function installWorldview(){const m=state.map;if(!m||!m.loaded?.())return false;const sid=state.worldview.mapSource,lid=state.worldview.mapLayer,date=dateUTC(-1);try{
  /* Critical rendering rule: keep one persistent tiled source. Replacing a global
     raster source while the globe is rotating exposes partially loaded tile
     quadrants on mobile Safari. Update only when the observation date changes. */
  if(m.getLayer?.(lid)&&m.getSource?.(sid)&&state.worldview.date===date)return true;
  if(m.getLayer?.(lid))m.removeLayer(lid);if(m.getSource?.(sid))m.removeSource(sid);
  m.addSource(sid,{type:'raster',tiles:[worldviewTiles(date)],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'});
  m.addLayer({id:lid,type:'raster',source:sid,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.46,3,.43,6,.34,9,.18,11,0],'raster-saturation':-.08,'raster-contrast':.06,'raster-fade-duration':0}},beforeHazards(m));
  state.worldview.date=date;state.worldview.lastError=null;
  ingest({id:'worldview',acquiredAt:`${date}T23:59:59Z`,retrievedAt:new Date().toISOString(),product:'VIIRS_SNPP_CorrectedReflectance_TrueColor',rendered:true,status:'OBSERVED_DAILY_COMPOSITE',truth:'OBSERVED',temporalResolution:'daily; not real-time'});return true;
}catch(e){state.worldview.lastError=String(e?.message||e);markGap('worldview',state.worldview.lastError);return false;}}
function renderLedger(){const host=document.getElementById('map');if(!host)return;let el=document.getElementById('domAtmosphereTruth');if(!el){el=document.createElement('div');el.id='domAtmosphereTruth';el.style.cssText='position:absolute;left:10px;bottom:10px;z-index:9;max-width:min(78%,430px);padding:7px 9px;border-radius:10px;background:rgba(1,12,18,.82);border:1px solid rgba(111,231,255,.25);font:600 10px/1.35 system-ui;color:#d9fbff;pointer-events:none;backdrop-filter:blur(5px)';host.appendChild(el)}const observed=state.sources.filter(x=>x.truth==='OBSERVED').length,gaps=state.sources.filter(x=>x.truth!=='OBSERVED').map(x=>x.id);const daily=state.worldview.date?` · NASA VIIRS ${state.worldview.date} daily cloud/true-colour context`:'';el.textContent=`ATMOSPHERE ${observed}/${state.sources.length} source families timestamp-qualified${daily}${gaps.length?` · gaps: ${gaps.join(', ')}`:''}`;}
function attachMap(m){if(!m||state.map===m)return;state.map=m;const go=()=>{installWorldview();renderLedger()};if(m.loaded?.())go();else m.once?.('load',go);try{m.on?.('styledata',()=>{if(!m.getLayer?.(state.worldview.mapLayer))setTimeout(installWorldview,120)})}catch(_){}}
function bind(){if(state.bound)return;state.bound=true;publish();state.timer=setInterval(()=>{for(const s of state.sources){if(s.acquiredAt)Object.assign(s,freshness(s.acquiredAt,s.cadenceMin));}publish();if(state.map)installWorldview();},600000);if(window.DOMCurrentHazardMap?.map)attachMap(window.DOMCurrentHazardMap.map);}
window.addEventListener('dom:map-ready',e=>attachMap(e.detail?.map));window.addEventListener('dom:satellite-observation',e=>ingest(e.detail));window.addEventListener('dom:satellite-coverage-gap',e=>markGap(e.detail?.id,e.detail?.reason));window.addEventListener('pagehide',()=>{if(state.timer)clearInterval(state.timer)},{once:true});
window.DOMLiveSatelliteObservationFabric=Object.freeze({bind,ingest,markGap,installWorldview,sources:()=>state.sources.map(x=>({...x})),state:()=>({bound:state.bound,lastRefresh:state.lastRefresh,worldview:{...state.worldview},sources:state.sources.map(x=>({...x}))})});bind();
})();