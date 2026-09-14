(()=>{
  const DEFAULT_BROKER_URL='';
  const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
  const brokerUrl=explicit||DEFAULT_BROKER_URL;
  const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
  window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});

  if(/\/hazards\.html$/i.test(location.pathname)){
    for(const [src,key] of [
      ['./dom-geographic-semantic-forensic-audit.js?v=20260914-1','domGeographicSemanticForensicAudit'],
      ['./dom-weather-climate-station-inspector.js?v=20260914-1','domWeatherClimateStationInspector'],
      ['./dom-earthquake-visual-restoration.js?v=20260914-1','domEarthquakeVisualRestoration'],
      ['./dom-geographic-hazard-motion.js?v=20260914-1','domGeographicHazardMotion']
    ]){
      if(document.querySelector(`script[data-dom-runtime-module="${key}"]`))continue;
      const s=document.createElement('script');
      s.src=src;
      s.defer=true;
      s.dataset.domRuntimeModule=key;
      document.head.appendChild(s);
    }
  }
})();
