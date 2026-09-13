(()=>{
'use strict';
function mount(){
  if(document.getElementById('domScienceMethods'))return;
  const anchor=document.getElementById('stationFabricState')||document.getElementById('sourceState');
  if(!anchor)return;
  const d=document.createElement('details');d.id='domScienceMethods';d.className='source-state';
  d.style.cssText='margin-top:8px;padding:9px 11px;border:1px solid rgba(101,223,255,.16);border-radius:12px;background:rgba(3,18,24,.45)';
  d.innerHTML=`<summary style="cursor:pointer;font-weight:760">Math · science · physics method</summary>
  <div style="margin-top:8px;line-height:1.48">
  <b>Observation truth:</b> D.O.M. preserves source-published coordinates, timestamps, units, instrument/network identity and observation cadence. It does not invent missing measurements.<br>
  <b>Location physics:</b> geographic positions are rendered as WGS84-compatible latitude/longitude. Coordinate uncertainty is bounded from source precision; independent station proximity uses great-circle/Haversine distance and never moves the authoritative point.<br>
  <b>Time-series math:</b> current values remain separate from historical baselines. Analysis can include anomalies, sample variance, covariance/correlation, autocorrelation-adjusted effective sample size, weighted regression, descriptive acceleration and uncertainty propagation.<br>
  <b>Earth-system aggregation:</b> domain evidence is quality/freshness/coverage weighted. Correlated domains reduce effective independent information through a covariance/correlation model rather than being double-counted as independent evidence.<br>
  <b>Forecast discipline:</b> observations end at the latest measured time. Future values are projections only. Statistical trend windows include uncertainty and autocorrelation inflation; physics-based authoritative scenario/model ensembles supersede simple extrapolation when available.<br>
  <b>Precision rule:</b> D.O.M. reports day/month/year precision only when the underlying sampling, uncertainty and model skill support it; otherwise the result remains a wider interval or unresolved.
  </div>`;
  anchor.insertAdjacentElement('afterend',d);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
