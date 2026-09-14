(()=>{
  const DEFAULT_BROKER_URL='';
  const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
  const brokerUrl=explicit||DEFAULT_BROKER_URL;
  const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
  window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});

  if(!/\/hazards\.html$/i.test(location.pathname))return;

  const loadScript=(src,key)=>{
    if(document.querySelector(`script[data-dom-runtime-module="${key}"]`))return;
    const s=document.createElement('script');
    s.src=src;
    s.defer=true;
    s.dataset.domRuntimeModule=key;
    document.head.appendChild(s);
  };

  for(const [src,key] of [
    ['./dom-geographic-semantic-forensic-audit.js?v=20260914-2','domGeographicSemanticForensicAudit'],
    ['./dom-weather-climate-station-inspector.js?v=20260914-2','domWeatherClimateStationInspector'],
    ['./dom-earthquake-visual-restoration.js?v=20260914-2','domEarthquakeVisualRestoration'],
    ['./dom-geographic-hazard-motion.js?v=20260914-3','domGeographicHazardMotion']
  ])loadScript(src,key);

  const dashboardKey='domObservatoryDashboardShell';
  if(document.querySelector(`script[data-dom-runtime-module="${dashboardKey}"]`))return;

  let css=document.querySelector('link[data-dom-dashboard-shell]');
  const loadDashboard=()=>loadScript('./dom-observatory-dashboard-shell.js?v=20260914-3',dashboardKey);
  if(css){
    if(css.sheet)loadDashboard();
    else css.addEventListener('load',loadDashboard,{once:true});
    return;
  }

  css=document.createElement('link');
  css.rel='stylesheet';
  css.href='./dom-observatory-dashboard-shell.css?v=20260914-3';
  css.dataset.domDashboardShell='1';
  css.addEventListener('load',loadDashboard,{once:true});
  css.addEventListener('error',()=>console.error('D.O.M. dashboard stylesheet failed; dashboard shell not started'),{once:true});
  document.head.appendChild(css);
})();
