(()=>{
'use strict';
const SOURCES=Object.freeze([
 {id:'goes-east',agency:'NOAA',satellite:'GOES-East',instrument:'ABI',cadenceMin:10,coverage:'Americas / Atlantic',truth:'OBSERVED',landing:'https://www.goes.noaa.gov/'},
 {id:'goes-west',agency:'NOAA',satellite:'GOES-West',instrument:'ABI',cadenceMin:10,coverage:'Americas / Pacific',truth:'OBSERVED',landing:'https://www.goes.noaa.gov/'},
 {id:'meteosat',agency:'EUMETSAT',satellite:'Meteosat',instrument:'FCI/SEVIRI',cadenceMin:10,coverage:'Europe / Africa / Atlantic / Indian Ocean',truth:'OBSERVED',wms:'https://view.eumetsat.int/geoserver/wms'},
 {id:'himawari',agency:'JMA',satellite:'Himawari-9',instrument:'AHI',cadenceMin:10,coverage:'Asia / Oceania / Western Pacific',truth:'OBSERVED',landing:'https://www.data.jma.go.jp/mscweb/en/himawari89/'},
 {id:'worldview',agency:'NASA EOSDIS',satellite:'polar-orbiting constellation',instrument:'MODIS/VIIRS and supported EO instruments',cadenceMin:240,coverage:'global / polar reinforcement',truth:'OBSERVED',landing:'https://worldview.earthdata.nasa.gov/'}
]);
const state={bound:false,lastRefresh:null,sources:SOURCES.map(x=>({...x,status:'UNVERIFIED',acquiredAt:null,ageMin:null})),timer:0};
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
function freshness(acquiredAt,cadenceMin){if(!acquiredAt)return {status:'COVERAGE_GAP',ageMin:null};const ageMin=Math.max(0,(Date.now()-Date.parse(acquiredAt))/60000);return {ageMin,status:ageMin<=Math.max(cadenceMin*3,45)?'OBSERVED':'STALE'};}
function publish(){state.lastRefresh=new Date().toISOString();emit('dom:satellite-observation-fabric',{truthState:'OBSERVED',generatedAt:state.lastRefresh,sources:state.sources.map(x=>({...x}))});}
function ingest(meta){if(!meta||!meta.id)return false;const i=state.sources.findIndex(x=>x.id===meta.id);if(i<0)return false;const base=state.sources[i],f=freshness(meta.acquiredAt,base.cadenceMin);state.sources[i]={...base,...meta,...f,truth:base.truth};publish();return true;}
function markGap(id,reason){const i=state.sources.findIndex(x=>x.id===id);if(i<0)return;state.sources[i]={...state.sources[i],status:'COVERAGE_GAP',gapReason:String(reason||'fresh authoritative observation unavailable'),acquiredAt:null,ageMin:null};publish();}
function bind(){if(state.bound)return;state.bound=true;publish();state.timer=setInterval(()=>{for(const s of state.sources){if(s.acquiredAt){const f=freshness(s.acquiredAt,s.cadenceMin);s.ageMin=f.ageMin;s.status=f.status;}}publish();},60000);}
window.addEventListener('dom:satellite-observation',e=>ingest(e.detail));window.addEventListener('dom:satellite-coverage-gap',e=>markGap(e.detail?.id,e.detail?.reason));window.addEventListener('pagehide',()=>{if(state.timer)clearInterval(state.timer)},{once:true});
window.DOMLiveSatelliteObservationFabric=Object.freeze({bind,ingest,markGap,sources:()=>state.sources.map(x=>({...x})),state:()=>({bound:state.bound,lastRefresh:state.lastRefresh,sources:state.sources.map(x=>({...x}))})});bind();
})();