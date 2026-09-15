(()=>{
'use strict';
const state={bound:false,mode:null,map:null,lastError:null};
function emit(name,detail){window.dispatchEvent(new CustomEvent(name,{detail}))}
function bind(){
  const R=window.DOMRealismRuntime,m=window.DOMCurrentHazardMap?.map;
  if(!R||!m||state.bound)return false;
  state.bound=true;state.map=m;
  const sync=()=>{try{const z=Number(m.getZoom?.()||0),mode=R.modeForZoom(z);if(mode!==state.mode){state.mode=mode;emit('dom:realism-mode',{mode,zoom:z,truthContract:['OBSERVED','WARNING','MODELED','BACKGROUND','COVERAGE_GAP']})}}catch(e){state.lastError=String(e?.message||e)}};
  m.on?.('zoom',sync);m.on?.('load',sync);sync();
  emit('dom:realism-runtime-ready',{semanticCanonical:true,upstreamMutation:false,branchIsolation:true});
  return true;
}
function wait(){if(bind())return;let n=0;const t=setInterval(()=>{if(bind()||++n>120)clearInterval(t)},250)}
window.DOMRealismObservatoryAdapter=Object.freeze({state:()=>({...state}),bind});
window.addEventListener('dom:map-ready',wait);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();
