(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  if(!window.DOMObservationIngress){window.DOMObservationIngressTestReport={passed:0,failed:1,tests:[{name:'observation ingress loaded',ok:false}]};return}
  try{
    const I=DOMObservationIngress;
    const n=I.normalize({id:'r1',sourceAgency:'Agency',network:'Net',lineageId:'L1',kind:'temperature',lat:40,lon:-74,time:'2026-09-10T00:00:00Z',url:'https://example.com/a',quality:.9,freshness:.8,nominalAreaWeight:2});
    t('qualified record normalizes',n.ok&&n.record.schema==='dom.observation.v1');
    t('identity preserved',n.record.sourceId==='r1'&&n.record.lineageId==='L1');
    t('coordinates preserved',n.record.lat===40&&n.record.lon===-74);
    t('time normalized',n.record.observedAt==='2026-09-10T00:00:00.000Z');
    t('spatial support preserved',n.record.nominalAreaWeight===2);
    t('javascript URL rejected',I.normalize({...n.record,sourceUrl:'javascript:alert(1)'}).record.sourceUrl===null);
    t('null coordinates remain unresolved',I.normalize({...n.record,lat:null,lon:null}).record.lat===null);
    t('official status requires provenance',I.normalize({id:'x',sourceAgency:'',lineageId:'x',time:'2026-01-01',url:null,officialAlert:true,authoritative:true}).record.officialAlert===false);
    const d=I.dedupe([n.record,{...n.record,receivedAt:'2026-09-10T00:01:00Z'}]);t('same lineage source time dedupes',d.length===1);
    if(window.DOMSensorActivation&&window.DOMGlobalSensorGlobe){const s=I.toSensor(n.record),g=DOMGlobalSensorGlobe.normalizeSensor(s);t('ingress to sensor to globe identity continuous',g.id==='r1'&&g.lineageId==='L1');t('ingress to sensor to globe coordinates continuous',g.lat===40&&g.lon===-74)}else t('sensor/globe continuity modules loaded',false);
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  const failed=tests.filter(x=>!x.ok);window.DOMObservationIngressTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. observation-ingress self-test failures',failed);else console.info('D.O.M. observation-ingress self-tests PASS',tests.length);
})();
