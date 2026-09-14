(()=>{
  const DEFAULT_BROKER_URL='';
  const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
  const brokerUrl=explicit||DEFAULT_BROKER_URL;
  const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
  window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});

  if(/\/hazards\.html$/i.test(location.pathname)){
    const s=document.createElement('script');
    s.src='./dom-hazard-render-reconciler.js?v=20260914-1';
    s.async=false;
    s.dataset.domHazardRenderReconciler='1';
    document.head.appendChild(s);
  }
})();
