(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const state={started:false,heading:null,accuracy:null,source:'none',listener:null};
  const finite=v=>Number.isFinite(Number(v));
  const norm=d=>((Number(d)%360)+360)%360;
  const cardinal=h=>{
    const names=['N','NE','E','SE','S','SW','W','NW'];
    return names[Math.round(norm(h)/45)%8];
  };
  const screenAngle=()=>{
    const a=globalThis.screen&&screen.orientation&&finite(screen.orientation.angle)?Number(screen.orientation.angle):finite(globalThis.orientation)?Number(globalThis.orientation):0;
    return norm(a);
  };
  function headingFromEvent(e){
    if(e&&finite(e.webkitCompassHeading))return{heading:norm(e.webkitCompassHeading),accuracy:finite(e.webkitCompassAccuracy)&&Number(e.webkitCompassAccuracy)>=0?Number(e.webkitCompassAccuracy):null,source:'magnetic'};
    if(e&&e.absolute===true&&finite(e.alpha))return{heading:norm(360-Number(e.alpha)+screenAngle()),accuracy:null,source:'absolute-device'};
    return null;
  }
  function render(status){
    const needle=$('#compassNeedle'),value=$('#compassHeading'),source=$('#compassSource'),button=$('#startCompass');
    if(status&&source)source.textContent=status;
    if(state.heading==null){
      if(value)value.textContent='—';
      if(needle)needle.style.transform='rotate(0deg)';
      return;
    }
    const h=norm(state.heading);
    if(value)value.textContent=`${Math.round(h)}° ${cardinal(h)}`;
    if(needle)needle.style.transform=`rotate(${-h}deg)`;
    if(source){
      const accuracy=state.accuracy==null?'':` · ±${Math.round(state.accuracy)}° reported accuracy`;
      source.textContent=`Live ${state.source==='magnetic'?'magnetic':'absolute device'} heading${accuracy}`;
    }
    if(button)button.textContent='Compass active';
  }
  function onOrientation(e){
    const reading=headingFromEvent(e);if(!reading)return;
    state.heading=reading.heading;state.accuracy=reading.accuracy;state.source=reading.source;render();
  }
  function attach(){
    if(state.started)return;
    state.started=true;
    state.listener=onOrientation;
    if('ondeviceorientationabsolute' in window)window.addEventListener('deviceorientationabsolute',state.listener,true);
    window.addEventListener('deviceorientation',state.listener,true);
    render('Compass enabled · move the phone gently to calibrate.');
  }
  async function start(){
    const button=$('#startCompass');if(button)button.disabled=true;
    try{
      if(typeof DeviceOrientationEvent==='undefined')throw new Error('Device orientation sensors are not available in this browser.');
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted')throw new Error('Compass permission was not granted.');
      }
      attach();
    }catch(err){
      state.started=false;render(err&&err.message?err.message:'Compass unavailable.');
      if(button){button.disabled=false;button.textContent='Enable live compass';}
      return;
    }
    if(button)button.disabled=false;
  }
  const button=$('#startCompass');if(button)button.addEventListener('click',start);
  render('Compass off · tap Enable live compass. On iPhone, Safari requires a tap before motion permission can be requested.');
  window.DOMCompass=Object.freeze({start,headingFromEvent,cardinal,normalize:norm});
})();
