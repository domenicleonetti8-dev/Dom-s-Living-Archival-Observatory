(()=>{
'use strict';
const DEFAULT_BROKER_URL='';
const explicit=typeof window.DOMS_BROKER_URL==='string'?window.DOMS_BROKER_URL.trim():'';
const brokerUrl=explicit||DEFAULT_BROKER_URL;
const googleMapsApiKey=typeof window.DOM_GOOGLE_MAPS_API_KEY==='string'?window.DOM_GOOGLE_MAPS_API_KEY.trim():'';
window.DOMSRuntimeConfig=Object.freeze({brokerUrl,googleMapsApiKey});
if(!/\/hazards\.html$/i.test(location.pathname))return;
const loaded=new Set(),timers=[];
function loadScript(src,key,delay=0){if(loaded.has(key)||document.querySelector(`script[data-dom-runtime-module="${key}"]`))return;const run=()=>{if(loaded.has(key)||document.querySelector(`script[data-dom-runtime-module="${key}"]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.dataset.domRuntimeModule=key;s.onload=()=>loaded.add(key);s.onerror=()=>console.error(`D.O.M. runtime module failed: ${src}`);document.head.appendChild(s)};const t=setTimeout(run,delay);timers.push(t)}
function idle(fn,timeout=4000){if('requestIdleCallback'in window)return requestIdleCallback(fn,{timeout});return setTimeout(fn,Math.min(timeout,1200))}
function restoreMap(m){if(!m)return;try{m.dragPan?.enable?.();m.scrollZoom?.enable?.();m.boxZoom?.enable?.();m.doubleClickZoom?.enable?.();m.keyboard?.enable?.();m.touchZoomRotate?.enable?.();m.touchZoomRotate?.disableRotation?.();const c=m.getCanvas?.(),h=m.getContainer?.();if(c){c.style.pointerEvents='auto';c.style.touchAction='none'}if(h){h.style.pointerEvents='auto';h.style.touchAction='none'}requestAnimationFrame(()=>{try{m.resize?.()}catch(_){}})}catch(_){}}
let scheduled=false;
function scheduleEnhancements(){if(scheduled||!window.DOMCurrentHazardMap?.map)return;scheduled=true;const m=window.DOMCurrentHazardMap.map;restoreMap(m);
  loadScript('./dom-hazard-runtime-guard.js?v=20260914-1','domHazardRuntimeGuard',0);
  const critical=[['./dom-hazard-popup-provenance.js?v=20260914-3','domHazardPopupProvenance'],['./dom-earthquake-visual-restoration.js?v=20260914-4','domEarthquakeVisualRestoration'],['./dom-weather-climate-station-inspector.js?v=20260914-3','domWeatherClimateStationInspector'],['./dom-geographic-hazard-motion.js?v=20260914-7','domGeographicHazardMotion']];
  critical.forEach((x,i)=>loadScript(x[0],x[1],250+i*220));
  idle(()=>{
    const feeds=[['./dom-station-summary-arbiter.js?v=20260914-15','domStationSummaryArbiter'],['./dom-eonet-live-extension.js?v=20260914-15','domEonetLive'],['./dom-global-seismic-heartbeat.js?v=20260914-15','domGlobalSeismicHeartbeat'],['./dom-global-fire-satellite-layer.js?v=20260914-15','domGlobalFireSatellite'],['./dom-gdacs-global-layer.js?v=20260914-15','domGdacsGlobal'],['./dom-wildfire-truth-guard.js?v=20260914-15','domWildfireTruthGuard'],['./dom-hazard-truth-audit.js?v=20260914-15','domHazardTruthAudit']];
    feeds.forEach((x,i)=>loadScript(x[0],x[1],i*500));
  },7000);
  idle(()=>{
    const science=[['./dom-planetary-evidence-fabric.js?v=20260914-3','domPlanetaryEvidenceFabric'],['./dom-planetary-coupled-hazard-math.js?v=20260914-4','domPlanetaryCoupledHazardMath'],['./dom-environmental-coupled-physics.js?v=20260914-3','domEnvironmentalCoupledPhysics'],['./dom-global-operational-weather-field.js?v=20260914-8','domGlobalOperationalWeather'],['./dom-wmo-gbon-station-supplement.js?v=20260914-2','domWmoGbonStations'],['./dom-global-coverage-gap-audit.js?v=20260914-3','domGlobalCoverageGapAudit'],['./dom-geographic-semantic-forensic-audit.js?v=20260914-3','domGeographicSemanticForensicAudit']];
    science.forEach((x,i)=>loadScript(x[0],x[1],i*650));
  },12000);
  idle(()=>{let css=document.querySelector('link[data-dom-dashboard-shell]');const loadDash=()=>loadScript('./dom-observatory-dashboard-shell.js?v=20260914-12','domObservatoryDashboardShell',300);if(css){if(css.sheet)loadDash();else css.addEventListener('load',loadDash,{once:true});return}css=document.createElement('link');css.rel='stylesheet';css.href='./dom-observatory-dashboard-shell.css?v=20260914-6';css.dataset.domDashboardShell='1';css.onload=loadDash;document.head.appendChild(css)},16000);
}
function capture(e){if(!e.detail?.map)return;window.DOMCurrentHazardMap={map:e.detail.map,maplibre:e.detail.maplibre||window.DOMCurrentHazardMap?.maplibre||null,capturedAt:new Date().toISOString()};restoreMap(e.detail.map);scheduleEnhancements()}
if(!window.__domCurrentMapCaptureInstalled){window.__domCurrentMapCaptureInstalled=true;window.addEventListener('dom:map-ready',capture)}
window.addEventListener('pageshow',()=>{const m=window.DOMCurrentHazardMap?.map;if(m){restoreMap(m);scheduleEnhancements()}else setTimeout(()=>window.DOMLiveGlobeRenderer?.mount?.(),80)});
window.addEventListener('orientationchange',()=>setTimeout(()=>restoreMap(window.DOMCurrentHazardMap?.map),120));
window.addEventListener('pagehide',ev=>{if(ev.persisted)return;for(const t of timers)clearTimeout(t)});
if(window.DOMCurrentHazardMap?.map){restoreMap(window.DOMCurrentHazardMap.map);scheduleEnhancements()}
})();