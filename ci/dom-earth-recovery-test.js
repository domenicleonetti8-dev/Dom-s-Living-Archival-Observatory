const fs=require('fs');
const assert=require('assert');
const recovery=fs.readFileSync('earth-recovery.js','utf8');
const freshness=fs.readFileSync('earth-freshness-ui.js','utf8');
const earth=fs.readFileSync('earth.js','utf8');

assert(recovery.includes("document.getElementById('earthMap')"),'fallback must bind to Earth container');
assert(recovery.includes('pollUSGS')&&recovery.includes('pollEONET')&&recovery.includes('pollCOOPS')&&recovery.includes('pollNDBC'),'fallback must recover independent public source-backed points');
assert(recovery.includes('valid(r.lat,r.lon)'),'fallback must reject invalid coordinates');
assert(!recovery.includes('Math.random'),'fallback must never invent point locations');
assert(recovery.includes('mapLooksHealthy'),'fallback must yield to the primary renderer after verified health');
assert(freshness.includes("./earth-recovery.js?v=1"),'classic-script path must load recovery even when module import fails');
assert(freshness.includes('window.DOMEarthRecovery'),'freshness UI must accept recovery runtime when primary runtime is absent');
assert(earth.includes("map.on('load',()=>{installEarthImagery();installObservationLayers();refreshFabric()"),'test must continue detecting the primary load coupling until it is deliberately removed');
console.log('DOM_EARTH_RECOVERY=PASS');
