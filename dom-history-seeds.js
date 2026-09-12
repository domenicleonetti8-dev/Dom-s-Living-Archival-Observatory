(()=>{
  'use strict';
  const byId=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const official={
    population:'https://www.census.gov/popclock/data/population.php/world',
    temperature:'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
    seaLevel:'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_all_66.csv',
    greenland:'https://science.nasa.gov/climate-change/vital-signs/ice-sheets/',
    antarctica:'https://science.nasa.gov/climate-change/vital-signs/ice-sheets/',
    arcticIce:'https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv',
    antarcticIce:'https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v4.0.csv',
    forest:'https://www.fao.org/newsroom/detail/global-deforestation-slows--but-forests-remain-under-pressure--fao-report-shows/en',
    coral:'https://gcrmn.net/2025-report/',
    bleaching:'https://coralreefwatch.noaa.gov/satellite/research/coral_bleaching_report.php'
  };
  const specs={
    phPopulation:{label:'History + source',source:'U.S. Census Bureau Population Clock',url:official.population,history:'Continuous population estimate; current value is an estimate, not a census count.',method:'Displayed value comes from the source record returned to D.O.M.'},
    phTemperature:{label:'History + source',source:'NASA GISS GISTEMP v4',url:official.temperature,history:'Monthly global temperature-anomaly series.',method:'Anomaly is shown relative to the 1951–1980 GISTEMP baseline.'},
    phSeaLevel:{label:'History + source',source:'NOAA NESDIS satellite altimetry',url:official.seaLevel,history:'Multi-decadal satellite-altimetry time series.',method:'D.O.M. computes and labels its own linear OLS diagnostic; it is not an official NOAA confidence interval.'},
    phGreenland:{label:'History + source',source:'NASA GRACE / GRACE-FO',url:official.greenland,history:'Land-ice mass-change record since 2002.',method:'Displayed rate is a published long-term average, not an instantaneous melt rate.'},
    phAntarctica:{label:'History + source',source:'NASA GRACE / GRACE-FO',url:official.antarctica,history:'Land-ice mass-change record since 2002.',method:'Displayed rate is a published long-term average, not an instantaneous melt rate.'},
    phArcticIce:{label:'History + source',source:'NOAA/NSIDC Sea Ice Index v4',url:official.arcticIce,history:'Daily Arctic sea-ice extent record.',method:'D.O.M. compares the latest day with the same calendar day in the 1981–2010 baseline.'},
    phAntarcticIce:{label:'History + source',source:'NOAA/NSIDC Sea Ice Index v4',url:official.antarcticIce,history:'Daily Antarctic sea-ice extent record.',method:'D.O.M. compares the latest day with the same calendar day in the 1981–2010 baseline.'},
    phDeforestation:{label:'History + source',source:'FAO Global Forest Resources Assessment 2025',url:official.forest,history:'Published global forest assessment covering 2015–2025 for the displayed deforestation rate.',method:'Published reference, not a live sensor feed.'},
    phForestWhere:{label:'History + source',source:'FAO Global Forest Resources Assessment 2025',url:official.forest,history:'Regional forest-loss evidence used for South America context.',method:'Published reference, not a live sensor feed.'},
    phCoralLoss:{label:'History + source',source:'GCRMN Status of Coral Reefs of the World: 2025',url:official.coral,history:'Global hard-coral-cover assessment using historical reference data and observations through 2024.',method:'Annualized loss is a compound-equivalent mathematical transformation, not assumed constant annual mortality.'},
    phCoralWhere:{label:'History + source',source:'GCRMN / regional coral observations',url:official.coral,history:'Long-term Caribbean coral-cover decline context.',method:'Displayed annualization is a mathematical transformation of the published decline period.'},
    phCoralHeat:{label:'History + source',source:'NOAA Coral Reef Watch',url:official.bleaching,history:'Fourth global coral-bleaching-event summary, 2023–2025.',method:'Historical event exposure only; it is not presented as a current 2026 heat-exposure reading.'},
    phCoralBasis:{label:'History + source',source:'GCRMN Status of Coral Reefs of the World: 2025',url:official.coral,history:'Current global coral-cover assessment uses observations through 2024 against its historical reference.',method:'This is the basis for D.O.M.’s displayed global coral-cover decline reference.'}
  };
  function mount(id,spec){
    const value=byId(id);if(!value||value.parentElement?.querySelector(`details[data-history-for="${id}"]`))return;
    const d=document.createElement('details');d.dataset.historyFor=id;d.className='dom-history-seed';
    d.innerHTML=`<summary>${esc(spec.label)}</summary><div class="dom-history-body"><div><b>Record:</b> ${esc(spec.history)}</div><div><b>Method:</b> ${esc(spec.method)}</div><div><b>Authority:</b> ${esc(spec.source)}</div><a href="${esc(spec.url)}" target="_blank" rel="noopener noreferrer">Open exact source ↗</a></div>`;
    value.insertAdjacentElement('afterend',d);
  }
  function init(){
    if(!byId('planetHealthSidebar'))return;
    if(!byId('dom-history-seed-style')){const s=document.createElement('style');s.id='dom-history-seed-style';s.textContent='.dom-history-seed{margin-top:7px;font-size:.67rem}.dom-history-seed summary{cursor:pointer;color:#76f4dd;opacity:.9;list-style:none}.dom-history-seed summary::-webkit-details-marker{display:none}.dom-history-seed summary:before{content:"＋ ";opacity:.8}.dom-history-seed[open] summary:before{content:"− "}.dom-history-body{display:grid;gap:5px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.08);line-height:1.35;color:rgba(238,252,255,.72)}.dom-history-body a{color:#76f4dd;text-decoration:none;font-weight:700;overflow-wrap:anywhere}';document.head.appendChild(s)}
    for(const [id,spec] of Object.entries(specs))mount(id,spec);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
  window.addEventListener('dom:earth-vitals',init);
})();
