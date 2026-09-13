(()=>{
'use strict';
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
let vitals=null,current=null,last=null;
const part=(value,weight,quality,freshness,coverage,source,method)=>({value:clamp(value),weight,quality,freshness,coverage,source,method});
const BENCHMARKS=Object.freeze({
  climateAnomalyC:2,
  seaLevelRiseMm:200,
  seaLevelTrendMmPerYear:6,
  deforestationPctForestAreaPerYear:.5,
  coralRelativeDeclinePct:20,
  coralBleachingExposurePct:50,
  seaIceZ:3
});
function build(){
  if(!vitals)return null;
  const t=vitals.temperature||{},sl=vitals.seaLevel||{},f=vitals.forest||{},c=vitals.coral||{},cr=vitals.cryosphere||{},si=cr.seaIce||{},ar=si.arctic||{},an=si.antarctic||{};
  const seaNow=current&&current.seaLevelCurrent||{};
  const coralNow=current&&current.coralBleaching||{};
  const input={climate:[],ocean:[],hydrology:[],forests:[],reefs:[],cryosphere:[]};
  if(finite(t.anomalyC))input.climate.push(part(Math.abs(Number(t.anomalyC))/BENCHMARKS.climateAnomalyC,1,.96,1,1,t.source||'NASA GISTEMP v4','Absolute monthly temperature anomaly divided by the declared 2 °C diagnostic saturation benchmark; baseline remains the source baseline, not preindustrial.'));
  if(finite(seaNow.measurementMm))input.ocean.push(part(Math.abs(Number(seaNow.measurementMm))/BENCHMARKS.seaLevelRiseMm,.55,.98,1,1,seaNow.source||'NASA Earth Indicator — Sea Level','Observed global mean sea-level change since the 1993 satellite reference divided by the declared 200 mm diagnostic saturation benchmark.'));
  if(finite(sl.trendMmPerYear))input.ocean.push(part(Math.abs(Number(sl.trendMmPerYear))/BENCHMARKS.seaLevelTrendMmPerYear,.45,.88,.82,1,sl.source||'NOAA satellite altimetry','D.O.M. long-record OLS trend diagnostic divided by the declared 6 mm/yr diagnostic saturation benchmark; not an official NOAA confidence interval.'));
  if(finite(f.deforestationPctForestAreaPerYear))input.forests.push(part(Number(f.deforestationPctForestAreaPerYear)/BENCHMARKS.deforestationPctForestAreaPerYear,1,.93,.82,1,f.source||'FAO FRA 2025','Published global deforestation rate divided by the declared 0.5% of forest area per year diagnostic saturation benchmark.'));
  if(finite(c.globalCoralLossPct))input.reefs.push(part(Number(c.globalCoralLossPct)/BENCHMARKS.coralRelativeDeclinePct,.75,.93,.8,1,c.source||'GCRMN','Relative hard-coral-cover decline versus the report reference mean divided by the declared 20% diagnostic saturation benchmark.'));
  if(finite(coralNow.globalReefPixelsExposedPct))input.reefs.push(part(Number(coralNow.globalReefPixelsExposedPct)/BENCHMARKS.coralBleachingExposurePct,.25,.98,1,1,coralNow.source||'NOAA Coral Reef Watch','Rolling 365-day fraction of reef-containing pixels reaching Bleaching Alert Level 1+ divided by the declared 50% diagnostic saturation benchmark.'));
  const zs=[ar,an].map(x=>finite(x&&x.zScoreVsCalendarDayClimatology)?Math.abs(Number(x.zScoreVsCalendarDayClimatology)):null).filter(finite);
  if(zs.length)input.cryosphere.push(part((zs.reduce((a,b)=>a+b,0)/zs.length)/BENCHMARKS.seaIceZ,1,.95,1,zs.length===2?1:.5,'NOAA/NSIDC Sea Ice Index v4','Mean absolute same-calendar-day sea-ice z-score across available hemispheres divided by 3 standard deviations. Daily anomaly is not treated as a long-term trend.'));
  return input;
}
function emit(){
  const input=build();if(!input||!window.DOMPlanetHealth)return null;
  const state=DOMPlanetHealth.state(input);
  last={input,state,benchmarks:BENCHMARKS,waterStatus:'awaiting-qualified-global-hydrology-indicator',generatedAt:new Date().toISOString()};
  window.dispatchEvent(new CustomEvent('dom:planet-health-input',{detail:{input,evaluation:last}}));
  window.dispatchEvent(new CustomEvent('dom:earth-health-evaluation',{detail:last}));
  return last;
}
window.addEventListener('dom:earth-vitals',ev=>{vitals=ev.detail||null;emit()});
window.addEventListener('dom:current-2026',ev=>{current=ev.detail||null;emit()});
window.DOMEarthHealthEvaluator=Object.freeze({evaluate:(v,c)=>{vitals=v||vitals;current=c||current;return emit()},state:()=>last,benchmarks:BENCHMARKS});
if(window.DOMEarthVitals){try{vitals=DOMEarthVitals.state();emit()}catch(_){}}
})();
