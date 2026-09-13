(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const STORE='dom.mainCompass.trueNorth.v1';
  const state={started:false,heading:null,magneticHeading:null,accuracy:null,source:'none',listener:null,displayRotation:0,lastHeading:null,declination:null,declinationAt:null,lat:null,lon:null,locationAccuracy:null,cached:false,modelState:'idle'};
  const finite=v=>Number.isFinite(Number(v));
  const norm=d=>((Number(d)%360)+360)%360;
  const cardinal=h=>['N','NE','E','SE','S','SW','W','NW'][Math.round(norm(h)/45)%8];
  const screenAngle=()=>{const a=globalThis.screen&&screen.orientation&&finite(screen.orientation.angle)?Number(screen.orientation.angle):finite(globalThis.orientation)?Number(globalThis.orientation):0;return norm(a)};
  function headingFromEvent(e){
    if(e&&finite(e.webkitCompassHeading))return{heading:norm(e.webkitCompassHeading),accuracy:finite(e.webkitCompassAccuracy)&&Number(e.webkitCompassAccuracy)>=0?Number(e.webkitCompassAccuracy):null,source:'magnetic'};
    if(e&&e.absolute===true&&finite(e.alpha))return{heading:norm(360-Number(e.alpha)+screenAngle()),accuracy:null,source:'absolute-device'};
    return null;
  }
  function shortestDelta(from,to){const a=norm(from),b=norm(to);return((b-a+540)%360)-180}
  function visualRotationForHeading(h){const target=norm(h);if(state.lastHeading==null){state.displayRotation=-target;state.lastHeading=target;return state.displayRotation}const delta=shortestDelta(state.lastHeading,target);state.displayRotation-=delta;state.lastHeading=target;return state.displayRotation}
  function loadSaved(){try{const x=JSON.parse(localStorage.getItem(STORE)||'null');if(!x||!finite(x.trueHeading))return;state.heading=norm(x.trueHeading);state.magneticHeading=finite(x.magneticHeading)?norm(x.magneticHeading):null;state.accuracy=finite(x.accuracy)?Number(x.accuracy):null;state.declination=finite(x.declination)?Number(x.declination):null;state.declinationAt=x.declinationAt||null;state.lat=finite(x.lat)?Number(x.lat):null;state.lon=finite(x.lon)?Number(x.lon):null;state.locationAccuracy=finite(x.locationAccuracy)?Number(x.locationAccuracy):null;state.cached=true}catch(_){}}
  function save(){try{localStorage.setItem(STORE,JSON.stringify({trueHeading:state.heading,magneticHeading:state.magneticHeading,accuracy:state.accuracy,declination:state.declination,declinationAt:state.declinationAt,lat:state.lat,lon:state.lon,locationAccuracy:state.locationAccuracy,savedAt:new Date().toISOString()}))}catch(_){}}
  async function calculateDeclination(lat,lon){
    if(!finite(lat)||!finite(lon))return null;
    state.modelState='loading';
    try{
      const mod=await import('https://esm.sh/magvar@2.2.0');
      const fn=mod.magvar||mod.default?.magvar||mod.default;
      if(typeof fn!=='function')throw new Error('WMM2025 model unavailable');
      const d=Number(fn(Number(lat),Number(lon),0,new Date()));
      if(!Number.isFinite(d))throw new Error('WMM2025 returned no declination');
      state.declination=d;state.declinationAt=new Date().toISOString();state.modelState='WMM2025';save();render();return d;
    }catch(_){state.modelState=state.declination==null?'unavailable':'cached';render();return state.declination}
  }
  function acquireLocation(){
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(async p=>{state.lat=p.coords.latitude;state.lon=p.coords.longitude;state.locationAccuracy=finite(p.coords.accuracy)?Number(p.coords.accuracy):null;await calculateDeclination(state.lat,state.lon)},()=>{render()}, {enableHighAccuracy:true,maximumAge:300000,timeout:10000});
  }
  function correctedHeading(reading){
    state.magneticHeading=reading.heading;
    if(reading.source==='magnetic'&&finite(state.declination))return norm(reading.heading+Number(state.declination));
    return reading.heading;
  }
  function render(status){
    const rose=$('#mainCompassRose'),value=$('#mainCompassHeading'),source=$('#mainCompassSource'),button=$('#mainCompassStart'),live=$('#mainCompassLive');
    if(status&&source)source.textContent=status;
    if(state.heading==null){if(value)value.textContent='—';if(rose)rose.style.transform='rotate(0deg)';if(live)live.textContent='OFF';return}
    const h=norm(state.heading);if(value)value.textContent=`${Math.round(h)}° ${cardinal(h)}`;if(rose)rose.style.transform=`rotate(${visualRotationForHeading(h)}deg)`;
    if(source&&!status){
      const accuracy=state.accuracy==null?'':` · ±${Math.round(state.accuracy)}° sensor accuracy`;
      if(state.cached&&!state.started)source.textContent=`Saved true-north heading${finite(state.declination)?` · WMM2025 declination ${Number(state.declination)>=0?'+':''}${Number(state.declination).toFixed(1)}°`:''}. Waiting for live orientation to verify it.`;
      else if(state.source==='magnetic'&&finite(state.declination))source.textContent=`Live TRUE NORTH heading${accuracy} · magnetic reading corrected by WMM2025 declination ${Number(state.declination)>=0?'+':''}${Number(state.declination).toFixed(1)}° for the current location/date.`;
      else if(state.source==='magnetic')source.textContent=`Live magnetic heading${accuracy} · waiting for location/WMM2025 declination before claiming true north.`;
      else source.textContent=`Live absolute device heading${accuracy} · browser reference frame does not expose a magnetic/true-north distinction.`;
    }
    if(button)button.textContent=state.started?'Compass active':'Enable live compass';if(live)live.textContent=state.started?'TRUE N':'CACHED';
  }
  function onOrientation(e){const reading=headingFromEvent(e);if(!reading)return;state.accuracy=reading.accuracy;state.source=reading.source;state.heading=correctedHeading(reading);state.cached=false;save();render()}
  function attach(){if(state.started)return;state.started=true;state.listener=onOrientation;if('ondeviceorientationabsolute'in window)window.addEventListener('deviceorientationabsolute',state.listener,true);window.addEventListener('deviceorientation',state.listener,true);render('Compass enabled · acquiring live orientation and true-north correction. Move the phone gently in a figure-eight if unstable.')}
  function detach(){if(!state.listener)return;window.removeEventListener('deviceorientationabsolute',state.listener,true);window.removeEventListener('deviceorientation',state.listener,true);state.listener=null;state.started=false;render()}
  async function start(){const button=$('#mainCompassStart');if(button)button.disabled=true;try{if(typeof DeviceOrientationEvent==='undefined')throw new Error('Device orientation sensors are not available in this browser.');if(typeof DeviceOrientationEvent.requestPermission==='function'){const result=await DeviceOrientationEvent.requestPermission();if(result!=='granted')throw new Error('Compass permission was not granted.')}attach();acquireLocation()}catch(err){state.started=false;render(err&&err.message?err.message:'Compass unavailable.');if(button){button.disabled=false;button.textContent='Enable live compass'}return}if(button)button.disabled=false}
  loadSaved();
  acquireLocation();
  const button=$('#mainCompassStart');if(button)button.addEventListener('click',start);
  window.addEventListener('pagehide',()=>{save();detach()},{once:true});
  if(state.heading!=null)render();else render('Compass off · tap Enable live compass. iPhone Safari requires a tap before motion permission can be requested. True-north correction uses location + WMM2025 when available.');
  window.DOMMainCompass=Object.freeze({start,detach,headingFromEvent,cardinal,normalize:norm,shortestDelta,state:()=>({...state,listener:!!state.listener})});
})();