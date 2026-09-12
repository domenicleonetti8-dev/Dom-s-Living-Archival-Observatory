(()=>{
  const root=document.getElementById('planetHealthSidebar');if(!root)return;
  const pct=x=>x==null||!Number.isFinite(Number(x))?'UNKNOWN':`${Math.round(Math.max(0,Math.min(1,Number(x)))*100)}%`;
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const families=window.DOMPublicSensorRegistry?DOMPublicSensorRegistry.summary():null;
  let healthInputSeen=false;
  root.innerHTML=`<div class="ph-head"><div><span class="ph-kicker">PLANETARY HEALTH · QUALIFIED OBSERVATIONS</span><strong>D.O.M. Earth Health Gauge</strong></div><span id="phCoverage">health-data coverage NOT ASSESSED</span></div>
  <div class="ph-ring" id="phRing"><div><strong id="phHealth">UNKNOWN</strong><span>observational health</span></div></div>
  <div class="ph-grid"><div><span>Climate</span><strong id="phClimate">UNASSESSED</strong></div><div><span>Ocean</span><strong id="phOcean">UNASSESSED</strong></div><div><span>Water</span><strong id="phWater">UNASSESSED</strong></div><div><span>Forests</span><strong id="phForests">UNASSESSED</strong></div><div><span>Coral reefs</span><strong id="phReefs">UNASSESSED</strong></div><div><span>Cryosphere</span><strong id="phIce">UNASSESSED</strong></div></div>
  <div class="ph-section"><strong>Earth vital signs</strong><div class="ph-grid" style="margin-top:8px"><div><span>Humans</span><strong id="phPopulation">LOADING</strong></div><div><span>Global temperature anomaly</span><strong id="phTemperature">LOADING</strong></div><div><span>Sea-level trend</span><strong id="phSeaLevel">LOADING</strong></div><div><span>D.O.M. fetch</span><strong id="phVitalsFreshness">WAITING</strong></div></div><p id="phVitalsSource">Polling authoritative sources directly, with same-origin server-fetched snapshots only when browser cross-origin access fails. No numeric fallback constants.</p></div>
  <div class="ph-section"><strong>Forest loss · PUBLISHED REFERENCE</strong><div class="ph-grid" style="margin-top:8px"><div><span>Global deforestation</span><strong id="phDeforestation">LOADING</strong></div><div><span>South America</span><strong id="phForestWhere">LOADING</strong></div></div><p id="phForestSource">FAO Global Forest Resources Assessment 2025 · not a live sensor feed.</p></div>
  <div class="ph-section"><strong>Coral reef decline · PUBLISHED REFERENCE</strong><div class="ph-grid" style="margin-top:8px"><div><span>Global annualized loss</span><strong id="phCoralLoss">LOADING</strong></div><div><span>Caribbean annualized loss</span><strong id="phCoralWhere">LOADING</strong></div><div><span>Bleaching heat exposure</span><strong id="phCoralHeat">LOADING</strong></div><div><span>Global cover-loss basis</span><strong id="phCoralBasis">LOADING</strong></div></div><p id="phCoralSource">Published observational summaries; not live reef mortality.</p></div>
  <div class="ph-section"><strong>Live network health</strong><p id="phNetworkLive">Waiting for first hazard-network refresh…</p></div>
  <div class="ph-section"><strong>Runtime hardening</strong><p id="phAudit">Audit pending…</p></div>
  <div class="ph-section"><strong>Future outlook</strong><p id="phForecast">No deterministic month/year claim without a qualified scenario ensemble or statistical threshold crossing.</p></div>
  <div class="ph-section"><strong>Sea-level outlook</strong><p>Regional projections must include source dataset, scenario, baseline, location, central estimate and uncertainty interval. A global trend is not a local flood prediction.</p></div>
  <div class="ph-section"><strong>Registered network fabric</strong><p>${families?`${families.families} registered source families · ${families.global} with global coverage metadata`:'sensor registry unavailable'}</p></div>
  <div class="ph-truth">D.O.M. does not manufacture a planetary-health score from feed uptime, station counts or unrelated reference statistics. UNASSESSED means no qualified health-domain input has been delivered. UNKNOWN means a qualified calculation ran but evidence was insufficient. Population is demographic context, not health. Source observation/publication time and D.O.M. fetch time remain separate.</div>`;
  const set=(id,text)=>{const n=document.getElementById(id);if(n)n.textContent=text};
  const transport=x=>x?.transport==='direct-browser'?'LIVE DIRECT':x?.transport==='same-origin-authoritative-snapshot'?'LIVE SNAPSHOT':x?.live?'LIVE':'UNAVAILABLE';
  function update(input={},forecast=null){
    if(!window.DOMPlanetHealth)return null;
    healthInputSeen=true;
    const s=DOMPlanetHealth.state(input);set('phHealth',pct(s.health));set('phCoverage',`health-data coverage ${pct(s.coverage)}`);
    const map={climate:'phClimate',ocean:'phOcean',hydrology:'phWater',forests:'phForests',reefs:'phReefs',cryosphere:'phIce'};
    for(const [k,id] of Object.entries(map)){const d=s.domains[k];set(id,d&&d.value!=null?`${Math.round((1-d.value)*100)}% health`:'UNKNOWN')}
    if(forecast){const p=DOMPlanetHealth.projectionLabel(forecast);set('phForecast',p.status==='PROJECTED WINDOW'?`Projected threshold window: ${p.lower.month}/${p.lower.year} – ${p.upper.month}/${p.upper.year}; central estimate ${p.estimate.month}/${p.estimate.year}. Scenario/trend estimate, not deterministic prediction.`:'Forecast unresolved.')}
    return s;
  }
  window.addEventListener('dom:earth-vitals',ev=>{
    const d=ev.detail||{},p=d.population||{},t=d.temperature||{},sl=d.seaLevel||{},f=d.forest||{},c=d.coral||{},sa=f.southAmerica||{},cb=c.caribbean||{},bh=c.bleachingExposure||{};
    set('phPopulation',finite(p.value)?`${Math.round(Number(p.value)).toLocaleString()}${p.estimate?' est.':''}${p.date?` · ${p.date}`:''} · ${transport(p)}`:'UNAVAILABLE');
    set('phTemperature',finite(t.anomalyC)?`${Number(t.anomalyC)>=0?'+':''}${Number(t.anomalyC).toFixed(2)} °C · ${t.month}/${t.year} · ${transport(t)}`:'UNAVAILABLE');
    if(finite(sl.trendMmPerYear)){const u=finite(sl.uncertaintyMmPerYear)?` ± ${Number(sl.uncertaintyMmPerYear).toFixed(1)}`:'';set('phSeaLevel',`${Number(sl.trendMmPerYear).toFixed(1)}${u} mm/yr · ${transport(sl)}`)}else set('phSeaLevel','UNAVAILABLE');
    set('phVitalsFreshness',d.updatedAt?new Date(d.updatedAt).toLocaleTimeString():'WAITING');
    set('phVitalsSource','Population: U.S. Census Bureau Population Clock · temperature: NASA GISS GISTEMP v4 · sea level: NOAA NESDIS satellite altimetry. Values display only after authoritative parsing succeeds; browser failures may use a same-origin snapshot generated from those same sources.');
    set('phDeforestation',finite(f.deforestationPctForestAreaPerYear)?`${Number(f.deforestationPctForestAreaPerYear).toFixed(3)}%/yr · ${Number(f.deforestationMillionHaPerYear).toFixed(1)}M ha/yr · REF`:'UNAVAILABLE');
    set('phForestWhere',finite(sa.annualLossPctForestArea)?`${Number(sa.annualLossPctForestArea).toFixed(3)}%/yr · ${Number(sa.annualLossMillionHa).toFixed(2)}M ha/yr · REF`:'UNAVAILABLE');
    set('phForestSource',`${f.source||'FAO FRA 2025'} · ${f.period||''}. Published reference period, not a live sensor reading. Percentages are computed from the source-reported area quantities shown by D.O.M.`);
    set('phCoralLoss',finite(c.annualizedLossPct)?`${Number(c.annualizedLossPct).toFixed(3)}%/yr compound-equivalent · REF`:'UNAVAILABLE');
    set('phCoralWhere',finite(cb.annualizedLossPct)?`${Number(cb.annualizedLossPct).toFixed(3)}%/yr compound-equivalent · Caribbean · REF`:'UNAVAILABLE');
    set('phCoralHeat',finite(bh.reefAreaExposedPct)?`${Number(bh.reefAreaExposedPct).toFixed(1)}% reef area · ${bh.period} · REF`:'UNAVAILABLE');
    set('phCoralBasis',finite(c.globalCoralLossPct)?`${Number(c.globalCoralLossPct).toFixed(1)}% lost · ${c.period} · REF`:'UNAVAILABLE');
    set('phCoralSource','Global: GCRMN/UNEP · Caribbean: GCRMN · heat stress: NOAA Coral Reef Watch. Annualized loss uses compound-equivalent mathematics; bleaching heat exposure is not mortality.');
  });
  window.addEventListener('dom:planet-health-input',ev=>{const d=ev.detail||{};update(d.input||{},d.forecast||null)});
  window.addEventListener('dom:hazard-refresh',ev=>{const d=ev.detail||{},ok=Number(d.ok)||0,total=Number(d.total)||0,ratio=total?ok/total:0;set('phNetworkLive',`${ok}/${total||0} active hazard feeds responded · ${Number(d.eventCount)||0} normalized records · ${Number(d.elapsedMs)||0} ms · feed availability ${Math.round(ratio*100)}%. Network availability is not Earth health.`)});
  window.addEventListener('dom:hardening-audit',ev=>{const d=ev.detail||{};if(d.phase==='running'){set('phAudit',`RUNNING · ${Number(d.checks)||0} invariant checks completed · ${Number(d.failures)||0} failures so far`);return}set('phAudit',d.ok?`PASS · ${d.checks} invariant checks · ${d.failures||0} failures`:`ATTENTION · ${d.checks||0} checks · ${d.failures||0} failures${d.firstFailure?` · ${d.firstFailure}`:''}`)});
  window.DOMPlanetHealthSidebar={update,state:()=>({healthInputSeen})};
  if(!window.DOMEarthVitals&&!document.querySelector('script[data-dom-earth-vitals]')){const s=document.createElement('script');s.src='./dom-earth-vitals.js?v=20260912-1';s.defer=true;s.dataset.domEarthVitals='1';document.body.appendChild(s)}
})();
