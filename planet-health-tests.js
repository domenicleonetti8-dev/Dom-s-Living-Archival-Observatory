(()=>{
  const out=[];const ok=(n,c)=>out.push({name:n,pass:!!c});
  try{
    const M=DOMPlanetHealth;
    ok('empty state unknown',M.state({}).health===null);
    const sparse=M.state({climate:[{value:.8,weight:1,quality:1,freshness:1,coverage:1}],ocean:[{value:.6,weight:1,quality:1,freshness:1,coverage:1}]});
    ok('sparse health remains provisional',sparse.health===null&&Number.isFinite(sparse.provisionalHealth)&&sparse.displayQualified===false);
    ok('sparse coverage counts missing domains',sparse.coverage>0&&sparse.coverage<.5);
    const one=M.weightedScore([{value:.4,weight:1,quality:1,freshness:1}]);
    ok('missing spatial coverage cannot claim complete domain',one.coverage<1);
    const rich={};for(const k of ['climate','ocean','hydrology','cryosphere','forests','reefs','wildfire','atmosphere','biodiversity','geophysical'])rich[k]=[{value:.4,weight:1,quality:.9,freshness:.9,coverage:.9}];const full=M.state(rich);
    ok('representative multi-domain health resolves',Number.isFinite(full.health)&&full.displayQualified===true&&full.qualifiedDomains.length>=6);
    ok('resolved health bounded',full.health>=0&&full.health<=1);
    ok('full-domain coverage uses whole planetary prior',full.coverage>.6&&full.coverage<=1&&full.observedPriorWeight>.9);
    const series=[];for(let i=0;i<10;i++)series.push({t:2020+i*.5,value:1+i*.2,sigma:.1});
    const p=M.forecastWindow({series,threshold:3.2});
    ok('qualified forecast window resolved',p.kind==='statistical-threshold-window');
    ok('forecast has interval',p.lowerT<=p.estimateT&&p.upperT>=p.estimateT);
    ok('forecast carries fit quality',Number.isFinite(p.r2)&&p.r2>=.55);
    const short=M.forecastWindow({series:series.slice(0,3),threshold:3.2});
    ok('three point projection refused',short.kind==='unresolved');
    const bad=series.map((x,i)=>({...x,value:3-i*.2}));
    ok('wrong-way trend unresolved',M.forecastWindow({series:bad,threshold:4}).kind==='unresolved');
    const noisy=series.map((x,i)=>({...x,value:i%2?3:1}));
    ok('weak fit unresolved',M.forecastWindow({series:noisy,threshold:4,minR2:.8}).kind==='unresolved');
    ok('decimal year January stable',M.monthYearFromDecimalYear(2030).month===1);
    ok('decimal year December stable',M.monthYearFromDecimalYear(2030+11/12).month===12);
  }catch(e){out.push({name:'exception',pass:false,error:String(e)})}
  window.DOMPlanetHealthTestReport={passed:out.every(x=>x.pass),tests:out};console.log('DOMPlanetHealthTestReport',window.DOMPlanetHealthTestReport)
})();
