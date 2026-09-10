const DOMObservationHazardBridge=(()=>{
  const brokerEvents=new Map(),historyVersions=new Set();
  const kindMap=k=>{const s=String(k||'').toLowerCase();if(s==='earthquake'||s.includes('seismic'))return'Earthquake';if(s.includes('wildfire')||s.includes('fire'))return'Wildfire';if(s.includes('volcano'))return'Volcano';if(s.includes('storm')||s.includes('cyclone')||s.includes('hurricane')||s.includes('typhoon'))return'Severe Storm';if(s.includes('weather alert')||s.includes('warning'))return'Official Weather Alert';return null};
  const ms=v=>{const t=v?new Date(v).getTime():NaN;return Number.isFinite(t)?t:null};
  function stale(e,now=Date.now()){
    const explicit=ms(e.expiresAt);if(explicit!==null)return explicit<=now;
    const observed=ms(e.time);if(observed===null)return true;
    const age=now-observed;if(e.officialAlert)return age>24*3600e3;if(e.kind==='Earthquake')return age>48*3600e3;return age>30*24*3600e3;
  }
  function toEvent(r={}){if(r.schema!=='dom.observation.v1')return null;const kind=r.officialAlert?'Official Weather Alert':kindMap(r.kind||r.modality);if(!kind)return null;const status=String(r.observationStatus||'unknown');return{id:String(r.sourceId||''),kind,source:r.sourceAgency||r.network||'Broker source',sourceType:r.officialAlert?'official-alert':status==='aggregated'?'event-aggregation':'observing-network',lineageId:r.lineageId||'',modality:r.modality||'',authoritative:r.authoritative===true,officialAlert:r.officialAlert===true,observed:status==='observed',observationStatus:status,title:r.title||kind,mag:Number.isFinite(Number(r.mag))?Number(r.mag):NaN,time:r.observedAt||null,expiresAt:r.expiresAt||null,receivedAt:r.receivedAt||null,lat:r.lat===null?NaN:Number(r.lat),lon:r.lon===null?NaN:Number(r.lon),locationPrecision:r.locationPrecision||'unresolved',geometry:r.geometry||null,url:r.sourceUrl||null,severityText:r.severityText||'',certaintyText:r.certaintyText||'',urgencyText:r.urgencyText||'',brokerDerived:true};}
  function prune(){const now=Date.now();for(const[id,e]of brokerEvents)if(stale(e,now))brokerEvents.delete(id);if(historyVersions.size>10000){const keep=new Set([...historyVersions].slice(-7000));historyVersions.clear();for(const k of keep)historyVersions.add(k)}}
  function mergeIntoHazards(){prune();if(typeof H==='undefined'||typeof render!=='function')return;const merged=new Map((H.events||[]).filter(e=>!e.brokerDerived).map(e=>[String(e.id),e]));for(const[id,e]of brokerEvents)merged.set(id,e);H.events=[...merged.values()];render()}
  function accept(records=[],mode='unknown'){if(mode==='browser-hazard-feed')return{accepted:0,ignored:records.length};let accepted=0,ignored=0;for(const r of records||[]){const e=toEvent(r);if(!e||!e.id||stale(e)){ignored++;continue}brokerEvents.set(e.id,e);const version=`${e.id}|${e.time||''}`;if(!historyVersions.has(version)){historyVersions.add(version);if(typeof recordHistory==='function')recordHistory([e]);if(typeof notifyNew==='function')notifyNew([e])}accepted++}prune();if(accepted)mergeIntoHazards();return{accepted,ignored}}
  window.addEventListener('dom:observation-batch',ev=>{const d=ev.detail||{};accept(d.records||[],d.mode||'event')});
  window.addEventListener('dom:hazard-refresh',()=>{if(brokerEvents.size)mergeIntoHazards()});
  return{toEvent,accept,stale,state:()=>({events:brokerEvents.size,historyVersions:historyVersions.size})};
})();
