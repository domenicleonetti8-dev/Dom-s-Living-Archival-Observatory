const DOMPlanetHealth=(()=>{
  const clamp=x=>{const n=Number(x);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0};
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const ksum=a=>{let s=0,c=0;for(const raw of a||[]){const v=Number(raw);if(!Number.isFinite(v))continue;const y=v-c,t=s+y;c=(t-s)-y;s=t}return s};
  function weightedScore(parts=[]){let n=0,d=0,coveredWeight=0,totalWeight=0;for(const p of parts){if(!p||!finite(p.weight)||Number(p.weight)<=0)continue;const w=Number(p.weight);totalWeight+=w;if(!finite(p.value))continue;const q=finite(p.quality)?clamp(p.quality):.5,f=finite(p.freshness)?clamp(p.freshness):.5,c=finite(p.coverage)?clamp(p.coverage):.5,eff=w*q*f*c;if(!(eff>0))continue;n+=clamp(p.value)*eff;d+=eff;coveredWeight+=w*Math.min(q,f,c)}return{value:d?n/d:null,coverage:totalWeight?clamp(coveredWeight/totalWeight):0,effectiveWeight:d,totalWeight}}
  function dependenceDiagnostics(names,weights,correlationMatrix){
    const n=names.length;if(!n)return{effectiveIndependentDomains:0,dependenceVariance:null,normalizedWeights:[]};
    const sw=ksum(weights);if(!(sw>0))return{effectiveIndependentDomains:0,dependenceVariance:null,normalizedWeights:[]};
    const a=weights.map(w=>w/sw);let v=0,valid=true;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      let rho=i===j?1:0;
      if(correlationMatrix&&correlationMatrix[names[i]]&&finite(correlationMatrix[names[i]][names[j]]))rho=Math.max(-1,Math.min(1,Number(correlationMatrix[names[i]][names[j]])));
      else if(correlationMatrix&&i!==j)valid=false;
      v+=a[i]*a[j]*rho;
    }
    const effectiveIndependentDomains=v>0?Math.min(n,Math.max(1,1/v)):n;
    return{effectiveIndependentDomains,dependenceVariance:v,normalizedWeights:a,correlationMatrixComplete:correlationMatrix?valid:false,method:'Effective independent domain count = 1/(wᵀRw), with normalized evidence weights w and supplied domain correlation matrix R. Correlation changes confidence/effective information, not the observed stress mean.'};
  }
  function state(input={}){const domains={climate:weightedScore(input.climate||[]),ocean:weightedScore(input.ocean||[]),hydrology:weightedScore(input.hydrology||[]),cryosphere:weightedScore(input.cryosphere||[]),forests:weightedScore(input.forests||[]),reefs:weightedScore(input.reefs||[]),wildfire:weightedScore(input.wildfire||[]),atmosphere:weightedScore(input.atmosphere||[]),biodiversity:weightedScore(input.biodiversity||[]),geophysical:weightedScore(input.geophysical||[])};const priors={climate:.17,ocean:.13,hydrology:.10,cryosphere:.09,forests:.11,reefs:.08,wildfire:.07,atmosphere:.10,biodiversity:.08,geophysical:.07};let n=0,d=0,globalCoverage=0,observedPriorWeight=0;const qualified=[],usedNames=[],usedWeights=[];for(const[k,v]of Object.entries(domains)){const w=priors[k],cov=clamp(v.coverage);globalCoverage+=w*cov;if(v.value==null)continue;observedPriorWeight+=w;const ew=w*cov;if(ew>0){n+=v.value*ew;d+=ew;usedNames.push(k);usedWeights.push(ew)}if(cov>=.5)qualified.push(k)}const stress=d?n/d:null,coverage=clamp(globalCoverage),provisionalHealth=stress==null?null:1-stress,dependence=dependenceDiagnostics(usedNames,usedWeights,input.correlationMatrix||null);const independenceFraction=usedNames.length?clamp(dependence.effectiveIndependentDomains/usedNames.length):0;const evidenceConfidence=coverage*Math.sqrt(independenceFraction||0);const displayQualified=provisionalHealth!=null&&coverage>=.6&&qualified.length>=6&&observedPriorWeight>=.6&&(!input.correlationMatrix||dependence.effectiveIndependentDomains>=4);return{stress,provisionalHealth,health:displayQualified?provisionalHealth:null,coverage,observedPriorWeight,effectiveGlobalWeight:d,displayQualified,qualifiedDomains:qualified,priors,dependence,evidenceConfidence,method:'Domain stress means are evidence-weighted internally. The global composite is prior-weighted and coverage-weighted. When an empirical domain correlation matrix is supplied, covariance affects evidence confidence/effective independent information rather than silently changing the measured mean; this reduces double-counting of correlated Earth-system signals.',domains}}
  function unresolved(reason,extra={}){return{kind:'unresolved',reason,...extra}}
  function forecastWindow({series=[],threshold,direction='above',minPoints=8,minSpanYears=2,minR2=.55,maxHorizonYears=100}={}){
    const pts=(series||[]).filter(p=>p&&finite(p.t)&&finite(p.value)&&finite(p.sigma)&&Number(p.sigma)>0).sort((a,b)=>Number(a.t)-Number(b.t));
    if(pts.length<Math.max(3,minPoints)||!finite(threshold))return unresolved('insufficient qualified trend data',{count:pts.length});
    const xs=pts.map(p=>Number(p.t)),ys=pts.map(p=>Number(p.value)),ws=pts.map(p=>1/(Number(p.sigma)**2)),span=xs[xs.length-1]-xs[0];
    if(!(span>=minSpanYears))return unresolved('insufficient temporal span',{spanYears:span});
    const sw=ksum(ws);if(!(sw>0))return unresolved('zero effective regression weight');
    const xbar=ksum(xs.map((x,i)=>x*ws[i]))/sw,ybar=ksum(ys.map((y,i)=>y*ws[i]))/sw;
    const dx=xs.map(x=>x-xbar),dy=ys.map(y=>y-ybar),sxx=ksum(dx.map((x,i)=>ws[i]*x*x)),sxy=ksum(dx.map((x,i)=>ws[i]*x*dy[i]));
    if(!(sxx>1e-14))return unresolved('trend geometry singular');
    const slope=sxy/sxx;
    if((direction==='above'&&slope<=0)||(direction==='below'&&slope>=0))return unresolved('trend is not moving toward threshold',{slope});
    let sse=0,sst=0;for(let i=0;i<pts.length;i++){const fit=ybar+slope*dx[i],r=ys[i]-fit;sse+=ws[i]*r*r;sst+=ws[i]*dy[i]*dy[i]}
    const r2=sst>0?Math.max(0,Math.min(1,1-sse/sst)):0;if(r2<minR2)return unresolved('trend fit too weak for a month/year crossing',{slope,r2});
    const residuals=pts.map((_,i)=>ys[i]-(ybar+slope*dx[i]));let r1=null;if(residuals.length>=4){const a=residuals.slice(0,-1),b=residuals.slice(1),ma=ksum(a)/a.length,mb=ksum(b)/b.length;let num=0,da=0,db=0;for(let i=0;i<a.length;i++){num+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2}if(da>0&&db>0)r1=Math.max(-.99,Math.min(.99,num/Math.sqrt(da*db)))}
    const deltaToThreshold=Number(threshold)-ybar,t=xbar+deltaToThreshold/slope,lastT=xs[xs.length-1];if(!Number.isFinite(t))return unresolved('no finite threshold crossing');if(t<lastT)return unresolved('threshold crossing is not in the future',{estimateT:t,lastT});if(t-lastT>maxHorizonYears)return unresolved('crossing lies beyond configured projection horizon',{estimateT:t,lastT});
    const dof=Math.max(1,pts.length-2),reducedChi2=sse/dof,scale=Math.max(1,reducedChi2),acfInflation=r1==null?1:Math.sqrt(Math.max(1,(1+r1)/(1-r1))),varYbar=scale/sw,varSlope=scale/sxx,dY=-1/slope,dSlope=-deltaToThreshold/(slope*slope),varT=Math.max(0,dY*dY*varYbar+dSlope*dSlope*varSlope)*acfInflation*acfInflation,sigmaT=Math.sqrt(varT);
    if(!Number.isFinite(sigmaT))return unresolved('projection uncertainty unresolved',{slope,r2});
    return{kind:'statistical-threshold-window',estimateT:t,lowerT:t-1.96*sigmaT,upperT:t+1.96*sigmaT,slope,r2,reducedChi2,sigmaT,residualLag1:r1,acfInflation,count:pts.length,spanYears:span,referenceT:xbar,warning:'Weighted linear-regression threshold window with first-order residual-autocorrelation inflation. It still does not include structural/model/scenario uncertainty; authoritative physics-based ensembles take precedence.'};
  }
  function monthYearFromDecimalYear(y){if(!finite(y))return null;let year=Math.floor(Number(y)),fraction=Number(y)-year,month=Math.floor(fraction*12+1e-10)+1;month=Math.max(1,Math.min(12,month));return{year,month}}
  function projectionLabel(p){if(!p||p.kind!=='statistical-threshold-window')return{status:'UNRESOLVED'};return{status:'PROJECTED WINDOW',estimate:monthYearFromDecimalYear(p.estimateT),lower:monthYearFromDecimalYear(p.lowerT),upper:monthYearFromDecimalYear(p.upperT),warning:p.warning,r2:p.r2,count:p.count,spanYears:p.spanYears,residualLag1:p.residualLag1}}
  return{weightedScore,dependenceDiagnostics,state,forecastWindow,monthYearFromDecimalYear,projectionLabel};
})();
