(()=>{
'use strict';
let map=null,timer=0,lastKey='',state={active:false,zoom:0,bounds:null,reason:'orbit',requestedAt:null};
const ZOOM_ON=5.2,ZOOM_OFF=4.65,DEBOUNCE_MS=420;
const markerLayers=['dom-fire-point','dom-hurricane-cloud','dom-hurricane-outer','dom-hurricane-band','dom-hurricane-inner-band','dom-hurricane-eye','dom-tornado-vortex','dom-tornado-debris','dom-tornado-core','dom-quake-wave','dom-quake-core','dom-sensor-points'];
const round=(n,p=3)=>Number(Number(n).toFixed(p));
function visibleBounds(){try{const b=map.getBounds();return{west:round(b.getWest()),south:round(b.getSouth()),east:round(b.getEast()),north:round(b.getNorth())}}catch(_){return null}}
function fadeNavigationCues(active){if(!map)return;for(const id of markerLayers){if(!map.getLayer(id))continue;try{const type=map.getLayer(id).type;if(type==='circle')map.setPaintProperty(id,'circle-opacity',active?['interpolate',['linear'],['zoom'],5,.72,7,.24,9,.08]:1);else if(type==='symbol')map.setPaintProperty(id,'icon-opacity',active?.12:1)}catch(_){}}}
function publish(reason){state={active:map?map.getZoom()>=ZOOM_ON:false,zoom:map?round(map.getZoom(),2):0,bounds:visibleBounds(),reason,requestedAt:new Date().toISOString()};window.dispatchEvent(new CustomEvent('dom:lazy-imagery-viewport',{detail:state}));}
function evaluate(){timer=0;if(!map)return;const z=map.getZoom(),was=state.active,active=was?z>=ZOOM_OFF:z>=ZOOM_ON;const b=visibleBounds();if(!active){if(was){fadeNavigationCues(false);state={active:false,zoom:round(z,2),bounds:b,reason:'orbit',requestedAt:new Date().toISOString()};window.dispatchEvent(new CustomEvent('dom:lazy-imagery-viewport',{detail:state}))}return}
 const key=b?`${round(z,1)}:${b.west}:${b.south}:${b.east}:${b.north}`:'';if(!was)fadeNavigationCues(true);state.active=true;if(key===lastKey)return;lastKey=key;publish('viewport-settled')}
function queue(){clearTimeout(timer);timer=setTimeout(evaluate,DEBOUNCE_MS)}
function attach(m){if(!m||map===m)return;map=m;try{map.on('moveend',queue);map.on('zoomend',queue);map.on('idle',queue)}catch(_){}queue()}
window.addEventListener('dom:map-ready',e=>attach(e.detail?.map));
window.addEventListener('dom:lazy-imagery-observation',e=>{const d=e.detail||{};window.dispatchEvent(new CustomEvent('dom:lazy-imagery-status',{detail:{...state,observation:d}}))});
window.DOMLazyHazardImagery=Object.freeze({state:()=>({...state}),refresh:queue,attach});
})();