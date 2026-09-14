(()=>{
'use strict';
let map=null;
function apply(m){
  if(m)map=m;
  if(!map)return;
  try{map.setMaxZoom(18)}catch(_){}
  try{map.setMinZoom(.35)}catch(_){}
}
window.addEventListener('dom:map-ready',e=>apply(e.detail?.map));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')apply()});
window.DOMMapDeepZoom=Object.freeze({apply:()=>apply(),state:()=>({attached:!!map,maxZoom:map?.getMaxZoom?.()??null})});
})();
