(()=>{
  const out=[];const ok=(name,pass)=>out.push({name,pass:!!pass});
  try{
    const E=DOMPlanetaryEcosystemDefense,now=new Date().toISOString();
    const f1=E.forestDisturbance({lat:1,lon:2,observedAt:now,confidence:.95,areaHa:1000,primaryForest:1,protectedOverlap:.5,repeatDisturbance:.3});
    const f2=E.forestDisturbance({lat:1,lon:2,observedAt:'2000-01-01T00:00:00Z',confidence:.95,areaHa:1000,primaryForest:1,protectedOverlap:.5,repeatDisturbance:.3});
    ok('forest physical severity independent of freshness',Math.abs(f1.severity-f2.severity)<1e-12);
    ok('forest evidence decays with age',f1.evidenceStrength>f2.evidenceStrength);
    const c1=E.coralStress({lat:10,lon:20,observedAt:now,dhw:12,hotspotC:2,sstAnomalyC:1.5,bleachingAlertLevel:3});
    const c2=E.coralStress({lat:10,lon:20,observedAt:'2000-01-01T00:00:00Z',dhw:12,hotspotC:2,sstAnomalyC:1.5,bleachingAlertLevel:3});
    ok('coral physical severity independent of freshness',Math.abs(c1.severity-c2.severity)<1e-12);
    ok('coral evidence decays with age',c1.evidenceStrength>c2.evidenceStrength);
    ok('invalid forest coordinate unresolved',E.forestDisturbance({lat:95,lon:0}).lat===null);
    ok('invalid coral coordinate unresolved',E.coralStress({lat:0,lon:190}).lon===null);
  }catch(e){out.push({name:'exception',pass:false,error:String(e)})}
  window.DOMEcosystemDefenseTestReport={passed:out.every(x=>x.pass),tests:out};console.log('DOMEcosystemDefenseTestReport',window.DOMEcosystemDefenseTestReport)
})();
