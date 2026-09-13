const $=s=>document.querySelector(s);
let earth3d=null;

function setState(message){const el=$('#providerState');if(el)el.textContent=message}
function googleKey(){return String(window.DOMSRuntimeConfig?.googleMapsApiKey||window.DOM_GOOGLE_MAPS_API_KEY||'').trim()}
function clearMap(){const host=$('#earthMap');if(host)host.replaceChildren()}
function showSetup(message){
  const host=$('#earthMap');
  if(!host)return;
  clearMap();
  const panel=document.createElement('div');
  panel.style.cssText='height:100%;display:grid;place-items:center;padding:28px;text-align:center;background:radial-gradient(circle at 50% 40%,#0a2531 0,#031219 55%,#01080d 100%);color:#eafcff;font:600 15px/1.5 system-ui';
  panel.innerHTML=`<div style="max-width:560px"><div style="font-size:42px;margin-bottom:12px">🌎</div><strong style="font-size:20px">Google 3D Earth view</strong><p style="opacity:.72;font-weight:500">${message}</p><p style="opacity:.58;font-size:12px;font-weight:500">This page intentionally no longer falls back to the old synthetic globe. Once the authorized Google Maps browser key is configured, this exact panel is replaced by Google's interactive photorealistic 3D Earth.</p></div>`;
  host.appendChild(panel);
}
function loadGoogle(key){
  return new Promise((resolve,reject)=>{
    if(window.google?.maps)return resolve(window.google.maps);
    window.__DOMGoogleMapsReady=()=>resolve(window.google.maps);
    const s=document.createElement('script');
    s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=maps3d&callback=__DOMGoogleMapsReady`;
    s.async=true;s.defer=true;
    s.onerror=()=>reject(new Error('Google Maps JavaScript API failed to load'));
    document.head.appendChild(s);
  });
}
async function build(){
  const key=googleKey();
  if(!key){
    showSetup('An authorized Google Maps JavaScript API browser key is required before Google can render its 3D imagery on this public page.');
    setState('Google 3D Earth is configured as the only map provider · browser API key still required.');
    return;
  }
  try{
    const maps=await loadGoogle(key);
    const {Map3DElement}=await maps.importLibrary('maps3d');
    earth3d=new Map3DElement({
      center:{lat:15,lng:0,altitude:0},
      range:19000000,
      tilt:0,
      heading:0,
      mode:'HYBRID',
      gestureHandling:'GREEDY'
    });
    earth3d.style.width='100%';
    earth3d.style.height='100%';
    earth3d.setAttribute('aria-label','Google photorealistic 3D Earth');
    clearMap();
    $('#earthMap')?.appendChild(earth3d);
    earth3d.addEventListener?.('gmp-steadystate',e=>{if(e?.isSteady)setState('Geographical Earth active · Google photorealistic 3D imagery + geographic labels · hazards and sensors remain in the Hazard Observatory.')});
    setState('Loading Google photorealistic 3D Earth…');
  }catch(e){
    showSetup(`Google 3D Earth could not initialize: ${String(e?.message||e)}`);
    setState(`Google 3D Earth unavailable: ${String(e?.message||e)}`);
  }
}
function reset(){
  if(!earth3d)return;
  earth3d.center={lat:15,lng:0,altitude:0};
  earth3d.range=19000000;
  earth3d.tilt=0;
  earth3d.heading=0;
}
function refresh(){
  if(!earth3d){build();return}
  const host=$('#earthMap');
  if(host){host.style.display='none';requestAnimationFrame(()=>{host.style.display='block'})}
  setState('Geographical Earth refreshed · Google photorealistic 3D imagery active.');
}
function locate(){
  if(!navigator.geolocation){setState('Location unavailable. Geographical Earth remains in global view.');return}
  navigator.geolocation.getCurrentPosition(p=>{
    if(!earth3d)return;
    earth3d.center={lat:p.coords.latitude,lng:p.coords.longitude,altitude:0};
    earth3d.range=18000;
    earth3d.tilt=62;
    earth3d.heading=0;
  },()=>setState('Location unavailable. Geographical Earth remains in global view.'));
}

build();
$('#resetEarth')?.addEventListener('click',reset);
$('#refreshEarth')?.addEventListener('click',refresh);
$('#locateMe')?.addEventListener('click',locate);
