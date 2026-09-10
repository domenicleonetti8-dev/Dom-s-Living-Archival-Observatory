(()=>{
  const out=[];const ok=(n,c)=>out.push({name:n,pass:!!c});
  try{
    const M=DOMPlanetHealth;
    ok('empty state unknown',M.state({}).health===null);
    const s=M.state({climate:[{value:.8,weight:1,quality:1,freshness:1}],ocean:[{value:.6,weight:1,quality:1,freshness:1}]});
    ok('health bounded',s.health>=0&&s.health<=1);
    ok('coverage explicit',s.coverage>0&&s.coverage<=1);
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