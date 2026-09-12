const fs=require('fs');const vm=require('vm');
function assert(ok,msg){if(!ok)throw new Error(msg)}
const code=fs.readFileSync('dom-earth-geodesy.js','utf8');const box={window:{},console};vm.runInNewContext(code,box);const G=box.window.DOMEarthGeodesy;
assert(G&&G.earthShell.datum==='WGS84','geodesy unavailable');
assert(G.earthShell.arFrame==='RealityKit-right-handed-Y-up','AR frame contract unavailable');
let seed=0x5eed1234;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
let checked=0;
for(let i=0;i<100000;i++){
  const lat=-90+180*rnd(),lon=-180+360*rnd(),elev=-11000+111000*rnd();
  const ecef=G.geodeticToECEF(lat,lon,elev),frame=G.surfaceFrame(lat,lon,elev,0),room=G.scenePosition(lat,lon,elev,0,.35);
  assert(ecef&&frame&&room,`valid coordinate rejected ${i}`);
  for(const n of [ecef.x,ecef.y,ecef.z,frame.unit.x,frame.unit.y,frame.unit.z,room.x,room.y,room.z])assert(Number.isFinite(n),`non-finite transform ${i}`);
  const unit=Math.hypot(frame.unit.x,frame.unit.y,frame.unit.z);assert(Math.abs(unit-1)<1e-12,`unit vector drift ${i}`);
  const rr=Math.hypot(room.x,room.y,room.z);assert(rr>0&&rr<.37,`room-scale radius out of bounds ${i}`);
  checked++;
}
const north=G.scenePosition(90,0,0,0,.35),east=G.scenePosition(0,90,0,0,.35),prime=G.scenePosition(0,0,0,0,.35);
assert(north.y>.349999&&Math.abs(north.x)<1e-12&&Math.abs(north.z)<1e-12,'north pole must map to RealityKit +Y');
assert(prime.x>.349999&&Math.abs(prime.y)<1e-12&&Math.abs(prime.z)<1e-12,'prime-meridian equator must map to RealityKit +X');
assert(east.z<-.349999&&Math.abs(east.x)<1e-12&&Math.abs(east.y)<1e-12,'90E equator must map to RealityKit -Z');
for(const [lat,lon] of [[91,0],[-91,0],[0,181],[0,-181],[NaN,0],[0,Infinity]])assert(G.geodeticToECEF(lat,lon,0)===null,'invalid coordinate accepted');
console.log(`DOM_EARTH_GEODESY_100000=PASS cases=${checked} datum=${G.earthShell.datum} arFrame=${G.earthShell.arFrame}`);
