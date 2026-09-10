(()=>{
  const tests=[];const t=(name,ok)=>tests.push({name,ok:!!ok});
  if(!window.DOMSensorActivation){window.DOMSensorActivationTestReport={passed:0,failed:1,tests:[{name:'sensor activation loaded',ok:false}]};return}
  const S=DOMSensorActivation;
  try{
    t('idle sensor is gray',S.level(0).id==='idle');
    t('critical invocation is red',S.level(.95).id==='critical'&&S.level(.95).color==='#ff2b2b');
    t('activation score bounded',S.activation({freshness:2,quality:2,anomaly:2,persistence:2,corroboration:2,hazardCoupling:2}).score===1);
    t('missing coordinate does not fabricate point',S.sensorPacket({sensorId:'x'}).lat===null&&S.sensorPacket({sensorId:'x'}).lon===null);
    t('published coordinate preserved',S.sensorPacket({sensorId:'x',lat:40.1,lon:-73.9}).lat===40.1);
    t('tropical storm threshold',S.cycloneFromKnots(50).category==='Tropical Storm');
    t('category 1 threshold',S.cycloneFromKnots(70).category==='Category 1');
    t('category 5 threshold',S.cycloneFromKnots(140).category==='Category 5');
    t('official category outranks derived category',S.stormLabel({officialType:'Hurricane',officialCategory:'Category 3',windKts:70}).category==='Category 3');
    t('unknown strength stays unresolved',S.stormLabel({type:'Storm'}).category==='strength unresolved');
  }catch(err){t('test execution',false)}
  const failed=tests.filter(x=>!x.ok);window.DOMSensorActivationTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. sensor activation self-test failures',failed);else console.info('D.O.M. sensor activation self-tests PASS',tests.length);
})();
