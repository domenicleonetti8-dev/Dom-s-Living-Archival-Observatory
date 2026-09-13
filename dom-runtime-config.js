(()=>{
  const DEFAULT_BROKER_URL='';
  const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
  const brokerUrl=explicit||DEFAULT_BROKER_URL;
  const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
  window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});
})();
