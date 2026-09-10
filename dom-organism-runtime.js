const DOMOrganismRuntime=(()=>{
  const state={records:new Map(),sensors:new Map(),lastBatchAt:null,lastMode:null,lastSummary:null};
  const key=r=>`${r.lineageId||''}|${r.sourceId||''}|${r.observedAt||''}`;
  const ingressReady=()=>typeof DOMObservationIngress!=='undefined';
  const globeReady=()=>typeof DOMGlobalSensorGlobe!=='undefined';
  const emit=()=>{const detail=snapshot();try{window.dispatchEvent(new CustomEvent('dom:organism-state',{detail}))}catch(_){ }return detail};
  function accept(records=[],mode='unknown'){
    if(!ingressReady())return emit();
    const clean=DOMObservationIngress.dedupe(records);
    for(const r of clean){state.records.set(key(r),r);const packet=DOMObservationIngress.toSensor(r);if(packet&&globeReady()){const sensor=DOMGlobalSensorGlobe.normalizeSensor(packet);if(sensor.id)state.sensors.set(`${sensor.lineageId}|${sensor.id}`,sensor)}}
    if(state.records.size>20000){const ordered=[...state.records.entries()].sort((a,b)=>String(a[1].receivedAt||'').localeCompare(String(b[1].receivedAt||'')));for(const [k] of ordered.slice(0,state.records.size-18000))state.records.delete(k)}
    if(state.sensors.size>15000){const ordered=[...state.sensors.entries()].sort((a,b)=>String(a[1].receivedAt||'').localeCompare(String(b[1].receivedAt||'')));for(const [k] of ordered.slice(0,state.sensors.size-13000))state.sensors.delete(k)}
    state.lastBatchAt=new Date().toISOString();state.lastMode=mode;state.lastSummary=DOMObservationIngress.summary(clean);return emit();
  }
  function snapshot(){const sensors=[...state.sensors.values()],records=[...state.records.values()],lineages=new Set(records.map(r=>r.lineageId).filter(Boolean)),agencies=new Set(records.map(r=>r.sourceAgency).filter(Boolean));return{recordCount:records.length,sensorCount:sensors.length,lineages:lineages.size,agencies:agencies.size,lastBatchAt:state.lastBatchAt,lastMode:state.lastMode,lastSummary:state.lastSummary,sensors}}
  function renderPlan(options={}){if(!globeReady())return null;return DOMGlobalSensorGlobe.renderPlan({...options,sensors:[...state.sensors.values()]})}
  function clear(){state.records.clear();state.sensors.clear();state.lastBatchAt=null;state.lastMode=null;state.lastSummary=null;return emit()}
  function boot(){emit();if(typeof DOMObservationBroker!=='undefined')DOMObservationBroker.configureFromPage()}
  window.addEventListener('dom:observation-batch',ev=>{const d=ev.detail||{};accept(d.records||[],d.mode||'event')});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
  return{accept,snapshot,renderPlan,clear,boot};
})();
