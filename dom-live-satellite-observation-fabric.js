(()=>{
'use strict';
const NASA_GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const SOURCES=Object.freeze([
 {id:'goes-east',agency:'NOAA',satellite:'GOES-East',instrument:'ABI',cadenceMin:10,coverage:'Americas / Atlantic'},
 {id:'goes-west',agency:'NOAA',satellite:'GOES-West',instrument:'ABI',cadenceMin:10,coverage:'Americas / Pacific'},
 {id:'meteosat',agency:'EUMETSAT',satellite:'Meteosat',instrument:'FCI',cadenceMin:10,coverage:'Europe / Africa / Atlantic'},
 {id:'himawari',agency:'JMA',satellite:'Himawari-9',instrument:'AHI',cadenceMin:10,coverage:'Asia / Oceania / Western Pacific'},
 {id:'worldview',agency:'NASA EOSDIS',satellite:'Suomi NPP',instrument:'VIIRS',cadenceMin:1440,coverage:'global'}
]);
const state={bound:false,map:null,attachTimer:0,lastRefresh:null,sources:SOURCES.map(x=>({...x,status:'UNVERIFIED',truth:'COVERAGE_GAP',acquiredAt:null})),worldview:{mapLayer:'dom-satellite-worldview',mapSource:'dom-satellite-worldview-source',date:null,lastError:null}};
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
function utcDate(days=0){return new Date(Date.now()+days*86400000).toISOString().slice(0,10)}
function tileUrl(date){return `${NASA_GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;}
function beforeHazards(m){for(const id of['dom-integrity-hazards-fill','dom-live-points-layer','dom-eira-quake-origin'])if(m.getLayer?.(id))return id;}
function publish(){state.lastRefresh=new Date().toISOString();emit('dom:satellite-observation-fabric',{classification:'BACKGROUND',generatedAt:state.lastRefresh,sources:state.sources.map(x=>({...x}))});renderLedger();}
function markObserved(date){const i=state.sources.findIndex(x=>x.id==='worldview');state.sources[i]={...state.sources[i],status:'OBSERVED_DAILY_COMPOSITE',truth:'OBSERVED',acquiredAt:`${date}T23:59:59Z`,product:'VIIRS_SNPP_CorrectedReflectance_TrueColor',rendered:true};publish();}
function installWorldview(){const m=state.map;if(!m||!m.loaded?.())return false;const sid=state.worldview.mapSource,lid=state.worldview.mapLayer,date=utcDate(-1);try{
 if(m.getLayer?.(lid)){state.worldview.date=date;markObserved(date);return true;}
 if(m.getSource?.(sid)){try{m.removeSource(sid)}catch(_){}}
 m.addSource(sid,{type:'raster',tiles:[tileUrl(date)],tileSize:256,minzoom:0,maxzoom:9,attribution:'NASA EOSDIS GIBS / VIIRS'});
 m.addLayer({id:lid,type:'raster',source:sid,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],0,.78,3,.74,6,.62,9,.38,11,0],'raster-saturation':-.04,'raster-contrast':.10,'raster-fade-duration':500}},beforeHazards(m));
 state.worldview.date=date;state.worldview.lastError=null;markObserved(date);return true;
 }catch(e){state.worldview.lastError=String(e?.message||e);renderLedger();return false;}}
function renderLedger(){const host=document.getElementById('map');if(!host)return;let el=document.getElementById('domAtmosphereTruth');if(!el){el=document.createElement('div');el.id='domAtmosphereTruth';el.style.cssText='position:absolute;left:10px;bottom:10px;z-index:9;max-width:min(78%,430px);padding:7px 9px;border-radius:10px;background:rgba(1,12,18,.82);border:1px solid rgba(111,231,255,.25);font:600 10px/1.35 system-ui;color:#d9fbff;pointer-events:none;backdrop-filter:blur(5px)';host.appendChild(el)}const ok=state.worldview.date&&state.map?.getLayer?.(state.worldview.mapLayer);const gaps=state.sources.filter(x=>x.id!=='worldview').map(x=>x.id);el.textContent=ok?`ATMOSPHERE 1/5 source families timestamp-qualified · NASA VIIRS ${state.worldview.date} full-Earth true-colour/cloud context · gaps: ${gaps.join(', ')}`:`ATMOSPHERE 0/5 · restoring NASA VIIRS full-Earth satellite context${state.worldview.lastError?' · '+state.worldview.lastError:''}`;}
function ensure(){if(!state.map)return false;const ok=installWorldview();renderLedger();return ok;}
function attachMap(m){if(!m)return;state.map=m;const go=()=>{ensure();setTimeout(ensure,250);setTimeout(ensure,900);setTimeout(ensure,2200)};if(m.loaded?.())go();else m.once?.('load',go);try{m.on?.('styledata',()=>setTimeout(ensure,100));m.on?.('idle',()=>{if(!m.getLayer?.(state.worldview.mapLayer))ensure()})}catch(_){}}
function findMap(){const m=window.DOMCurrentHazardMap?.map;if(m){if(m!==state.map)attachMap(m);else ensure();return true}return false;}
function bind(){if(state.bound)return;state.bound=true;publish();findMap();let tries=0;state.attachTimer=setInterval(()=>{tries++;findMap();if(state.map&&state.map.getLayer?.(state.worldview.mapLayer)&&tries>24){clearInterval(state.attachTimer);state.attachTimer=0}else if(tries>160){clearInterval(state.attachTimer);state.attachTimer=0}},250);}
window.addEventListener('dom:map-ready',e=>attachMap(e.detail?.map));window.addEventListener('pagehide',()=>{if(state.attachTimer)clearInterval(state.attachTimer)},{once:true});
window.DOMLiveSatelliteObservationFabric=Object.freeze({bind,installWorldview,sources:()=>state.sources.map(x=>({...x})),state:()=>({bound:state.bound,lastRefresh:state.lastRefresh,worldview:{...state.worldview},sources:state.sources.map(x=>({...x}))})});bind();
})();