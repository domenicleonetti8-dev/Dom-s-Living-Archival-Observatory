const DOMPlanetHealth=(()=>{
  const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
  const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  function weightedScore(parts=[]){
    let n=0,d=0,coverage=0;
    for(const p of parts){if(!p||!finite(p.value)||!finite(p.weight)||Number(p.weight)<=0)continue;const w=Number(p.weight),q=finite(p.quality)?clamp(p.quality):1,f=finite(p.freshness)?clamp(p.freshness):1,eff=w*q*f;n+=clamp(p.value)*eff;d+=eff;coverage+=w;}
    return{value:d?n/d:null,coverage:clamp(coverage)};
  }
  function state(input={}){
    const domains={
      climate:weightedScore(input.climate||[]),
      ocean:weightedScore(input.ocean||[]),
      hydrology:weightedScore(input.hydrology||[]),
      cryosphere:weightedScore(input.cryosphere||[]),
      forests:weightedScore(input.forests||[]),
      reefs:weightedScore(input.reefs||[]),
      wildfire:weightedScore(input.wildfire||[]),
      atmosphere:weightedScore(input.atmosphere||[]),
      biodiversity:weightedScore(input.biodiversity||[]),
      geophysical:weightedScore(input.geophysical||[])
    };
    const priors={climate:.17,ocean:.13,hydrology:.10,cryosphere:.09,forests:.11,reefs:.08,wildfire:.07,atmosphere:.10,biodiversity:.08,geophysical:.07};
    let n=0,d=0,coverage=0;
    for(const [k,v] of Object.entries(domains)){if(v.value==null)continue;const w=priors[k];n+=v.value*w;d+=w;coverage+=w*v.coverage;}
    const stress=d?n/d:null;
    return{stress,health:stress==null?null:1-stress,coverage:d?coverage/d:0,domains};
  }
  function forecastWindow({series=[],threshold,direction='above'}={}){
    const pts=(series||[]).filter(p=>p&&finite(p.t)&&finite(p.value)&&finite(p.sigma)).sort((a,b)=>Number(a.t)-Number(b.t));
    if(pts.length<3||!finite(threshold))return{kind:'unresolved',reason:'insufficient qualified trend data'};
    const xs=pts.map(p=>Number(p.t)),ys=pts.map(p=>Number(p.value)),ws=pts.map(p=>1/Math.max(1e-12,Number(p.sigma)**2));
    let sw=0,sx=0,sy=0,sxx=0,sxy=0;for(let i=0;i<pts.length;i++){const w=ws[i];sw+=w;sx+=w*xs[i];sy+=w*ys[i];sxx+=w*xs[i]*xs[i];sxy+=w*xs[i]*ys[i];}
    const den=sw*sxx-sx*sx;if(Math.abs(den)<1e-12)return{kind:'unresolved',reason:'trend geometry singular'};
    const slope=(sw*sxy-sx*sy)/den,intercept=(sy-slope*sx)/sw;
    if((direction==='above'&&slope<=0)||(direction==='below'&&slope>=0))return{kind:'unresolved',reason:'trend is not moving toward threshold',slope};
    const t=(Number(threshold)-intercept)/slope;if(!Number.isFinite(t))return{kind:'unresolved',reason:'no finite threshold crossing'};
    let rss=0;for(let i=0;i<pts.length;i++){const r=ys[i]-(intercept+slope*xs[i]);rss+=ws[i]*r*r;}
    const dof=Math.max(1,pts.length-2),sigmaFit=Math.sqrt(rss/dof/Math.max(sw/pts.length,1e-12));
    const sigmaT=Math.abs(sigmaFit/Math.max(Math.abs(slope),1e-12));
    return{kind:'statistical-threshold-window',estimateT:t,lowerT:t-1.96*sigmaT,upperT:t+1.96*sigmaT,slope,fitSigma:sigmaFit,warning:'scenario/trend estimate, not deterministic event prediction'};
  }
  function monthYearFromDecimalYear(y){if(!finite(y))return null;let year=Math.floor(Number(y)),m=Math.round((Number(y)-year)*12)+1;if(m>12){year++;m=1}if(m<1)m=1;return{year,month:m};}
  function projectionLabel(p){if(!p||p.kind!=='statistical-threshold-window')return{status:'UNRESOLVED'};return{status:'PROJECTED WINDOW',estimate:monthYearFromDecimalYear(p.estimateT),lower:monthYearFromDecimalYear(p.lowerT),upper:monthYearFromDecimalYear(p.upperT),warning:p.warning};}
  return{weightedScore,state,forecastWindow,monthYearFromDecimalYear,projectionLabel};
})();
