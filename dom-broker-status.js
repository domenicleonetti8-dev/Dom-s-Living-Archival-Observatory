const DOMBrokerStatus=(()=>{
  let broker={configured:false,connected:false,error:null,records:0,baseUrl:null},organism={recordCount:0,sensorCount:0,lineages:0,agencies:0};
  const set=(id,text)=>{const n=document.getElementById(id);if(n)n.textContent=text};
  function render(){
    const configured=broker.configured===true,connected=broker.connected===true;
    const brokerText=!configured?'Persistent broker not configured · browser feeds only':connected?`Persistent broker connected · ${Number(broker.records)||0} records in latest broker batch`:`Persistent broker configured but disconnected${broker.error?` · ${broker.error}`:''}`;
    set('brokerState',brokerText);
    set('organismState',`${Number(organism.recordCount)||0} canonical observations · ${Number(organism.sensorCount)||0} sensor states · ${Number(organism.lineages)||0} lineages · ${Number(organism.agencies)||0} agencies`);
  }
  function mount(){const anchor=document.getElementById('sourceState');if(!anchor)return false;let box=document.getElementById('domNetworkTruth');if(!box){box=document.createElement('div');box.id='domNetworkTruth';box.className='evidence-block';box.innerHTML='<strong>D.O.M. network truth</strong><div id="brokerState" class="tiny"></div><div id="organismState" class="tiny"></div><div class="tiny">Registered source families are not counted as live until an adapter actually ingests them.</div>';anchor.insertAdjacentElement('afterend',box)}render();return true}
  window.addEventListener('dom:broker-state',ev=>{broker={...broker,...(ev.detail||{})};mount()});
  window.addEventListener('dom:organism-state',ev=>{organism={...organism,...(ev.detail||{})};mount()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else setTimeout(mount,0);
  return{mount,state:()=>({broker:{...broker},organism:{...organism}})};
})();
