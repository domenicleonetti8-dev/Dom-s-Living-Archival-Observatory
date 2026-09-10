const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const listeners=new Map();
class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}}
const document={readyState:'loading',addEventListener(){},querySelector(){return null},getElementById(){return null},visibilityState:'visible'};
const sandbox={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,URL,CustomEvent,document,setTimeout,clearTimeout,setInterval,clearInterval,performance:{now:()=>Date.now()},navigator:{},location:{href:'https://example.test/hazards.html'},requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,__notifications:[]};
sandbox.window=sandbox;
sandbox.addEventListener=(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)};
sandbox.dispatchEvent=ev=>{for(const fn of listeners.get(ev.type)||[])fn(ev);return true};
sandbox.notifyNew=events=>sandbox.__notifications.push(...events.map(e=>e.id));
sandbox.recordHistory=()=>{};
const ctx=vm.createContext(sandbox);
function load(path){vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path})}
function value(code){return vm.runInContext(code,ctx)}

load('dom-sensor-activation.js');
load('dom-observation-ingress.js');
load('dom-global-sensor-globe.js');
load('dom-organism-runtime.js');
load('dom-observation-hazard-bridge.js');

const now=new Date().toISOString();
value(`globalThis.__normalized=DOMObservationIngress.normalize({id:'ci-station',sourceAgency:'CI Agency',network:'CI Net',lineageId:'ci-lineage',kind:'Earthquake',modality:'seismic',lat:40,lon:-74,time:${JSON.stringify(now)},url:'https://example.com/source',authoritative:true,quality:.9,freshness:.8})`);
assert.equal(value('__normalized.ok'),true,'canonical ingress must accept valid record');
assert.equal(value('__normalized.record.sourceId'),'ci-station');
value('globalThis.__packet=DOMObservationIngress.toSensor(__normalized.record)');
assert.equal(value('__packet.sensorId'),'ci-station','sourceId must survive into sensor identity');
assert.equal(value('__packet.sourceId'),'ci-station');
value('globalThis.__globe=DOMGlobalSensorGlobe.normalizeSensor(__packet)');
assert.equal(value('__globe.id'),'ci-station','sensor identity must survive globe normalization');
assert.equal(value('__globe.lineageId'),'ci-lineage');
value("DOMOrganismRuntime.accept([__normalized.record],'ci')");
assert.equal(value("DOMOrganismRuntime.snapshot().sensors.some(s=>s.id==='ci-station'&&s.lineageId==='ci-lineage')"),true,'organism must contain canonical sensor');

const expired=new Date(Date.now()-72*3600e3).toISOString();
value(`globalThis.__old=DOMObservationIngress.normalize({id:'old-quake',sourceAgency:'CI Agency',network:'CI Net',lineageId:'ci-lineage',kind:'Earthquake',modality:'seismic',lat:41,lon:-73,time:${JSON.stringify(expired)},url:'https://example.com/old',authoritative:true}).record`);
value("DOMOrganismRuntime.accept([__old],'ci')");
assert.equal(value("DOMOrganismRuntime.snapshot().sensors.some(s=>s.id==='old-quake')"),false,'expired live sensor must not enter globe state');

const futureExpiry=new Date(Date.now()+3600e3).toISOString();
value(`globalThis.__nws=DOMObservationIngress.normalize({id:'nws-ci',sourceAgency:'NWS',network:'NWS CAP',lineageId:'nws-cap',kind:'Official Weather Alert',modality:'official-warning',lat:42,lon:-72,time:${JSON.stringify(now)},expiresAt:${JSON.stringify(futureExpiry)},url:'https://api.weather.gov/alerts/ci',authoritative:true,officialAlert:true,observationStatus:'observed'}).record`);
value('globalThis.__nwsPacket=DOMObservationIngress.toSensor(__nws)');
assert.equal(value('__nwsPacket.expiresAt'),futureExpiry,'expiry must survive sensor packet');
assert.equal(value('__nwsPacket.officialAlert'),true);

value(`globalThis.__swpc=DOMObservationIngress.normalize({id:'swpc-ci',sourceAgency:'NOAA SWPC',network:'NOAA SWPC',lineageId:'noaa-swpc-alerts',kind:'Space Weather',modality:'space-weather-alert',time:${JSON.stringify(now)},url:'https://services.swpc.noaa.gov/products/alerts.json',authoritative:true,observationStatus:'forecast',severityText:'G3 - Strong'}).record`);
value('globalThis.__swEvent=DOMObservationHazardBridge.toEvent(__swpc)');
assert.equal(value('__swEvent.kind'),'Space Weather','Space Weather must survive broker hazard bridge');
assert.equal(value('__swEvent.observationStatus'),'forecast');
assert.equal(value('Number.isNaN(__swEvent.lat)&&Number.isNaN(__swEvent.lon)'),true,'Space Weather must remain unlocated without source geometry');
assert.equal(value('DOMObservationHazardBridge.stale({...__swEvent,time:new Date(Date.now()-80*3600e3).toISOString()},Date.now())'),true,'old Space Weather forecast must expire');

function canonical(id,minute){return value(`DOMObservationIngress.normalize({id:${JSON.stringify(id)},sourceAgency:'CI Agency',network:'CI Net',lineageId:'ci-alert-lineage',kind:'Earthquake',modality:'seismic',lat:40,lon:-74,time:new Date(Date.now()+${minute}*60000).toISOString(),url:'https://example.com/'+${JSON.stringify(id)},authoritative:true}).record`)}
sandbox.__snapshotRecord=canonical('snapshot-hydration',0);
sandbox.__primeRecord=canonical('first-stream-prime',1);
sandbox.__liveRecord=canonical('later-live-stream',2);
let r=value("DOMObservationHazardBridge.accept([__snapshotRecord],'snapshot')");
assert.equal(r.notified,0,'snapshot hydration must never notify');
assert.deepEqual(sandbox.__notifications,[],'snapshot hydration must be silent');
r=value("DOMObservationHazardBridge.accept([__primeRecord],'stream')");
assert.equal(r.notified,0,'first stream replay must prime silently');
assert.deepEqual(sandbox.__notifications,[],'first stream replay must be silent');
r=value("DOMObservationHazardBridge.accept([__liveRecord],'stream')");
assert.equal(r.notified,1,'later genuinely new stream record may notify');
assert.deepEqual(sandbox.__notifications,['later-live-stream']);

console.log('D.O.M. canonical JavaScript organism execution PASS');
