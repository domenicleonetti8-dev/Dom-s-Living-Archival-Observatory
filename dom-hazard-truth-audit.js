(()=>{
'use strict';
const seen=new Map();
let lastSource='waiting',lastAt=null;
const norm=s=>String(s||'').toLowerCase();
function classOf(e={}){
  const kind=norm(e.kind),src=norm(`${e.source||''} ${e.agency||''} ${e.sourceType||''}`),title=norm(e.title);
  if(kind==='wildfire'){
    if(src.includes('cwfis')||src.includes('natural resources canada'))return{label:'CONFIRMED / OFFICIAL FIRE REGISTRY',tier:'confirmed'};
    if(src.includes('eonet'))return{label:'CONFIRMED CATALOGED WILDFIRE EVENT',tier:'confirmed'};
    if(src.includes('firms')||src.includes('viirs')||src.includes('thermal'))return{label:'SATELLITE THERMAL DETECTION — NOT YET A CONFIRMED WILDFIRE',tier:'detection'};
    if(src.includes('nws')||title.includes('fire weather'))return{label:'FIRE-WEATHER PRODUCT — NOT A CONFIRMED FIRE',tier:'warning'};
    return{label:'WILDFIRE SOURCE CLASSIFICATION UNRESOLVED',tier:'unknown'};
  }
  if(kind==='earthquake')return{label:'CATALOGED EARTHQUAKE',tier:'confirmed'};
  if(kind.includes('sea / lake ice')||title.includes('iceberg'))return{label:'TRACKED ICE / ICEBERG EVENT — OPEN STATUS DOES NOT IMPLY IMMINENT BREAKUP',tier:'tracked'};
  if(e.officialAlert)return{label:'OFFICIAL WARNING / ADVISORY PRODUCT',tier:'warning'};
  return{label:'SOURCE-TRACKED HAZARD EVENT',tier:'tracked'};
}
function ingest(detail={}){
  const rows=Array.isArray(detail.events)?detail.events:[];
  for(const e of rows){if(!e||!e.id)continue;e.truthClass=classOf(e);seen.set(String(e.id),e)}
  if(detail.source)lastSource=String(detail.source);lastAt=new Date();render();
}
function render(){
  let el=document.getElementById('domHazardTruthAudit');
  if(!el){const a=document.getElementById('domCoordinateIntegrityState')||document.getElementById('sourceState');if(!a)return;el=document.createElement('div');el.id='domHazardTruthAudit';el.className='source-state';a.insertAdjacentElement('afterend',el)}
  const rows=[...seen.values()],fires=rows.filter(e=>norm(e.kind)==='wildfire'),confirmed=fires.filter(e=>e.truthClass?.tier==='confirmed'),detections=fires.filter(e=>e.truthClass?.tier==='detection'),warnings=fires.filter(e=>e.truthClass?.tier==='warning'),ice=rows.filter(e=>norm(e.kind).includes('sea / lake ice')||norm(e.title).includes('iceberg'));
  el.innerHTML=`<strong>Global hazard truth audit</strong> · ${rows.length.toLocaleString()} source-bound records observed in this session · wildfire: ${confirmed.length.toLocaleString()} confirmed/cataloged${detections.length?` · ${detections.length.toLocaleString()} satellite detections kept separate`:''}${warnings.length?` · ${warnings.length.toLocaleString()} fire-weather products kept separate`:''} · tracked ice/icebergs ${ice.length.toLocaleString()}<br><span class="tiny">D.O.M. does not count a thermal anomaly or fire-weather warning as a confirmed wildfire. EONET open ice/iceberg records mean the event is being tracked; open status alone does not mean an iceberg is about to calve or break apart. Last event source: ${lastSource}${lastAt?` · ${lastAt.toLocaleTimeString()}`:''}.</span>`;
}
for(const n of ['dom:hazard-extension','dom:hazard-refresh','dom:verified-global-events'])window.addEventListener(n,e=>ingest(e.detail||{}));
document.addEventListener('DOMContentLoaded',render,{once:true});
window.DOMHazardTruthAudit=Object.freeze({classify:classOf,state:()=>({records:seen.size,lastSource,lastAt:lastAt?.toISOString()||null})});
})();
