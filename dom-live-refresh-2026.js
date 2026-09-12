(()=>{
  'use strict';
  const PERIOD_MS=60000;
  let timer=null,running=false;

  async function refresh(){
    if(running||document.visibilityState==='hidden')return;
    running=true;
    try{
      const jobs=[];
      if(window.DOMEarthVitals&&typeof window.DOMEarthVitals.refresh==='function')jobs.push(Promise.resolve(window.DOMEarthVitals.refresh()).catch(()=>null));
      if(window.DOMExtremeEvents&&typeof window.DOMExtremeEvents.refresh==='function')jobs.push(Promise.resolve(window.DOMExtremeEvents.refresh()).catch(()=>null));
      const earthButton=document.getElementById('refreshEarth');
      if(earthButton)earthButton.click();
      await Promise.allSettled(jobs);
    }finally{running=false}
  }

  function start(){
    if(timer)return;
    timer=setInterval(refresh,PERIOD_MS);
    window.addEventListener('focus',refresh,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);timer=null},{once:true});
  window.DOMLiveRefresh2026=Object.freeze({refresh,periodMs:PERIOD_MS});
})();
