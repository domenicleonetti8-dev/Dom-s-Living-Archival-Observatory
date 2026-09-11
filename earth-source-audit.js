(()=>{
  const DIRECT_BROWSER=new Set(['usgs-eq','nasa-eonet','nws-alerts']);
  const INVENTORY_ONLY=new Set(['ndbc-stdmet','ndbc-ocean','ndbc-waterlevel']);
  function stateFor(f){
    if(DIRECT_BROWSER.has(f.id))return{label:'ADAPTER PATH',cls:'ok',detail:'browser fetch path exists; current-session success is shown in the live source panel'};
    if(INVENTORY_ONLY.has(f.id))return{label:'INVENTORY ONLY',cls:'loading',detail:'D.O.M. currently loads NDBC station inventory here, not this measurement family'};
    return{label:'REGISTERED',cls:'loading',detail:'metadata only; broker or specialized adapter still required'};
  }
  function render(){
    const host=document.getElementById('allSourceFamilies');
    if(!host||!window.DOMPublicSensorRegistry)return;
    const feeds=DOMPublicSensorRegistry.feeds||[];
    host.innerHTML=feeds.map(f=>{
      const s=stateFor(f);
      return `<div class="source-row"><div><strong>${String(f.agency||'')} · ${String(f.name||f.id)}</strong><small>${String(f.domain||'')} · ${String(f.coverage||'')} · ${String(f.cadence||'')}<br>${s.detail}</small></div><strong class="${s.cls}">${s.label}</strong></div>`;
    }).join('');
    const n=document.getElementById('registeredFabricCount');
    if(n)n.textContent=`${feeds.length} registered source families are visible here. Registration is metadata. ADAPTER PATH means code exists, INVENTORY ONLY means platform locations only, and neither means the measurement feed is live.`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
