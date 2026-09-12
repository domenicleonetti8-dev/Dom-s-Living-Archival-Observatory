const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
function assert(ok,msg){if(!ok){console.error('FAIL',msg);process.exitCode=1}else console.log('PASS',msg)}
const broker=read('broker/dom_observation_broker.py');
const adapters=read('broker/scientific_station_adapters.py');
const sourceAdapters=read('broker/dom_adapters.py');
const nhc=read('broker/nhc_gis_adapter.py');
const earth=read('earth.js');
assert(broker.includes('poll_earthscope_fdsn')&&broker.includes('poll_usgs_monitoring_locations'),'broker imports real scientific inventory adapters');
assert(broker.includes('"earthscope-fdsn"')&&broker.includes('"usgs-water-sites"'),'scientific inventories have explicit source identities');
assert(broker.includes('INVENTORY_POLL_SECONDS')&&broker.includes('adapter_intervals'),'heavy inventories use slower polling cadence');
assert(broker.includes('if r.get("inventorySnapshot")')&&broker.includes('|inventory'),'inventory refresh replaces prior snapshot instead of unbounded duplicate growth');
assert(adapters.includes('level=station&format=text')&&adapters.includes('monitoring-locations/items'),'FDSN and USGS monitoring-location endpoints are wired');
assert(adapters.includes('observed_at=None')&&adapters.includes('fetchedAt=observed_at')&&adapters.includes('temporalKind="inventory"'),'inventory retrieval time is represented as fetch/snapshot time, not measurement observation time');
assert(broker.includes('"publishedAt": published')&&broker.includes('"validAt": valid')&&broker.includes('"expiresAt": expires')&&broker.includes('"fetchedAt": fetched')&&broker.includes('"receivedAt": received'),'broker record contract carries distinct canonical source-time and broker-receipt fields');
assert(broker.includes('source_time_ok = any((r.get("observedAt"), r.get("publishedAt"), r.get("validAt")))'),'non-inventory records require a real source-semantic time rather than browser/broker fetch time alone');
assert(broker.includes('nonnegative_float')&&broker.includes('probability01')&&broker.includes('horizontalAccuracyMeters')&&broker.includes('uncertaintyRadiusMeters')&&broker.includes('confidenceLevel'),'broker normalizes uncertainty fields before persistence');
assert(broker.includes('location_precision = clean_optional_text(extra.pop("locationPrecision", None)) or "unresolved"'),'broker never upgrades missing location precision to source-coordinate');
assert(sourceAdapters.includes('publishedAt=sent, validAt=valid, temporalKind="publication"'),'NWS adapter separates publication and validity time');
assert(sourceAdapters.includes('publishedAt=updated, temporalKind="publication"'),'tsunami publication timestamp is not mislabeled as an observation');
assert(sourceAdapters.includes('publishedAt=issued, temporalKind="publication"'),'space-weather issuance timestamp is not mislabeled as an observation');
assert(nhc.includes('publishedAt=issued, temporalKind="forecast"'),'NHC forecast geometry carries issuance as publication time rather than observation time');
assert(earth.includes('/v1/observations')&&earth.includes('DOMSRuntimeConfig')&&earth.includes('loadBroker'),'geographic Earth consumes persistent broker observations');
assert(earth.includes('recordKeys')&&earth.includes('clearRecords'),'Earth deduplicates source-backed records between refreshes');
assert(!/Math\.random\s*\(/.test(earth+broker+adapters),'scientific fabric has no randomized geographic placement');
if(process.exitCode)process.exit(process.exitCode);
