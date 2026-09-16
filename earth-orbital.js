import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

const GIBS='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const LIVE='VIIRS_SNPP_CorrectedReflectance_TrueColor';
const BASE='BlueMarble_ShadedRelief_Bathymetry';
const host=document.getElementById('earthOrbital');
const state=document.getElementById('providerState');
if(!host)throw new Error('earthOrbital host missing');
const setState=t=>{if(state)state.textContent=t};
const utcDate=days=>new Date(Date.now()-days*86400000).toISOString().slice(0,10);
const dates=[utcDate(0),utcDate(1),utcDate(2)];
const wms=(layer,date='')=>`${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${layer}&STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024${date?`&TIME=${date}`:''}`;

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x00050a,1);host.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.z=3.15;
const mat=new THREE.MeshBasicMaterial({color:0x173f55});
const globe=new THREE.Mesh(new THREE.SphereGeometry(1,192,128),mat);scene.add(globe);
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.018,160,96),new THREE.MeshBasicMaterial({color:0x70cfff,transparent:true,opacity:.075,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(atmosphere);

// Safari-safe image -> CanvasTexture path. We validate decoded dimensions before the image can
// replace the current globe texture, so an error document/empty response cannot turn Earth black.
function loadCanvasTexture(url){return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.decoding='async';img.onload=()=>{if(img.naturalWidth<512||img.naturalHeight<256){reject(new Error(`invalid satellite image ${img.naturalWidth}x${img.naturalHeight}`));return;}try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d',{alpha:false});x.drawImage(img,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;resolve(t);}catch(e){reject(e)}};img.onerror=()=>reject(new Error('satellite image request failed'));img.src=url;});}
let currentTexture=null;
function applyTexture(t){const old=currentTexture;currentTexture=t;mat.map=t;mat.color.set(0xffffff);mat.needsUpdate=true;if(old)old.dispose();}
async function loadEarth(){
 setState('Geographical Earth · loading continuous NASA whole-Earth satellite surface · build 0710…');
 // First establish a known continuous photographic Earth. It remains on the sphere unless a
 // newer observation successfully decodes; failed observation requests can never blank it.
 try{const base=await loadCanvasTexture(wms(BASE));applyTexture(base);setState('Geographical Earth · continuous NASA Earth loaded · checking latest VIIRS observation…');}
 catch(e){console.error('base Earth texture failed',e);setState('Geographical Earth · NASA Earth image request failed · geographic terrain remains available.');return;}
 for(const d of dates){try{const live=await loadCanvasTexture(wms(LIVE,d));applyTexture(live);setState(`Geographical Earth · NASA VIIRS ${d} full-Earth satellite image · one continuous spherical texture · no tile wedges.`);return;}catch(e){console.warn(`VIIRS ${d} failed`,e)}}
 setState('Geographical Earth · continuous NASA Earth active · latest VIIRS observation unavailable.');
}
loadEarth();

let dragging=false,lastX=0,lastY=0,zoom=3.15,pinch=0,paused=false;
function syncRotation(){atmosphere.rotation.copy(globe.rotation)}
function geographicCenter(){let lng=THREE.MathUtils.radToDeg(-globe.rotation.y)%360;if(lng>180)lng-=360;if(lng<-180)lng+=360;const lat=Math.max(-85,Math.min(85,THREE.MathUtils.radToDeg(globe.rotation.x)));return{lng,lat};}
function enterDetail(){if(paused)return;paused=true;const c=geographicCenter();window.DOM_DETAIL?.enter(c.lng,c.lat,3.2);}
function down(e){if(paused)return;dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)}
function move(e){if(!dragging||paused)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;globe.rotation.y+=dx*.006;globe.rotation.x=Math.max(-1.45,Math.min(1.45,globe.rotation.x+dy*.006));syncRotation()}
function up(){dragging=false}
renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();if(paused)return;zoom=Math.max(1.52,Math.min(4.2,zoom+e.deltaY*.002));camera.position.z=zoom;if(zoom<=1.57)enterDetail();},{passive:false});
renderer.domElement.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{if(paused||e.touches.length!==2||!pinch)return;const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom=Math.max(1.52,Math.min(4.2,zoom-(d-pinch)*.006));camera.position.z=zoom;pinch=d;if(zoom<=1.57)enterDetail();},{passive:true});
renderer.domElement.addEventListener('dblclick',()=>enterDetail());
function resize(){const w=host.clientWidth||1,h=host.clientHeight||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();
function frame(){requestAnimationFrame(frame);if(!paused)renderer.render(scene,camera)}frame();
window.DOM_ORBITAL={reset(){paused=false;host.classList.remove('detail-active');document.getElementById('earthMap')?.classList.remove('active');globe.rotation.set(0,0,0);syncRotation();zoom=3.15;camera.position.z=zoom;setState(currentTexture?'Geographical Earth · continuous satellite Earth active.':'Geographical Earth · loading satellite Earth…');},refresh(){loadEarth();},resume(){paused=false;zoom=1.62;camera.position.z=zoom;}};
