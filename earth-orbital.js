import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

const GIBS='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const LAYER='VIIRS_SNPP_CorrectedReflectance_TrueColor';
const date=new Date(Date.now()-86400000).toISOString().slice(0,10);
const host=document.getElementById('earthOrbital');
const state=document.getElementById('providerState');
if(!host) throw new Error('earthOrbital host missing');

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,.1,100);
camera.position.z=3.15;
scene.add(new THREE.HemisphereLight(0xffffff,0x102030,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2.6); sun.position.set(-3,2,4); scene.add(sun);
const globe=new THREE.Mesh(new THREE.SphereGeometry(1,192,128),new THREE.MeshStandardMaterial({roughness:1,metalness:0}));
scene.add(globe);

const url=`${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${LAYER}&STYLES=&FORMAT=image/jpeg&TRANSPARENT=false&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&TIME=${date}`;
new THREE.TextureLoader().load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());globe.material.map=t;globe.material.needsUpdate=true;if(state)state.textContent=`Geographical Earth · continuous NASA VIIRS ${date} spherical observation surface · no raster wedges/polar mesh gaps · geographic detail takes over on descent.`;},undefined,e=>{if(state)state.textContent='Geographical Earth observation texture unavailable · geographic Earth remains available.';console.error(e);});

let dragging=false,lastX=0,lastY=0,zoom=3.15;
function down(e){dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)}
function move(e){if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;globe.rotation.y+=dx*.006;globe.rotation.x=Math.max(-1.45,Math.min(1.45,globe.rotation.x+dy*.006));}
function up(){dragging=false}
renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(1.55,Math.min(4.2,zoom+e.deltaY*.002));camera.position.z=zoom;},{passive:false});
let pinch=0;
renderer.domElement.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom=Math.max(1.55,Math.min(4.2,zoom-(d-pinch)*.006));camera.position.z=zoom;pinch=d;}},{passive:true});
function resize(){const w=host.clientWidth||1,h=host.clientHeight||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);resize();
function frame(){requestAnimationFrame(frame);renderer.render(scene,camera)}frame();
window.DOM_ORBITAL={reset(){globe.rotation.set(0,0,0);zoom=3.15;camera.position.z=zoom;},refresh(){location.reload();}};
