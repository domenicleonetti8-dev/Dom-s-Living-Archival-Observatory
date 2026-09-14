(()=>{
  'use strict';
  const DEFAULT_BROKER_URL='';
  const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
  const brokerUrl=explicit||DEFAULT_BROKER_URL;
  const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
  window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});
  if(!/\/hazards\.html$/i.test(location.pathname))return;

  if(!window.__domCurrentMapCaptureInstalled){
    window.__domCurrentMapCaptureInstalled=true;
    window.addEventListener('dom:map-ready',e=>{
      if(e.detail?.map)window.DOMCurrentHazardMap={map:e.detail.map,maplibre:e.detail.maplibre||null,capturedAt:new Date().toISOString()};
    });
  }

  const loaded=new Set();
  const loadScript=(src,key)=>new Promise(resolve=>{
    if(loaded.has(key)){resolve();return}
    const existing=document.querySelector(`script[data-dom-runtime-module="${key}"]`);
    if(existing){loaded.add(key);resolve();return}
    const s=document.createElement('script');
    s.src=src;
    s.defer=true;
    s.dataset.domRuntimeModule=key;
    const done=()=>{loaded.add(key);resolve()};
    s.addEventListener('load',done,{once:true});
    s.addEventListener('error',()=>{console.error(`D.O.M. runtime module failed: ${src}`);done()},{once:true});
    document.head.appendChild(s);
  });
  const idle=(ms=0)=>new Promise(resolve=>{
    const run=()=>resolve();
    if(ms>0){setTimeout(()=>{if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else run()},ms);return}
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,0);
  });

  let booted=false;
  async function bootAfterMap(){
    if(booted)return;
    const current=window.DOMCurrentHazardMap?.map;
    if(!current)return;
    booted=true;

    // Preserve map responsiveness first. These modules only enhance an already-mounted map.
    await idle(80);
    await loadScript('./dom-hazard-popup-provenance.js?v=20260914-2','domHazardPopupProvenance');
    await loadScript('./dom-earthquake-visual-restoration.js?v=20260914-3','domEarthquakeVisualRestoration');
    await loadScript('./dom-weather-climate-station-inspector.js?v=20260914-2','domWeatherClimateStationInspector');
    await loadScript('./dom-geographic-hazard-motion.js?v=20260914-6','domGeographicHazardMotion');

    // Evidence and physics are valuable, but must never block first map paint or touch response.
    await idle(250);
    await loadScript('./dom-planetary-evidence-fabric.js?v=20260914-2','domPlanetaryEvidenceFabric');
    await loadScript('./dom-planetary-coupled-hazard-math.js?v=20260914-3','domPlanetaryCoupledHazardMath');
    await loadScript('./dom-environmental-coupled-physics.js?v=20260914-2','domEnvironmentalCoupledPhysics');

    // Heavier global enrichment loads only after the map is established and interactive.
    await idle(700);
    await loadScript('./dom-global-operational-weather-field.js?v=20260914-7','domGlobalOperationalWeather');
    await idle(120);
    await loadScript('./dom-wmo-gbon-station-supplement.js?v=20260914-1','domWmoGbonStations');
    await idle(120);
    await loadScript('./dom-global-coverage-gap-audit.js?v=20260914-2','domGlobalCoverageGapAudit');
    await idle(120);
    await loadScript('./dom-geographic-semantic-forensic-audit.js?v=20260914-2','domGeographicSemanticForensicAudit');

    // Re-announce the already-mounted map once all late listeners exist.
    queueMicrotask(()=>window.dispatchEvent(new CustomEvent('dom:map-ready',{detail:window.DOMCurrentHazardMap})));

    // Dashboard chrome is intentionally last so it cannot compete with map creation.
    await idle(250);
    const dashboardKey='domObservatoryDashboardShell';
    let css=document.querySelector('link[data-dom-dashboard-shell]');
    const loadDashboard=()=>loadScript('./dom-observatory-dashboard-shell.js?v=20260914-10',dashboardKey);
    if(css){if(css.sheet)loadDashboard();else css.addEventListener('load',loadDashboard,{once:true});return}
    css=document.createElement('link');
    css.rel='stylesheet';
    css.href='./dom-observatory-dashboard-shell.css?v=20260914-5';
    css.dataset.domDashboardShell='1';
    css.addEventListener('load',loadDashboard,{once:true});
    css.addEventListener('error',()=>console.error('D.O.M. dashboard stylesheet failed; dashboard shell not started'),{once:true});
    document.head.appendChild(css);
  }

  window.addEventListener('dom:map-ready',bootAfterMap);
  if(window.DOMCurrentHazardMap?.map)bootAfterMap();
  // Recovery only: if map-ready fired before this listener but capture succeeded, try again without creating a second map.
  setTimeout(()=>{if(!booted&&window.DOMCurrentHazardMap?.map)bootAfterMap()},1500);
})();