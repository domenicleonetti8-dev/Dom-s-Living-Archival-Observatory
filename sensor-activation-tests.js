(()=>{
  const tests=[];const t=(name,ok)=>tests.push({name,ok:!!ok});
  if(!window.DOMSensorActivation){window.DOMSensorActivationTestReport={passed:0,failed:1,tests:[{name:'sensor activation loaded',ok:false}]};return}
  const S=DOMSensorActivation;
  try{
    t('idle sensor is gray',S.level(0).id==='idle');
    t('critical invocation is red',S.level(.95).id==='critical'&&S.level(.95).color==='#ff2b2b');
    t('activation score bounded',S.activation({freshness:2,quality:2,anomaly:2,persistence:2,corroboration:2,hazardCoupling:2}).score===1);
    t('missing coordinate does not fabricate point',S.sensorPacket({sensorId:'x'}).lat===null&&S.sensorPacket({sensorId:'x'}).lon===null);
    t('out of range coordinate rejected',S.sensorPacket({sensorId:'x',lat:91,lon:0}).lat===null&&S.sensorPacket({sensorId:'x',lat:0,lon:181}).lon===null);
    t('published coordinate preserved',S.sensorPacket({sensorId:'x',lat:40.1,lon:-73.9}).lat===40.1);
    t('tropical storm threshold',S.cycloneFromKnots(50).category==='Tropical Storm');
    t('category 1 threshold',S.cycloneFromKnots(70).category==='Category 1');
    t('category 5 threshold',S.cycloneFromKnots(140).category==='Category 5');
    t('negative wind rejected',S.cycloneFromKnots(-1).category==='unknown');
    t('derived cyclone category declares scale',/Saffir-Simpson/.test(S.cycloneFromKnots(70).scale));
    t('official category outranks derived category',S.stormLabel({officialType:'Hurricane',officialCategory:'Category 3',windKts:70}).category==='Category 3');
    t('unknown strength stays unresolved',S.stormLabel({type:'Storm'}).category==='strength unresolved');
    if(window.DOMGlobalSensorGlobe){
      const p=S.sensorPacket({sensorId:'station-42',stationId:'st-42',sourceAgency:'Agency X',network:'test-network',instrument:'thermometer',modality:'temperature',lat:40.1,lon:-73.9,observedAt:'2026-01-01T00:00:00Z',receivedAt:'2026-01-01T00:01:00Z',sourceUrl:'https://example.com/sensor',lineageId:'lineage-x',authoritative:true,quality:.9,freshness:.8,anomaly:.7,anomalyZ:2.4,persistence:.6,corroboration:.5,hazardCoupling:.4,storm:{windKts:70}});
      const g=DOMGlobalSensorGlobe.normalizeSensor(p);
      t('sensor id survives packet to globe',g.id==='station-42'&&g.sensorId==='station-42');
      t('activation survives packet to globe',Math.abs(g.activation-p.activation.score)<1e-12);
      t('activation color is canonical across modules',g.band.id===p.activation.id&&g.band.color===p.activation.color);
      t('storm classification survives packet to globe',g.storm&&g.storm.category==='Category 1');
      t('coordinates survive packet to globe',g.lat===40.1&&g.lon===-73.9);
      t('agency and lineage survive packet to globe',g.agency==='Agency X'&&g.lineageId==='lineage-x');
      t('quality and freshness survive packet to globe',g.quality===.9&&g.freshness===.8);
      t('timestamps and source survive packet to globe',g.observedAt===p.observedAt&&g.receivedAt===p.receivedAt&&g.sourceUrl===p.sourceUrl&&g.authoritative===true);
    }else t('global sensor globe loaded for continuity test',false);
  }catch(err){t('test execution',false)}
  const failed=tests.filter(x=>!x.ok);window.DOMSensorActivationTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. sensor activation self-test failures',failed);else console.info('D.O.M. sensor activation self-tests PASS',tests.length);
})();
