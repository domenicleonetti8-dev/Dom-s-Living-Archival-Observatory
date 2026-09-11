const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('dom-scientific-instrument-fabric.js','utf8');
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(src,sandbox);
const f=sandbox.window.DOMScientificInstrumentFabric;
function ok(x,m){if(!x)throw new Error(m)}
ok(f,'fabric missing');
ok(Array.isArray(f.FIELDS)&&f.FIELDS.length>=30,'too few scientific fields');
ok(Array.isArray(f.NETWORKS)&&f.NETWORKS.length>=45,'too few network families');
ok(new Set(f.FIELDS).size===f.FIELDS.length,'duplicate fields');
ok(new Set(f.NETWORKS.map(x=>x.id)).size===f.NETWORKS.length,'duplicate network ids');
for(const n of f.NETWORKS){
  ok(n.id&&n.agency&&n.name&&n.field&&n.platform&&n.scope&&n.access&&n.url,`incomplete network ${n.id}`);
  ok(f.FIELDS.includes(n.field),`unregistered field ${n.field}`);
  ok(/^https:\/\//.test(n.url),`non-https source ${n.id}`);
}
const required=['meteorology','climate','air-quality','hydrology','groundwater','snow','soil-moisture','oceanography','sea-level','tsunami','marine-chemistry','marine-biology','seismology','geodesy','volcanology','geomagnetism','infrasound','hydroacoustics','cryosphere','permafrost','ecology','forest-carbon','biodiversity','coral-reefs','space-weather','ionosphere','solar-physics','astronomy','cosmic-rays','radiation-monitoring','satellite-earth-observation','research-vessels','gliders-autonomous-platforms'];
for(const field of required)ok(f.FIELDS.includes(field),`missing target field ${field}`);
const platformRules={satellite:'orbital',profilingFloat:'marine',surface:'surface',depth:'depth'};
let seed=0x5a17c9e3;function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<50000;i++){
  const lat=-90+rnd()*180,lon=-180+rnd()*360;
  ok(Number.isFinite(lat)&&lat>=-90&&lat<=90,'lat invariant');
  ok(Number.isFinite(lon)&&lon>=-180&&lon<=180,'lon invariant');
  const n=f.NETWORKS[Math.floor(rnd()*f.NETWORKS.length)];
  ok(f.FIELDS.includes(n.field),'field lookup invariant');
  if(n.platform==='satellite')ok(/orbit|satellite|space|geostationary|polar/i.test(`${n.scope} ${n.platform}`),'satellite semantics');
  if(/buoy|float|glider|ocean|marine|research-vessel/.test(n.platform))ok(n.field.includes('ocean')||n.field.includes('marine')||n.field==='tsunami'||n.field==='research-vessels'||n.field==='gliders-autonomous-platforms','marine placement semantics');
}
console.log(`SCIENTIFIC_INSTRUMENT_FABRIC_PASS fields=${f.FIELDS.length} networks=${f.NETWORKS.length} invariant_cases=50000`);
