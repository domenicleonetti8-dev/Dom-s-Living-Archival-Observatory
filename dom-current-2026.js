(()=>{
  'use strict';
  const SNAP='./data/live-vitals.json';
  const NOAA_PAGE='https://coralreefwatch.noaa.gov/product/5km/index_5km_bse-365d.php';
  const NOAA_CSV='https://coralreefwatch.noaa.gov/data_current/5km/v3.1_op/daily/csv/5km-v3.1_stats-alert01_baa5-max-365d_dailyupdate.csv';
  const byId=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function set(id,text){const n=byId(id);if(n)n.textContent=text}
  function rewriteCoralHistory(record){
    const d=document.querySelector('details[data-history-for="phCoralHeat"]');if(!d)return;
    const body=d.querySelector('.dom-history-body');if(!body)return;
    const status=record&&record.status==='live'
      ? `${Number(record.globalReefPixelsExposedPct).toFixed(1)}% global reef-pixel exposure in the rolling 365-day window ending ${record.observationDate}.`
      : 'Current NOAA daily value is temporarily unavailable; no replacement value is invented.';
    body.innerHTML=`<div><b>Record:</b> NOAA Coral Reef Watch Daily Global 5km 365-day Bleaching Stress Extent, version 3.1.</div><div><b>Current:</b> ${esc(status)}</div><div><b>Method:</b> Percentage of 5 km reef-containing pixels that reached Bleaching Alert Level 1 or higher at any time during the preceding 365 days.</div><div><b>Freshness:</b> NOAA states this product is updated daily, generally around 13:30 U.S. Eastern Time.</div><div><b>Authority:</b> NOAA Coral Reef Watch.</div><a href="${NOAA_PAGE}" target="_blank" rel="noopener noreferrer">Open NOAA product ↗</a><a href="${NOAA_CSV}" target="_blank" rel="noopener noreferrer">Open exact daily CSV ↗</a>`;
  }
  function apply(snapshot){
    if(!snapshot||typeof snapshot!=='object')return;
    const cb=snapshot.coralBleaching||{};
    if(cb.status==='live'&&Number.isFinite(Number(cb.globalReefPixelsExposedPct))){
      set('phCoralHeat',`${Number(cb.globalReefPixelsExposedPct).toFixed(1)}% reef pixels · rolling 365 days ending ${cb.observationDate} · LIVE DAILY`);
    }else{
      set('phCoralHeat','CURRENT NOAA DAILY VALUE UNAVAILABLE');
    }
    rewriteCoralHistory(cb);
    const fresh=byId('phVitalsFreshness');
    if(fresh&&snapshot.generatedAt){fresh.title=`Authoritative snapshot generated ${snapshot.generatedAt}. Freshest available source data are retained even when their latest official assessment period predates 2026.`}
    window.dispatchEvent(new CustomEvent('dom:current-2026',{detail:snapshot}));
  }
  async function refresh(){
    try{const r=await fetch(`${SNAP}?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);apply(await r.json())}
    catch(e){console.warn('D.O.M. 2026 current-source overlay unavailable',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0),{once:true});else setTimeout(refresh,0);
  window.addEventListener('dom:earth-vitals',()=>setTimeout(refresh,0));
  setInterval(refresh,300000);
})();
