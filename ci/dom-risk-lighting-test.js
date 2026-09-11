const fs=require('fs'),vm=require('vm'),assert=require('assert');
let reduce=false;
global.window={devicePixelRatio:1,addEventListener(){},matchMedia(){return{matches:reduce}}};
global.document={};
let src=fs.readFileSync('dom-live-globe-renderer.js','utf8').replace('const DOMLiveGlobeRenderer=','globalThis.DOMLiveGlobeRenderer=');
vm.runInThisContext(src,{filename:'dom-live-globe-renderer.js'});
const R=globalThis.DOMLiveGlobeRenderer;
assert(R,'renderer exported');
const future=new Date(Date.now()+60000).toISOString();
const past=new Date(Date.now()-60000).toISOString();
assert.equal(R.profile({activation:{id:'critical'},expiresAt:future},'sensor').id,'high');
assert.equal(R.profile({activation:{id:'heavy'},expiresAt:future},'sensor').id,'high');
assert.equal(R.profile({activation:{id:'elevated'},expiresAt:future},'sensor').id,'medium');
assert.equal(R.profile({activation:{id:'active'},expiresAt:future},'sensor').id,'low');
assert.equal(R.profile({activation:{id:'watching'},expiresAt:future},'sensor').id,'steady');
assert.equal(R.profile({activation:{id:'critical'},expiresAt:past},'sensor').id,'off');
assert.equal(R.profile({activation:{id:'critical'},observationStatus:'resolved'},'sensor').id,'off');
assert.equal(R.profile({activation:{id:'critical'},observationStatus:'stale'},'sensor').id,'unknown');
assert.equal(R.profile({activation:{id:'critical'},sourceStatus:'unavailable'},'sensor').id,'unknown');
assert.equal(R.profile({level:'extreme',expiresAt:future},'event').id,'high');
assert.equal(R.profile({level:'watch',expiresAt:future},'event').id,'medium');
assert.equal(R.profile({level:'info',expiresAt:future},'event').id,'low');
assert.equal(R.profile({activation:{id:'critical'},expiresAt:future},'sensor').animate,true);
reduce=true;
assert.equal(R.profile({activation:{id:'critical'},expiresAt:future},'sensor').animate,false);
assert.equal(R.profile({activation:{id:'elevated'},expiresAt:future},'sensor').animate,false);
reduce=false;

// Deterministic 10,000-case lifecycle stress qualification.
// Every case is derived from canonical risk band + liveness state; no random network data is required.
const bands=['critical','heavy','elevated','active','watching','idle'];
const statuses=['reported','active','stale','unknown','unavailable','resolved','cancelled','ended'];
const expectedBand={critical:'high',heavy:'high',elevated:'medium',active:'low',watching:'steady',idle:'steady'};
let seed=0xD0A5C0DE;
const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let i=0;i<10000;i++){
  const band=bands[next()%bands.length];
  const status=statuses[next()%statuses.length];
  const expired=(next()%13)===0;
  const item={activation:{id:band,score:(next()%1000)/1000},observationStatus:status,expiresAt:expired?past:future};
  const p=R.profile(item,'sensor');
  const stopped=/resolved|cancelled|ended/.test(status)||expired;
  const stale=/stale|unknown|unavailable/.test(status);
  const expected=stopped?'off':stale?'unknown':expectedBand[band];
  assert.equal(p.id,expected,`case ${i}: ${band}/${status}/expired=${expired}`);
  if(expected==='high'||expected==='medium') assert.equal(p.animate,true,`case ${i}: live elevated risk must animate`);
  else assert.equal(p.animate,false,`case ${i}: ${expected} must not animate`);
  assert(Number.isFinite(p.alpha)&&p.alpha>=0&&p.alpha<=1,`case ${i}: bounded alpha`);
  assert(Number.isFinite(p.scale)&&p.scale>0,`case ${i}: positive scale`);
}
console.log('DOM_RISK_LIGHTING_10000=PASS');
