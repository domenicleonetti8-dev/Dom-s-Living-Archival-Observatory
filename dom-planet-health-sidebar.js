(()=>{
  const root=document.getElementById('planetHealthSidebar');if(!root)return;
  const fmt=x=>x==null?'UNKNOWN':`${Math.round(x*100)}%`;
  const families=window.DOMPublicSensorRegistry?DOMPublicSensorRegistry.summary():null;
  const initial=window.DOMPlanetHealth?DOMPlanetHealth.state({}):{health:null,stress:null,coverage:0,domains:{}};
  root.innerHTML=`<div class="ph-head"><div><span class="ph-kicker">LIVE PLANETARY HEALTH</span><strong>D.O.M. Earth Health Gauge</strong></div><span id="phCoverage">coverage ${fmt(initial.coverage)}</span></div>
  <div class="ph-ring" id="phRing"><div><strong id="phHealth">${fmt(initial.health)}</strong><span>observational health</span></div></div>
  <div class="ph-grid">
    <div><span>Climate</span><strong id="phClimate">UNKNOWN</strong></div><div><span>Ocean</span><strong id="phOcean">UNKNOWN</strong></div>
    <div><span>Water</span><strong id="phWater">UNKNOWN</strong></div><div><span>Forests</span><strong id="phForests">UNKNOWN</strong></div>
    <div><span>Coral reefs</span><strong id="phReefs">UNKNOWN</strong></div><div><span>Cryosphere</span><strong id="phIce">UNKNOWN</strong></div>
  </div>
  <div class="ph-section"><strong>Future outlook</strong><p id="phForecast">No deterministic month/year claim without a qualified scenario ensemble or statistical threshold crossing.</p></div>
  <div class="ph-section"><strong>Sea-level outlook</strong><p>Regional projections must come from NASA/IPCC AR6 or equivalent scenario datasets and include a range, scenario, baseline and uncertainty interval.</p></div>
  <div class="ph-section"><strong>Network</strong><p>${families?`${families.families} registered source families · ${families.global} with global coverage metadata`:'sensor registry loading'}</p></div>
  <div class="ph-truth">UNKNOWN means D.O.M. does not yet have enough qualified live measurements. Missing data is never treated as safe.</div>`;
  window.DOMPlanetHealthSidebar={update(input={},forecast=null){if(!window.DOMPlanetHealth)return;const s=DOMPlanetHealth.state(input);document.getElementById('phHealth').textContent=fmt(s.health);document.getElementById('phCoverage').textContent=`coverage ${fmt(s.coverage)}`;const map={climate:'phClimate',ocean:'phOcean',hydrology:'phWater',forests:'phForests',reefs:'phReefs',cryosphere:'phIce'};for(const [k,id] of Object.entries(map)){const d=s.domains[k];document.getElementById(id).textContent=d&&d.value!=null?`${Math.round((1-d.value)*100)}% health`:'UNKNOWN';}if(forecast){const p=DOMPlanetHealth.projectionLabel(forecast);document.getElementById('phForecast').textContent=p.status==='PROJECTED WINDOW'?`Projected threshold window: ${p.lower.month}/${p.lower.year} – ${p.upper.month}/${p.upper.year}; central estimate ${p.estimate.month}/${p.estimate.year}. Scenario/trend estimate, not deterministic prediction.`:'Forecast unresolved.';}return s;}};
})();
