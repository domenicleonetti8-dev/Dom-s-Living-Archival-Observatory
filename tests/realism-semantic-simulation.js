'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('dom-realism-runtime.js','utf8');
const sandbox={window:{},matchMedia:()=>({matches:false}),console}; sandbox.window.window=sandbox.window;
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const R=sandbox.window.DOMRealismRuntime;assert(R,'runtime missing');
const poly={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
const rows=[
{id:'eq',kind:'earthquake',lat:40,lon:-74,mag:6.2,depth:12,truthState:'OBSERVED'},
{id:'fo',kind:'flood',lat:30,lon:-90,geometry:poly,truthState:'OBSERVED'},
{id:'fm',kind:'flood',lat:31,lon:-91,geometry:poly,truthState:'MODELED'},
{id:'cy',kind:'hurricane',lat:20,lon:-60,radiusKm:300,windKph:190,truthState:'OBSERVED'},
{id:'to',kind:'tornado',lat:35,lon:-97,truthState:'OBSERVED'},
{id:'tw',kind:'tornado',lat:36,lon:-98,geometry:poly,truthState:'WARNING'},
{id:'wx',kind:'thunderstorm',lat:34,lon:-96,truthState:'WARNING'},
{id:'gap',kind:'weather',lat:0,lon:0,truthState:'COVERAGE_GAP'},
{id:'bad',kind:'earthquake',lat:123,lon:500,mag:9,truthState:'OBSERVED'}
];
const s=R.ingest(rows);assert.equal(s.total,9);assert.equal(s.qualified,8);assert.equal(s.quarantined,1);assert.equal(s.renderable,7);assert.equal(s.truth.OBSERVED,4);assert.equal(s.truth.MODELED,1);assert.equal(s.truth.WARNING,2);assert.equal(s.truth.COVERAGE_GAP,1);
const fx=rows.map(R.effect);const by=id=>fx.find(x=>x&&x.id===id);
assert.equal(by('fo').label,'OBSERVED FLOOD EXTENT');assert.equal(by('fm').label,'MODELED FLOOD EXTENT');
assert.equal(by('to').funnelEligible,true);assert.equal(by('tw').funnelEligible,false);assert(by('tw').warningGeometry);
assert.equal(by('gap').atmosphereEligible,false);assert.equal(fx[8],null);
assert.equal(R.truth({truthState:'MODELED',officialAlert:true}),'MODELED');
assert.equal(R.modeForZoom(0),'ORBIT');assert.equal(R.modeForZoom(3),'ATMOSPHERE');assert.equal(R.modeForZoom(7),'REGIONAL');assert.equal(R.modeForZoom(12),'CITY');assert.equal(R.modeForZoom(15),'NEIGHBORHOOD');assert.equal(R.modeForZoom(18),'WALK');
const q=by('eq');const near=R.earthquakeResponse(q,10),far=R.earthquakeResponse(q,1000);assert(near.shake>far.shake);assert(near.rumble>far.rumble);
console.log(JSON.stringify({REALISM_SEMANTIC_SIMULATION:'PASS',summary:s,earthquake:{near,far},modes:[0,3,7,12,15,18].map(z=>[z,R.modeForZoom(z)])},null,2));
