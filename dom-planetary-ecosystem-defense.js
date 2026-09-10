const DOMPlanetaryEcosystemDefense=(()=>{
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const freshness=(observedAt,halfLifeHours=24)=>{const t=new Date(observedAt).getTime();if(!Number.isFinite(t))return null;const age=Math.max(0,(Date.now()-t)/36e5);return Math.exp(-Math.LN2*age/Math.max(.01,halfLifeHours))};
  const pct=x=>Math.round(clamp(x)*100);
  function weighted(parts){let n=0,d=0;for(const p of parts||[]){if(!p||!finite(p.value)||!finite(p.weight)||Number(p.weight)<=0)continue;n+=clamp(p.value)*Number(p.weight);d+=Number(p.weight)}return d?clamp(n/d):null}
  function temperatureReference(row={}){
    return{provider:'Copernicus Climate Change Service / ECMWF',product:String(row.product||'ERA5/ERA5T reference field'),variable:String(row.variable||'2m air temperature'),lat:finite(row.lat)?Number(row.lat):null,lon:finite(row.lon)?Number(row.lon):null,valueC:finite(row.valueC)?Number(row.valueC):null,observedAt:row.observedAt||null,receivedAt:row.receivedAt||null,spatialResolutionKm:finite(row.spatialResolutionKm)?Number(row.spatialResolutionKm):null,uncertaintyC:finite(row.uncertaintyC)?Math.abs(Number(row.uncertaintyC)):null,mode:String(row.mode||'reanalysis/reference-field'),freshness:freshness(row.observedAt,72)};
  }
  function forestDisturbance(row={}){
    const f=freshness(row.observedAt,168),confidence=finite(row.confidence)?clamp(row.confidence):null,area=finite(row.areaHa)?Math.max(0,Number(row.areaHa)):null,protectedOverlap=finite(row.protectedOverlap)?clamp(row.protectedOverlap):null,primaryForest=finite(row.primaryForest)?clamp(row.primaryForest):null,repeat=finite(row.repeatDisturbance)?clamp(row.repeatDisturbance):null;
    const severity=weighted([{value:confidence,weight:.28},{value:f,weight:.18},{value:area==null?null:clamp(Math.log10(1+area)/4),weight:.22},{value:protectedOverlap,weight:.12},{value:primaryForest,weight:.12},{value:repeat,weight:.08}]);
    return{kind:'forest-disturbance',source:String(row.source||'Global Forest Watch integrated disturbance alerts'),alertSystem:row.alertSystem||null,lat:finite(row.lat)?Number(row.lat):null,lon:finite(row.lon)?Number(row.lon):null,geometry:row.geometry||null,observedAt:row.observedAt||null,confidence,areaHa:area,freshness:f,severity,severityPercent:severity==null?null:pct(severity),interpretation:'Near-real-time disturbance signal requiring source/imagery confirmation; not automatically proof of illegal deforestation.'};
  }
  function coralStress(row={}){
    const f=freshness(row.observedAt,48),dhw=finite(row.dhw)?Math.max(0,Number(row.dhw)):null,hotspot=finite(row.hotspotC)?Math.max(0,Number(row.hotspotC)):null,sstAnom=finite(row.sstAnomalyC)?Number(row.sstAnomalyC):null,alert=finite(row.bleachingAlertLevel)?Math.max(0,Number(row.bleachingAlertLevel)):null;
    const heat=dhw==null?null:clamp(dhw/20),hot=hotspot==null?null:clamp(hotspot/4),anom=sstAnom==null?null:clamp(Math.max(0,sstAnom)/4),al=alert==null?null:clamp(alert/5);
    const severity=weighted([{value:al,weight:.34},{value:heat,weight:.30},{value:hot,weight:.18},{value:anom,weight:.10},{value:f,weight:.08}]);
    return{kind:'coral-heat-stress',source:String(row.source||'NOAA Coral Reef Watch'),lat:finite(row.lat)?Number(row.lat):null,lon:finite(row.lon)?Number(row.lon):null,geometry:row.geometry||null,observedAt:row.observedAt||null,dhw,hotspotC:hotspot,sstAnomalyC:sstAnom,bleachingAlertLevel:alert,freshness:f,severity,severityPercent:severity==null?null:pct(severity),interpretation:'Satellite/model-based coral heat-stress state; bleaching stress is not identical to confirmed reef mortality.'};
  }
  function ecosystemPacket(input={}){return{temperature:input.temperature?temperatureReference(input.temperature):null,forest:input.forest?forestDisturbance(input.forest):null,coral:input.coral?coralStress(input.coral):null}};
  return{clamp,freshness,weighted,temperatureReference,forestDisturbance,coralStress,ecosystemPacket};
})();
