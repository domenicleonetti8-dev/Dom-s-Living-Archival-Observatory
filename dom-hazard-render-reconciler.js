(()=>{
'use strict';
const base=new Map(),batches=new Map();
const valid=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Number(a)>=-90&&Number(a)<=90&&Number(b)>=-180&&Number(b)<=180;
const idOf=(e,i=0)=>String(e?.id||e?.sourceId||e?.eventId||`${e?.kind||'event'}:${e?.lat}:${e?.lon}:${i}`);
function batchKey(detail={}){return String(detail.source||detail.adapter||detail.lineageId||'extension');}
function replace(map,rows){map.clear();(Array.isArray(rows)?rows:[]).forEach((e,i)=>{if(e&&valid(e.lat,e.lon))map.set(idOf(e,i),e)});}
function union(){const out=new Map(base);for(const m of batches.values())for(const [id,e] of m)out.set(id,e);return [...out.values()];}
function family(e={}){const k=String(e.kind||'').toLowerCase();if(k==='earthquake')return'earthquake';if(k==='wildfire')return'wildfire';if(k==='tsunami')return'tsunami';return k||'other';}
function renderState(rows){const counts={};for(const e of rows){const f=family(e);counts[f]=(counts[f]||0)+1}let el=document.getElementById('domRenderReconciliationState');if(!el){const a=document.getElementById('domCoordinateIntegrityState')||document.getElementById('sourceState');if(a){el=document.createElement('div');el.id='domRenderReconciliationState';el.className='source-state';a.insertAdjacentElement('afterend',el)}}if(el)el.innerHTML=`<strong>Render reconciliation</strong> · ${rows.length.toLocaleString()} unique renderable hazard/event IDs in unified inventory · earthquakes ${(counts.earthquake||0).toLocaleString()} · wildfires ${(counts.wildfire||0).toLocaleString()} · tsunami ${(counts.tsunami||0).toLocaleString()}<br><span class="tiny">Sensors/stations are excluded from these hazard totals. Authoritative extension records override duplicate base IDs; invalid coordinates never enter the render inventory.</span>`;window.DOMHazardRenderReconciliation={total:rows.length,counts,base:base.size,extensionBatches:[...batches.entries()].map(([source,m])=>({source,count:m.size})),updatedAt:new Date().toISOString()};}
function push(){const rows=union();if(window.DOMLiveGlobeRenderer?.setEvents)DOMLiveGlobeRenderer.setEvents(rows);renderState(rows);}
window.addEventListener('dom:hazard-refresh',ev=>{replace(base,ev.detail?.events);queueMicrotask(push)});
window.addEventListener('dom:hazard-extension',ev=>{const m=new Map();(Array.isArray(ev.detail?.events)?ev.detail.events:[]).forEach((e,i)=>{if(e&&valid(e.lat,e.lon))m.set(idOf(e,i),e)});batches.set(batchKey(ev.detail||{}),m);queueMicrotask(push)});
window.addEventListener('dom:verified-global-events',ev=>{const m=new Map();(Array.isArray(ev.detail?.events)?ev.detail.events:[]).forEach((e,i)=>{if(e&&valid(e.lat,e.lon))m.set(idOf(e,i),e)});batches.set(`verified:${batchKey(ev.detail||{})}`,m);queueMicrotask(push)});
document.addEventListener('DOMContentLoaded',()=>queueMicrotask(push),{once:true});
window.DOMHazardRenderReconciler=Object.freeze({state:()=>window.DOMHazardRenderReconciliation||{},rows:()=>union()});
})();
