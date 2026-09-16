import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

const GIBS='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const LIVE='VIIRS_SNPP_CorrectedReflectance_TrueColor';
const host=document.getElementById('earthOrbital');
const state=document.getElementById('providerState');
if(!host)throw new Error('earthOrbital host missing');
const setState=t=>{if(state)state.textContent=t};
const utcDate=days=>new Date(Date.now()-days*86400000).toISOString().slice(0,10);
const dates=[utcDate(0),utcDate(1),utcDate(2)];
// The VIIRS corrected-reflectance product is an opaque true-colour Earth image. Requesting it
// as transparent PNG turned no-data/background pixels into black on iOS WebGL. Keep it opaque.
const liveWms=d=>`${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${LIVE}&STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&TIME=${d}`;

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x00050a,1);host.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.z=3.15;
const mat=new THREE.MeshBasicMaterial({color:0x173f55});
const globe=new THREE.Mesh(new THREE.SphereGeometry(1,256,160),mat);scene.add(globe);
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.018,192,128),new THREE.MeshBasicMaterial({color:0x70cfff,transparent:true,opacity:.075,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(atmosphere);

const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
function prep(t){t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
function loadObservation(i=0){
 if(i>=dates.length){setState('Geographical Earth · satellite image unavailable · geographic terrain remains available.');return;}
 const d=dates[i];
 loader.load(liveWms(d),t=>{mat.map=prep(t);mat.color.set(0xffffff);mat.needsUpdate=true;setState(`Geographical Earth · NASA VIIRS ${d} full-Earth satellite image · continuous spherical surface · no WebGL tile wedges.`);},undefined,()=>loadObservation(i+1));
}
loadObservation();

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
window.DOM_ORBITAL={reset(){paused=false;host.classList.remove('detail-active');document.getElementById('earthMap')?.classList.remove('active');globe.rotation.set(0,0,0);syncRotation();zoom=3.15;camera.position.z=zoom;setState('Geographical Earth · continuous satellite Earth active.');},refresh(){loadObservation(0);},resume(){paused=false;zoom=1.62;camera.position.z=zoom;}};
