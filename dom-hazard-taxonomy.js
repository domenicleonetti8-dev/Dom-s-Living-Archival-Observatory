const DOMHazardTaxonomy=(()=>{
  const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
  const pct=x=>Math.round(clamp(x)*100);
  const CATEGORIES={
    earthquake:{family:'Geophysical',levels:['micro','minor','light','moderate','strong','major','great']},
    tsunami:{family:'Oceanic/Geophysical',levels:['information','advisory','watch','warning']},
    cyclone:{family:'Atmospheric/Oceanic',levels:['disturbance','depression','tropical storm','category 1','category 2','category 3','category 4','category 5']},
    tornado:{family:'Atmospheric',levels:['EF0','EF1','EF2','EF3','EF4','EF5']},
    severe_thunderstorm:{family:'Atmospheric',levels:['marginal','slight','enhanced','moderate','high']},
    flood:{family:'Hydrologic',levels:['action','minor','moderate','major','record']},
    wildfire:{family:'Fire/Land',levels:['low','moderate','high','very high','extreme']},
    volcano:{family:'Geophysical/Atmospheric',levels:['normal','advisory','watch','warning']},
    landslide:{family:'Geophysical/Hydrologic',levels:['background','elevated','high','critical']},
    winter_storm:{family:'Atmospheric/Cryosphere',levels:['minor','moderate','major','extreme']},
    heat:{family:'Atmospheric',levels:['caution','extreme caution','danger','extreme danger']},
    drought:{family:'Atmospheric/Hydrologic/Land',levels:['abnormally dry','moderate','severe','extreme','exceptional']},
    space_weather:{family:'Space/Atmospheric',levels:['minor','moderate','strong','severe','extreme']}
  };
  function cycloneCategory(windKts){const w=Number(windKts);if(!Number.isFinite(w))return'unknown';if(w<34)return'depression';if(w<64)return'tropical storm';if(w<83)return'category 1';if(w<96)return'category 2';if(w<113)return'category 3';if(w<137)return'category 4';return'category 5'}
  function earthquakeClass(m){m=Number(m);if(!Number.isFinite(m))return'unknown';if(m<2)return'micro';if(m<4)return'minor';if(m<5)return'light';if(m<6)return'moderate';if(m<7)return'strong';if(m<8)return'major';return'great'}
  function weightedGeometricMean(parts){let sw=0,ls=0,n=0;for(const p of parts||[]){if(!p||!Number.isFinite(p.value)||!Number.isFinite(p.weight)||p.weight<=0)continue;const v=Math.max(.001,clamp(p.value));ls+=p.weight*Math.log(v);sw+=p.weight;n++}return n&&sw?Math.exp(ls/sw):0}
  function interactionBonus(parts){const hot=(parts||[]).filter(p=>p&&clamp(p.value)>=.65);if(hot.length<2)return 0;const distinct=new Set(hot.map(p=>p.domain||p.name));return Math.min(.25,Math.max(0,(distinct.size-1)*.05))}
  function compoundRisk(parts,evidence=.5){const base=weightedGeometricMean(parts);const bonus=interactionBonus(parts);const score=clamp((base+bonus)*(.65+.35*clamp(evidence)));return{score,percent:pct(score),interactionBonus:bonus,contributors:(parts||[]).slice().sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,5)}}
  function earlyWarning(signals,{minEvidence=.55,minDomains=2}={}){const qualified=(signals||[]).filter(s=>s&&clamp(s.evidence)>=minEvidence&&Math.abs(Number(s.z)||0)>=2.5);const domains=new Set(qualified.map(s=>s.domain));const worsening=qualified.filter(s=>(Number(s.trend)||0)>0);const severeSpike=qualified.some(s=>Math.abs(Number(s.z)||0)>=4);
    const flag=domains.size>=minDomains&&(worsening.length>=2||severeSpike);
    const strength=clamp(.35*Math.min(1,qualified.length/5)+.25*Math.min(1,domains.size/4)+.20*Math.min(1,worsening.length/4)+.20*(severeSpike?1:0));
    return{flag,strength,percent:pct(strength),domains:[...domains],reasons:qualified.map(s=>`${s.name||s.domain}: z=${Number(s.z).toFixed(2)}, trend=${Number(s.trend||0).toFixed(2)}, evidence=${pct(s.evidence)}/100`)}};
  function combinationAssessment(parts,signals,evidence){const compound=compoundRisk(parts,evidence),early=earlyWarning(signals),badCombination=compound.score>=.7&&early.flag;return{compound,early,badCombination,language:badCombination?'Multiple independently supported hazard factors are worsening together; conditions warrant elevated attention.':early.flag?'Early multi-domain warning pattern detected; stronger outcome is not yet established.':'No qualified compound early-warning pattern detected.'}}
  return{CATEGORIES,cycloneCategory,earthquakeClass,weightedGeometricMean,interactionBonus,compoundRisk,earlyWarning,combinationAssessment};
})();