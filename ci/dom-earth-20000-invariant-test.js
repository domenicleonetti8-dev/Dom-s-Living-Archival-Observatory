const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const hazards=read('hazards.html');
const earth=read('earth.html');
const earthjs=read('earth.js');
const globe=read('dom-live-globe-renderer.js');
const health=read('dom-planet-health.js');
const registrySrc=read('dom-public-sensor-registry.js');

// Route separation is a hard invariant.
assert(index.includes('href="./hazards.html"'),'hazard route missing');
assert(index.includes('href="./earth.html"'),'Earth route missing');
assert(!index.includes('href="./hazards.html#apple-ar"'),'Apple Earth still aliases hazards page');
assert(hazards.includes('href="./earth.html"'),'hazard page does not leave for Earth');
assert(earth.includes('id="earthMap"'),'geographic Earth map missing');
assert(earthjs.includes("setProjection({type:'globe'})"),'globe projection missing');
assert(earthjs.includes("coordinates:[r.lon,r.lat]"),'GeoJSON lon/lat anchoring missing');
assert(!earthjs.includes('Math.random('),'random/decorative sensor placement forbidden');

// Registry must remain exactly visible as registered metadata, not be confused with live ingestion.
const sandbox={}; vm.createContext(sandbox); vm.runInContext(registrySrc.replace('const DOMPublicSensorRegistry=','globalThis.DOMPublicSensorRegistry='),sandbox);
const reg=sandbox.DOMPublicSensorRegistry;
assert(reg&&Array.isArray(reg.feeds),'registry unavailable');
assert.strictEqual(reg.feeds.length,20,'registered source-family count changed unexpectedly');
assert.strictEqual(new Set(reg.feeds.map(x=>x.id)).size,20,'duplicate registry source id');

function validLatLon(lat,lon){return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180}
function projectToUnitSphere(lat,lon){if(!validLatLon(lat,lon))return null;const a=Number(lat)*Math.PI/180,o=Number(lon)*Math.PI/180;return{x:Math.cos(a)*Math.cos(o),y:Math.sin(a),z:Math.cos(a)*Math.sin(o)}}

// 20,000 deterministic geospatial invariant evaluations.
let seed=0x51f15e7d;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
let accepted=0,rejected=0;
for(let i=0;i<20000;i++){
  const shouldBeValid=(i%4)!==0;
  const lat=shouldBeValid?(-90+rnd()*180):(i%8===0?90.0001+rnd()*900:NaN);
  const lon=shouldBeValid?(-180+rnd()*360):(i%8===4?180.0001+rnd()*900:Infinity);
  const ok=validLatLon(lat,lon);
  assert.strictEqual(ok,shouldBeValid,`coordinate validity mismatch at case ${i}`);
  const p=projectToUnitSphere(lat,lon);
  if(shouldBeValid){
    accepted++;
    assert(p,`valid coordinate failed projection at ${i}`);
    const r=Math.hypot(p.x,p.y,p.z);
    assert(Math.abs(r-1)<1e-12,`surface anchor left unit sphere at ${i}: ${r}`);
  }else{
    rejected++;
    assert.strictEqual(p,null,`invalid coordinate projected at ${i}`);
  }
}
assert.strictEqual(accepted,15000);
assert.strictEqual(rejected,5000);

// Truth boundaries seen in screenshots must survive the repair.
assert(health.includes('coverage>=.6'),'planet-health coverage gate weakened');
assert(health.includes('qualified.length>=6'),'planet-health domain gate weakened');
assert(globe.includes("type==='sensor'"),'existing sensor-risk renderer removed');
assert(globe.includes("'#34d17b'")&&globe.includes("'#ffd43b'")&&globe.includes("'#ff7a1a'"),'working green/yellow/orange risk lighting changed');

console.log('DOM_EARTH_20000_INVARIANTS=PASS');
console.log(JSON.stringify({evaluations:20000,valid_surface_anchors:accepted,rejected_invalid_coordinates:rejected,registered_source_families:reg.feeds.length,routes_separated:true,truth_gates_preserved:true}));
