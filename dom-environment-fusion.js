const DOMEnvironmentFusion=(()=>{
  const clamp=(x,a=0,b=1)=>{const n=Number(x);return Number.isFinite(n)?Math.max(a,Math.min(b,n)):a};
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const pct=x=>Math.round(clamp(x)*100);
  const officialProvenance=x=>!!(x&&x.officialAuthority&&x.officialSourceUrl&&/^https?:\/\//i.test(String(x.officialSourceUrl)));
  function weighted(parts){let n=0,d=0,available=0,total=0;for(const p of parts||[]){if(!p||!finite(p.weight)||Number(p.weight)<=0)continue;total+=Number(p.weight);if(!finite(p.value))continue;n+=clamp(p.value)*Number(p.weight);d+=Number(p.weight);available+=Number(p.weight)}return{value:d?n/d:null,coverage:total?available/total:0}}
  function interaction(a,b){if(!finite(a)||!finite(b))return null;return Math.sqrt(clamp(a)*clamp(b))}
  function compoundIndex(x={}){
    const domains={
      atmosphere:weighted([{value:x.wind,weight:.24},{value:x.pressureAnomaly,weight:.16},{value:x.convectiveEnergy,weight:.18},{value:x.precipRate,weight:.18},{value:x.visibilityLoss,weight:.08},{value:x.lightning,weight:.08},{value:x.temperatureExtreme,weight:.08}]),
      ocean:weighted([{value:x.surge,weight:.32},{value:x.wave,weight:.20},{value:x.sstAnomaly,weight:.15},{value:x.tide,weight:.18},{value:x.current,weight:.15}]),
      ground:weighted([{value:x.soilSaturation,weight:.24},{value:x.riverStage,weight:.22},{value:x.slopeInstability,weight:.16},{value:x.seismic,weight:.20},{value:x.groundTemperature,weight:.08},{value:x.subsidence,weight:.10}]),
      fire:weighted([{value:x.fuelDryness,weight:.30},{value:x.fireRadiativePower,weight:.24},{value:x.wind,weight:.18},{value:x.humidityDeficit,weight:.18},{value:x.lightning,weight:.10}]),
      cryosphere:weighted([{value:x.snowWaterEquivalent,weight:.24},{value:x.snowfallRate,weight:.18},{value:x.iceInstability,weight:.24},{value:x.freezeThaw,weight:.16},{value:x.avalanche,weight:.18}]),
      water:weighted([{value:x.precipRate,weight:.24},{value:x.soilSaturation,weight:.18},{value:x.riverStage,weight:.24},{value:x.surge,weight:.18},{value:x.snowmelt,weight:.16}])
    };
    const coupling=weighted([{value:interaction(domains.atmosphere.value,domains.ocean.value),weight:.22},{value:interaction(domains.atmosphere.value,domains.water.value),weight:.22},{value:interaction(domains.atmosphere.value,domains.fire.value),weight:.16},{value:interaction(domains.water.value,domains.ground.value),weight:.18},{value:interaction(domains.cryosphere.value,domains.water.value),weight:.12},{value:interaction(domains.fire.value,domains.ground.value),weight:.10}]);
    domains.coupling=coupling;
    const weights={atmosphere:.29,ocean:.16,ground:.17,fire:.14,cryosphere:.10,water:.08,coupling:.06};let n=0,d=0,coverageWeight=0;
    for(const k of Object.keys(weights)){const v=domains[k].value,w=weights[k];if(v==null)continue;n+=v*w;d+=w;coverageWeight+=w*domains[k].coverage}
    const total=d?clamp(n/d):null,coverage=d?clamp(coverageWeight/d):0;
    return{atmosphere:domains.atmosphere.value,ocean:domains.ocean.value,ground:domains.ground.value,fire:domains.fire.value,cryosphere:domains.cryosphere.value,water:domains.water.value,coupling:coupling.value,total,coverage,domains};
  }
  function horizon(x={}){
    const distanceKm=finite(x.distanceToImpactKm)?Math.max(0,Number(x.distanceToImpactKm)):null,speedKmh=finite(x.motionSpeedKmh)?Math.max(0,Number(x.motionSpeedKmh)):null;
    if(x.officialETA&&officialProvenance(x))return{kind:'official',label:String(x.officialETA),confidence:clamp(x.etaConfidence==null?.9:x.etaConfidence),authority:String(x.officialAuthority),sourceUrl:String(x.officialSourceUrl)};
    if(x.officialETA&&!officialProvenance(x))return{kind:'unverified-official-claim',label:String(x.officialETA),confidence:0,reason:'official ETA supplied without authority/source provenance'};
    if(distanceKm!=null&&distanceKm>0&&speedKmh!=null&&speedKmh>0){const h=distanceKm/speedKmh,tc=clamp(x.trackConfidence==null?.5:x.trackConfidence),uncertainty=Math.max(.5,h*(1-tc));return{kind:'physics-estimate',hours:h,plusMinusHours:uncertainty,confidence:tc}}
    if(finite(x.trendVelocity)&&Number(x.trendVelocity)>.05&&finite(x.currentLoad)&&finite(x.overwhelmThreshold)){const velocity=Number(x.trendVelocity),gap=clamp(x.overwhelmThreshold)-clamp(x.currentLoad);if(gap>0){const steps=gap/velocity;return{kind:'trend-estimate',hours:steps*Math.max(.25,finite(x.stepHours)?Number(x.stepHours):1),confidence:clamp(x.trendConfidence==null?.4:x.trendConfidence)}}}
    return{kind:'unknown',confidence:0};
  }
  function actionStage(x={}){
    const verifiedOfficial=officialProvenance(x);
    if(x.officialEvacuation&&verifiedOfficial)return{stage:'evacuate',authority:'official',text:'A sourced official evacuation instruction is active. Follow the issuing authority now.',officialAuthority:String(x.officialAuthority),officialSourceUrl:String(x.officialSourceUrl)};
    if(x.officialEvacuation&&!verifiedOfficial)return{stage:'unknown',authority:'unverified',text:'An evacuation flag was received without verifiable issuing-authority provenance. Do not treat it as an official evacuation order.'};
    if(x.officialWarning&&verifiedOfficial&&finite(x.localImpact)&&clamp(x.localImpact)>=.8)return{stage:'prepare-to-act',authority:'official-warning',text:'A sourced official warning and high local-impact evidence are both present. Be ready to act immediately and follow local emergency instructions.'};
    if(finite(x.localImpact)&&clamp(x.localImpact)>=.78&&finite(x.evidence)&&clamp(x.evidence)>=.78)return{stage:'consider-early-departure',authority:'research',text:'Strong modeled local-impact evidence supports reviewing official guidance and whether leaving early is appropriate while travel remains safe. This is not an evacuation order.'};
    if(finite(x.localImpact)&&clamp(x.localImpact)>=.58)return{stage:'prepare',authority:'research',text:'Prepare now, review routes and official guidance, and be ready for conditions to worsen.'};
    return{stage:'monitor',authority:'research',text:'Continue monitoring authoritative sources; current evidence does not support an evacuation recommendation.'};
  }
  function explain(x={}){
    const c=compoundIndex(x),h=horizon(x);if(c.total==null||c.coverage<.25)return{compound:c,impact:null,evidence:finite(x.evidence)?clamp(x.evidence):null,horizon:h,action:{stage:'unknown',authority:'research',text:'Insufficient measured coverage for a compound impact score.'},drivers:[],text:'Compound environmental state is unknown because measured coverage is insufficient.'};
    const exposure=finite(x.exposure)?clamp(x.exposure):null,vulnerability=finite(x.vulnerability)?clamp(x.vulnerability):null,impact=(exposure==null||vulnerability==null)?null:clamp(.62*c.total+.20*exposure+.18*vulnerability),evidence=finite(x.evidence)?clamp(x.evidence):null;
    const a=actionStage({officialEvacuation:x.officialEvacuation,officialWarning:x.officialWarning,officialAuthority:x.officialAuthority,officialSourceUrl:x.officialSourceUrl,localImpact:impact,evidence});
    const drivers=[['atmosphere',c.atmosphere],['ocean',c.ocean],['ground',c.ground],['fire/dryness',c.fire],['ice/snow',c.cryosphere],['water/flood',c.water],['cross-system coupling',c.coupling]].filter(d=>d[1]!=null).sort((m,n)=>n[1]-m[1]);
    const impactText=impact==null?'Local impact is unknown until exposure and vulnerability are measured.':`Local impact index ${pct(impact)} out of 100.`;
    return{compound:c,impact,evidence,horizon:h,action:a,drivers:drivers.slice(0,4),text:`Combined environmental load ${pct(c.total)} out of 100 with ${pct(c.coverage)} percent measured coverage. ${impactText} Strongest measured contributors: ${drivers.slice(0,4).map(d=>`${d[0]} ${pct(d[1])}`).join(', ')||'none'}. ${a.text}`};
  }
  return{clamp,officialProvenance,weighted,interaction,compoundIndex,horizon,actionStage,explain};
})();
