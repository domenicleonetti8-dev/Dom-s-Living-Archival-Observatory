(()=>{
'use strict';
const host=document.getElementById('earthMap');
if(!host)return;
const countEl=document.getElementById('earthCount');
const stateEl=document.getElementById('providerState');
const records=[];
const seen=new Set();
let yaw=-0.45,pitch=0.20,drag=null,raf=0,last=0;
const canvas=document.createElement('canvas');
canvas.dataset.domEarthRecovery='1';
canvas.setAttribute('aria-label','D.O.M. resilient Earth fallback');
canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;touch-action:none;';
host.style.position=host.style.position||'relative';
host.prepend(canvas);
const ctx=canvas.getContext('2d');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const valid=(lat,lon)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
function add(r){if(!r||!valid(r.lat,r.lon))return;const k=`${r.id||r.source}:${Number(r.lat).toFixed(4)}:${Number(r.lon).toFixed(4)}`;if(seen.has(k))return;seen.add(k);records.push({...r,lat:Number(r.lat),lon:Number(r.lon)});}
function size(){const r=host.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=`${r.width}px`;canvas.style.height=`${r.height}px`}return{w,h,d,cx:w/2,cy:h/2,radius:Math.min(w,h)*.39};}
function project(lat,lon,s){const la=lat*Math.PI/180,lo=lon*Math.PI/180+yaw,x=Math.cos(la)*Math.sin(lo),y=Math.sin(la),z=Math.cos(la)*Math.cos(lo),cp=Math.cos(pitch),sp=Math.sin(pitch),yy=y*cp-z*sp,zz=y*sp+z*cp;if(zz<=0)return null;return{x:s.cx+x*s.radius,y:s.cy-yy*s.radius,z:zz};}
const coast=[
[[-168,72],[-140,60],[-125,50],[-118,33],[-100,20],[-83,25],[-72,45],[-60,58],[-82,72],[-120,75],[-168,72]],
[[-82,12],[-72,-5],[-66,-25],[-57,-52],[-42,-55],[-35,-20],[-52,2],[-82,12]],
[[-18,37],[5,35],[28,31],[42,15],[51,-12],[35,-35],[18,-35],[2,-28],[-11,0],[-18,37]],
[[-10,36],[10,55],[35,66],[72,72],[105,60],[130,48],[150,55],[178,50],[160,30],[125,18],[103,5],[82,20],[58,28],[40,35],[20,42],[-10,36]],
[[112,-11],[154,-10],[153,-40],[132,-44],[113,-27],[112,-11]],
[[-52,60],[-20,60],[-25,82],[-48,83],[-52,60]]
];
function lineGeo(points,s){ctx.beginPath();let started=false;for(const [lon,lat] of points){const p=project(lat,lon,s);if(!p){started=false;continue}if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}ctx.stroke();}
function draw(ts=performance.now()){raf=0;if(last&&ts-last<28){raf=requestAnimationFrame(draw);return}const s=size();ctx.clearRect(0,0,s.w,s.h);const g=ctx.createRadialGradient(s.cx-s.radius*.25,s.cy-s.radius*.28,s.radius*.05,s.cx,s.cy,s.radius);g.addColorStop(0,'#50d9ff');g.addColorStop(.42,'#1670b7');g.addColorStop(.82,'#062b59');g.addColorStop(1,'#020914');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.cx,s.cy,s.radius,0,Math.PI*2);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(s.cx,s.cy,s.radius,0,Math.PI*2);ctx.clip();ctx.strokeStyle='rgba(111,240,255,.20)';ctx.lineWidth=Math.max(1,s.d*.6);for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let lon=-180;lon<=180;lon+=4)pts.push([lon,lat]);lineGeo(pts,s)}for(let lon=-150;lon<=180;lon+=30){const pts=[];for(let lat=-88;lat<=88;lat+=3)pts.push([lon,lat]);lineGeo(pts,s)}ctx.strokeStyle='rgba(153,255,205,.72)';ctx.lineWidth=Math.max(1.3,s.d*1.1);for(const p of coast)lineGeo(p,s);for(const r of records){const p=project(r.lat,r.lon,s);if(!p)continue;ctx.fillStyle=r.type==='earthquake'?'#5ae5ff':r.type==='alert'?'#ff536f':r.type==='hazard'?'#ffd43b':'#36e58b';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8*s.d;ctx.beginPath();ctx.arc(p.x,p.y,(r.type==='station'?2.2:3.2)*s.d,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.shadowBlur=0;ctx.strokeStyle='rgba(111,240,255,.55)';ctx.lineWidth=1.2*s.d;ctx.beginPath();ctx.arc(s.cx,s.cy,s.radius,0,Math.PI*2);ctx.stroke();last=ts;}
function requestDraw(){if(!raf)raf=requestAnimationFrame(draw)}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;yaw+=dx*.007;pitch=clamp(pitch-dy*.007,-1.3,1.3);requestDraw()});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{drag=null});
new ResizeObserver(requestDraw).observe(host);
function updateCount(){if(countEl)countEl.textContent=`${records.length.toLocaleString()} geographic points loaded`;requestDraw();}
async function json(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{signal:c.signal,cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw Error(`${r.status}`);return await r.json()}finally{clearTimeout(t)}}
async function text(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error(`${r.status}`);return await r.text()}finally{clearTimeout(t)}}
async function pollUSGS(){try{const j=await json('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');for(const f of j.features||[]){const c=f?.geometry?.coordinates;if(Array.isArray(c))add({id:`usgs:${f.id}`,source:'USGS',type:'earthquake',lat:c[1],lon:c[0]})}}catch(_){}}
async function pollEONET(){try{const j=await json('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=500');for(const e of j.events||[]){const g=(e.geometry||[]).at(-1);if(g?.type==='Point'&&Array.isArray(g.coordinates))add({id:`eonet:${e.id}`,source:'NASA EONET',type:'hazard',lat:g.coordinates[1],lon:g.coordinates[0]})}}catch(_){}}
async function pollCOOPS(){try{const j=await json('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels');for(const s of j.stations||[])add({id:`coops:${s.id}`,source:'NOAA CO-OPS',type:'station',lat:s.lat,lon:s.lng})}catch(_){}}
async function pollNDBC(){try{const x=await text('https://www.ndbc.noaa.gov/activestations.xml'),d=new DOMParser().parseFromString(x,'application/xml');for(const s of d.querySelectorAll('station'))add({id:`ndbc:${s.getAttribute('id')}`,source:'NOAA NDBC',type:'station',lat:s.getAttribute('lat'),lon:s.getAttribute('lon')})}catch(_){}}
async function recoverData(){records.length=0;seen.clear();await Promise.allSettled([pollUSGS(),pollEONET(),pollCOOPS(),pollNDBC()]);updateCount();}
function mapLooksHealthy(){const c=host.querySelector('.maplibregl-canvas');return !!c&&/NASA Blue Marble geographic baseline active/i.test(stateEl?.textContent||'');}
const healthTimer=setInterval(()=>{if(mapLooksHealthy()){canvas.style.display='none';clearInterval(healthTimer)}},1000);
setTimeout(()=>{if(!mapLooksHealthy()&&stateEl){stateEl.textContent=`Geographic renderer degraded · resilient Earth fallback active · ${records.length.toLocaleString()} source-backed points recovered independently of the basemap.`}},8000);
recoverData();requestDraw();setInterval(recoverData,300000);
window.DOMEarthRecovery=Object.freeze({records:()=>records.slice(),refresh:recoverData,state:()=>({records:records.length,yaw,pitch,mapHealthy:mapLooksHealthy()})});
})();
