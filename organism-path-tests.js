(()=>{
  const tests=[];const t=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});
  try{
    t('ingress loaded',typeof DOMObservationIngress!=='undefined');
    t('organism loaded',typeof DOMOrganismRuntime!=='undefined');
    t('hazard browser bridge loaded',typeof DOMHazardObservationBridge!=='undefined');
    t('broker hazard bridge loaded',typeof DOMObservationHazardBridge!=='undefined');
    DOMOrganismRuntime.clear();
    const raw={id:'path-test',sourceAgency:'Test Agency',network:'Test Net',lineageId:'test-lineage',kind:'Earthquake',modality:'seismic',lat:40,lon:-74,time:'2026-09-10T00:00:00Z',url:'https://example.com/source',authoritative:true,mag:4.2,quality:.9,freshness:.8};
    const n=DOMObservationIngress.normalize(raw);t('raw to ingress accepted',n.ok);
    const before=DOMOrganismRuntime.snapshot();DOMOrganismRuntime.accept([n.record],'test');const after=DOMOrganismRuntime.snapshot();
    t('ingress enters organism record state',after.recordCount===before.recordCount+1);
    t('ingress enters organism sensor state',after.sensors.some(s=>s.id==='path-test'&&s.lineageId==='test-lineage'));
    const plan=DOMOrganismRuntime.renderPlan({altitudeKm:100,viewport:{south:-90,north:90,west:-180,east:180}});t('organism produces globe render plan',!!plan&&Array.isArray(plan.sensors));
    const e=DOMObservationHazardBridge.toEvent(n.record);t('qualified observation becomes hazard event',e&&e.id==='path-test'&&e.kind==='Earthquake'&&e.lineageId==='test-lineage');
    const browser=DOMHazardObservationBridge.eventToObservation({id:'browser-test',kind:'Wildfire',source:'NASA EONET',lineageId:'nasa-eonet',modality:'event-aggregation',authoritative:true,officialAlert:false,title:'fixture',time:'2026-09-10T00:00:00Z',lat:10,lon:20,url:'https://example.com/fire'});t('browser hazard becomes canonical observation',browser.ok&&browser.record.sourceId==='browser-test');
    const safeOfficial=DOMObservationIngress.normalize({id:'official-test',sourceAgency:'NWS',lineageId:'nws-cap',kind:'Official Weather Alert',time:'2026-09-10T00:00:00Z',url:'https://api.weather.gov/alerts/x',authoritative:true,officialAlert:true});t('qualified official status survives ingress',safeOfficial.record.officialAlert===true);
    const forged=DOMObservationIngress.normalize({id:'forged',lineageId:'x',kind:'Official Weather Alert',time:'2026-09-10T00:00:00Z',authoritative:true,officialAlert:true});t('unproven official status is stripped',forged.record.officialAlert===false);
    const swpc=DOMObservationIngress.normalize({id:'swpc-test',sourceAgency:'NOAA SWPC',network:'NOAA SWPC',lineageId:'noaa-swpc-alerts',kind:'Space Weather',modality:'space-weather-alert',time:new Date().toISOString(),url:'https://services.swpc.noaa.gov/products/alerts.json',authoritative:true,observationStatus:'forecast',severityText:'G3 - Strong'});
    const swe=DOMObservationHazardBridge.toEvent(swpc.record);t('space weather survives broker hazard bridge',swpc.ok&&swe&&swe.kind==='Space Weather');
    t('space weather remains deliberately unlocated',swe&&Number.isNaN(swe.lat)&&Number.isNaN(swe.lon)&&swe.locationPrecision==='unresolved');
    t('space weather forecast status survives canonical path',swe&&swe.observationStatus==='forecast'&&swe.observed===false);
    const now=Date.now(),recentForecast={...swe,time:new Date(now-48*3600e3).toISOString()},oldForecast={...swe,time:new Date(now-80*3600e3).toISOString()};
    t('space weather forecast stays valid inside short horizon',DOMObservationHazardBridge.stale(recentForecast,now)===false);
    t('space weather forecast expires outside short horizon',DOMObservationHazardBridge.stale(oldForecast,now)===true);
    const observedSpace={...swe,observationStatus:'observed',observed:true,time:new Date(now-25*3600e3).toISOString()};t('space weather observation expires after one day without explicit expiry',DOMObservationHazardBridge.stale(observedSpace,now)===true);
  }catch(err){t('test execution',false,String(err&&err.message||err))}
  finally{try{DOMOrganismRuntime.clear()}catch(_){ }}
  const failed=tests.filter(x=>!x.ok);window.DOMOrganismPathTestReport={passed:tests.length-failed.length,failed:failed.length,tests};
  if(failed.length)console.warn('D.O.M. organism path self-test failures',failed);else console.info('D.O.M. organism path self-tests PASS',tests.length);
})();