(()=>{
'use strict';
let lastMap=null,lastMaplibre=null;
window.addEventListener('dom:map-ready',e=>{const d=e.detail||{};if(d.map){lastMap=d.map;lastMaplibre=d.maplibre||lastMaplibre}});
const files=[['dom-global-seismic-heartbeat-core.js','seismic-core'],['dom-global-seismic-presence-pulse.js','seismic-presence'],['dom-hazard-interactions.js','hazard-interactions']];
function replay(){if(!lastMap)return;window.dispatchEvent(new CustomEvent('dom:map-ready',{detail:{map:lastMap,maplibre:lastMaplibre}}))}
for(const[path,key]of files){
  if(document.querySelector(`script[data-dom-seismic-boot="${key}"]`))continue;
  const s=document.createElement('script');
  s.src=`./${path}?v=20260914-6`;
  s.defer=true;
  s.dataset.domSeismicBoot=key;
  s.onload=()=>{
    if(key==='seismic-core')window.DOMGlobalSeismicHeartbeatCore?.load?.();
    if(key==='hazard-interactions')window.DOMHazardInteractions?.ensure?.();
    replay();
  };
  document.head.appendChild(s)
}
window.DOMGlobalSeismicHeartbeat=Object.freeze({
  load:()=>window.DOMGlobalSeismicHeartbeatCore?.load?.(),
  state:()=>({bootstrap:true,mapCaptured:!!lastMap,core:window.DOMGlobalSeismicHeartbeatCore?.state?.()||null,presence:window.DOMGlobalSeismicPresencePulse?.state?.()||null,interactions:window.DOMHazardInteractions?.state?.()||null})
});
})();