const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const nodes=new Map();
const document={
  visibilityState:'visible',
  querySelector(sel){return nodes.get(sel)||null},
};
const fetch=async url=>{
  const s=String(url);
  if(s.includes('earthquake.usgs.gov'))return{ok:true,status:200,statusText:'OK',json:async()=>({features:[]})};
  if(s.includes('eonet.gsfc.nasa.gov'))return{ok:true,status:200,statusText:'OK',json:async()=>({events:[]})};
  if(s.includes('api.weather.gov'))return{ok:true,status:200,statusText:'OK',json:async()=>({features:[{id:'https://api.weather.gov/alerts/fixture',geometry:null,properties:{event:'Fixture Warning',sent:new Date().toISOString(),effective:new Date().toISOString(),expires:new Date(Date.now()+3600000).toISOString(),severity:'Extreme',certainty:'Observed',urgency:'Immediate','@id':'https://api.weather.gov/alerts/fixture'}}]})};
  throw new Error('unexpected fetch '+s);
};
const sandbox={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,URL,AbortController,fetch,document,navigator:{},location:{href:'https://example.test/hazards.html'},performance:{now:()=>Date.now()},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},Notification:undefined};
sandbox.window=sandbox;
sandbox.addEventListener=()=>{};
sandbox.dispatchEvent=()=>true;
const ctx=vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dom-observation-model.js','utf8'),ctx,{filename:'dom-observation-model.js'});
vm.runInContext('window.DOMObservationModel=DOMObservationModel',ctx);
vm.runInContext(fs.readFileSync('hazards.js','utf8'),ctx,{filename:'hazards.js'});
const value=code=>vm.runInContext(code,ctx);

assert.equal(value(`esc('"')`),'&quot;','HTML quote escaping must remain valid');
assert.equal(value(`correlationClass({kind:'Tsunami',officialAlert:true})`),'tsunami','official tsunami must keep tsunami correlation class');
assert.equal(value(`classify({kind:'Tsunami',officialAlert:true,severityText:'Tsunami Warning'}).hazardClass`),'tsunami');
assert.equal(value(`classify({kind:'Space Weather',officialAlert:false,severityText:'G4 - Severe'}).hazardClass`),'space-weather');
assert(value(`severity01({kind:'Tsunami',severityText:'Tsunami Warning'})`) > value(`severity01({kind:'Tsunami',severityText:'Tsunami Watch'})`));
assert(value(`severity01({kind:'Space Weather',severityText:'G5 - Extreme'})`) > value(`severity01({kind:'Space Weather',severityText:'G1 - Minor'})`));

const staleDespiteFetch=value(`freshness01({observedAt:new Date(Date.now()-72*3600000).toISOString(),fetchedAt:new Date().toISOString(),time:new Date().toISOString()})`);
assert(staleDespiteFetch<0.06,'recent browser fetch or legacy time cannot make an explicitly old observation fresh');
assert.equal(value(`temporalStatus({fetchedAt:new Date().toISOString()}).state`),'UNKNOWN','fetch time alone must never establish hazard freshness');
assert.equal(value(`temporalStatus({publishedAt:new Date(Date.now()-3600000).toISOString(),expiresAt:new Date(Date.now()-1000).toISOString()}).state`),'EXPIRED','expired source product must override publication recency');
assert(value(`freshness01({temporalKind:'model',validAt:new Date(Date.now()+3*3600000).toISOString(),fetchedAt:new Date().toISOString()})`)>.9,'future-valid model time remains temporally relevant without using fetch time');
assert.equal(value(`officialUrgency01({officialAlert:false,urgencyText:'Immediate'})`),null,'non-official events must not receive synthetic official urgency from recency or labels');
assert.equal(value(`officialUrgency01({officialAlert:true,urgencyText:'Immediate'})`),1,'official urgency remains a distinct official-source dimension');

const confidenceFresh=value(`DOMObservationModel.hazardEvidenceConfidence({quality:.9,geospatial:.8,corroboration:.4,certainty:.8,recency:1}).value`);
const confidenceStale=value(`DOMObservationModel.hazardEvidenceConfidence({quality:.9,geospatial:.8,corroboration:.4,certainty:.8,recency:0}).value`);
assert.equal(confidenceFresh,confidenceStale,'event recency must not inflate evidence confidence');
const pNoOptional=value(`DOMObservationModel.hazardPriority({physicalSeverity:.8,eventRecency:.7,officialUrgency:null,officialUrgencyApplicable:false,localRelevance:null,localRelevanceApplicable:false,evidenceConfidence:.7})`);
assert.equal(pNoOptional.components.filter(x=>x.applicable!==false).length,3,'inapplicable official urgency and local relevance must be omitted from priority denominator');
const pFive=value(`DOMObservationModel.hazardPriority({physicalSeverity:.8,eventRecency:.7,officialUrgency:.9,officialUrgencyApplicable:true,localRelevance:.6,localRelevanceApplicable:true,evidenceConfidence:.7})`);
assert.deepEqual(Array.from(pFive.components,x=>x.name),['physicalSeverity','eventRecency','officialUrgency','localRelevance','evidenceConfidence'],'priority audit must expose exactly five top-level dimensions');

value(`H.user={lat:40,lon:-74}`);
const local=value(`(()=>{const e={kind:'Official Weather Alert',officialAlert:true,appliesToUser:true,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate',publishedAt:new Date().toISOString(),validAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),lat:40,lon:-74,sourceType:'official-alert'};Object.assign(e,evaluate(e));return {eligible:isAlertEligible(e),priority:e.priorityAudit,confidence:e.evidenceConfidence,local:e.localRelevance}})()`);
assert.equal(local.eligible,true,'point-qualified unexpired local official warning should be alert eligible');
assert.equal(local.local,1,'official point-qualified local warning receives explicit applicability-based local relevance');
assert.equal(local.priority.components.length,5,'evaluated local official warning carries five-dimension priority audit');
assert(local.confidence.excluded.includes('recency')&&local.confidence.excluded.includes('severity')&&local.confidence.excluded.includes('urgency')&&local.confidence.excluded.includes('localRelevance'),'hazard evidence confidence exposes anti-double-counting exclusions');
const expiredLocal=value(`(()=>{const e={kind:'Official Weather Alert',officialAlert:true,appliesToUser:true,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate',publishedAt:new Date(Date.now()-3600000).toISOString(),expiresAt:new Date(Date.now()-1000).toISOString(),lat:40,lon:-74,sourceType:'official-alert'};Object.assign(e,evaluate(e));return isAlertEligible(e)})()`);
assert.equal(expiredLocal,false,'expired official warning must never trigger a local notification gate');
const fetchOnlyLocal=value(`(()=>{const e={kind:'Official Weather Alert',officialAlert:true,appliesToUser:true,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate',fetchedAt:new Date().toISOString(),lat:40,lon:-74,sourceType:'official-alert'};Object.assign(e,evaluate(e));return isAlertEligible(e)})()`);
assert.equal(fetchOnlyLocal,false,'fetch time alone must never authorize a local official-alert notification');
const remoteOfficial=value(`(()=>{const e={kind:'Official Weather Alert',officialAlert:true,appliesToUser:false,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate',publishedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),lat:40,lon:-74,sourceType:'official-alert'};Object.assign(e,evaluate(e));return {eligible:isAlertEligible(e),local:e.localRelevance}})()`);
assert.equal(remoteOfficial.eligible,false,'global broker official warning must not become a phone alert without applicability proof');
assert.equal(remoteOfficial.local,0,'official alert explicitly not applicable to user must not gain local relevance merely from coordinate proximity');
const tsunami=value(`(()=>{const e={kind:'Tsunami',officialAlert:true,appliesToUser:false,severityText:'Tsunami Warning',publishedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),lat:NaN,lon:NaN,sourceType:'official-alert',modality:'official-tsunami-product'};Object.assign(e,evaluate(e));return {eligible:isAlertEligible(e),text:evidenceFor(e).interpretation}})()`);
assert.equal(tsunami.eligible,false,'unlocated tsunami product must remain informational for local phone alerting');
assert(!tsunami.text.includes('around location not resolved'),'unlocated narrative must be grammatically truthful');

value(`H.seen=new Set(Array.from({length:10050},(_,i)=>'id-'+i));trimSeen()`);
assert(value('H.seen.size')<=7000,'seen state must be bounded');
value('H.refreshing=true;H.refreshPending=false');
value('refresh()');
assert.equal(value('H.refreshPending'),true,'refresh requested during active refresh must be queued');
value('H.refreshing=false;H.refreshPending=false');

(async()=>{
  const rows=await value('loadNWS()');
  assert.equal(rows.length,1);
  assert.equal(rows[0].appliesToUser,true,'point-query NWS result must carry local applicability proof');
  assert(rows[0].publishedAt&&rows[0].validAt&&rows[0].expiresAt&&rows[0].fetchedAt,'NWS record must keep publication, validity, expiry and fetch times separate');
  console.log('D.O.M. hazard semantics execution PASS');
})().catch(err=>{console.error(err);process.exitCode=1});
