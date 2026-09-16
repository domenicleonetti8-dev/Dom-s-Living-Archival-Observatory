const API='https://epic.gsfc.nasa.gov/api/natural';
const ARCHIVE='https://epic.gsfc.nasa.gov/archive/natural';
const img=document.getElementById('observedEarth');
const state=document.getElementById('providerState');
const stamp=document.getElementById('earthTimestamp');
const status=t=>{if(state)state.textContent=t};
const url=f=>{const [d]=f.date.split(' ');const [y,m,day]=d.split('-');return `${ARCHIVE}/${y}/${m}/${day}/png/${f.image}.png`;};
async function refresh(){status('Loading latest NASA full-disk Earth observation…');try{const r=await fetch(`${API}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`NASA API ${r.status}`);const frames=await r.json();if(!Array.isArray(frames)||!frames.length)throw new Error('no observation returned');const f=frames.reduce((a,b)=>a.date>b.date?a:b);const src=url(f);const probe=new Image();probe.crossOrigin='anonymous';probe.onload=()=>{img.src=src;stamp.textContent=`NASA DSCOVR/EPIC · acquired ${f.date} UTC`;status('Geographical Earth · latest available observed full-disk Earth');};probe.onerror=()=>status('NASA full-disk observation image unavailable; previous image preserved.');probe.src=`${src}?v=${Date.now()}`;}catch(e){status(`NASA observation unavailable · ${e.message}`);}}
document.getElementById('refreshEarth')?.addEventListener('click',refresh);
refresh();
