const DOMEnvironmentalDefense=(()=>{
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const clamp=(x,a=0,b=1)=>{const n=Number(x);return Number.isFinite(n)?Math.max(a,Math.min(b,n)):a};
  const rad=d=>Number(d)*Math.PI/180;
  const kahanSum=values=>{let s=0,c=0;for(const v of values||[]){if(!Number.isFinite(v))continue;const y=v-c,t=s+y;c=(t-s)-y;s=t}return s};
  function normalizeTemperature(obs={}){
    if(!finite(obs.value))return null;
    const unit=String(obs.unit||'C').toUpperCase();let c=Number(obs.value);
    if(unit==='K')c-=273.15;else if(unit==='F'||unit==='°F')c=(c-32)*5/9;else if(unit!=='C'&&unit!=='°C')return null;
    const uncertaintyC=finite(obs.uncertaintyC)?Math.max(0,Number(obs.uncertaintyC)):null;
    const resolutionC=finite(obs.resolutionC)?Math.max(0,Number(obs.resolutionC)):null;
    return{...obs,valueC:c,uncertaintyC,resolutionC,unit:'C'};
  }
  function observationWeight(obs={}){
    const q=finite(obs.quality)?clamp(obs.quality):0.5;
    const f=finite(obs.freshness)?clamp(obs.freshness):0.5;
    const u=finite(obs.uncertaintyC)&&Number(obs.uncertaintyC)>0?1/(Number(obs.uncertaintyC)**2):1;
    return q*f*u;
  }
  function fusePoint(observations=[]){
    const rows=(observations||[]).map(normalizeTemperature).filter(Boolean);
    if(!rows.length)return{valueC:null,uncertaintyC:null,count:0,effectiveWeight:0,spreadC:null};
    const weights=rows.map(observationWeight),sw=kahanSum(weights);
    if(!(sw>0))return{valueC:null,uncertaintyC:null,count:rows.length,effectiveWeight:0,spreadC:null};
    const mean=kahanSum(rows.map((r,i)=>r.valueC*weights[i]))/sw;
    const variance=kahanSum(rows.map((r,i)=>weights[i]*(r.valueC-mean)**2))/sw;
    const propagated=1/Math.sqrt(sw),spread=Math.sqrt(Math.max(0,variance));
    return{valueC:mean,uncertaintyC:Math.max(propagated,spread),count:rows.length,effectiveWeight:sw,spreadC:spread};
  }
  function areaWeight(lat){if(!finite(lat))return 0;const n=Number(lat);if(n<-90||n>90)return 0;return Math.max(0,Math.cos(rad(n)))}
  function globalAreaWeightedMean(cells=[],options={}){
    const expected=finite(options.expectedAreaWeight)&&Number(options.expectedAreaWeight)>0?Number(options.expectedAreaWeight):null;
    const unresolvedEmpty=()=>({valueC:null,uncertaintyC:null,coverage:expected==null?null:0,count:0,coverageResolved:expected!=null,representedAreaWeight:0,expectedAreaWeight:expected});
    const usable=(cells||[]).filter(c=>finite(c.valueC)&&finite(c.lat)&&Number(c.lat)>=-90&&Number(c.lat)<=90);
    if(!usable.length)return unresolvedEmpty();
    const contributions=[],weights=[],uncertaintyTerms=[];let representedArea=0;
    for(const c of usable){const nominal=finite(c.nominalAreaWeight)?Math.max(0,Number(c.nominalAreaWeight)):areaWeight(c.lat);const quality=finite(c.quality)?clamp(c.quality):.5;const localCoverage=finite(c.coverage)?clamp(c.coverage):.5;const w=nominal*quality*localCoverage;if(!(w>0))continue;weights.push(w);contributions.push(Number(c.valueC)*w);representedArea+=nominal*localCoverage;if(finite(c.uncertaintyC))uncertaintyTerms.push((w*Math.max(0,Number(c.uncertaintyC)))**2)}
    const sw=kahanSum(weights);if(!(sw>0))return unresolvedEmpty();
    const coverage=expected==null?null:clamp(representedArea/expected);
    return{valueC:kahanSum(contributions)/sw,uncertaintyC:uncertaintyTerms.length?Math.sqrt(kahanSum(uncertaintyTerms))/sw:null,coverage,count:weights.length,coverageResolved:expected!=null,representedAreaWeight:representedArea,expectedAreaWeight:expected};
  }
  function anomaly(current,baseline){if(!finite(current)||!finite(baseline))return null;return Number(current)-Number(baseline)}
  function robustStats(values=[]){const v=(values||[]).filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!v.length)return{median:null,mad:null};const m=v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;const d=v.map(x=>Math.abs(x-m)).sort((a,b)=>a-b),md=d.length%2?d[(d.length-1)/2]:(d[d.length/2-1]+d[d.length/2])/2;return{median:m,mad:md}}
  function robustZ(value,baseline=[]){if(!finite(value))return null;const s=robustStats(baseline);if(!finite(s.median)||!finite(s.mad)||s.mad===0)return null;return(Number(value)-s.median)/(1.4826*s.mad)}
  function confidenceEnvelope({measurementUncertainty=null,modelUncertainty=null,representativenessUncertainty=null}={}){const terms=[measurementUncertainty,modelUncertainty,representativenessUncertainty].filter(finite).map(x=>Math.max(0,Number(x)));if(!terms.length)return null;return Math.sqrt(kahanSum(terms.map(x=>x*x)))}
  function assessTemperatureField({cells=[],baselineC=null,expectedAreaWeight=null,modelUncertaintyC=null}={}){
    const global=globalAreaWeightedMean(cells,{expectedAreaWeight});const anom=anomaly(global.valueC,baselineC);
    const representativeness=global.coverageResolved&&global.coverage!=null?1-global.coverage:null;
    const uncertainty=global.coverageResolved?confidenceEnvelope({measurementUncertainty:global.uncertaintyC,modelUncertainty:modelUncertaintyC,representativenessUncertainty:representativeness}):null;
    return{globalMeanC:global.valueC,globalMeanUncertaintyC:uncertainty,uncertaintyResolved:global.coverageResolved&&uncertainty!=null,coverage:global.coverage,count:global.count,anomalyC:anom,coverageResolved:global.coverageResolved,precisionPolicy:'display only digits supported by measurement, model and representativeness uncertainty'};
  }
  function activationFromEvidence({anomalyZ=null,quality=null,freshness=null,corroboration=null,persistence=null}={}){const a=finite(anomalyZ)?clamp(Math.abs(Number(anomalyZ))/6):0,q=finite(quality)?clamp(quality):0,f=finite(freshness)?clamp(freshness):0,c=finite(corroboration)?clamp(corroboration):0,p=finite(persistence)?clamp(persistence):0;return clamp(.34*a+.18*q+.18*f+.16*c+.14*p)}
  function verdict({evidenceStrength=null,coverage=null,officialAlert=false,uncertainty=null}={}){if(officialAlert)return{level:'official',text:'Official alert active; issuing authority takes precedence.'};if(!finite(evidenceStrength)||!finite(coverage)||Number(coverage)<.25)return{level:'unknown',text:'Insufficient measured coverage for a strong environmental judgment.'};const e=clamp(evidenceStrength),u=finite(uncertainty)?Math.max(0,Number(uncertainty)):null;if(e>=.85&&Number(coverage)>=.7)return{level:'high-evidence',text:u==null?'Strong multi-source evidence; uncertainty unresolved.':'Strong multi-source evidence with quantified uncertainty.'};if(e>=.6)return{level:'moderate-evidence',text:'Moderate evidence; continue corroboration and trend monitoring.'};return{level:'limited-evidence',text:'Evidence is limited; no strong outcome claim is supported.'}}
  return{finite,clamp,kahanSum,normalizeTemperature,observationWeight,fusePoint,areaWeight,globalAreaWeightedMean,anomaly,robustStats,robustZ,confidenceEnvelope,assessTemperatureField,activationFromEvidence,verdict};
})();
