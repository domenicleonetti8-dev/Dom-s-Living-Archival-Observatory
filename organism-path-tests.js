(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  try{
    t('ingress loaded',typeof DOMObservationIngress!=='undefined');
    t('organism loaded',typeof DOMOrganismRuntime!=='undefined');
    t('hazard browser bridge loaded',typeof DOMHazardObservationBridge!=='undefined');
    t('broker hazard bridge loaded',typeof DOMObservationHazardBridge!=='undefined');
    const raw={id:'path-test',sourceAgency:'Test Agency',network:'Test Net',lineageId:'test-lineage',kind:'Earthquake',modality:'seismic',lat:40,lon:-74,time:'2026-09-10T00:00:00Z',url:'https://example.com/source',authoritative:true,mag:4.2,quality:.9,freshness:.8};
    const n=DOMObservationIngress.normalize(raw);t('raw to ingress accepted',n.ok);
    const before=DOMOrganismRuntime.snapshot();DOMOrganismRuntime.accept([n.record],'test');const after=DOMOrganismRuntime.snapshot();
    t('ingress enters organism record state',after.recordCount>=before.recordCount+1);
    t('ingress enters organism sensor state',after.sensors.some(s=>s.id==='path-test'&&s.lineageId==='test-lineage'));
    const plan=DOMOrganismRuntime.renderPlan({altitudeKm:100,viewport:{south:-90,north:90,west:-180,east:180}});t('organism produces globe render plan',!!plan&&Array.isArray(plan.sensors));
    const e=DOMObservationHazardBridge.toEvent(n.record);t('qualified observation becomes hazard event',e&&e.id==='path-test'&&e.kind==='Earthquake'&&e.lineageId==='test-lineage');
    const browser=DOMHazardObservationBridge.eventToObservation({id:'browser-test',kind:'Wildfire',source:'NASA EONET',lineageId:'nasa-eonet',modality:'event-aggregation',authoritative:true,officialAlert:false,title:'fixture',time:'2026-09-10T00:00:00Z',lat:10,lon:20,url:'https://example.com/fire'});t('browser hazard becomes canonical observation',browser.ok&&browser.record.sourceId==='browser-test');
    const safeOfficial=DOMObservationIngress.normalize({id:'official-test',sourceAgency:'NWS',lineageId:'nws-cap',kind:'Official Weather Alert',time:'2026-09-10T00:00:00Z',url:'https://api.weather.gov/alerts/x',authoritative:true,officialAlert:true});t('qualified official status survives ingress',safeOfficial.record.officialAlert===true);
    const forged=DOMObservationIngress.normalize({id:'forged',lineageId:'x',kind:'Official Weather Alert',time:'2026-09-10T00:00:00Z',authoritative:true,officialAlert:true});t('unproven official status is stripped',forged.record.officialAlert===false);
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  const failed=tests.filter(x=>!x.ok);window.DOMOrganismPathTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. organism path self-test failures',failed);else console.info('D.O.M. organism path self-tests PASS',tests.length);
})();
