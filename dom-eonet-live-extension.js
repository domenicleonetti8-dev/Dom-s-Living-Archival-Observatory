(()=>{
'use strict';
let timer=null,lastError=null,lastCount=0,lastWildfireCount=0;
const valid=(lat,lon)=>Number.isFinite(+lat)&&Number.isFinite(+lon)&&+lat>=-90&&+lat<=90&&+lon>=-180&&+lon<=180;
async function j(url,ms=22000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:'no-store',signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}}
function categoryIds(e){return(e.categories||[]).map(x=>String(x.id||x.title||'').toLowerCase())}
function kindOf(e){const ids=categoryIds(e),s=`${ids.join(' ')} ${e.title||''}`.toLowerCase();if(ids.some(x=>x==='wildfires'||x==='wildfire')||/\bwildfires?\b|forest fire|bushfire/.test(s))return'Wildfire';if(ids.some(x=>x==='severestorms')||/severe.?storms?|cyclone|hurricane|typhoon|tropical storm/.test(s))return'Severe Storm';if(ids.some(x=>x==='volcanoes')||/volcano|eruption|volcanic/.test(s))return'Volcano';if(ids.some(x=>x==='floods')||/flood/.test(s))return'Flood';if(ids.some(x=>x==='drought')||/drought/.test(s))return'Drought';if(/dust.?haze|dust storm|sandstorm|haze/.test(s))return'Atmospheric Hazard';if(/temp.?extremes?|heat wave|heatwave|extreme heat|extreme cold|cold wave/.test(s))return'Extreme Temperature';if(/sea.?lake.?ice|sea ice|lake ice/.test(s))return'Sea / Lake Ice';if(/snow|blizzard|winter storm|snowstorm/.test(s))return'Winter Weather';if(/landslide|mudslide|debris flow/.test(s))return'Landslide';return null}
function pts(coords,out=[]){if(!Array.isArray(coords))return out;if(coords.length>=2&&Number.isFinite(+coords[0])&&Number.isFinite(+coords[1])){if(valid(coords[1],coords[0]))out.push([+coords[0],+coords[1]]);return out}for(const x of coords)pts(x,out);return out}
function geomInfo(g){if(!g||!g.type)return null;const p=pts(g.coordinates,[]);if(!p.length)return null;let lat=0,sin=0,cos=0;for(const [lon,la] of p){lat+=la;const r=lon*Math.PI/180;sin+=Math.sin(r);cos+=Math.cos(r)}lat/=p.length;const lon=Math.atan2(sin,cos)*180/Math.PI;if(!valid(lat,lon))return null;return{lat,lon,areaGeometry:['Polygon','MultiPolygon'].includes(g.type)?{type:g.type,coordinates:g.coordinates}:undefined,type:g.type}}
function newest(e){const a=Array.isArray(e.geometry)?e.geometry:[];for(let i=a.length-1;i>=0;i--){const z=geomInfo(a[i]);if(z)return{...z,date:a[i].date||null}}return null}
function normalize(e,forcedKind=null){const kind=forcedKind||kindOf(e);if(!kind)return null;const g=newest(e);if(!g)return null;const cats=categoryIds(e).join(', ');return{id:`eonet:${e.id}`,kind,title:e.title||kind,source:'NASA EONET',agency:'NASA EONET',sourceType:'event-aggregation',lineageId:`nasa-eonet-${cats||kind}`,modality:'event-aggregation',authoritative:true,officialAlert:false,sourceStatus:'open',observationStatus:'current',lat:g.lat,lon:g.lon,observedAt:g.date,time:g.date,locationPrecision:g.type==='Point'?'event-geometry-point':'event-geometry-centroid',areaGeometry:g.areaGeometry,url:(e.sources||[])[0]?.url||e.link||'',detail:`OPEN EONET ${kind} · ${cats||'source category'}`,wildfireCategoryVerified:kind==='Wildfire'&&categoryIds(e).some(x=>x==='wildfires'||x==='wildfire')}}
async function refresh(){try{
  const [allData,wildfireData]=await Promise.all([
    j('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1000'),
    j('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=1000')
  ]);
  const byId=new Map();
  for(const e of allData.events||[]){const n=normalize(e);if(n)byId.set(n.id,n)}
  for(const e of wildfireData.events||[]){const n=normalize(e,'Wildfire');if(n){n.wildfireCategoryVerified=true;n.detail=`OPEN EONET Wildfire · dedicated wildfires category`;byId.set(n.id,n)}}
  const out=[...byId.values()];
  lastWildfireCount=out.filter(x=>x.kind==='Wildfire').length;lastCount=out.length;lastError=null;
  window.dispatchEvent(new CustomEvent('dom:hazard-extension',{detail:{source:'eonet-live',events:out,wildfireCount:lastWildfireCount,wildfireSource:'NASA EONET dedicated wildfires category'}}));
}catch(e){lastError=String(e?.message||e)}}
document.addEventListener('DOMContentLoaded',()=>{refresh();timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},120000)},{once:true});window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer)},{once:true});window.DOMEONETLiveExtension=Object.freeze({refresh,state:()=>({lastCount,lastWildfireCount,lastError})});
})();