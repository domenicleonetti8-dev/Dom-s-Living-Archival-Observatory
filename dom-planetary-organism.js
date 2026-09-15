(()=>{
'use strict';
const S=window.DOMPlanetaryOrganismState={version:'2026-09-15.2',updatedAt:null,events:new Map(),evidence:new Map(),analyses:new Map(),relationships:[],missing:[],contradictions:[]};
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const num=v=>finite(v)?Number(v):null;
const parseTime=v=>{if(v===null||v===undefined||v==='')return null;const n=typeof v==='number'?v:Date.parse(v);return Number.isFinite(n)?n:null};
function time(r={}){for(const v of[r.observedAt,r.validAt,r.updatedAt,r.effective,r.time,r.timestamp,r.publishedAt,r.properties?.time,r.properties?.updated]){const n=parseTime(v);if(n!==null)return n}return null}
function coord(r={}){const g=r.sourceGeometry||r.geometry;if(g?.type==='Point'&&Array.isArray(g.coordinates)){const lon=num(g.coordinates[0]),lat=num(g.coordinates[1]);if(lat!==null&&lon!==null&&Math.abs(lat)<=90&&Math.abs(lon)<=180)return[lon,lat]}const lat=num(r.lat??r.latitude),lon=num(r.lon??r.lng??r.longitude);return lat!==null&&lon!==null&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[lon,lat]:null}
const id=r=>String(r?.id||r?.eventId||r?.stationId||r?.sensorId||r?.observationId||r?.sourceId||r?.properties?.id||'').trim();
const rad=x=>x*Math.PI/180;
function km(a,b){const p1=rad(a[1]),p2=rad(b[1]),dp=rad(b[1]-a[1]),dl=rad(b[0]-a[0]),h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)))}
function family(r={}){return String(r.type||r.category||r.hazard||r.kind||r.family||r.title||'unknown').toLowerCase()}
function normalize(r,kind){const c=coord(r),t=time(r),key=id(r)||`${kind}:${family(r)}:${c?c.join(','):'unlocated'}:${t??'undated'}`;return{key,kind,family:family(r),coordinate:c,time:t,source:String(r.source||r.agency||r.network||'unknown'),raw:r}}
function relation(a,b){if(!a.coordinate||!b.coordinate)return null;return{distanceKm:km(a.coordinate,b.coordinate),timeDeltaS:a.time!==null&&b.time!==null?Math.abs(a.time-b.time)/1000:null}}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;const run=()=>{scheduled=false;recompute()};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,120)}
function ingest(rows,kind){for(const r of Array.isArray(rows)?rows:[]){if(!r||typeof r!=='object')continue;const n=normalize(r,kind);(kind==='event'?S.events:S.evidence).set(n.key,n)}while(S.events.size>10000)S.events.delete(S.events.keys().next().value);while(S.evidence.size>20000)S.evidence.delete(S.evidence.keys().next().value);schedule()}
function fabricNearby(e){const f=window.DOMPlanetaryEvidenceFabric;if(!f)return[];try{if(e.coordinate&&typeof f.within==='function')return(f.within(e.coordinate[1],e.coordinate[0],1500,Date.now(),48)||[]).map(x=>({evidence:normalize(x.raw||x,'evidence'),relation:{distanceKm:x.distanceKm,timeDeltaS:Number.isFinite(x.ageHours)?x.ageHours*3600:null},class:x.class||null}));}catch(_){}return[]}
function localNearby(e){return[...S.evidence.values()].map(x=>({evidence:x,relation:relation(e,x)})).filter(x=>x.relation&&x.relation.distanceKm<=1500&&(!Number.isFinite(x.relation.timeDeltaS)||x.relation.timeDeltaS<=172800)).sort((a,b)=>a.relation.distanceKm-b.relation.distanceKm).slice(0,64)}
function recompute(){S.updatedAt=new Date().toISOString();S.relationships=[];S.missing=[];S.contradictions=[];const math=window.DOMPlanetaryCoupledHazardMath,env=window.DOMEnvironmentalCoupledPhysics;for(const e of S.events.values()){let coupled=null,environmental=null;try{coupled=math?.analyze?.(e.raw)||null}catch(err){S.contradictions.push({event:e.key,system:'coupled-math',error:String(err)})}try{environmental=env?.analyze?.(e.raw)||null}catch(err){S.contradictions.push({event:e.key,system:'environmental-physics',error:String(err)})}let nearby=fabricNearby(e);if(!nearby.length)nearby=localNearby(e);nearby=nearby.slice(0,64);const missing=[...(Array.isArray(coupled?.missing)?coupled.missing:[]),...(Array.isArray(environmental?.missing)?environmental.missing:[])];S.analyses.set(e.key,{event:e,coupled,environmental,nearby,missing});if(missing.length)S.missing.push({event:e.key,missing});for(const x of nearby){const n=x.evidence,r=x.relation||relation(e,n);if(r)S.relationships.push({event:e.key,evidence:n.key,class:x.class||null,...r})}}
for(const key of[...S.analyses.keys()])if(!S.events.has(key))S.analyses.delete(key);
window.dispatchEvent(new CustomEvent('dom:planetary-organism-update',{detail:{updatedAt:S.updatedAt,eventCount:S.events.size,evidenceCount:S.evidence.size,relationshipCount:S.relationships.length,missingCount:S.missing.length,contradictionCount:S.contradictions.length,policy:'Observed, modeled, registry, derived and official-product evidence remain distinct; spatial/temporal association is context, not causation.'}}))}
window.DOMPlanetaryOrganism=Object.freeze({state:()=>S,ingestEvents:r=>ingest(r,'event'),ingestEvidence:r=>ingest(r,'evidence'),recompute:schedule});
for(const name of['dom:hazard-refresh','dom:hazard-extension','dom:verified-global-events'])window.addEventListener(name,e=>ingest(e.detail?.events||e.detail?.rows||(Array.isArray(e.detail)?e.detail:[]),'event'));
window.addEventListener('dom:observation',e=>ingest([e.detail||{}],'evidence'));
window.addEventListener('dom:operational-weather-summary',()=>schedule());
window.addEventListener('dom:station-fabric-summary',()=>schedule());
window.addEventListener('dom:map-ready',()=>schedule());
})();