(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  if(typeof evaluate!=='function'||typeof isAlertEligible!=='function'||typeof notifyNew!=='function'){window.DOMHazardCoreTestReport={passed:0,failed:1,tests:[{name:'hazard core loaded',ok:false}]};return}
  const savedEvents=H.events,savedUser=H.user,savedSeen=H.seen,savedInit=H.initialized;
  try{
    H.events=[];H.user={lat:40,lon:-74};
    const usgs={id:'t:q',kind:'Earthquake',source:'USGS',sourceType:'observing-network',lineageId:'usgs-earthquake',modality:'seismic',authoritative:true,officialAlert:false,observed:true,title:'fixture',mag:2.5,time:new Date().toISOString(),lat:0,lon:0};
    const uq=evaluate(usgs);Object.assign(usgs,uq);
    t('distant M2.5 is not alert eligible',!isAlertEligible(usgs));
    const nws={id:'t:n',kind:'Official Weather Alert',source:'NWS',sourceType:'official-alert',lineageId:'nws-cap',modality:'official-warning',authoritative:true,officialAlert:true,observed:true,title:'fixture',time:new Date().toISOString(),lat:40,lon:-74,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate'};
    Object.assign(nws,evaluate(nws));
    t('extreme observed immediate official warning is alert eligible',isAlertEligible(nws));
    const minor={...nws,id:'t:m',severityText:'Minor',certaintyText:'Possible',urgencyText:'Future'};Object.assign(minor,evaluate(minor));
    t('minor possible future official notice is not alert eligible',!isAlertEligible(minor));
    H.events=[{...usgs,id:'a',lat:10,lon:10,lineageId:'same'},{...usgs,id:'b',lat:10.1,lon:10.1,lineageId:'same'}];
    t('same lineage does not create corroboration',corroboration01(H.events[0])===0);
    H.events=[{...usgs,id:'a',lat:10,lon:10,lineageId:'A'},{...usgs,id:'b',lat:10.1,lon:10.1,lineageId:'B'}];
    t('independent lineage increases corroboration',corroboration01(H.events[0])>0);
    H.initialized=false;H.seen=new Set();notifyNew([usgs]);
    t('first load primes seen set without alerting',H.initialized&&H.seen.has(usgs.id));
    t('evidence strength is bounded percentage source',usgs.evidenceStrength>=0&&usgs.evidenceStrength<=1);
    t('official semantics separated from authority',nws.authoritative===true&&nws.officialAlert===true&&usgs.authoritative===true&&usgs.officialAlert===false);
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  finally{H.events=savedEvents;H.user=savedUser;H.seen=savedSeen;H.initialized=savedInit}
  const failed=tests.filter(x=>!x.ok);window.DOMHazardCoreTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. hazard-core self-test failures',failed);else console.info('D.O.M. hazard-core self-tests PASS',tests.length);
})();