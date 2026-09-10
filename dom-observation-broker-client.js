const DOMObservationBroker=(()=>{
  let baseUrl=null,stream=null,state={configured:false,connected:false,lastSnapshotAt:null,lastStreamAt:null,error:null,records:0};
  const ingressReady=()=>typeof DOMObservationIngress!=='undefined';
  const safeBase=u=>{try{const x=new URL(String(u||''),location.href);if(x.protocol!=='https:'&&x.protocol!=='http:')return null;return x.href.replace(/\/$/,'')}catch(_){return null}};
  const emit=()=>{try{window.dispatchEvent(new CustomEvent('dom:broker-state',{detail:{...state,baseUrl}}))}catch(_){ }};
  const dispatchRecords=(records,mode)=>{const clean=ingressReady()?DOMObservationIngress.dedupe(records):[];state.records=clean.length;try{window.dispatchEvent(new CustomEvent('dom:observation-batch',{detail:{mode,records:clean,summary:ingressReady()?DOMObservationIngress.summary(clean):null}}))}catch(_){ }return clean};
  async function snapshot(){if(!baseUrl)return[];try{const r=await fetch(`${baseUrl}/v1/observations`,{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);const d=await r.json(),rows=Array.isArray(d)?d:Array.isArray(d.records)?d.records:[];state.lastSnapshotAt=new Date().toISOString();state.connected=true;state.error=null;emit();return dispatchRecords(rows,'snapshot')}catch(err){state.connected=false;state.error=String(err&&err.message||err);emit();return[]}}
  function disconnect(){if(stream){try{stream.close()}catch(_){ }stream=null}state.connected=false;emit()}
  function handleStreamEvent(ev){try{const d=JSON.parse(ev.data),rows=Array.isArray(d)?d:Array.isArray(d.records)?d.records:[d];state.lastStreamAt=new Date().toISOString();state.connected=true;state.error=null;dispatchRecords(rows,'stream');emit()}catch(err){state.error=`stream parse: ${String(err&&err.message||err)}`;emit()}}
  function connect(url){disconnect();baseUrl=safeBase(url);state={configured:!!baseUrl,connected:false,lastSnapshotAt:null,lastStreamAt:null,error:baseUrl?null:'broker URL not configured',records:0};emit();if(!baseUrl)return state;snapshot();if(typeof EventSource!=='function')return state;try{stream=new EventSource(`${baseUrl}/v1/stream`);stream.onopen=()=>{state.connected=true;state.error=null;emit()};stream.onmessage=handleStreamEvent;stream.addEventListener('observations',handleStreamEvent);stream.onerror=()=>{state.connected=false;state.error='stream disconnected';emit()}}catch(err){state.error=String(err&&err.message||err);emit()}return state}
  function configureFromPage(){const meta=document.querySelector('meta[name="dom-observation-broker"]'),value=(meta&&meta.content)||(window.DOMS_BROKER_URL||'');if(value)connect(value);else emit()}
  function getState(){return{...state,baseUrl}}
  window.addEventListener('pagehide',disconnect,{once:true});
  return{connect,disconnect,snapshot,configureFromPage,state:getState,safeBase};
})();
