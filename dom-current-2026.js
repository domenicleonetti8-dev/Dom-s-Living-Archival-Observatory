(()=>{
  'use strict';
  const SNAP='./data/live-vitals.json';
  const NOAA_PAGE='https://coralreefwatch.noaa.gov/product/5km/index_5km_bse-365d.php';
  const NOAA_CSV='https://coralreefwatch.noaa.gov/data_current/5km/v3.1_op/daily/csv/5km-v3.1_stats-alert01_baa5-max-365d_dailyupdate.csv';
  const NASA_SEA='https://science.nasa.gov/earth/explore/earth-indicators/sea-level/';
  const byId=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function set(id,text){const n=byId(id);if(n)n.textContent=text}
  function removeResearchContext(){document.querySelectorAll('.research-context,.research-context-out').forEach(n=>n.remove())}
  function relabel2026(){
    const coralValue=byId('phCoralHeat');if(coralValue&&coralValue.parentElement){const label=coralValue.parentElement.querySelector('span');if(label)label.textContent='Rolling 365-day bleaching stress extent'}
    const forestSource=byId('phForestSource');if(forestSource)forestSource.textContent='Latest authoritative global forest assessment available in 2026: FAO Global Forest Resources Assessment 2025 · coverage 1990–2025 · published reference, not a live sensor feed.';
    const coralSource=byId('phCoralSource');if(coralSource)coralSource.textContent='Latest authoritative global coral-cover assessment available in 2026: GCRMN report released 31 Aug 2026, using observations through 2024. NOAA Coral Reef Watch rolling bleaching stress is current daily data and is shown separately.';
  }
  function rewriteCoralHistory(record){
    const d=document.querySelector('details[data-history-for="phCoralHeat"]');if(!d)return;const body=d.querySelector('.dom-history-body');if(!body)return;
    const status=record&&record.status==='live'?`${Number(record.globalReefPixelsExposedPct).toFixed(1)}% global reef-pixel exposure in the rolling 365-day window ending ${record.observationDate}.`:'Current NOAA daily value is temporarily unavailable; no replacement value is invented.';
    body.innerHTML=`<div><b>Record:</b> NOAA Coral Reef Watch Daily Global 5km 365-day Bleaching Stress Extent, version 3.1.</div><div><b>Current:</b> ${esc(status)}</div><div><b>Method:</b> Percentage of 5 km reef-containing pixels that reached Bleaching Alert Level 1 or higher at any time during the preceding 365 days.</div><div><b>Freshness:</b> NOAA states this product is updated daily, generally around 13:30 U.S. Eastern Time.</div><div><b>Authority:</b> NOAA Coral Reef Watch.</div><a href="${NOAA_PAGE}" target="_blank" rel="noopener noreferrer">Open NOAA product ↗</a><a href="${NOAA_CSV}" target="_blank" rel="noopener noreferrer">Open exact daily CSV ↗</a>`;
  }
  function rewriteSeaHistory(current,diagnostic){
    const d=document.querySelector('details[data-history-for="phSeaLevel"]');if(!d)return;const body=d.querySelector('.dom-history-body');if(!body)return;
    const now=current&&current.status==='live'?`${Number(current.measurementMm).toFixed(1)}${Number.isFinite(Number(current.uncertaintyMm))?` ± ${Number(current.uncertaintyMm).toFixed(1)}`:''} mm · ${current.observationLabel}`:'Current NASA measurement temporarily unavailable.';
    const trend=diagnostic&&Number.isFinite(Number(diagnostic.trendMmPerYear))?`${Number(diagnostic.trendMmPerYear).toFixed(2)} mm/yr over ${Number(diagnostic.startDecimalYear).toFixed(1)}–${Number(diagnostic.endDecimalYear).toFixed(1)}.`:'NOAA trend diagnostic unavailable.';
    body.innerHTML=`<div><b>Current NASA measurement:</b> ${esc(now)}</div><div><b>Record:</b> Satellite global mean sea level since 1993.</div><div><b>D.O.M. NOAA diagnostic:</b> ${esc(trend)}</div><div><b>Method:</b> Current level and long-record trend are kept separate. The NOAA OLS value is a D.O.M. diagnostic, not an official NOAA confidence interval.</div><div><b>Authority:</b> NASA Earth Indicator + NOAA satellite altimetry.</div><a href="${NASA_SEA}" target="_blank" rel="noopener noreferrer">Open current NASA source ↗</a>`;
  }
  function apply(snapshot){
    if(!snapshot||typeof snapshot!=='object')return;
    const cb=snapshot.coralBleaching||{},sea=snapshot.seaLevelCurrent||{},diag=snapshot.seaLevel||{};
    if(cb.status==='live'&&Number.isFinite(Number(cb.globalReefPixelsExposedPct)))set('phCoralHeat',`${Number(cb.globalReefPixelsExposedPct).toFixed(1)}% reef pixels · rolling 365 days ending ${cb.observationDate} · LIVE DAILY`);else set('phCoralHeat','CURRENT NOAA DAILY VALUE UNAVAILABLE');
    if(sea.status==='live'&&Number.isFinite(Number(sea.measurementMm))){const u=Number.isFinite(Number(sea.uncertaintyMm))?` ± ${Number(sea.uncertaintyMm).toFixed(1)}`:'';set('phSeaLevel',`${Number(sea.measurementMm).toFixed(1)}${u} mm · ${sea.observationLabel} · NASA`);const node=byId('phSeaLevel'),label=node&&node.parentElement&&node.parentElement.querySelector('span');if(label)label.textContent='Global sea level'}
    rewriteCoralHistory(cb);rewriteSeaHistory(sea,diag);relabel2026();removeResearchContext();
    const fresh=byId('phVitalsFreshness');if(fresh&&snapshot.generatedAt)fresh.title=`Authoritative snapshot generated ${snapshot.generatedAt}. Freshest available source data are retained even when their latest official assessment period predates 2026.`;
    window.dispatchEvent(new CustomEvent('dom:current-2026',{detail:snapshot}));
  }
  async function refresh(){try{const r=await fetch(`${SNAP}?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);apply(await r.json())}catch(e){console.warn('D.O.M. 2026 current-source overlay unavailable',e)}}
  const observer=new MutationObserver(()=>{removeResearchContext();relabel2026()});
  function init(){observer.observe(document.body,{childList:true,subtree:true});removeResearchContext();relabel2026();refresh()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('dom:earth-vitals',()=>setTimeout(refresh,0));setInterval(refresh,300000);
})();
