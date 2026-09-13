(()=>{
  'use strict';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=u=>{try{const x=new URL(String(u||''),location.href);return /^https?:$/.test(x.protocol)?x.href:'#'}catch(_){return'#'}};
  function base(){const raw=window.DOMSRuntimeConfig&&window.DOMSRuntimeConfig.brokerUrl;try{const u=new URL(String(raw||''),location.href);return /^https?:$/.test(u.protocol)?u.href.replace(/\/$/,''):''}catch(_){return''}}
  function activeScope(){return document.querySelector('#scopes button.active')?.dataset.scope||'all'}
  function card(r){const meta=[r.year,r.doi,Number(r.confirmations)>1?`${r.confirmations} sources confirm`:null,r.openAccess===true?'open access':null].filter(Boolean).join(' · ');return `<a target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(r.url))}"><small>${esc(r.source)} · ${esc(r.type||'RESULT')}</small><h3>${esc(r.title||'Untitled')}</h3>${meta?`<small>${esc(meta)}</small>`:''}${r.detail?`<p>${esc(String(r.detail).slice(0,320))}</p>`:''}<span>Open original →</span></a>`}
  function handoff(h){return `<a target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(h.url))}"><small>${esc(String(h.category||'source').toUpperCase())} · QUERY HANDOFF</small><h3>${esc(h.source)}</h3><p>D.O.M. carries this exact query to the authoritative source because this source is not ingested through a public server-side API in the current federation.</p><span>Search source →</span></a>`}
  async function federatedSearch(q){
    q=String(q||'').trim();const b=base();if(!q||!b)return false;
    const out=document.querySelector('#results'),status=document.querySelector('#intent');
    if(status)status.textContent='D.O.M. server federation · searching public machine-readable sources in parallel…';
    if(out)out.innerHTML='<article><small>D.O.M. FEDERATION</small><h3>Searching connected source systems…</h3><p>Server-side adapters are querying lawful public APIs, normalizing records, deduplicating by DOI/title and preserving original-source links.</p></article>';
    try{
      const c=new AbortController(),t=setTimeout(()=>c.abort(),18000);
      const r=await fetch(`${b}/v1/search?q=${encodeURIComponent(q)}&scope=${encodeURIComponent(activeScope())}`,{headers:{Accept:'application/json'},cache:'no-store',signal:c.signal});clearTimeout(t);
      if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
      const d=await r.json();if(!d||d.schema!=='dom.search.federation.v1'||!Array.isArray(d.results))throw new Error('invalid federation response');
      const responded=(d.sources||[]).filter(x=>x.state==='responded').length,unavailable=(d.sources||[]).filter(x=>x.state!=='responded').length,confirmed=d.results.filter(x=>Number(x.confirmations)>1).length;
      if(status)status.textContent=`D.O.M. federation · ${d.results.length} ranked records · ${confirmed} cross-source confirmations · ${responded} server connectors responded${unavailable?` · ${unavailable} unavailable`:''} · ${(d.handoffs||[]).length} authoritative query handoffs.`;
      if(out){const results=d.results.length?`<div style="grid-column:1/-1"><p class="eyebrow">RANKED FEDERATED RESULTS</p><p>Results came from D.O.M.'s server-side and browser-safe public source fabric. Records are normalized, deduplicated and linked back to their original source.</p></div>${d.results.map(card).join('')}`:'<article><h3>No merged API records returned</h3><p>Authoritative source searches remain available below with the same query preloaded.</p></article>';const handoffs=(d.handoffs||[]).length?`<div style="grid-column:1/-1"><p class="eyebrow">AUTHORITATIVE SOURCE HANDOFFS</p><p>These sources remain part of the same search request, but D.O.M. does not scrape their HTML or bypass credentials/access controls.</p></div>${d.handoffs.map(handoff).join('')}`:'';out.innerHTML=results+handoffs;}
      window.dispatchEvent(new CustomEvent('dom:federated-search',{detail:d}));return true;
    }catch(err){
      if(status)status.textContent='D.O.M. server federation unavailable · continuing with browser-safe federation.';
      return false;
    }
  }
  function install(){const form=document.querySelector('#searchForm'),q=document.querySelector('#q');if(!form||!q)return;form.addEventListener('submit',async e=>{if(!base())return;e.preventDefault();e.stopImmediatePropagation();const ok=await federatedSearch(q.value);if(!ok&&typeof window.searchAll==='function')window.searchAll(q.value)},true);document.querySelectorAll('#scopes button').forEach(btn=>btn.addEventListener('click',()=>{const text=q.value.trim();if(text&&base())setTimeout(()=>federatedSearch(text),0)},true));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.DOMFederatedSearch=Object.freeze({search:federatedSearch,brokerBase:base});
})();
