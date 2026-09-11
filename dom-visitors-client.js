const DOMVisitorClient=(()=>{
  let timer=null,ephemeralId=null,state={configured:false,totalVisitors:null,liveNow:null,lastUpdate:null,error:null},listeners=new Set();
  const validId=x=>/^[A-Za-z0-9_-]{16,128}$/.test(String(x||''));
  function makeId(){if(typeof crypto!=='undefined'&&crypto&&typeof crypto.getRandomValues==='function'){const b=new Uint8Array(18);crypto.getRandomValues(b);return'v_'+[...b].map(x=>x.toString(16).padStart(2,'0')).join('')}return'v_'+Math.random().toString(36).slice(2)+Date.now().toString(36)}
  function visitorId(){const key='domsAnonymousVisitorV1';try{const old=localStorage.getItem(key);if(validId(old))return old;const id=makeId();localStorage.setItem(key,id);return id}catch(_){if(!validId(ephemeralId))ephemeralId=makeId();return ephemeralId}}
  function safeBase(u){try{const x=new URL(String(u||''),location.href);if(x.protocol!=='https:'&&x.protocol!=='http:')return null;return x.href.replace(/\/$/,'')}catch(_){return null}}
  function resolveBase(){const runtime=window.DOMSRuntimeConfig&&window.DOMSRuntimeConfig.brokerUrl;const meta=document.querySelector('meta[name="dom-observation-broker"]');return safeBase(runtime||(meta&&meta.content)||(window.DOMS_BROKER_URL||''))}
  function emit(){const copy={...state};for(const fn of listeners){try{fn(copy)}catch(_){ }}try{window.dispatchEvent(new CustomEvent('dom:visitor-state',{detail:copy}))}catch(_){ }return copy}
  async function heartbeat(){const base=resolveBase();state.configured=!!base;if(!base){state.error=null;return emit()}try{const r=await fetch(`${base}/v1/visitors/heartbeat`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({visitorId:visitorId(),page:location.pathname||'/'})});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);const d=await r.json();state={configured:true,totalVisitors:Number(d.totalVisitors),liveNow:Number(d.liveNow),lastUpdate:d.generatedAt||new Date().toISOString(),error:null};return emit()}catch(err){state={...state,configured:true,error:String(err&&err.message||err)};return emit()}}
  function arm(){if(timer)return;if(resolveBase())heartbeat();else emit();timer=setInterval(()=>{if(document.visibilityState==='visible')heartbeat()},30000)}
  function start(listener){if(typeof listener==='function')listeners.add(listener);arm();if(typeof listener==='function'){try{listener({...state})}catch(_){ }}return()=>stop(listener)}
  function stop(listener){if(typeof listener==='function')listeners.delete(listener);if(!listener||listeners.size===0){if(timer){clearInterval(timer);timer=null}}}
  function getState(){return{...state}}
  window.addEventListener('pagehide',()=>stop(),{once:true});
  return{start,stop,heartbeat,state:getState,resolveBase,visitorId};
})();
