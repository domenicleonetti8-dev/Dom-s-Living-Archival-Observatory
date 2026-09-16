const API='https://epic.gsfc.nasa.gov/api/natural';
const ARCHIVE='https://epic.gsfc.nasa.gov/archive/natural';
const stage=document.getElementById('epicStage');
const img=document.getElementById('epicEarth');
const state=document.getElementById('providerState');
const stamp=document.getElementById('earthTimestamp');
let frames=[],index=0,timer=null;
const status=t=>{if(state)state.textContent=t};
function imageURL(frame){const [d]=frame.date.split(' ');const [y,m,day]=d.split('-');return `${ARCHIVE}/${y}/${m}/${day}/png/${frame.image}.png`;}
function show(i){if(!frames.length)return;index=(i+frames.length)%frames.length;const f=frames[index];const next=imageURL(f);const probe=new Image();probe.onload=()=>{img.src=next;img.alt=`NASA DSCOVR EPIC full-disk Earth acquired ${f.date} UTC`;stamp.textContent=`NASA DSCOVR/EPIC · acquired ${f.date} UTC · frame ${index+1}/${frames.length}`;status('Geographical Earth · latest available NASA DSCOVR/EPIC full-disk observation.');};probe.onerror=()=>status('Geographical Earth · EPIC image failed to load; retrying metadata will not fabricate a frame.');probe.src=next;}
async function refresh(){status('Checking NASA DSCOVR/EPIC for the latest full-Earth observation…');try{const r=await fetch(`${API}?_=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`EPIC API ${r.status}`);const data=await r.json();if(!Array.isArray(data)||!data.length)throw new Error('no EPIC frames returned');frames=data.slice().sort((a,b)=>a.date.localeCompare(b.date));show(frames.length-1);}catch(e){status(`Geographical Earth · NASA EPIC unavailable · ${e.message}`);}}
function play(){clearInterval(timer);if(frames.length<2)return;timer=setInterval(()=>show(index+1),1400);}
document.getElementById('refreshEarth')?.addEventListener('click',refresh);
document.getElementById('latestEarth')?.addEventListener('click',()=>show(frames.length-1));
document.getElementById('playEarth')?.addEventListener('click',play);
img?.addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else stage?.requestFullscreen?.();});
refresh();
