// Current D.O.M. hazard-only coupled-physics qualification. No Geographic Earth scope.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const listeners={};
const sandbox={console,Math,Number,String,Array,Object,Map,Set,Date,JSON,setTimeout:()=>0,clearTimeout:()=>{},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},document:{readyState:'complete'},window:null};
sandbox.window=sandbox;sandbox.addEventListener=(n,f)=>{(listeners[n]??=[]).push(f)};sandbox.dispatchEvent=()=>true;
sandbox.DOMHazardRenderReconciler={rows:()=>[]};sandbox.DOMGlobalOperationalWeather={points:()=>[]};
const ctx=vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dom-planetary-coupled-hazard-math.js','utf8'),ctx);
const M=sandbox.DOMPlanetaryCoupledHazardMath;
assert(M,'coupled hazard math must export');
function close(a,b,t=1e-9){assert(Math.abs(a-b)<=t,`${a} != ${b}`)}
for(let i=0;i<100000;i++){
  const lat1=-89.9+179.8*((i*7919%100000)/99999),lon1=-179.9+359.8*((i*104729%100000)/99999),lat2=-89.9+179.8*((i*15485863%100000)/99999),lon2=-179.9+359.8*((i*32452843%100000)/99999);
  const d1=M.km(lat1,lon1,lat2,lon2),d2=M.km(lat2,lon2,lat1,lon1);assert(Number.isFinite(d1)&&d1>=0&&d1<=20016,'haversine distance bounded on Earth');close(d1,d2,1e-9);close(M.km(lat1,lon1,lat1,lon1),0,1e-12);
  const speed=(i%401),dir=(i*37)%360,w=M.windVector(speed,dir);assert(w&&Number.isFinite(w.uEastMs)&&Number.isFinite(w.vNorthMs));close(Math.hypot(w.uEastMs,w.vNorthMs),speed/3.6,1e-10);
  const temp=-40+(i%8100)/100,rh=i%101,v=M.vaporPressureDeficitKPa(temp,rh);assert(v&&v.vpdKPa>=-1e-12);if(rh===100)close(v.vpdKPa,0,1e-10);
}
const synthetic=[];for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)synthetic.push({lat:40+y,lon:-75+x,pressure:1000+0.02*(x*111.32*Math.cos(40*Math.PI/180))-0.03*(y*111.32)});const g=M.pressureGradient(40,-75,synthetic);assert(g&&g.sampleCount>=3);close(g.dpdxHpaPerKm,0.02,2e-4);close(g.dpdyHpaPerKm,-0.03,2e-4);
sandbox.DOMGlobalOperationalWeather={points:()=>[{lat:0,lon:0,time:'2026-09-14T19:00:00Z',temp:30,humidity:20,pressure:1000,wind:36,windDir:90,cloud:10},{lat:10,lon:0,time:'2026-09-14T19:00:00Z',temp:28,humidity:30,pressure:999,wind:20,windDir:100,cloud:20},{lat:0,lon:10,time:'2026-09-14T19:00:00Z',temp:29,humidity:25,pressure:998,wind:25,windDir:80,cloud:15}]};
let a=M.analyze({id:'q',kind:'Earthquake',lat:0,lon:0,mag:7,depthKm:20,usgsTsunamiFlag:false,sourceGeometry:{type:'Point',coordinates:[0,0]}});assert(a.ok);assert.strictEqual(a.physics.derived.approxRadiatedEnergyJ,null,'energy relation must not run when magnitude type is not Mw');assert.strictEqual(a.physics.derived.tsunamiScreen,'MAGNITUDE_DEPTH_SCREEN_ONLY_NOT_TSUNAMI_CONFIRMATION');assert(!('score' in a.physics.derived),'no arbitrary hazard score may be emitted');
a=M.analyze({id:'f',kind:'Wildfire',lat:0,lon:0,sourceGeometry:{type:'Point',coordinates:[0,0]}});assert(a.ok&&a.physics.derived.airDrynessVPD&&a.physics.derived.windVector);assert(!('score' in a.physics.derived),'wildfire context must not invent danger probability');assert(a.physics.requiredButMissing.includes('fuel moisture / fuel type at fire perimeter'));
console.log('D.O.M. COUPLED HAZARD PHYSICS 100000=PASS');