(()=>{
'use strict';
let best=null,redispatching=false;
function n(v){v=Number(v);return Number.isFinite(v)?v:0}
function mergeBest(d={}){
  if(d.source==='weather-climate-global-loader'||d.globalOverview||d.globalLoadComplete){
    if(!best||n(d.loaded)>=n(best.loaded))best={...d};
    return;
  }
  const s=window.DOMWeatherClimateGlobalLoader?.state?.();
  if(s&&n(s.indexed)>0){
    const candidate={indexed:n(s.indexed),loaded:n(s.loadedStations),rendered:n(s.loadedStations),loadedTiles:n(s.loadedTiles),totalTiles:n(s.totalTiles),failedTiles:0,exactLocations:true,globalLoadComplete:!!s.done,clustered:false,lazyViewport:false,globalOverview:true,source:'station-summary-arbiter',lastError:s.lastError||null};
    if(!best||n(candidate.loaded)>=n(best.loaded))best=candidate;
  }
}
function paint(){
  if(!best)return;
  const el=document.getElementById('weatherClimateFabricState');
  if(el){
    const indexed=n(best.indexed),loaded=n(best.loaded),tiles=n(best.loadedTiles),total=n(best.totalTiles);
    el.innerHTML=`<strong>Weather + climate station fabric</strong> · ${loaded.toLocaleString()} rendered globally / ${indexed.toLocaleString()} indexed · ${tiles}/${total} tiles${best.globalLoadComplete?' · COMPLETE':''}<br><span class="tiny">The 40,096-station global layer is independent from the additional seismic/marine/water/current overlays. Detailed station metadata remains interactive while zooming.</span>`;
  }
}
function ensureGlobalRealtime(){if(window.DOMGlobalRealtimeExtension||document.querySelector('script[data-dom-global-realtime]'))return;const s=document.createElement('script');s.src='./dom-global-realtime-extension.js?v=20260913-2204';s.defer=true;s.dataset.domGlobalRealtime='1';document.head.appendChild(s)}
window.addEventListener('dom:station-fabric-summary',e=>{
  const d=e.detail||{};
  if(d.__arbiter)return;
  mergeBest(d);paint();ensureGlobalRealtime();
  if(!best||redispatching)return;
  if(n(d.loaded)>=n(best.loaded)&&d.globalOverview)return;
  redispatching=true;
  queueMicrotask(()=>{
    window.dispatchEvent(new CustomEvent('dom:station-fabric-summary',{detail:{...best,__arbiter:true,source:'station-summary-arbiter'}}));
    paint();redispatching=false;
  });
});
document.addEventListener('DOMContentLoaded',ensureGlobalRealtime,{once:true});
setInterval(()=>{mergeBest({});paint()},1500);
})();