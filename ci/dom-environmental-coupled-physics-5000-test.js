const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window=global;
vm.runInThisContext(fs.readFileSync('dom-environmental-coupled-physics.js','utf8'),{filename:'dom-environmental-coupled-physics.js'});
const P=global.DOMEnvironmentalCoupledPhysics;
assert(P,'physics module missing');
let seed=0x5eed1234;
function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/0x100000000}
function between(a,b){return a+(b-a)*rnd()}
function rel(a,b,tol=1e-9){return Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b))}
for(let i=0;i<5000;i++){
  const t=between(-40,45),p=between(850,1050),ppb=between(0,500),mw=between(10,200);
  const gas=P.gasPpbToUgM3(ppb,mw,t,p);assert(gas&&gas.ugM3>=0);assert(P.gasPpbToUgM3(ppb*2,mw,t,p).ugM3>=gas.ugM3);
  const h=between(0,4),rho=between(40,650),snow=P.snowPhysics(h,rho);assert(snow&&snow.snowWaterEquivalentMm>=0&&snow.loadPa>=0);assert(rel(snow.loadPa,rho*9.80665*h,1e-12));
  const d=between(2,120),iceRho=between(700,950),v=between(0,80),hail=P.hailPhysics(d,iceRho,v);assert(hail&&hail.massKg>0&&hail.kineticEnergyJ>=0);assert(rel(hail.kineticEnergyJ,0.5*hail.massKg*v*v,1e-12));
  const area=between(1,1e9),thick=between(0,300),dens=between(700,1100),ice=P.iceMass(area,thick,dens);assert(ice&&rel(ice.massKg,area*thick*dens,1e-12));
  const ws=between(0,250),dir=between(0,360),vec=P.windVector(ws,dir);assert(vec);assert(rel(Math.hypot(vec.uEastMs,vec.vNorthMs),ws/3.6,1e-12));
  const dt=between(0,86400),ad=P.advect(ws,dir,dt);assert(ad&&rel(ad.distanceM,(ws/3.6)*dt,1e-12));
  const mMg=between(0,1e12),soilKg=between(1,1e10),soil=P.soilConcentrationMgKg(mMg,soilKg);assert(soil&&rel(soil.mgKg,mMg/soilKg,1e-12));
  const K=between(0,0.01),grad=between(0,0.2),ne=between(0.05,0.6),darcy=P.darcyPoreVelocity(K,grad,ne);assert(darcy&&rel(darcy.poreVelocityMs,K*grad/ne,1e-12));
  const slick=P.slickMass(area,between(0,0.2),between(600,1100));assert(slick&&slick.massKg>=0);
  const c1=between(0,1000),c2=between(0,1000),q1=between(0.001,1e5),q2=between(0.001,1e5),mix=P.flowWeightedMix([{concentration:c1,flow:q1},{concentration:c2,flow:q2}]);assert(mix&&mix.concentration>=Math.min(c1,c2)-1e-9&&mix.concentration<=Math.max(c1,c2)+1e-9);
  const br=between(0,1000),hv=between(1e6,6e7),ef=between(0,2),burn=P.burnPhysics(br,hv,ef);assert(burn&&rel(burn.heatReleaseW,br*hv,1e-12)&&rel(burn.emissionRateKgS,br*ef,1e-12));
  const Q=between(0.001,1e5),u=between(0.1,60),sy=between(1,5000),sz=between(1,5000),y=between(-10000,10000),z=between(0,5000),H=between(0,500),pl=P.gaussianPlume(Q,u,sy,sz,y,z,H),plMirror=P.gaussianPlume(Q,u,sy,sz,-y,z,H);assert(pl&&pl.concentrationGm3>=0&&rel(pl.concentrationGm3,plMirror.concentrationGm3,1e-12));
  const lat=between(-70,70),lon=between(-170,170),ax=between(-2,2),ay=between(-2,2),base=between(-50,1050),pts=[];for(let j=0;j<8;j++){const dy=between(-2,2),dx=between(-2,2),plat=lat+dy,plon=lon+dx/Math.max(0.2,Math.cos(lat*Math.PI/180)),x=(plon-lon)*111.32*Math.cos(lat*Math.PI/180),yy=(plat-lat)*111.32;pts.push({lat:plat,lon:plon,temp:base+ax*x+ay*yy})}const sg=P.scalarGradient(lat,lon,pts,'temp');assert(sg);assert(Math.abs(sg.dValueDxPerKm-ax)<1e-8);assert(Math.abs(sg.dValueDyPerKm-ay)<1e-8);
  const a={lat:between(-80,80),lon:between(-179,179),time:'2026-01-01T00:00:00Z'},b={lat:between(-80,80),lon:between(-179,179),time:'2026-01-01T01:00:00Z'},dr=P.drift(a,b);assert(dr&&dr.distanceM>=0&&dr.speedMs>=0&&dr.bearingDeg>=0&&dr.bearingDeg<360);
}
assert.strictEqual(P.gasPpbToUgM3(null,46,20,1013),null);
assert.strictEqual(P.hailPhysics(20,917,null),null);
assert.strictEqual(P.darcyPoreVelocity(1e-5,0.01,0),null);
assert.strictEqual(P.gaussianPlume(1,0,10,10,0,0,0),null);
console.log('ENVIRONMENTAL_COUPLED_PHYSICS_5000=PASS');
console.log(JSON.stringify({iterations:5000,domains:['cryosphere','snow','hail','front gradients','air pollution','plume transport','soil contamination','groundwater','oil spill','water mixing','waste/junkyard fire'],policy:'equation-gated; missing inputs remain missing; no arbitrary hazard score'},null,2));
