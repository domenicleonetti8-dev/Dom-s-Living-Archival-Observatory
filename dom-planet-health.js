const DOMPlanetHealth=(()=>{
  const clamp=x=>{const n=Number(x);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0};
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  function weightedScore(parts=[]){let n=0,d=0,coverage=0,totalWeight=0;for(const p of parts){if(!p||!finite(p.weight)||Number(p.weight)<=0)continue;const w=Number(p.weight);totalWeight+=w;if(!finite(p.value))continue;const q=finite(p.quality)?clamp(p.quality):1,f=finite(p.freshness)?clamp(p.freshness):1,eff=w*q*f;if(!(eff>0))continue;n+=clamp(p.value)*eff;d+=eff;coverage+=w}return{value:d?n/d:null,coverage:totalWeight?clamp(coverage/totalWeight):0}}
  function state(input={}){const domains={climate:weightedScore(input.climate||[]),ocean:weightedScore(input.ocean||[]),hydrology:weightedScore(input.hydrology||[]),cryosphere:weightedScore(input.cryosphere||[]),forests:weightedScore(input.forests||[]),reefs:weightedScore(input.reefs||[]),wildfire:weightedScore(input.wildfire||[]),atmosphere:weightedScore(input.atmosphere||[]),biodiversity:weightedScore(input.biodiversity||[]),geophysical:weightedScore(input.geophysical||[])};const priors={climate:.17,ocean:.13,hydrology:.10,cryosphere:.09,forests:.11,reefs:.08,wildfire:.07,atmosphere:.10,biodiversity:.08,geophysical:.07};let n=0,d=0,coverage=0;for(const[k,v]of Object.entries(domains)){if(v.value==null)continue;const w=priors[k];n+=v.value*w;d+=w;coverage+=w*v.coverage}const stress=d?n/d:null;return{stress,health:stress==null?null:1-stress,coverage:d?clamp(coverage/d):0,domains}}
  function unresolved(reason,extra={}){return{kind:'unresolved',reason,...extra}}
  function forecastWindow({series=[],threshold,direction='above',minPoints=8,minSpanYears=2,minR2=.55,maxHorizonYears=100}={}){
    const pts=(series||[]).filter(p=>p&&finite(p.t)&&finite(p.value)&&finite(p.sigma)&&Number(p.sigma)>0).sort((a,b)=>Number(a.t)-Number(b.t));
    if(pts.length<Math.max(3,minPoints)||!finite(threshold))return unresolved('insufficient qualified trend data',{count:pts.length});
    const xs=pts.map(p=>Number(p.t)),ys=pts.map(p=>Number(p.value)),ws=pts.map(p=>1/(Number(p.sigma)**2)),span=xs[xs.length-1]-xs[0];
    if(!(span>=minSpanYears))return unresolved('insufficient temporal span',{spanYears:span});
    let sw=0,sx=0,sy=0,sxx=0,sxy=0;for(let i=0;i<pts.length;i++){const w=ws[i];sw+=w;sx+=w*xs[i];sy+=w*ys[i];sxx+=w*xs[i]*xs[i];sxy+=w*xs[i]*ys[i]}
    const den=sw*sxx-sx*sx;if(!(den>1e-12))return unresolved('trend geometry singular');
    const slope=(sw*sxy-sx*sy)/den,intercept=(sy-slope*sx)/sw;
    if((direction==='above'&&slope<=0)||(direction==='below'&&slope>=0))return unresolved('trend is not moving toward threshold',{slope});
    const weightedMean=sy/sw;let sse=0,sst=0;for(let i=0;i<pts.length;i++){const fit=intercept+slope*xs[i],r=ys[i]-fit;sse+=ws[i]*r*r;sst+=ws[i]*(ys[i]-weightedMean)**2}
    const r2=sst>0?Math.max(0,Math.min(1,1-sse/sst)):0;if(r2<minR2)return unresolved('trend fit too weak for a month/year crossing',{slope,r2});
    const t=(Number(threshold)-intercept)/slope,lastT=xs[xs.length-1];if(!Number.isFinite(t))return unresolved('no finite threshold crossing');if(t<lastT)return unresolved('threshold crossing is not in the future',{estimateT:t,lastT});if(t-lastT>maxHorizonYears)return unresolved('crossing lies beyond configured projection horizon',{estimateT:t,lastT});
    const dof=Math.max(1,pts.length-2),reducedChi2=sse/dof,scale=Math.max(1,reducedChi2),varA=(sxx/den)*scale,varB=(sw/den)*scale,covAB=(-sx/den)*scale,da=-1/slope,db=-t/slope,varT=Math.max(0,da*da*varA+db*db*varB+2*da*db*covAB),sigmaT=Math.sqrt(varT);
    if(!Number.isFinite(sigmaT))return unresolved('projection uncertainty unresolved',{slope,r2});
    return{kind:'statistical-threshold-window',estimateT:t,lowerT:t-1.96*sigmaT,upperT:t+1.96*sigmaT,slope,r2,reducedChi2,sigmaT,count:pts.length,spanYears:span,warning:'statistical trend window only; scenario ensembles and authoritative projections take precedence'}
  function monthYearFromDecimalYear(y){if(!finite(y))return null;let year=Math.floor(Number(y)),fraction=Number(y)-year,month=Math.floor(fraction*12)+1;month=Math.max(1,Math.min(12,month));return{year,month}}
  function projectionLabel(p){if(!p||p.kind!=='statistical-threshold-window')return{status:'UNRESOLVED'};return{status:'PROJECTED WINDOW',estimate:monthYearFromDecimalYear(p.estimateT),lower:monthYearFromDecimalYear(p.lowerT),upper:monthYearFromDecimalYear(p.upperT),warning:p.warning,r2:p.r2,count:p.count,spanYears:p.spanYears}}
  return{weightedScore,state,forecastWindow,monthYearFromDecimalYear,projectionLabel};
})();