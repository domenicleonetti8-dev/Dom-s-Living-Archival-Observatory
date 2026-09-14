const DOMOrganismRuntime=(()=>{
  'use strict';
  const state={records:new Map(),sensors:new Map(),hazards:new Map(),hazardHistory:new Map(),lastBatchAt:null,lastMode:null,lastSummary:null,lastHazardAt:null,lastEmitAt:0,emitTimer:null};
  const key=r=>`${r.lineageId||''}|${r.sourceId||''}|${r.observedAt||''}`;
  const ingressReady=()=>typeof DOMObservationIngress!=='undefined';
  const globeReady=()=>typeof DOMGlobalSensorGlobe!=='undefined';
  const timeValue=v=>{const t=v?new Date(v).getTime():NaN;return Number.isFinite(t)?t:-Infinity};
  const newer=(a,b)=>{const ao=timeValue(a&&a.observedAt),bo=timeValue(b&&b.observedAt);if(ao!==bo)return ao>bo;return timeValue(a&&a.receivedAt)>timeValue(b&&b.receivedAt)};
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const valid=(lat,lon)=>finite(lat)&&finite(lon)&&+lat>=-90&&+lat<=90&&+lon>=-180&&+lon<=180;
  function sensorExpired(s,now=Date.now()){
    if(!s)return true;
    const expires=timeValue(s.expiresAt);if(expires!==-Infinity)return expires<=now;
    const observed=timeValue(s.observedAt),received=timeValue(s.receivedAt),basis=observed!==-Infinity?observed:received;if(basis===-Infinity)return true;
    const age=now-basis,kind=String(s.kind||'').toLowerCase(),modality=String(s.modality||'').toLowerCase(),status=String(s.observationStatus||'').toLowerCase();
    if(s.officialAlert||kind==='official weather alert'||modality==='official-warning')return age>24*3600e3;
    if(kind==='earthquake'||modality==='seismic')return age>48*3600e3;
    if(kind==='space weather'||modality.includes('space-weather'))return age>(status==='forecast'?72:24)*3600e3;
    if(status==='forecast')return age>7*24*3600e3;
    if(status==='projection'||status==='modeled'||modality.includes('reanalysis'))return age>7*24*3600e3;
    if(status==='aggregated'||modality==='event-aggregation')return age>30*24*3600e3;
    return age>24*3600e3;
  }
  function pruneSensors(now=Date.now()){let removed=0;for(const[k,s]of state.sensors)if(sensorExpired(s,now)){state.sensors.delete(k);removed++}return removed}
  function hazardKey(h={}){const source=String(h.source||h.agency||h.network||h.lineageId||'unknown');const id=String(h.id||h.eventId||h.sourceId||'');if(id)return`${source}|${id}`;const lat=valid(h.lat,h.lon)?Number(h.lat).toFixed(5):'x',lon=valid(h.lat,h.lon)?Number(h.lon).toFixed(5):'x',t=h.observedAt||h.time||h.validAt||h.publishedAt||'';return`${source}|${String(h.kind||'hazard')}|${lat}|${lon}|${t}`}
  function hazardTime(h={}){return h.observedAt||h.time||h.validAt||h.publishedAt||h.receivedAt||null}
  function canonicalHazard(h={}){const lat=valid(h.lat,h.lon)?Number(h.lat):null,lon=valid(h.lat,h.lon)?Number(h.lon):null;return{...h,lat,lon,canonicalKey:hazardKey(h),canonicalLocationStatus:lat!==null&&lon!==null?(h.locationPrecision||'source-coordinate'):'unresolved',canonicalTime:hazardTime(h),source:String(h.source||h.agency||h.network||''),sourceId:String(h.id||h.eventId||h.sourceId||''),updatedAt:new Date().toISOString()}}
  function physicsFor(h){let coupled=null,environmental=null;try{coupled=window.DOMPlanetaryCoupledHazardMath?.analyze?.(h)||null}catch(_){}try{environmental=window.DOMEnvironmentalCoupledPhysics?.analyze?.(h)||null}catch(_){}return{coupled,environmental,policy:'Only equation-gated physics/model outputs already exposed by the canonical math engines are attached. No arbitrary probability or danger score is created here.'}}
  function recordHazardHistory(h){const k=h.canonicalKey,a=state.hazardHistory.get(k)||[],stamp={time:new Date().toISOString(),sourceTime:h.canonicalTime||null,lat:h.lat,lon:h.lon,status:h.status||h.state||h.observationStatus||null,kind:h.kind||null};const last=a[a.length-1];if(!last||JSON.stringify([last.sourceTime,last.lat,last.lon,last.status])!==JSON.stringify([stamp.sourceTime,stamp.lat,stamp.lon,stamp.status]))a.push(stamp);while(a.length>96)a.shift();state.hazardHistory.set(k,a);if(state.hazardHistory.size>3000){for(const key of state.hazardHistory.keys()){if(!state.hazards.has(key))state.hazardHistory.delete(key);if(state.hazardHistory.size<=2500)break}}}
  function acceptHazards(rows=[],mode='hazard'){
    let changed=0;for(const raw of rows||[]){if(!raw)continue;const h=canonicalHazard(raw),old=state.hazards.get(h.canonicalKey);const nt=timeValue(h.canonicalTime),ot=timeValue(old?.canonicalTime);if(!old||nt>=ot){state.hazards.set(h.canonicalKey,h);recordHazardHistory(h);changed++}}
    if(state.hazards.size>5000){const ordered=[...state.hazards.entries()].sort((a,b)=>timeValue(a[1].canonicalTime)-timeValue(b[1].canonicalTime));for(const[k]of ordered.slice(0,state.hazards.size-4500))state.hazards.delete(k)}
    state.lastHazardAt=new Date().toISOString();state.lastMode=mode;scheduleEmit();return changed
  }
  function legacySnapshot(){pruneSensors();const sensors=[...state.sensors.values()],records=[...state.records.values()],lineages=new Set(records.map(r=>r.lineageId).filter(Boolean)),agencies=new Set(records.map(r=>r.sourceAgency).filter(Boolean));return{recordCount:records.length,sensorCount:sensors.length,lineages:lineages.size,agencies:agencies.size,lastBatchAt:state.lastBatchAt,lastMode:state.lastMode,lastSummary:state.lastSummary,sensors}}
  function canonicalSnapshot(){const hazards=[...state.hazards.values()].map(h=>({...h,physics:physicsFor(h),historyCount:(state.hazardHistory.get(h.canonicalKey)||[]).length}));const byKind={};for(const h of hazards){const k=String(h.kind||'Unknown');byKind[k]=(byKind[k]||0)+1}return{schema:'dom-canonical-planetary-organism-v1',updatedAt:new Date().toISOString(),recordCount:state.records.size,sensorCount:state.sensors.size,hazardCount:hazards.length,hazardKinds:byKind,lastObservationAt:state.lastBatchAt,lastHazardAt:state.lastHazardAt,hazards,historySeries:state.hazardHistory.size,truthPolicy:'Observed, modeled, inferred and official states remain distinct. Exact source coordinates are preserved. Missing inputs stay missing. Future pathways are emitted only through equation-gated physics/model engines.'}}
  function emitNow(){state.emitTimer=null;state.lastEmitAt=Date.now();const legacy=legacySnapshot();try{window.dispatchEvent(new CustomEvent('dom:organism-state',{detail:legacy}))}catch(_){ }const canonical=canonicalSnapshot();try{window.dispatchEvent(new CustomEvent('dom:canonical-organism-state',{detail:canonical}))}catch(_){ }window.DOMCanonicalOrganismState=canonical;return canonical}
  function scheduleEmit(delay=180){if(state.emitTimer)return;const elapsed=Date.now()-state.lastEmitAt;const wait=Math.max(delay,500-elapsed);state.emitTimer=setTimeout(emitNow,wait)}
  function accept(records=[],mode='unknown'){
    if(!ingressReady()){scheduleEmit();return canonicalSnapshot()}
    const clean=DOMObservationIngress.dedupe(records);
    for(const r of clean){const recordKey=key(r),oldRecord=state.records.get(recordKey);if(!oldRecord||newer(r,oldRecord))state.records.set(recordKey,r);const packet=DOMObservationIngress.toSensor(r);if(packet&&globeReady()){const sensor=DOMGlobalSensorGlobe.normalizeSensor(packet),sensorKey=`${sensor.lineageId}|${sensor.id}`,oldSensor=state.sensors.get(sensorKey);if(sensor.id&&sensor.id!=='unknown-sensor'&&!sensorExpired(sensor)&&(!oldSensor||newer(sensor,oldSensor)))state.sensors.set(sensorKey,sensor)}}
    pruneSensors();
    if(state.records.size>20000){const ordered=[...state.records.entries()].sort((a,b)=>timeValue(a[1].receivedAt)-timeValue(b[1].receivedAt));for(const[k]of ordered.slice(0,state.records.size-18000))state.records.delete(k)}
    if(state.sensors.size>15000){const ordered=[...state.sensors.entries()].sort((a,b)=>timeValue(a[1].receivedAt)-timeValue(b[1].receivedAt));for(const[k]of ordered.slice(0,state.sensors.size-13000))state.sensors.delete(k)}
    state.lastBatchAt=new Date().toISOString();state.lastMode=mode;state.lastSummary=DOMObservationIngress.summary(clean);scheduleEmit();return canonicalSnapshot()
  }
  function snapshot(){return legacySnapshot()}
  function organism(){return canonicalSnapshot()}
  function history(id){return(state.hazardHistory.get(String(id))||[]).slice()}
  function renderPlan(options={}){pruneSensors();if(!globeReady())return null;return DOMGlobalSensorGlobe.renderPlan({...options,sensors:[...state.sensors.values()]})}
  function clear(){state.records.clear();state.sensors.clear();state.hazards.clear();state.hazardHistory.clear();state.lastBatchAt=null;state.lastMode=null;state.lastSummary=null;state.lastHazardAt=null;scheduleEmit(0);return organism()}
  function boot(){scheduleEmit(0);if(typeof DOMObservationBroker!=='undefined')DOMObservationBroker.configureFromPage()}
  window.addEventListener('dom:observation-batch',ev=>{const d=ev.detail||{};accept(d.records||[],d.mode||'event')});
  window.addEventListener('dom:hazard-refresh',ev=>acceptHazards(ev.detail?.events||[],'hazard-refresh'));
  window.addEventListener('dom:hazard-extension',ev=>acceptHazards(ev.detail?.events||ev.detail?.rows||[],'hazard-extension'));
  window.addEventListener('dom:verified-global-events',ev=>acceptHazards(ev.detail?.events||ev.detail?.rows||[],'verified-global-events'));
  for(const n of ['dom:planetary-evidence-summary','dom:environmental-coupling-summary','dom:operational-weather-summary'])window.addEventListener(n,()=>scheduleEmit(250));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
  return{accept,acceptHazards,snapshot,organism,history,renderPlan,clear,boot,newer,sensorExpired,pruneSensors};
})();