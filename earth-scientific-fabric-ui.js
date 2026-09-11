(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    const host=document.getElementById('scientificInstrumentFabric');
    const summaryNode=document.getElementById('scientificInstrumentSummary');
    const fabric=window.DOMScientificInstrumentFabric;
    if(!host||!summaryNode||!fabric)return;
    const grouped=fabric.byField();
    const covered=Object.entries(grouped).filter(([,rows])=>rows.length>0).length;
    summaryNode.textContent=`${fabric.NETWORKS.length} scientific network families across ${covered}/${fabric.FIELDS.length} target fields are registered for ingestion. This is a target fabric, not a claim that every instrument is live.`;
    host.innerHTML=fabric.FIELDS.map(field=>{
      const rows=grouped[field]||[];
      return `<details class="science-field"><summary><strong>${esc(field.replaceAll('-',' '))}</strong><span>${rows.length} network${rows.length===1?'':'s'}</span></summary>${rows.length?rows.map(n=>`<div class="source-row"><div><strong>${esc(n.agency)} · ${esc(n.name)}</strong><small>${esc(n.platform)} · ${esc(n.scope)} · ${esc(n.access)}</small></div><a target="_blank" rel="noopener noreferrer" href="${esc(n.url)}">source ↗</a></div>`).join(''):'<p class="earth-truth">No public source family registered yet for this target field.</p>'}</details>`;
    }).join('');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
