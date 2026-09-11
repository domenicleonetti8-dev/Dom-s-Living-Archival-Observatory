const DOMBrokerStatus=(()=>{
  let broker={configured:false,connected:false,error:null,records:0,baseUrl:null,registeredSources:0,activeAdapters:0,activeSources:0,staleSources:0,errorSources:0,notIngestingSources:0},organism={recordCount:0,sensorCount:0,lineages:0,agencies:0},visitor={configured:false,connected:false,totalVisitors:null,liveNow:null,error:null,lastUpdate:null,lastVerifiedAt:null,status:'unconfigured'},visitorUnsubscribe=null;
  const set=(id,text)=>{const n=document.getElementById(id);if(n)n.textContent=text};
  function visitorText(){if(!visitor.configured)return visitor.lastVerifiedAt?'Persistent visitor service not connected · showing last verified values':'Persistent visitor service not connected';if(visitor.connected&&visitor.lastUpdate)return'Live anonymous telemetry · updated '+new Date(visitor.lastUpdate).toLocaleTimeString();if(visitor.status==='stale'&&visitor.lastVerifiedAt)return'Visitor service temporarily unavailable · showing last verified values from '+new Date(visitor.lastVerifiedAt).toLocaleTimeString();if(visitor.error)return'Visitor service unavailable · verified totals cannot be refreshed right now';return'Connecting to visitor service…'}
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
    const hero=shell.querySelector('.hazard-hero');
    let box=document.getElementById('domVisitorCounter');
    if(!box){box=document.createElement('section');box.id='domVisitorCounter';box.className='hazard-card';box.style.margin='0 0 22px';box.setAttribute('aria-label','Visitor activity');box.innerHTML='<div class="status-row"><div><p class="eyebrow">PUBLIC OBSERVATORY ACTIVITY</p><h2 style="margin:.25rem 0">Visitors</h2></div><span class="tiny">privacy-preserving</span></div><div class="hazard-grid" style="margin-top:12px"><div class="hazard-card"><small>TOTAL VISITORS</small><strong id="domTotalVisitors" style="font-size:1.7rem">—</strong><span class="hazard-meta">anonymous browsers since counting began</span></div><div class="hazard-card"><small>LIVE NOW</small><strong id="domLiveVisitors" style="font-size:1.7rem">—</strong><span class="hazard-meta">active within the last ~2 minutes</span></div></div><div id="domVisitorState" class="tiny" aria-live="polite" style="margin-top:10px">Waiting for persistent visitor service…</div><div class="tiny" style="margin-top:6px">Counts are anonymous browser identifiers, not verified individual people. No IP history, location, names, or fingerprinting are stored by this counter.</div>'}
    if(hero){if(box.previousElementSibling!==hero)hero.insertAdjacentElement('afterend',box)}else if(box.parentElement!==shell)shell.prepend(box);
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