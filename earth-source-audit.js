(()=>{
  const DIRECT_BROWSER=new Set(['usgs-eq','nasa-eonet','nws-alerts']);
  const INVENTORY_ONLY=new Set(['ndbc-stdmet','ndbc-ocean','ndbc-waterlevel']);
  const brokerStates=new Map();
  const brokerBase=()=>String(window.DOMSRuntimeConfig?.brokerUrl||'').replace(/\/$/,'');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stateFor(f){
    const b=brokerStates.get(f.id);
    if(b){
      if(b.status==='active')return{label:'LIVE',cls:'ok',detail:`broker adapter active · ${Number(b.record_count||0).toLocaleString()} records · last success ${b.last_success||'unknown'}`};
      if(b.status==='stale')return{label:'STALE',cls:'loading',detail:`broker adapter stale · last success ${b.last_success||'unknown'} · stale after ${Number(b.stale_after_seconds||0).toLocaleString()} s`};
      if(b.status==='error')return{label:'FAILED',cls:'fail',detail:`broker adapter error${b.last_error?` · ${b.last_error}`:''}`};
      if(b.status==='registered-not-ingesting')return{label:'REGISTERED',cls:'loading',detail:'registered in broker; no ingest adapter is active yet'};
    }
    if(DIRECT_BROWSER.has(f.id))return{label:'ADAPTER PATH',cls:'ok',detail:'browser fetch path exists; current-session success is shown in the live source panel'};
    if(INVENTORY_ONLY.has(f.id))return{label:'INVENTORY ONLY',cls:'loading',detail:'D.O.M. currently loads NDBC station inventory here, not this measurement family'};
    return{label:'REGISTERED',cls:'loading',detail:'metadata only; broker or specialized adapter still required'};
  }
  function render(){
    const host=document.getElementById('allSourceFamilies');
    if(!host||!window.DOMPublicSensorRegistry)return;
    const feeds=DOMPublicSensorRegistry.feeds||[];
    host.innerHTML=feeds.map(f=>{
      const s=stateFor(f);
      return `<div class="source-row"><div><strong>${esc(f.agency||'')} · ${esc(f.name||f.id)}</strong><small>${esc(f.domain||'')} · ${esc(f.coverage||'')} · ${esc(f.cadence||'')}<br>${esc(s.detail)}</small></div><strong class="${esc(s.cls)}">${esc(s.label)}</strong></div>`;
    }).join('');
    const n=document.getElementById('registeredFabricCount');
    if(n)n.textContent=`${feeds.length} registered source families are visible here. LIVE/STALE/FAILED come from the configured broker. ADAPTER PATH means browser code exists, INVENTORY ONLY means platform locations only, and neither means the measurement feed is live.`;
  }
  async function refreshBrokerStates(){
    const base=brokerBase();
    brokerStates.clear();
    if(!base){render();return;}
    try{
      const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
      const r=await fetch(`${base}/v1/sources`,{cache:'no-store',signal:c.signal,headers:{Accept:'application/json'}}).finally(()=>clearTimeout(t));
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      for(const row of Array.isArray(j.sources)?j.sources:[])if(row?.id)brokerStates.set(String(row.id),row);
    }catch(e){
      brokerStates.set('__broker__',{status:'error',last_error:String(e.message||e)});
    }
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshBrokerStates,{once:true});else refreshBrokerStates();
  window.DOMEarthSourceAudit=Object.freeze({render,refreshBrokerStates,stateFor,brokerStates:()=>new Map(brokerStates)});
})();
