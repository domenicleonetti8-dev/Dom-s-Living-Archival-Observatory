const DOMBrokerStatus=(()=>{
  let broker={configured:false,connected:false,error:null,records:0,baseUrl:null,registeredSources:0,activeAdapters:0,activeSources:0,staleSources:0,errorSources:0,notIngestingSources:0},organism={recordCount:0,sensorCount:0,lineages:0,agencies:0},visitorTimer=null,visitor={totalVisitors:null,liveNow:null,error:null,lastUpdate:null};
  const set=(id,text)=>{const n=document.getElementById(id);if(n)n.textContent=text};
  const validVisitorId=x=>/^[A-Za-z0-9_-]{16,128}$/.test(String(x||''));
  function visitorId(){
    const key='domsAnonymousVisitorV1';
    try{const old=localStorage.getItem(key);if(validVisitorId(old))return old;let id='';if(crypto&&crypto.getRandomValues){const b=new Uint8Array(18);crypto.getRandomValues(b);id='v_'+[...b].map(x=>x.toString(16).padStart(2,'0')).join('')}else id='v_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(key,id);return id}catch(_){return 'v_'+Math.random().toString(36).slice(2)+Date.now().toString(36)}
  }
  function render(){
    const configured=broker.configured===true,connected=broker.connected===true;
    const counts=Number(broker.registeredSources)>0?` · ${Number(broker.activeSources)||0}/${Number(broker.registeredSources)||0} source families active · ${Number(broker.staleSources)||0} stale · ${Number(broker.errorSources)||0} error · ${Number(broker.notIngestingSources)||0} registered/not ingesting`:'';
    const brokerText=!configured?'Persistent broker not configured · browser feeds only':connected?`Persistent broker connected · ${Number(broker.records)||0} records in latest broker batch${counts}`:`Persistent broker configured but disconnected${broker.error?` · ${broker.error}`:''}${counts}`;
    set('brokerState',brokerText);
    set('organismState',`${Number(organism.recordCount)||0} canonical observations · ${Number(organism.sensorCount)||0} sensor states · ${Number(organism.lineages)||0} lineages · ${Number(organism.agencies)||0} agencies`);
    set('domTotalVisitors',visitor.totalVisitors==null?'—':Number(visitor.totalVisitors).toLocaleString());
    set('domLiveVisitors',visitor.liveNow==null?'—':Number(visitor.liveNow).toLocaleString());
    set('domVisitorState',visitor.error?`Counter unavailable · ${visitor.error}`:visitor.lastUpdate?'Live anonymous telemetry · updated '+new Date(visitor.lastUpdate).toLocaleTimeString():'Waiting for persistent visitor service…');
  }
  function mountVisitor(){
    const shell=document.querySelector('.hazard-shell')||document.querySelector('main')||document.body;if(!shell)return false;
    const hero=shell.querySelector('.hazard-hero');
    let box=document.getElementById('domVisitorCounter');
    if(!box){
      box=document.createElement('section');box.id='domVisitorCounter';box.className='hazard-card';box.style.margin='0 0 22px';box.setAttribute('aria-label','Visitor activity');box.innerHTML='<div class="status-row"><div><p class="eyebrow">PUBLIC OBSERVATORY ACTIVITY</p><h2 style="margin:.25rem 0">Visitors</h2></div><span class="tiny">privacy-preserving</span></div><div class="hazard-grid" style="margin-top:12px"><div class="hazard-card"><small>TOTAL VISITORS</small><strong id="domTotalVisitors" style="font-size:1.7rem">—</strong><span class="hazard-meta">anonymous browsers since counting began</span></div><div class="hazard-card"><small>LIVE NOW</small><strong id="domLiveVisitors" style="font-size:1.7rem">—</strong><span class="hazard-meta">active within the last ~2 minutes</span></div></div><div id="domVisitorState" class="tiny" aria-live="polite" style="margin-top:10px">Waiting for persistent visitor service…</div><div class="tiny" style="margin-top:6px">Counts are anonymous browser identifiers, not verified individual people. No IP history, location, names, or fingerprinting are stored by this counter.</div>';
    }
    if(hero){if(box.previousElementSibling!==hero)hero.insertAdjacentElement('afterend',box)}else if(box.parentElement!==shell)shell.prepend(box);
    render();return true
  }
  async function heartbeat(){
    const base=broker&&broker.baseUrl?String(broker.baseUrl).replace(/\/$/,''):'';if(!base)return;
    try{const r=await fetch(`${base}/v1/visitors/heartbeat`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({visitorId:visitorId(),page:location.pathname||'/'})});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);const d=await r.json();visitor={totalVisitors:Number(d.totalVisitors),liveNow:Number(d.liveNow),error:null,lastUpdate:d.generatedAt||new Date().toISOString()};render()}catch(err){visitor.error=String(err&&err.message||err);render()}
  }
  function armVisitor(){mountVisitor();if(visitorTimer){clearInterval(visitorTimer);visitorTimer=null}if(broker.configured&&broker.baseUrl){heartbeat();visitorTimer=setInterval(()=>{if(document.visibilityState==='visible')heartbeat()},30000)}}
  function mount(){const anchor=document.getElementById('sourceState');if(anchor){let box=document.getElementById('domNetworkTruth');if(!box){box=document.createElement('div');box.id='domNetworkTruth';box.className='evidence-block';box.innerHTML='<strong>D.O.M. network truth</strong><div id="brokerState" class="tiny"></div><div id="organismState" class="tiny"></div><div class="tiny">Registered source families are not counted as live until an adapter actually ingests them. Stale feeds are separated from active feeds. Feed health is not Earth health.</div>';anchor.insertAdjacentElement('afterend',box)}}mountVisitor();render();return true}
  window.addEventListener('dom:broker-state',ev=>{const oldBase=broker.baseUrl;broker={...broker,...(ev.detail||{})};mount();if(oldBase!==broker.baseUrl||(!visitorTimer&&broker.configured))armVisitor()});
  window.addEventListener('dom:organism-state',ev=>{organism={...organism,...(ev.detail||{})};mount()});
  window.addEventListener('pagehide',()=>{if(visitorTimer)clearInterval(visitorTimer)},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();armVisitor()},{once:true});else setTimeout(()=>{mount();armVisitor()},0);
  return{mount,heartbeat,state:()=>({broker:{...broker},organism:{...organism},visitor:{...visitor}})};
})();