const DOMHazardObservationBridge=(()=>{
  function eventToObservation(e={}){
    const raw={id:e.id,sourceId:e.id,sourceAgency:e.source,agency:e.source,network:e.sourceType==='official-alert'?'official-alerts':e.source,lineageId:e.lineageId,kind:e.kind,modality:e.modality,lat:e.lat,lon:e.lon,locationPrecision:e.locationPrecision,time:e.time,observedAt:e.time,receivedAt:new Date().toISOString(),expiresAt:e.expiresAt||e.expires||null,url:e.url,sourceUrl:e.url,authoritative:e.authoritative===true,officialAlert:e.officialAlert===true,observed:e.observed===true,observationStatus:e.observationStatus||null,title:e.title,severityText:e.severityText,certaintyText:e.certaintyText,urgencyText:e.urgencyText,mag:e.mag,geometry:e.geometry,quality:Number.isFinite(Number(e.quality))?Number(e.quality):null,freshness:Number.isFinite(Number(e.fresh))?Number(e.fresh):null,corroboration:Number.isFinite(Number(e.corr))?Number(e.corr):null,persistence:Number.isFinite(Number(e.trend))?Number(e.trend):null};
    return typeof DOMObservationIngress!=='undefined'?DOMObservationIngress.normalize(raw):{ok:false,record:null,errors:['ingress unavailable']};
  }
  function ingest(events=[]){if(typeof DOMObservationIngress==='undefined')return{records:[],rejected:(events||[]).length};const records=[],rejected=[];for(const e of events||[]){const n=eventToObservation(e);if(n.ok)records.push(n.record);else rejected.push({id:e&&e.id||null,errors:n.errors})}try{window.dispatchEvent(new CustomEvent('dom:observation-batch',{detail:{mode:'browser-hazard-feed',records,summary:DOMObservationIngress.summary(records),rejected}}))}catch(_){ }return{records,rejected}}
  window.addEventListener('dom:hazard-refresh',ev=>ingest((ev.detail&&ev.detail.events)||[]));
  return{eventToObservation,ingest};
})();
