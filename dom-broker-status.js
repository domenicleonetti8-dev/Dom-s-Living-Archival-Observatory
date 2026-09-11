const DOMBrokerStatus=(()=>{
  let broker={configured:false,connected:false,error:null,records:0,baseUrl:null,registeredSources:0,activeAdapters:0,activeSources:0,staleSources:0,errorSources:0,notIngestingSources:0},organism={recordCount:0,sensorCount:0,lineages:0,agencies:0},visitor={configured:false,connected:false,totalVisitors:null,liveNow:null,error:null,lastUpdate:null,lastVerifiedAt:null,status:'unconfigured'},visitorUnsubscribe=null;
  const set=(id,text)=>{const n=document.getElementById(id);if(n)n.textContent=text};
  function visitorText(){if(!visitor.configured)return visitor.lastVerifiedAt?'Service not connected · last verified values shown':'Service not connected';if(visitor.connected&&visitor.lastUpdate)return'Updated '+new Date(visitor.lastUpdate).toLocaleTimeString();if(visitor.status==='stale'&&visitor.lastVerifiedAt)return'Temporarily unavailable · last verified '+new Date(visitor.lastVerifiedAt).toLocaleTimeString();if(visitor.error)return'Visitor service unavailable';return'Connecting…'}
  function render(){
    const configured=broker.configured===true,connected=broker.connected===true;
    const counts=Number(broker.registeredSources)>0?` · ${Number(broker.activeSources)||0}/${Number(broker.registeredSources)||0} source families active · ${Number(broker.staleSources)||0} stale · ${Number(broker.errorSources)||0} error · ${Number(broker.notIngestingSources)||0} registered/not ingesting`:'';
    const brokerText=!configured?'Persistent broker not configured · browser feeds only':connected?`Persistent broker connected · ${Number(broker.records)||0} records in latest broker batch${counts}`:`Persistent broker configured but disconnected${broker.error?` · ${broker.error}`:''}${counts}`;
    set('brokerState',brokerText);
    set('organismState',`${Number(organism.recordCount)||0} canonical observations · ${Number(organism.sensorCount)||0} sensor states · ${Number(organism.lineages)||0} lineages · ${Number(organism.agencies)||0} agencies`);
    set('domTotalVisitors',visitor.totalVisitors==null?'—':Number(visitor.totalVisitors).toLocaleString());
    set('domLiveVisitors',visitor.liveNow==null?'—':Number(visitor.liveNow).toLocaleString());
    set('domVisitorState',visitorText());
  }
  function mountVisitor(){
    const shell=document.querySelector('.hazard-shell')||document.querySelector('main')||document.body;if(!shell)return false;
    let box=document.getElementById('domVisitorCounter');
    if(!box){box=document.createElement('section');box.id='domVisitorCounter';box.setAttribute('aria-label','Anonymous public visitor activity');box.style.cssText='margin:26px 0 12px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.10);border-bottom:1px solid rgba(255,255,255,.06);opacity:.76';box.innerHTML='<div class="tiny" style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;text-align:center"><span>Anonymous visitors <strong id="domTotalVisitors" style="display:inline;font-size:.95rem">—</strong></span><span>Live now <strong id="domLiveVisitors" style="display:inline;font-size:.95rem">—</strong></span><span id="domVisitorState" aria-live="polite">Waiting for visitor service…</span></div><div class="tiny" style="margin-top:5px;text-align:center;opacity:.72">Privacy-preserving browser counts · no names, location history or fingerprinting.</div>'}
    const footer=shell.querySelector('footer')||document.querySelector('footer');if(footer)footer.insertAdjacentElement('beforebegin',box);else shell.appendChild(box);
    render();return true
  }
  function mount(){const anchor=document.getElementById('sourceState');if(anchor){let box=document.getElementById('domNetworkTruth');if(!box){box=document.createElement('div');box.id='domNetworkTruth';box.className='evidence-block';box.innerHTML='<strong>D.O.M. network truth</strong><div id="brokerState" class="tiny"></div><div id="organismState" class="tiny"></div><div class="tiny">Registered source families are not counted as live until an adapter actually ingests them. Stale feeds are separated from active feeds. Feed health is not Earth health.</div>';anchor.insertAdjacentElement('afterend',box)}}mountVisitor();render();return true}
  function startVisitor(){if(visitorUnsubscribe||typeof DOMVisitorClient==='undefined')return;if(typeof DOMVisitorClient.start==='function')visitorUnsubscribe=DOMVisitorClient.start(s=>{visitor={...visitor,...(s||{})};render()})}
  function boot(){mount();startVisitor()}
  window.addEventListener('dom:broker-state',ev=>{broker={...broker,...(ev.detail||{})};mount()});
  window.addEventListener('dom:organism-state',ev=>{organism={...organism,...(ev.detail||{})};mount()});
  window.addEventListener('pagehide',()=>{if(visitorUnsubscribe)visitorUnsubscribe()},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
  return{mount,state:()=>({broker:{...broker},organism:{...organism},visitor:{...visitor}})};
})();
