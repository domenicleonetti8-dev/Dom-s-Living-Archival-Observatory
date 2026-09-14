(()=>{
  const DEFAULT_BROKER_URL='';
  const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
  const brokerUrl=explicit||DEFAULT_BROKER_URL;
  const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
  window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});
  if(!/\/hazards\.html$/i.test(location.pathname))return;
  if(!window.__domCurrentMapCaptureInstalled){window.__domCurrentMapCaptureInstalled=true;window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)window.DOMCurrentHazardMap={map:e.detail.map,maplibre:e.detail.maplibre||null,capturedAt:new Date().toISOString()}})}
  const coreModules=[['./dom-geographic-semantic-forensic-audit.js?v=20260914-2','domGeographicSemanticForensicAudit'],['./dom-weather-climate-station-inspector.js?v=20260914-2','domWeatherClimateStationInspector'],['./dom-earthquake-visual-restoration.js?v=20260914-3','domEarthquakeVisualRestoration'],['./dom-geographic-hazard-motion.js?v=20260914-6','domGeographicHazardMotion'],['./dom-global-operational-weather-field.js?v=20260914-5','domGlobalOperationalWeather'],['./dom-wmo-gbon-station-supplement.js?v=20260914-1','domWmoGbonStations'],['./dom-global-coverage-gap-audit.js?v=20260914-2','domGlobalCoverageGapAudit']];
  let pending=coreModules.length,replayed=false;
  const coreDone=()=>{pending=Math.max(0,pending-1);if(!replayed&&pending===0&&window.DOMCurrentHazardMap?.map){replayed=true;queueMicrotask(()=>window.dispatchEvent(new CustomEvent('dom:map-ready',{detail:window.DOMCurrentHazardMap})))}};
  const loadScript=(src,key,onload)=>{const existing=document.querySelector(`script[data-dom-runtime-module="${key}"]`);if(existing){onload?.();return}const s=document.createElement('script');s.src=src;s.defer=true;s.dataset.domRuntimeModule=key;if(onload)s.addEventListener('load',onload,{once:true});if(onload)s.addEventListener('error',onload,{once:true});document.head.appendChild(s)};
  for(const [src,key] of coreModules)loadScript(src,key,coreDone);
  const dashboardKey='domObservatoryDashboardShell';if(document.querySelector(`script[data-dom-runtime-module="${dashboardKey}"]`))return;
  let css=document.querySelector('link[data-dom-dashboard-shell]');const loadDashboard=()=>loadScript('./dom-observatory-dashboard-shell.js?v=20260914-9',dashboardKey);
  if(css){if(css.sheet)loadDashboard();else css.addEventListener('load',loadDashboard,{once:true});return}
  css=document.createElement('link');css.rel='stylesheet';css.href='./dom-observatory-dashboard-shell.css?v=20260914-5';css.dataset.domDashboardShell='1';css.addEventListener('load',loadDashboard,{once:true});css.addEventListener('error',()=>console.error('D.O.M. dashboard stylesheet failed; dashboard shell not started'),{once:true});document.head.appendChild(css);
})();