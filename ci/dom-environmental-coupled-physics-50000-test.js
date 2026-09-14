const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window=global;
vm.runInThisContext(fs.readFileSync('dom-environmental-coupled-physics.js','utf8'),{filename:'dom-environmental-coupled-physics.js'});
const P=global.DOMEnvironmentalCoupledPhysics;
assert(P,'physics module missing');
let seed=0x50c0ffee;
function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/0x100000000}
function between(a,b){return a+(b-a)*rnd()}
function rel(a,b,tol=1e-9){return Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b))}
function wrapLon(x){while(x>180)x-=360;while(x<-180)x+=360;return x}
for(let i=0;i<50000;i++){
  const t=between(-80,55),p=between(700,1100),ppb=between(0,5000),mw=between(2,300);
  const gas=P.gasPpbToUgM3(ppb,mw,t,p);assert(gas&&gas.ugM3>=0);assert(P.gasPpbToUgM3(ppb*2,mw,t,p).ugM3>=gas.ugM3);assert(P.gasPpbToUgM3(ppb,mw,t,p*1.1).ugM3>=gas.ugM3);assert(P.gasPpbToUgM3(ppb,mw,t+10,p).ugM3<=gas.ugM3+1e-12);
  const h=between(0,8),rho=between(20,900),snow=P.snowPhysics(h,rho);assert(snow&&snow.snowWaterEquivalentMm>=0&&snow.loadPa>=0);assert(rel(snow.loadPa,rho*9.80665*h,1e-12));assert(rel(snow.snowWaterEquivalentMm,h*rho,1e-12));
  const d=between(1,180),iceRho=between(500,1000),v=between(0,120),hail=P.hailPhysics(d,iceRho,v);assert(hail&&hail.massKg>0&&hail.kineticEnergyJ>=0);assert(rel(hail.kineticEnergyJ,0.5*hail.massKg*v*v,1e-12));
  const area=between(0,1e10),thick=between(0,500),dens=between(500,1300),ice=P.iceMass(area,thick,dens);assert(ice&&rel(ice.volumeM3,area*thick,1e-12)&&rel(ice.massKg,area*thick*dens,1e-12));
  const ws=between(0,350),dir=between(-720,720),vec=P.windVector(ws,dir),vec360=P.windVector(ws,dir+360);assert(vec&&vec360);assert(rel(Math.hypot(vec.uEastMs,vec.vNorthMs),ws/3.6,1e-12));assert(rel(vec.uEastMs,vec360.uEastMs,1e-12)&&rel(vec.vNorthMs,vec360.vNorthMs,1e-12));
  const dt=between(0,172800),ad=P.advect(ws,dir,dt);assert(ad&&rel(ad.distanceM,(ws/3.6)*dt,1e-12));assert(rel(Math.hypot(ad.eastM,ad.northM),ad.distanceM,1e-12));
  const mMg=between(0,1e14),soilKg=between(1,1e12),soil=P.soilConcentrationMgKg(mMg,soilKg);assert(soil&&rel(soil.mgKg,mMg/soilKg,1e-12));
  const K=between(0,0.1),grad=between(0,1),ne=between(0.01,1),darcy=P.darcyPoreVelocity(K,grad,ne);assert(darcy&&rel(darcy.darcyFluxMs,K*grad,1e-12)&&rel(darcy.poreVelocityMs,K*grad/ne,1e-12));
  const slickThickness=between(0,1),slickDensity=between(500,1300),slick=P.slickMass(area,slickThickness,slickDensity);assert(slick&&slick.massKg>=0);assert(rel(slick.volumeM3,area*slickThickness,1e-12));assert(rel(slick.massKg,area*slickThickness*slickDensity,1e-12));
  const c1=between(0,1e5),c2=between(0,1e5),q1=between(0.001,1e6),q2=between(0.001,1e6),mix=P.flowWeightedMix([{concentration:c1,flow:q1},{concentration:c2,flow:q2}]);assert(mix&&mix.concentration>=Math.min(c1,c2)-1e-9&&mix.concentration<=Math.max(c1,c2)+1e-9);assert(rel(mix.concentration*(q1+q2),c1*q1+c2*q2,1e-12));
  const br=between(0,5000),hv=between(1e5,8e7),ef=between(0,5),burn=P.burnPhysics(br,hv,ef);assert(burn&&rel(burn.heatReleaseW,br*hv,1e-12)&&rel(burn.emissionRateKgS,br*ef,1e-12));
  const Q=between(0.001,1e6),u=between(0.05,100),sy=between(0.1,10000),sz=between(0.1,10000),y=between(-20000,20000),z=between(0,10000),H=between(0,1000),pl=P.gaussianPlume(Q,u,sy,sz,y,z,H),plMirror=P.gaussianPlume(Q,u,sy,sz,-y,z,H),plZero=P.gaussianPlume(0,u,sy,sz,y,z,H);assert(pl&&pl.concentrationGm3>=0&&rel(pl.concentrationGm3,plMirror.concentrationGm3,1e-12));assert(P.gaussianPlume(Q*2,u,sy,sz,y,z,H).concentrationGm3>=pl.concentrationGm3);assert(plZero&&plZero.concentrationGm3===0);
  const dateline=rnd()<0.25,lat=between(-75,75),lon=dateline?(rnd()<0.5?between(178.5,179.9):between(-179.9,-178.5)):between(-170,170),ax=between(-5,5),ay=between(-5,5),base=between(-100,1500),pts=[];
  for(let j=0;j<10;j++){const dy=between(-1.5,1.5),dxKm=between(-150,150),plat=Math.max(-89.9,Math.min(89.9,lat+dy)),dlon=dxKm/(111.32*Math.max(0.2,Math.cos(lat*Math.PI/180))),plon=wrapLon(lon+dlon),x=wrapLon(plon-lon)*111.32*Math.cos(lat*Math.PI/180),yy=(plat-lat)*111.32;pts.push({lat:plat,lon:plon,temp:base+ax*x+ay*yy})}
  const sg=P.scalarGradient(lat,lon,pts,'temp');assert(sg);assert(Math.abs(sg.dValueDxPerKm-ax)<1e-7);assert(Math.abs(sg.dValueDyPerKm-ay)<1e-7);assert(sg.maxSampleDistanceKm<=sg.localRadiusKm);
  const a={lat:between(-80,80),lon:between(-179.99,179.99),time:'2026-01-01T00:00:00Z'},b={lat:between(-80,80),lon:between(-179.99,179.99),time:'2026-01-01T01:00:00Z'},dr=P.drift(a,b);assert(dr&&dr.distanceM>=0&&dr.speedMs>=0&&dr.bearingDeg>=0&&dr.bearingDeg<360);assert(rel(dr.distanceM,P.haversineM(a.lat,a.lon,b.lat,b.lon),1e-12));assert(rel(P.haversineM(a.lat,a.lon,b.lat,b.lon),P.haversineM(b.lat,b.lon,a.lat,a.lon),1e-12));
}
const datelinePts=[{lat:10,lon:179.7,temp:8},{lat:10,lon:-179.7,temp:12},{lat:9.5,lon:179.9,temp:9},{lat:10.5,lon:-179.9,temp:11}];
assert(P.scalarGradient(10,180,datelinePts,'temp'),'antimeridian gradient must resolve');
assert.strictEqual(P.scalarGradient(90,0,[{lat:89.9,lon:0,temp:1},{lat:89.9,lon:90,temp:2},{lat:89.9,lon:-90,temp:3}],'temp'),null);
const targetLat=40,targetLon=-75,axLocal=0.025,ayLocal=-0.012,baseLocal=300,localPts=[];
for(const [dy,dx] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){const lat=targetLat+dy,lon=targetLon+dx,x=(lon-targetLon)*111.32*Math.cos(targetLat*Math.PI/180),y=(lat-targetLat)*111.32;localPts.push({lat,lon,temp:baseLocal+axLocal*x+ayLocal*y})}
const distantDecoys=[];for(let i=0;i<40;i++)distantDecoys.push({lat:-50+(i%10)*3,lon:80+(i%8)*4,temp:10000+i*100});
const localWithDecoys=P.scalarGradient(targetLat,targetLon,[...distantDecoys,...localPts],'temp');assert(localWithDecoys,'local gradient must survive distant decoys');assert(Math.abs(localWithDecoys.dValueDxPerKm-axLocal)<1e-8);assert(Math.abs(localWithDecoys.dValueDyPerKm-ayLocal)<1e-8);assert(localWithDecoys.sampleCount===localPts.length);assert(localWithDecoys.maxSampleDistanceKm<200);assert.strictEqual(P.scalarGradient(targetLat,targetLon,distantDecoys,'temp'),null,'distant-only points must not fabricate a local gradient');
const datelinePoly={type:'Polygon',coordinates:[[[179.5,10],[-179.5,10],[-179.5,11],[179.5,11],[179.5,10]]]};
const datelineArea=P.polygonAreaM2(datelinePoly);assert(Number.isFinite(datelineArea)&&datelineArea>1e9&&datelineArea<2e10,'antimeridian polygon area must remain local, finite, and positive');
assert.strictEqual(P.gasPpbToUgM3(null,46,20,1013),null);
assert.strictEqual(P.gasPpbToUgM3(1,46,-273.15,1013),null);
assert.strictEqual(P.hailPhysics(20,917,null),null);
assert.strictEqual(P.darcyPoreVelocity(1e-5,0.01,0),null);
assert.strictEqual(P.darcyPoreVelocity(1e-5,0.01,1.01),null);
assert.strictEqual(P.gaussianPlume(1,0,10,10,0,0,0),null);
assert.strictEqual(P.snowPhysics(-1,100),null);
assert.strictEqual(P.iceMass(-1,1,900),null);
assert.strictEqual(P.flowWeightedMix([{concentration:10,flow:0}]),null);
assert.strictEqual(P.drift({lat:0,lon:0,time:'bad'},{lat:1,lon:1,time:'2026-01-01'}),null);
console.log('ENVIRONMENTAL_COUPLED_PHYSICS_50000=PASS');
console.log(JSON.stringify({iterations:50000,domains:['cryosphere','icebergs','sea ice','snowfall','snow load','hail','cold-front gradients','air pollution','plume transport','soil contamination','groundwater','oil spill','water contamination and mixing','waste dumping','landfill/junkyard/garbage fire'],adversarial:['antimeridian gradients and polygons','local-neighbor selection against distant decoys','local-radius rejection','boundary inputs','missing data','mass and flow conservation','symmetry','monotonicity','wind-angle periodicity','pole singularity rejection','invalid inputs'],policy:'equation-gated; missing inputs remain missing; no arbitrary hazard score'},null,2));
