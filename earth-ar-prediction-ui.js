(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const brokerBase=()=>String(window.DOMSRuntimeConfig&&window.DOMSRuntimeConfig.brokerUrl||'').replace(/\/$/,'');
  async function fetchJSON(url,ms=15000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:'no-store',signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}}
  function arPacket(records){
    const out=[];
    for(const r of records||[]){
      const lat=Number(r.lat),lon=Number(r.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)continue;
      out.push({
        id:String(r.sourceId||r.id||''),lineageId:String(r.lineageId||''),agency:String(r.sourceAgency||r.source||''),network:String(r.network||''),
        modality:String(r.modality||''),kind:String(r.kind||'Observation'),title:String(r.title||r.kind||'Observation'),latitude:lat,longitude:lon,
        elevation_m:Number.isFinite(Number(r.elevation))?Number(r.elevation):null,depth_km:Number.isFinite(Number(r.depthKm))?Number(r.depthKm):null,
        observedAt:r.observedAt||r.time||null,receivedAt:r.receivedAt||null,sourceUrl:r.sourceUrl||r.url||null,
        platformClass:r.platformClass||'surface',observationStatus:r.observationStatus||'reported',officialAlert:!!r.officialAlert,authoritative:!!r.authoritative,
        geometryType:'Point',measurement:r.measurement||null,units:r.units||null
      });
    }
    return {schema:'dom.ar.scene.v1',generatedAt:new Date().toISOString(),objects:out};
  }
  function downloadJSON(name,obj){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function loadBrokerSnapshot(){const base=brokerBase();if(!base)throw new Error('persistent broker is not configured');return await fetchJSON(`${base}/v1/observations`,20000)}
  async function showARStatus(){
    const box=$('#arSystemState');if(!box)return;
    const base=brokerBase();
    if(!base){box.textContent='AR data contract ready, but the persistent broker is not configured. Native RealityKit cannot receive live scientific packets until a broker URL is deployed.';return}
    box.textContent='Checking AR data path…';
    try{const batch=await loadBrokerSnapshot();const packet=arPacket(batch.records||[]);box.textContent=`AR data path ready · ${packet.objects.length.toLocaleString()} source-backed geographic objects available from the canonical broker.`}catch(e){box.textContent=`AR data path unavailable: ${e.message}`}
  }
  async function exportAR(){
    const box=$('#arSystemState');try{const batch=await loadBrokerSnapshot();const packet=arPacket(batch.records||[]);downloadJSON('dom-ar-scene-live-snapshot.json',packet);if(box)box.textContent=`AR scene snapshot exported · ${packet.objects.length.toLocaleString()} source-backed objects.`}catch(e){if(box)box.textContent=`AR scene export unavailable: ${e.message}`}
  }
  function numericSeries(records){
    const groups=new Map();
    for(const r of records||[]){
      const t=Date.parse(r.observedAt||'');if(!Number.isFinite(t))continue;
      const candidates=[['measurement',r.measurement],['value',r.value],['mag',r.mag],['waterLevel',r.waterLevel],['temperature',r.temperature]];
      const pair=candidates.find(([,v])=>Number.isFinite(Number(v)));if(!pair)continue;
      const key=`${r.lineageId||r.network||'source'}|${r.sourceId||r.id||'record'}|${pair[0]}`;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push({time:t,value:Number(pair[1]),record:r,metric:pair[0]});
    }
    return groups;
  }
  async function runPredictionAudit(){
    const out=$('#predictionState');if(!out)return;out.textContent='Evaluating statistical prediction readiness…';
    const base=brokerBase();if(!base){out.textContent='Prediction engine ready, but no persistent broker/history is configured. D.O.M. will not fabricate forecasts from one-off points.';return}
    try{
      const batch=await loadBrokerSnapshot(),P=window.DOMStatisticalPrediction,groups=numericSeries(batch.records||[]);let ready=0,best=null;
      for(const [key,series] of groups){series.sort((a,b)=>a.time-b.time);const r=P.readiness(series,8);if(!r.ready)continue;ready++;const pts=series.map(x=>({x:x.time,y:x.value}));const target=series.at(-1).time+(series.at(-1).time-series[0].time)/Math.max(1,series.length-1);const f=P.forecastLinear(pts,target,.95);if(f&&(!best||f.r2>best.f.r2))best={key,series,f};}
      if(!ready){out.textContent=`No numeric time series currently meets the minimum evidence threshold. ${groups.size} numeric series candidates were inspected; D.O.M. correctly withholds prediction.`;return}
      const [lineage,source,metric]=best.key.split('|');out.innerHTML=`${ready} statistically usable series · strongest current linear fit: <strong>${esc(lineage)} / ${esc(source)} / ${esc(metric)}</strong> · R² ${best.f.r2.toFixed(3)} · next-step estimate ${best.f.estimate.toFixed(3)} · 95% residual interval ${best.f.low.toFixed(3)} to ${best.f.high.toFixed(3)}. <span class="earth-truth">This is a statistical extrapolation, not certainty or an official forecast.</span>`;
    }catch(e){out.textContent=`Prediction audit unavailable: ${e.message}`}
  }
  function bind(id,fn){const n=$(`#${id}`);if(n)n.addEventListener('click',fn)}
  bind('checkAR',showARStatus);bind('exportAR',exportAR);bind('runPrediction',runPredictionAudit);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showARStatus,{once:true});else showARStatus();
  window.DOMARBridge=Object.freeze({arPacket,showARStatus,exportAR});
})();
