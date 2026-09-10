const DOMOrganismRuntime=(()=>{
  const state={records:new Map(),sensors:new Map(),lastBatchAt:null,lastMode:null,lastSummary:null};
  const key=r=>`${r.lineageId||''}|${r.sourceId||''}|${r.observedAt||''}`;
  const ingressReady=()=>typeof DOMObservationIngress!=='undefined';
  const globeReady=()=>typeof DOMGlobalSensorGlobe!=='undefined';
  const timeValue=v=>{const t=v?new Date(v).getTime():NaN;return Number.isFinite(t)?t:-Infinity};
  const newer=(a,b)=>{const ao=timeValue(a&&a.observedAt),bo=timeValue(b&&b.observedAt);if(ao!==bo)return ao>bo;return timeValue(a&&a.receivedAt)>timeValue(b&&b.receivedAt)};
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
  const emit=()=>{const detail=snapshot();try{window.dispatchEvent(new CustomEvent('dom:organism-state',{detail}))}catch(_){ }return detail};
  function accept(records=[],mode='unknown'){
    if(!ingressReady())return emit();
    const clean=DOMObservationIngress.dedupe(records);
    for(const r of clean){const recordKey=key(r),oldRecord=state.records.get(recordKey);if(!oldRecord||newer(r,oldRecord))state.records.set(recordKey,r);const packet=DOMObservationIngress.toSensor(r);if(packet&&globeReady()){const sensor=DOMGlobalSensorGlobe.normalizeSensor(packet),sensorKey=`${sensor.lineageId}|${sensor.id}`,oldSensor=state.sensors.get(sensorKey);if(sensor.id&&sensor.id!=='unknown-sensor'&&!sensorExpired(sensor)&&(!oldSensor||newer(sensor,oldSensor)))state.sensors.set(sensorKey,sensor)}}
    pruneSensors();
    if(state.records.size>20000){const ordered=[...state.records.entries()].sort((a,b)=>timeValue(a[1].receivedAt)-timeValue(b[1].receivedAt));for(const[k]of ordered.slice(0,state.records.size-18000))state.records.delete(k)}
    if(state.sensors.size>15000){const ordered=[...state.sensors.entries()].sort((a,b)=>timeValue(a[1].receivedAt)-timeValue(b[1].receivedAt));for(const[k]of ordered.slice(0,state.sensors.size-13000))state.sensors.delete(k)}
    state.lastBatchAt=new Date().toISOString();state.lastMode=mode;state.lastSummary=DOMObservationIngress.summary(clean);return emit();
  }
  function snapshot(){pruneSensors();const sensors=[...state.sensors.values()],records=[...state.records.values()],lineages=new Set(records.map(r=>r.lineageId).filter(Boolean)),agencies=new Set(records.map(r=>r.sourceAgency).filter(Boolean));return{recordCount:records.length,sensorCount:sensors.length,lineages:lineages.size,agencies:agencies.size,lastBatchAt:state.lastBatchAt,lastMode:state.lastMode,lastSummary:state.lastSummary,sensors}}
  function renderPlan(options={}){pruneSensors();if(!globeReady())return null;return DOMGlobalSensorGlobe.renderPlan({...options,sensors:[...state.sensors.values()]})}
  function clear(){state.records.clear();state.sensors.clear();state.lastBatchAt=null;state.lastMode=null;state.lastSummary=null;return emit()}
  function boot(){emit();if(typeof DOMObservationBroker!=='undefined')DOMObservationBroker.configureFromPage()}
  window.addEventListener('dom:observation-batch',ev=>{const d=ev.detail||{};accept(d.records||[],d.mode||'event')});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
  return{accept,snapshot,renderPlan,clear,boot,newer,sensorExpired,pruneSensors};
})();