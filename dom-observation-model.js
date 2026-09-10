const DOMObservationModel=(()=>{
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
  const median=a=>{const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!v.length)return NaN;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2};
  const mad=a=>{const m=median(a);if(!Number.isFinite(m))return NaN;return median(a.map(x=>Math.abs(x-m)))};
  function robustZ(value,baseline){const m=median(baseline),d=mad(baseline);if(!Number.isFinite(value)||!Number.isFinite(m)||!Number.isFinite(d)||d===0)return null;return(value-m)/(1.4826*d)}
  function uniqueLineages(rows){const s=new Set();for(const r of rows||[]){const id=r&&r.lineageId;if(id)s.add(String(id));}return s.size}
  function corroboration(rows){const n=uniqueLineages(rows);return clamp((n-1)/3)}
  function evidenceStrength(x={}){const Q=clamp(x.quality),F=clamp(x.freshness),G=clamp(x.geospatial),C=clamp(x.corroboration),U=clamp(x.uncertaintyQuality),T=clamp(x.trend);return clamp(.24*Q+.18*F+.16*G+.18*C+.14*U+.10*T)}
  function evidenceGrade(v){const p=Math.round(clamp(v)*100);return p>=90?'very strong':p>=75?'strong':p>=55?'moderate':p>=35?'limited':'weak / insufficient'}
  function spike(value,baseline,{minEvidence=.55,evidence=.0}={}){const z=robustZ(value,baseline);if(z===null)return{z:null,unusual:false,qualified:false};const unusual=Math.abs(z)>=3;return{z,unusual,qualified:unusual&&evidence>=minEvidence}}
  function impactLanguage({officialForecast=false,officialWarning=false,evidence=.0,trend=.0}={}){if(officialWarning)return'official warning active';if(officialForecast)return'official forecast indicates possible impact';if(evidence>=.75&&trend>=.55)return'evidence suggests conditions could affect the surrounding region';return'observed signal; stronger outcome is not established'}
  return{clamp,median,mad,robustZ,uniqueLineages,corroboration,evidenceStrength,evidenceGrade,spike,impactLanguage};
})();