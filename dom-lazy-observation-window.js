(()=>{
'use strict';
const ZOOM_ON=4.6,ZOOM_OFF=4.15,DEBOUNCE=420,REFRESH=60000;
let map=null,timer=null,refreshTimer=null,active=false,lastKey='',lastObservation=null;
const cueLayers=['dom-fire-point','dom-hurricane-cloud','dom-hurricane-outer','dom-hurricane-band','dom-hurricane-inner-band','dom-hurricane-eye','dom-tornado-vortex','dom-tornado-debris','dom-tornado-core','dom-quake-wave','dom-quake-core'];
function roundedUTC(step=10){const d=new Date();d.setUTCSeconds(0,0);d.setUTCMinutes(Math.floor(d.getUTCMinutes()/step)*step);return d.toISOString().slice(0,16)+':00Z'}
function viewport(){if(!map)return null;const b=map.getBounds(),c=map.getCenter();return{west:b.getWest(),south:b.getSouth(),east:b.getEast(),north:b.getNorth(),lat:c.lat,lon:c.lng,zoom:map.getZoom()}}
function provider(v){if(!v)return null;/* Worldview/GIBS geostationary observation cadence is 10 min; provider selection is geographic and never claims sub-cadence imagery. */if(v.lon>=-170&&v.lon<=-20)return{id:'GOES-East/West via NASA GIBS',cadence:10};if(v.lon>80||v.lon<-150)return{id:'Himawari via NASA GIBS',cadence:10};return{id:'NASA GIBS / Worldview',cadence:10}}
function status(text){window.dispatchEvent(new CustomEvent('dom:observation-window',{detail:{active,text,observation:lastObservation}}));let el=document.getElementById('domObservationWindowState');if(!el){el=document.createElement('div');el.id='domObservationWindowState';el.className='source-state';const anchor=document.getElementById('sourceState');anchor?.parentNode?.insertBefore(el,anchor)}if(el)el.textContent=text}
function fadeCues(on){if(!map)return;const z=map.getZoom();const opacity=on?Math.max(.08,Math.min(.34,(8.5-z)*.09)) : 1;for(const id of cueLayers){try{if(!map.getLayer(id))continue;const type=map.getLayer(id).type;if(type==='circle'){for(const p of ['circle-opacity','circle-stroke-opacity'])try{map.setPaintProperty(id,p,opacity)}catch(_){}}}catch(_){}}}
function release(){active=false;lastKey='';lastObservation=null;fadeCues(false);status('Orbital Earth · zoom into a hazard region for a lazy freshest-imagery observation window.')}
async function acquire(){if(!map||!map.loaded())return;const v=viewport();if(!v)return;if(v.zoom<ZOOM_OFF){release();return}if(v.zoom<ZOOM_ON&&!active)return;active=true;const p=provider(v),observedAt=roundedUTC(p.cadence),key=[p.id,observedAt,v.west.toFixed(2),v.south.toFixed(2),v.east.toFixed(2),v.north.toFixed(2),Math.floor(v.zoom)].join('|');if(key===lastKey)return;lastKey=key;lastObservation={provider:p.id,observedAt,cadenceMinutes:p.cadence,bounds:[v.west,v.south,v.east,v.north],zoom:v.zoom};fadeCues(true);status(`LAZY OBSERVATION WINDOW · ${p.id} · newest scheduled frame ${observedAt} · ${p.cadence}-minute source cadence · viewport-only priority. Symbols reduced; imagery timestamp is source cadence, not a claim of exact capture time.`)}
function schedule(){clearTimeout(timer);timer=setTimeout(acquire,DEBOUNCE)}
function attach(m){map=m;try{map.on('moveend',schedule);map.on('zoomend',schedule);map.on('idle',()=>{if(active)fadeCues(true)})}catch(_){}schedule();clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(active)acquire()},REFRESH)}
window.addEventListener('dom:map-ready',e=>{if(e.detail?.map)attach(e.detail.map)});
window.DOMLazyObservationWindow=Object.freeze({state:()=>({active,lastObservation}),refresh:acquire,release});
})();
