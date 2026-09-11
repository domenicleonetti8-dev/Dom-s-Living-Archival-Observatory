(()=>{
  const DIRECT_BROWSER=new Set(['usgs-eq','nasa-eonet','ndbc-stdmet','ndbc-ocean','ndbc-waterlevel','nws-alerts']);
  function render(){
    const host=document.getElementById('allSourceFamilies');
    if(!host||!window.DOMPublicSensorRegistry)return;
    const feeds=DOMPublicSensorRegistry.feeds||[];
    host.innerHTML=feeds.map(f=>{
      const direct=DIRECT_BROWSER.has(f.id);
      const state=direct?'browser adapter path available':'registered; broker/specialized adapter required';
      return `<div class="source-row"><div><strong>${String(f.agency||'')} · ${String(f.name||f.id)}</strong><small>${String(f.domain||'')} · ${String(f.coverage||'')} · ${String(f.cadence||'')}</small></div><strong class="${direct?'ok':'loading'}">${state}</strong></div>`;
    }).join('');
    const n=document.getElementById('registeredFabricCount');
    if(n)n.textContent=`${feeds.length} registered source families are visible here. Registration is metadata; only successful adapters count as live observations.`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
