const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
function assert(ok,msg){if(!ok){console.error('FAIL',msg);process.exitCode=1}else console.log('PASS',msg)}
const broker=read('broker/dom_observation_broker.py');
const adapters=read('broker/scientific_station_adapters.py');
const earth=read('earth.js');
assert(broker.includes('poll_earthscope_fdsn')&&broker.includes('poll_usgs_monitoring_locations'),'broker imports real scientific inventory adapters');
assert(broker.includes('"earthscope-fdsn"')&&broker.includes('"usgs-water-sites"'),'scientific inventories have explicit source identities');
assert(broker.includes('INVENTORY_POLL_SECONDS')&&broker.includes('adapter_intervals'),'heavy inventories use slower polling cadence');
assert(broker.includes('if r.get("inventorySnapshot")')&&broker.includes('|inventory'),'inventory refresh replaces prior snapshot instead of unbounded duplicate growth');
assert(adapters.includes('level=station&format=text')&&adapters.includes('monitoring-locations/items'),'FDSN and USGS monitoring-location endpoints are wired');
assert(earth.includes('/v1/observations')&&earth.includes('DOMSRuntimeConfig')&&earth.includes('loadBroker'),'geographic Earth consumes persistent broker observations');
assert(earth.includes('recordKeys')&&earth.includes('clearRecords'),'Earth deduplicates source-backed records between refreshes');
assert(!/Math\.random\s*\(/.test(earth+broker+adapters),'scientific fabric has no randomized geographic placement');
if(process.exitCode)process.exit(process.exitCode);
