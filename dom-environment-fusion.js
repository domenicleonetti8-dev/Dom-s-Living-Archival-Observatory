const DOMEnvironmentFusion=(()=>{
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
  const finite=x=>Number.isFinite(Number(x));
  const pct=x=>Math.round(clamp(x)*100);
  function weighted(parts){let n=0,d=0;for(const p of parts||[]){if(!p||!finite(p.value)||!finite(p.weight)||Number(p.weight)<=0)continue;n+=clamp(p.value)*Number(p.weight);d+=Number(p.weight)}return d?n/d:0}
  function interaction(a,b){return Math.sqrt(clamp(a)*clamp(b))}
  function compoundIndex(x={}){
    const atmosphere=weighted([{value:x.wind,weight:.24},{value:x.pressureAnomaly,weight:.16},{value:x.convectiveEnergy,weight:.18},{value:x.precipRate,weight:.18},{value:x.visibilityLoss,weight:.08},{value:x.lightning,weight:.08},{value:x.temperatureExtreme,weight:.08}]);
    const ocean=weighted([{value:x.surge,weight:.32},{value:x.wave,weight:.20},{value:x.sstAnomaly,weight:.15},{value:x.tide,weight:.18},{value:x.current,weight:.15}]);
    const ground=weighted([{value:x.soilSaturation,weight:.24},{value:x.riverStage,weight:.22},{value:x.slopeInstability,weight:.16},{value:x.seismic,weight:.20},{value:x.groundTemperature,weight:.08},{value:x.subsidence,weight:.10}]);
    const fire=weighted([{value:x.fuelDryness,weight:.30},{value:x.fireRadiativePower,weight:.24},{value:x.wind,weight:.18},{value:x.humidityDeficit,weight:.18},{value:x.lightning,weight:.10}]);
    const cryosphere=weighted([{value:x.snowWaterEquivalent,weight:.24},{value:x.snowfallRate,weight:.18},{value:x.iceInstability,weight:.24},{value:x.freezeThaw,weight:.16},{value:x.avalanche,weight:.18}]);
    const water=weighted([{value:x.precipRate,weight:.24},{value:x.soilSaturation,weight:.18},{value:x.riverStage,weight:.24},{value:x.surge,weight:.18},{value:x.snowmelt,weight:.16}]);
    const coupling=weighted([
      {value:interaction(atmosphere,ocean),weight:.22},
      {value:interaction(atmosphere,water),weight:.22},
      {value:interaction(atmosphere,fire),weight:.16},
      {value:interaction(water,ground),weight:.18},
      {value:interaction(cryosphere,water),weight:.12},
      {value:interaction(fire,ground),weight:.10}
    ]);
    const total=clamp(.29*atmosphere+.16*ocean+.17*ground+.14*fire+.10*cryosphere+.08*water+.06*coupling);
    return{atmosphere,ocean,ground,fire,cryosphere,water,coupling,total};
  }
  function horizon(x={}){
    const velocity=clamp(x.trendVelocity),distanceKm=Math.max(0,Number(x.distanceToImpactKm)||0),speedKmh=Math.max(0,Number(x.motionSpeedKmh)||0),officialETA=x.officialETA||null;
    if(officialETA)return{kind:'official',label:String(officialETA),confidence:clamp(x.etaConfidence||.9)};
    if(distanceKm>0&&speedKmh>0){const h=distanceKm/speedKmh;const uncertainty=Math.max(.5,h*(1-clamp(x.trackConfidence||.5)));return{kind:'physics-estimate',hours:h,plusMinusHours:uncertainty,confidence:clamp(x.trackConfidence||.5)}}
    if(velocity>.05&&finite(x.currentLoad)&&finite(x.overwhelmThreshold)){const gap=clamp(x.overwhelmThreshold)-clamp(x.currentLoad);if(gap>0){const steps=gap/velocity;return{kind:'trend-estimate',hours:steps*Math.max(.25,Number(x.stepHours)||1),confidence:clamp(x.trendConfidence||.4)}}}
    return{kind:'unknown',confidence:0};
  }
  function actionStage(x={}){
    if(x.officialEvacuation)return{stage:'evacuate',authority:'official',text:'An official evacuation instruction is active. Follow the issuing authority now.'};
    if(x.officialWarning&&clamp(x.localImpact)>=.8)return{stage:'prepare-to-act',authority:'official-warning',text:'An official warning and high local-impact evidence are both present. Be ready to act immediately and follow local emergency instructions.'};
    if(clamp(x.localImpact)>=.78&&clamp(x.evidence)>=.78)return{stage:'consider-early-departure',authority:'research',text:'Evidence is strong enough to consider early voluntary departure if local officials permit and travel remains safe. This is not an evacuation order.'};
    if(clamp(x.localImpact)>=.58)return{stage:'prepare',authority:'research',text:'Prepare now, review routes and official guidance, and be ready for conditions to worsen.'};
    return{stage:'monitor',authority:'research',text:'Continue monitoring authoritative sources; current evidence does not support an evacuation recommendation.'};
  }
  function explain(x={}){
    const c=compoundIndex(x),h=horizon(x),impact=clamp(.62*c.total+.20*clamp(x.exposure)+.18*clamp(x.vulnerability));
    const a=actionStage({officialEvacuation:x.officialEvacuation,officialWarning:x.officialWarning,localImpact:impact,evidence:x.evidence});
    const drivers=[['atmosphere',c.atmosphere],['ocean',c.ocean],['ground',c.ground],['fire/dryness',c.fire],['ice/snow',c.cryosphere],['water/flood',c.water],['cross-system coupling',c.coupling]].sort((m,n)=>n[1]-m[1]);
    return{compound:c,impact,evidence:clamp(x.evidence),horizon:h,action:a,drivers:drivers.slice(0,4),text:`Combined environmental load ${pct(c.total)} out of 100. Local impact index ${pct(impact)} out of 100. Strongest contributors: ${drivers.slice(0,4).map(d=>`${d[0]} ${pct(d[1])}`).join(', ')}. ${a.text}`};
  }
  return{clamp,weighted,interaction,compoundIndex,horizon,actionStage,explain};
})();
