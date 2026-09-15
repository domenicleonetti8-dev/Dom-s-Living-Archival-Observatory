const DOMRealismRuntime=(()=>{
  'use strict';
  const TRUTH=new Set(['OBSERVED','WARNING','MODELED','BACKGROUND','COVERAGE_GAP']);
  const state={enabled:false,mode:'ORBIT',audio:false,muted:false,events:[],effects:[],lastFrame:0};
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const text=v=>String(v??'');
  const reduced=()=>matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function kind(e={}){const s=`${e.kind||''} ${e.category||''} ${e.type||''} ${e.title||''}`.toLowerCase();if(/earthquake|seismic|\bquake\b/.test(s))return'earthquake';if(/tornado|waterspout/.test(s))return'tornado';if(/hurricane|typhoon|cyclone|tropical storm/.test(s))return'cyclone';if(/flood|inundation/.test(s))return'flood';if(/thunderstorm|lightning|storm|weather/.test(s))return'weather';if(/wildfire|bushfire|forest fire/.test(s))return'fire';return'other'}
  function truth(e={}){const explicit=text(e.truthState||e.evidenceClass||e.observationClass).toUpperCase();if(TRUTH.has(explicit))return explicit;if(e.modeled===true||/forecast|model|outlook/.test(text(e.status)+' '+text(e.detail)))return'MODELED';if(e.officialAlert===true||/warning|watch|advisory/.test(text(e.status)+' '+text(e.title)))return'WARNING';if(e.infrastructure===true)return'BACKGROUND';return'OBSERVED'}
  function validPoint(e){return finite(e?.lat)&&finite(e?.lon)&&Number(e.lat)>=-90&&Number(e.lat)<=90&&Number(e.lon)>=-180&&Number(e.lon)<=180}
  function observedGeometry(e){return e?.geometry&&['Polygon','MultiPolygon','LineString','MultiLineString'].includes(e.geometry.type)?e.geometry:null}
  function magnitude(e){const v=finite(e?.mag)?Number(e.mag):finite(e?.magnitude)?Number(e.magnitude):null;return v===null?null:clamp(v,0,10)}
  function effect(e){if(!e||!validPoint(e))return null;const k=kind(e),t=truth(e),geometry=observedGeometry(e),base={id:text(e.id||e.sourceId||`${k}:${e.lat}:${e.lon}`),kind:k,truth:t,lat:Number(e.lat),lon:Number(e.lon),geometry,source:text(e.agency||e.source||''),title:text(e.title||k),expiresAt:e.expiresAt||null};
    if(k==='earthquake'){const mag=magnitude(e),depth=finite(e.depth)?Math.max(0,Number(e.depth)):null;return{...base,magnitude:mag,depthKm:depth,shakeEligible:t==='OBSERVED'&&mag!==null,rumbleEligible:t==='OBSERVED'&&mag!==null};}
    if(k==='flood')return{...base,waterEligible:(t==='OBSERVED'||t==='MODELED')&&!!geometry,label:t==='MODELED'?'MODELED FLOOD EXTENT':'OBSERVED FLOOD EXTENT'};
    if(k==='tornado')return{...base,funnelEligible:t==='OBSERVED',warningGeometry:t==='WARNING'?geometry:null};
    if(k==='cyclone')return{...base,atmosphereEligible:t==='OBSERVED'||t==='WARNING'||t==='MODELED',radiusKm:finite(e.radiusKm)?Math.max(0,Number(e.radiusKm)):null,windKph:finite(e.windKph)?Math.max(0,Number(e.windKph)):null};
    if(k==='weather')return{...base,atmosphereEligible:t!=='COVERAGE_GAP'};
    return base;
  }
  function ingest(rows=[]){state.events=Array.isArray(rows)?rows.slice():[];state.effects=state.events.map(effect).filter(Boolean);return summary();}
  function modeForZoom(z){z=Number(z)||0;return z>=17?'WALK':z>=14?'NEIGHBORHOOD':z>=10?'CITY':z>=5?'REGIONAL':z>=2?'ATMOSPHERE':'ORBIT'}
  function setZoom(z){state.mode=modeForZoom(z);return state.mode}
  function earthquakeResponse(e,distanceKm){if(!e?.shakeEligible||!finite(distanceKm))return{shake:0,rumble:0};const d=Math.max(1,Number(distanceKm)),m=e.magnitude??0,depth=Math.max(1,e.depthKm??10);const attenuation=Math.pow(10,0.42*m)/(Math.pow(d+depth,1.18));const intensity=clamp(attenuation/4,0,1);return{shake:reduced()?0:intensity,rumble:intensity};}
  function canRender(e){if(!e)return false;if(e.kind==='tornado')return e.funnelEligible||!!e.warningGeometry;if(e.kind==='flood')return e.waterEligible;if(e.kind==='earthquake')return true;if(e.kind==='cyclone'||e.kind==='weather')return e.atmosphereEligible;return true}
  function summary(){const out={total:state.events.length,qualified:state.effects.length,renderable:0,quarantined:state.events.length-state.effects.length,truth:{}};for(const e of state.effects){out.truth[e.truth]=(out.truth[e.truth]||0)+1;if(canRender(e))out.renderable++;}return out}
  async function enableAudio(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;state.audio=true;return true}
  function setMuted(v){state.muted=!!v;return state.muted}
  function snapshot(){return{enabled:state.enabled,mode:state.mode,audio:state.audio,muted:state.muted,...summary()}}
  function enable(){state.enabled=true;return snapshot()}
  function disable(){state.enabled=false;return snapshot()}
  return Object.freeze({enable,disable,ingest,setZoom,earthquakeResponse,enableAudio,setMuted,snapshot,truth,kind,effect,modeForZoom});
})();
if(typeof window!=='undefined')window.DOMRealismRuntime=DOMRealismRuntime;
