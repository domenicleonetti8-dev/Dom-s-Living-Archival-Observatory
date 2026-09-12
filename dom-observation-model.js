const DOMObservationModel=(()=>{
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
  const median=a=>{const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!v.length)return NaN;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2};
  const mad=a=>{const m=median(a);if(!Number.isFinite(m))return NaN;return median(a.map(x=>Math.abs(x-m)))};
  function robustZ(value,baseline){const m=median(baseline),d=mad(baseline);if(!Number.isFinite(value)||!Number.isFinite(m)||!Number.isFinite(d)||d===0)return null;return(value-m)/(1.4826*d)}
  function uniqueLineages(rows){const s=new Set();for(const r of rows||[]){const id=r&&r.lineageId;if(id)s.add(String(id));}return s.size}
  function corroboration(rows){const n=uniqueLineages(rows);return clamp((n-1)/3)}
  function evidenceComponents(x={}){
    const quality=clamp(x.quality),freshness=clamp(x.freshness),geospatial=clamp(x.geospatial);
    const hasUncertainty=Number.isFinite(Number(x.uncertaintyQuality)),uncertaintyQuality=hasUncertainty?clamp(x.uncertaintyQuality):null;
    const locationEvidence=hasUncertainty?clamp(.70*geospatial+.30*uncertaintyQuality):geospatial;
    return{quality,freshness,geospatial,uncertaintyQuality,locationEvidence,weights:{quality:.44,freshness:.30,locationEvidence:.26},excludedFromEvidenceStrength:['corroboration','trend']};
  }
  function evidenceStrength(x={}){const c=evidenceComponents(x);return clamp(c.weights.quality*c.quality+c.weights.freshness*c.freshness+c.weights.locationEvidence*c.locationEvidence)}
  function evidenceGrade(v){const p=Math.round(clamp(v)*100);return p>=90?'very strong':p>=75?'strong':p>=55?'moderate':p>=35?'limited':'weak / insufficient'}
  function scoreAudit(x={}){const c=evidenceComponents(x);return{evidenceStrength:evidenceStrength(x),components:c,note:'Corroboration and temporal trend are excluded from evidence-strength confidence so callers can use them in hazard/priority logic without counting the same signal twice. Geospatial quality and uncertainty quality are combined into one location-evidence dimension rather than added as independent votes.'}}
  function spike(value,baseline,{minEvidence=.55,evidence=.0}={}){const z=robustZ(value,baseline);if(z===null)return{z:null,unusual:false,qualified:false};const unusual=Math.abs(z)>=3;return{z,unusual,qualified:unusual&&evidence>=minEvidence}}
  function impactLanguage({officialForecast=false,officialWarning=false,evidence=.0,trend=.0}={}){if(officialWarning)return'official warning active';if(officialForecast)return'official forecast indicates possible impact';if(evidence>=.75&&trend>=.55)return'evidence suggests conditions could affect the surrounding region';return'observed signal; stronger outcome is not established'}
  return{clamp,median,mad,robustZ,uniqueLineages,corroboration,evidenceComponents,evidenceStrength,evidenceGrade,scoreAudit,spike,impactLanguage};
})();