const DOMBrokerStatus=(()=>{
  let broker={configured:false,connected:false,error:null,records:0,baseUrl:null,registeredSources:0,activeAdapters:0,activeSources:0,staleSources:0,errorSources:0,notIngestingSources:0},organism={recordCount:0,sensorCount:0,lineages:0,agencies:0};
  const set=(id,text)=>{const n=document.getElementById(id);if(n)n.textContent=text};
  function render(){
    const configured=broker.configured===true,connected=broker.connected===true;
    const counts=Number(broker.registeredSources)>0?` · ${Number(broker.activeSources)||0}/${Number(broker.registeredSources)||0} source families active · ${Number(broker.staleSources)||0} stale · ${Number(broker.errorSources)||0} error · ${Number(broker.notIngestingSources)||0} registered/not ingesting`:'';
    const brokerText=!configured?'Persistent broker not configured · browser feeds only':connected?`Persistent broker connected · ${Number(broker.records)||0} records in latest broker batch${counts}`:`Persistent broker configured but disconnected${broker.error?` · ${broker.error}`:''}${counts}`;
    set('brokerState',brokerText);
    set('organismState',`${Number(organism.recordCount)||0} canonical observations · ${Number(organism.sensorCount)||0} sensor states · ${Number(organism.lineages)||0} lineages · ${Number(organism.agencies)||0} agencies`);
  }
  function mount(){const anchor=document.getElementById('sourceState');if(!anchor)return false;let box=document.getElementById('domNetworkTruth');if(!box){box=document.createElement('div');box.id='domNetworkTruth';box.className='evidence-block';box.innerHTML='<strong>D.O.M. network truth</strong><div id="brokerState" class="tiny"></div><div id="organismState" class="tiny"></div><div class="tiny">Registered source families are not counted as live until an adapter actually ingests them. Stale feeds are separated from active feeds. Feed health is not Earth health.</div>';anchor.insertAdjacentElement('afterend',box)}render();return true}
  window.addEventListener('dom:broker-state',ev=>{broker={...broker,...(ev.detail||{})};mount()});
  window.addEventListener('dom:organism-state',ev=>{organism={...organism,...(ev.detail||{})};mount()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else setTimeout(mount,0);
  return{mount,state:()=>({broker:{...broker},organism:{...organism}})};
})();