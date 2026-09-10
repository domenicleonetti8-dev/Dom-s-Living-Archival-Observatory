const DOMObservationIngress=(()=>{
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const clamp=x=>{const n=Number(x);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):null};
  const validLatLon=(lat,lon)=>finite(lat)&&finite(lon)&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  const iso=v=>{if(v===null||v===undefined||v==='')return null;const t=new Date(v).getTime();return Number.isFinite(t)?new Date(t).toISOString():null};
  const httpUrl=u=>{try{const x=new URL(String(u||''),location.href);return x.protocol==='https:'||x.protocol==='http:'?x.href:null}catch(_){return null}};
  function normalize(raw={},context={}){
    const lat=validLatLon(raw.lat,raw.lon)?Number(raw.lat):null,lon=lat===null?null:Number(raw.lon);
    const sourceAgency=String(raw.sourceAgency||raw.agency||context.sourceAgency||'').trim();
    const network=String(raw.network||context.network||sourceAgency||'').trim();
    const sourceId=String(raw.sourceId||raw.id||raw.sensorId||raw.stationId||raw.instrumentId||'').trim();
    const lineageId=String(raw.lineageId||context.lineageId||network||sourceAgency||'').trim();
    const observedAt=iso(raw.observedAt||raw.time),receivedAt=iso(raw.receivedAt)||new Date().toISOString();
    const sourceUrl=httpUrl(raw.sourceUrl||raw.url||context.sourceUrl);
    const kind=String(raw.kind||raw.hazardClass||raw.modality||'observation').trim();
    const authoritative=raw.authoritative===true;
    const officialAlert=raw.officialAlert===true&&authoritative&&!!sourceAgency&&!!sourceUrl;
    const record={schema:'dom.observation.v1',sourceId,lineageId,sourceAgency,network,kind,modality:String(raw.modality||''),instrument:String(raw.instrument||''),lat,lon,locationPrecision:lat===null?'unresolved':String(raw.locationPrecision||'source-coordinate'),observedAt,receivedAt,sourceUrl,authoritative,officialAlert,quality:clamp(raw.quality),freshness:clamp(raw.freshness),corroboration:clamp(raw.corroboration),persistence:clamp(raw.persistence),hazardCoupling:clamp(raw.hazardCoupling),anomaly:clamp(raw.anomaly),anomalyZ:finite(raw.anomalyZ)?Number(raw.anomalyZ):null,measurement:raw.measurement??null,measurements:Array.isArray(raw.measurements)?raw.measurements:[],unit:raw.unit??null,temperature:raw.temperature??null,nominalAreaWeight:finite(raw.nominalAreaWeight)&&Number(raw.nominalAreaWeight)>0?Number(raw.nominalAreaWeight):null,geometry:raw.geometry??null,title:String(raw.title||kind),severityText:String(raw.severityText||''),certaintyText:String(raw.certaintyText||''),urgencyText:String(raw.urgencyText||''),mag:finite(raw.mag)?Number(raw.mag):null,storm:raw.storm??null,upstream:raw.upstream??null};
    const errors=[];if(!record.sourceId)errors.push('missing source id');if(!record.lineageId)errors.push('missing lineage');if(!record.sourceAgency)errors.push('missing source agency');if(!record.observedAt)errors.push('missing/invalid observation time');if(!record.sourceUrl)errors.push('missing/invalid source URL');
    return{ok:errors.length===0,record,errors};
  }
  function dedupe(records=[]){const m=new Map();for(const raw of records){const n=raw&&raw.schema==='dom.observation.v1'?{ok:true,record:raw,errors:[]}:normalize(raw);if(!n.ok)continue;const r=n.record,key=`${r.lineageId}|${r.sourceId}|${r.observedAt||''}`;const old=m.get(key);if(!old||String(r.receivedAt||'')>String(old.receivedAt||''))m.set(key,r)}return[...m.values()]}
  function toSensor(record){if(!record||record.schema!=='dom.observation.v1'||!window.DOMSensorActivation)return null;return DOMSensorActivation.sensorPacket(record)}
  function summary(records=[]){const rows=dedupe(records),lineages=new Set(rows.map(r=>r.lineageId).filter(Boolean)),agencies=new Set(rows.map(r=>r.sourceAgency).filter(Boolean));return{records:rows.length,lineages:lineages.size,agencies:agencies.size,geolocated:rows.filter(r=>r.lat!==null&&r.lon!==null).length,officialAlerts:rows.filter(r=>r.officialAlert).length}}
  return{normalize,dedupe,toSensor,summary,validLatLon};
})();
