(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const brokerBase=()=>String(window.DOMSRuntimeConfig&&window.DOMSRuntimeConfig.brokerUrl||'').replace(/\/$/,'');
  async function fetchJSON(url,ms=15000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:'no-store',signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}}
  function numeric(v){return Number.isFinite(Number(v))?Number(v):null}
  function nonNegative(v){const n=numeric(v);return n!=null&&n>=0?n:null}
  function probability(v){const n=numeric(v);if(n==null)return null;if(n>=0&&n<=1)return n;if(n>1&&n<=100)return n/100;return null}
  function measurementsOf(r){
    const out=[];
    if(Array.isArray(r.measurements))for(const m of r.measurements){if(!m||typeof m!=='object')continue;const v=numeric(m.value??m.measurementValue);if(v==null)continue;out.push({name:String(m.name||m.metric||m.variable||'measurement'),value:v,unit:m.unit||m.units||m.measurementUnit||null,observedAt:m.observedAt||r.observedAt||null,quality:m.quality??null})}
    const fields=[['measurementValue',r.variable||'measurement'],['measurement','measurement'],['value','value'],['mag','magnitude'],['waterLevel','water-level'],['temperature','temperature'],['pressure','pressure'],['humidity','humidity'],['windSpeed','wind-speed'],['salinity','salinity'],['pH','pH'],['discharge','discharge'],['stage','stage'],['radiation','radiation'],['co2','co2']];
    const existing=new Set(out.map(x=>x.name));
    for(const [key,name] of fields){const v=numeric(r[key]);if(v==null||existing.has(name))continue;out.push({name,value:v,unit:key==='measurementValue'?(r.measurementUnit||r.unit||r.units||null):(r[`${key}Unit`]||r.units||null),observedAt:r.observedAt||null,quality:r.quality??null});existing.add(name)}
    return out;
  }
  function arPacket(records){
    const G=window.DOMEarthGeodesy;
    const out=[];
    for(const r of records||[]){
      const lat=Number(r.lat??r.latitude),lon=Number(r.lon??r.longitude);
      if(!G||!G.validLatLon(lat,lon))continue;
      const elevation=numeric(r.elevation_m??r.elevation??r.altitude),depthKm=numeric(r.depth_km??r.depthKm);
      const depthM=depthKm==null?0:depthKm*1000;
      const frame=G.surfaceFrame(lat,lon,elevation??0,depthM);
      const room=G.scenePosition(lat,lon,elevation??0,depthM,.35);
      if(!frame||!room)continue;
      out.push({
        id:String(r.sourceId||r.id||''),lineageId:String(r.lineageId||''),agency:String(r.sourceAgency||r.source||''),network:String(r.network||''),
        modality:String(r.modality||''),kind:String(r.kind||'Observation'),title:String(r.title||r.kind||'Observation'),latitude:lat,longitude:lon,
        elevation_m:elevation,depth_km:depthKm,observedAt:r.observedAt||r.time||null,receivedAt:r.receivedAt||null,sourceUrl:r.sourceUrl||r.url||null,
        platformClass:r.platformClass||'surface',observationStatus:r.observationStatus||'reported',officialAlert:!!r.officialAlert,authoritative:!!r.authoritative,
        geometryType:'Point',measurements:measurementsOf(r),ecef_m:frame.ecefM,ar_position_m:room,
        locationPrecision:r.locationPrecision||null,horizontalAccuracyMeters:nonNegative(r.horizontalAccuracyMeters),uncertaintyRadiusMeters:nonNegative(r.uncertaintyRadiusMeters),confidenceLevel:probability(r.confidenceLevel),uncertaintyBasis:r.uncertaintyBasis||null
      });
    }
    return {schema:'dom.ar.scene.v2',generatedAt:new Date().toISOString(),earth:G?G.earthShell:null,objects:out};
  }
  function downloadJSON(name,obj){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function loadBrokerSnapshot(){const base=brokerBase();if(!base)throw new Error('persistent broker is not configured');return await fetchJSON(`${base}/v1/observations`,20000)}
  async function showARStatus(){
    const box=$('#arSystemState');if(!box)return;
    const base=brokerBase();
    if(!window.DOMEarthGeodesy){box.textContent='AR geodesy module failed to load. Native placement is blocked rather than guessed.';return}
    if(!base){box.textContent='AR Earth geometry is WGS84-ready, but the persistent broker is not configured. Scientific objects cannot be streamed until a broker URL is deployed.';return}
    box.textContent='Checking AR Earth + scientific data path…';
    try{const batch=await loadBrokerSnapshot();const packet=arPacket(batch.records||[]);const readingCount=packet.objects.reduce((s,x)=>s+x.measurements.length,0),accuracyCount=packet.objects.filter(x=>x.horizontalAccuracyMeters!=null||x.uncertaintyRadiusMeters!=null).length;box.textContent=`AR data path ready · WGS84 Earth · ${packet.objects.length.toLocaleString()} georeferenced objects · ${readingCount.toLocaleString()} numeric readings · ${accuracyCount.toLocaleString()} objects with source-supplied numeric positional uncertainty.`}catch(e){box.textContent=`AR data path unavailable: ${e.message}`}
  }
  async function exportAR(){
    const box=$('#arSystemState');try{const batch=await loadBrokerSnapshot();const packet=arPacket(batch.records||[]);downloadJSON('dom-ar-earth-scene-snapshot.json',packet);if(box)box.textContent=`AR Earth scene exported · WGS84 shell + ${packet.objects.length.toLocaleString()} source-backed objects. Missing accuracy fields remain null rather than inferred.`}catch(e){if(box)box.textContent=`AR scene export unavailable: ${e.message}`}
  }
  function numericSeries(records){
    const groups=new Map();
    for(const r of records||[]){
      const ms=measurementsOf(r);
      for(const m of ms){const t=Date.parse(m.observedAt||r.observedAt||'');if(!Number.isFinite(t))continue;const key=`${r.lineageId||r.network||'source'}|${r.sourceId||r.id||'record'}|${m.name}|${m.unit||''}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({time:t,value:m.value,record:r,metric:m.name,unit:m.unit||''})}
    }
    return groups;
  }
  async function runPredictionAudit(){
    const out=$('#predictionState');if(!out)return;out.textContent='Evaluating statistical prediction readiness…';
    const base=brokerBase();if(!base){out.textContent='Prediction engine ready, but no persistent broker/history is configured. D.O.M. will not fabricate forecasts from one-off points.';return}
    try{
      const batch=await loadBrokerSnapshot(),P=window.DOMStatisticalPrediction,groups=numericSeries(batch.records||[]);let ready=0,best=null;
      for(const [key,series] of groups){series.sort((a,b)=>a.time-b.time);const r=P.readiness(series,8);if(!r.ready)continue;ready++;const pts=series.map(x=>({x:x.time,y:x.value}));const step=(series.at(-1).time-series[0].time)/Math.max(1,series.length-1);const target=series.at(-1).time+step;const f=P.forecastLinear(pts,target,.95);if(f&&(!best||f.r2>best.f.r2))best={key,series,f};}
      if(!ready||!best){out.textContent=`No numeric time series currently meets the minimum evidence threshold. ${groups.size} numeric series candidates were inspected; D.O.M. correctly withholds prediction.`;return}
      const [lineage,source,metric,unit]=best.key.split('|');out.innerHTML=`${ready} statistically usable series · strongest current one-step linear model: <strong>${esc(lineage)} / ${esc(source)} / ${esc(metric)}</strong> · n=${best.f.n} · R² ${best.f.r2.toFixed(3)} · slope t=${best.f.slopeT.toFixed(2)} · estimate ${best.f.estimate.toFixed(3)}${unit?` ${esc(unit)}`:''} · 95% prediction interval ${best.f.low.toFixed(3)} to ${best.f.high.toFixed(3)}. <span class="earth-truth">This is a conditional statistical extrapolation from that series, not certainty, causal proof, or official guidance.</span>`;
    }catch(e){out.textContent=`Prediction audit unavailable: ${e.message}`}
  }
  function bind(id,fn){const n=$(`#${id}`);if(n)n.addEventListener('click',fn)}
  bind('checkAR',showARStatus);bind('exportAR',exportAR);bind('runPrediction',runPredictionAudit);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showARStatus,{once:true});else showARStatus();
  window.DOMARBridge=Object.freeze({arPacket,measurementsOf,showARStatus,exportAR});
})();
