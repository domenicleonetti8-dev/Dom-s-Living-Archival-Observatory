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
  if(s.includes('api.weather.gov'))return{ok:true,status:200,statusText:'OK',json:async()=>({features:[{id:'https://api.weather.gov/alerts/fixture',geometry:null,properties:{event:'Fixture Warning',sent:new Date().toISOString(),severity:'Extreme',certainty:'Observed',urgency:'Immediate','@id':'https://api.weather.gov/alerts/fixture'}}]})};
  throw new Error('unexpected fetch '+s);
};
const sandbox={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,URL,AbortController,fetch,document,navigator:{},location:{href:'https://example.test/hazards.html'},performance:{now:()=>Date.now()},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},Notification:undefined};
sandbox.window=sandbox;
sandbox.addEventListener=()=>{};
sandbox.dispatchEvent=()=>true;
const ctx=vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('hazards.js','utf8'),ctx,{filename:'hazards.js'});
const value=code=>vm.runInContext(code,ctx);

assert.equal(value(`esc('"')`),'&quot;','HTML quote escaping must remain valid');
assert.equal(value(`correlationClass({kind:'Tsunami',officialAlert:true})`),'tsunami','official tsunami must keep tsunami correlation class');
assert.equal(value(`classify({kind:'Tsunami',officialAlert:true,severityText:'Tsunami Warning'}).hazardClass`),'tsunami');
assert.equal(value(`classify({kind:'Space Weather',officialAlert:false,severityText:'G4 - Severe'}).hazardClass`),'space-weather');
assert(value(`severity01({kind:'Tsunami',severityText:'Tsunami Warning'})`) > value(`severity01({kind:'Tsunami',severityText:'Tsunami Watch'})`));
assert(value(`severity01({kind:'Space Weather',severityText:'G5 - Extreme'})`) > value(`severity01({kind:'Space Weather',severityText:'G1 - Minor'})`));

value(`H.user={lat:40,lon:-74}`);
const local=value(`(()=>{const e={kind:'Official Weather Alert',officialAlert:true,appliesToUser:true,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate',time:new Date().toISOString(),lat:40,lon:-74,sourceType:'official-alert'};Object.assign(e,evaluate(e));return isAlertEligible(e)})()`);
assert.equal(local,true,'point-qualified local official warning should be alert eligible');
const remoteOfficial=value(`(()=>{const e={kind:'Official Weather Alert',officialAlert:true,appliesToUser:false,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate',time:new Date().toISOString(),lat:40,lon:-74,sourceType:'official-alert'};Object.assign(e,evaluate(e));return isAlertEligible(e)})()`);
assert.equal(remoteOfficial,false,'global broker official warning must not become a phone alert without applicability proof');
const tsunami=value(`(()=>{const e={kind:'Tsunami',officialAlert:true,appliesToUser:false,severityText:'Tsunami Warning',time:new Date().toISOString(),lat:NaN,lon:NaN,sourceType:'official-alert',modality:'official-tsunami-product'};Object.assign(e,evaluate(e));return {eligible:isAlertEligible(e),text:evidenceFor(e).interpretation}})()`);
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
  console.log('D.O.M. hazard semantics execution PASS');
})().catch(err=>{console.error(err);process.exitCode=1});
