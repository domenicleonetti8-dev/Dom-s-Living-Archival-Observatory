(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  if(typeof evaluate!=='function'||typeof isAlertEligible!=='function'||typeof notifyNew!=='function'){window.DOMHazardCoreTestReport={passed:0,failed:1,tests:[{name:'hazard core loaded',ok:false}]};return}
  const savedEvents=H.events,savedUser=H.user,savedSeen=H.seen,savedInit=H.initialized,savedHistory=H.history;
  try{
    H.events=[];H.user={lat:40,lon:-74};H.history=new Map();
    const usgs={id:'t:q',kind:'Earthquake',source:'USGS',sourceType:'observing-network',lineageId:'usgs-comcat',modality:'seismic',authoritative:true,officialAlert:false,observed:true,title:'fixture',mag:2.5,time:new Date().toISOString(),lat:0,lon:0};
    const uq=evaluate(usgs);Object.assign(usgs,uq);
    t('distant M2.5 is not alert eligible',!isAlertEligible(usgs));
    t('earthquake receives taxonomy class',usgs.hazardClass==='earthquake'&&usgs.strengthClass!=='unknown');
    const nws={id:'t:n',kind:'Official Weather Alert',source:'NWS',sourceType:'official-alert',lineageId:'nws-cap',modality:'official-warning',authoritative:true,officialAlert:true,appliesToUser:true,observed:true,title:'fixture',time:new Date().toISOString(),lat:40,lon:-74,severityText:'Extreme',certaintyText:'Observed',urgencyText:'Immediate'};
    Object.assign(nws,evaluate(nws));
    t('extreme observed immediate local official warning is alert eligible',isAlertEligible(nws));
    const brokerOnly={...nws,id:'t:broker',appliesToUser:false};Object.assign(brokerOnly,evaluate(brokerOnly));
    t('official warning without proven local applicability is not phone-alert eligible',!isAlertEligible(brokerOnly));
    const minor={...nws,id:'t:m',severityText:'Minor',certaintyText:'Possible',urgencyText:'Future'};Object.assign(minor,evaluate(minor));
    t('minor possible future official notice is not alert eligible',!isAlertEligible(minor));
    const tsunami={id:'t:tsu',kind:'Tsunami',source:'NOAA NTWC',sourceType:'official-alert',lineageId:'noaa-ntwc-atom',modality:'official-tsunami-product',authoritative:true,officialAlert:true,observed:false,title:'Tsunami Warning',time:new Date().toISOString(),lat:NaN,lon:NaN,severityText:'Tsunami Warning'};Object.assign(tsunami,evaluate(tsunami));
    t('official tsunami keeps tsunami hazard class',tsunami.hazardClass==='tsunami');
    t('tsunami warning has stronger severity than watch',severity01(tsunami)>severity01({...tsunami,severityText:'Tsunami Watch'}));
    t('unlocated tsunami product cannot become local phone alert',!isAlertEligible(tsunami));
    const swpc={id:'t:sw',kind:'Space Weather',source:'NOAA SWPC',sourceType:'observing-network',lineageId:'noaa-swpc-alerts',modality:'space-weather-alert',authoritative:true,officialAlert:false,observed:true,title:'Geomagnetic storm',time:new Date().toISOString(),lat:NaN,lon:NaN,severityText:'G4 - Severe'};Object.assign(swpc,evaluate(swpc));
    t('space weather keeps dedicated hazard class',swpc.hazardClass==='space-weather');
    t('NOAA G4 severity outranks G1',severity01(swpc)>severity01({...swpc,severityText:'G1 - Minor'}));
    t('unlocated evidence wording does not say around unresolved location',!evidenceFor(swpc).interpretation.includes('around location not resolved'));
    H.events=[{...usgs,id:'a',lat:10,lon:10,lineageId:'same'},{...usgs,id:'b',lat:10.1,lon:10.1,lineageId:'same'}];
    t('same lineage does not create corroboration',corroboration01(H.events[0])===0);
    H.events=[{...usgs,id:'a',lat:10,lon:10,lineageId:'A'},{...usgs,id:'b',lat:10.1,lon:10.1,lineageId:'B'}];
    t('independent same-hazard lineage increases corroboration',corroboration01(H.events[0])>0);
    H.events=[{...usgs,id:'a',lat:10,lon:10,lineageId:'A'},{id:'fire',kind:'Wildfire',hazardClass:'wildfire',source:'X',lineageId:'B',lat:10.1,lon:10.1,time:usgs.time}];
    t('unrelated nearby hazard does not create corroboration',corroboration01(H.events[0])===0);
    H.history=new Map();recordHistory([usgs]);t('single snapshot is not temporal trend',temporalTrend01(usgs)===0);recordHistory([usgs]);t('two snapshots are not temporal trend',temporalTrend01(usgs)===0);
    const stronger={...usgs,mag:5};recordHistory([stronger]);t('three measured snapshots can establish worsening trend',temporalTrend01(stronger)>0);
    const eonet={...usgs,source:'NASA EONET',sourceType:'event-aggregation',authoritative:true};
    t('aggregation source quality below observing network',sourceQuality(eonet)<sourceQuality(usgs));
    H.initialized=false;H.seen=new Set();notifyNew([usgs]);
    t('first load primes seen set without alerting',H.initialized&&H.seen.has(usgs.id));
    t('evidence strength is bounded percentage source',usgs.evidenceStrength>=0&&usgs.evidenceStrength<=1);
    t('official semantics separated from authority',nws.authoritative===true&&nws.officialAlert===true&&usgs.authoritative===true&&usgs.officialAlert===false);
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  finally{H.events=savedEvents;H.user=savedUser;H.seen=savedSeen;H.initialized=savedInit;H.history=savedHistory}
  const failed=tests.filter(x=>!x.ok);window.DOMHazardCoreTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. hazard-core self-test failures',failed);else console.info('D.O.M. hazard-core self-tests PASS',tests.length);
})();