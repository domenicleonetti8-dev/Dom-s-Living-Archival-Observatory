(()=>{
  'use strict';
  const finite=x=>Number.isFinite(Number(x));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const variance=a=>{if(a.length<2)return null;const m=mean(a);return a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)};
  const stdev=a=>{const v=variance(a);return v==null?null:Math.sqrt(v)};
  function linearRegression(points){
    const rows=(points||[]).filter(p=>finite(p.x)&&finite(p.y)).map(p=>({x:Number(p.x),y:Number(p.y)}));
    if(rows.length<3)return null;
    const mx=mean(rows.map(r=>r.x)),my=mean(rows.map(r=>r.y));
    let sxx=0,sxy=0;
    for(const r of rows){sxx+=(r.x-mx)**2;sxy+=(r.x-mx)*(r.y-my)}
    if(!sxx)return null;
    const slope=sxy/sxx,intercept=my-slope*mx;
    const residuals=rows.map(r=>r.y-(intercept+slope*r.x));
    const sigma=rows.length>2?Math.sqrt(residuals.reduce((s,x)=>s+x*x,0)/(rows.length-2)):0;
    return {n:rows.length,slope,intercept,sigma,r2:(()=>{const syy=rows.reduce((s,r)=>s+(r.y-my)**2,0);return syy?1-residuals.reduce((s,x)=>s+x*x,0)/syy:0})()};
  }
  function forecastLinear(points,targetX,confidence=0.95){
    const model=linearRegression(points);if(!model||!finite(targetX))return null;
    const estimate=model.intercept+model.slope*Number(targetX);
    const z=confidence>=0.99?2.576:confidence>=0.95?1.96:1.645;
    const margin=z*model.sigma;
    return {...model,estimate,low:estimate-margin,high:estimate+margin,confidence};
  }
  function ewma(values,alpha=.3){
    const a=(values||[]).filter(finite).map(Number);if(!a.length)return null;
    const k=Math.min(.99,Math.max(.01,Number(alpha)||.3));let v=a[0];for(let i=1;i<a.length;i++)v=k*a[i]+(1-k)*v;return v;
  }
  function poissonRate(count,duration){if(!finite(count)||!finite(duration)||Number(duration)<=0)return null;const c=Math.max(0,Number(count)),d=Number(duration),rate=c/d,se=Math.sqrt(Math.max(c,1))/d;return{rate,low:Math.max(0,rate-1.96*se),high:rate+1.96*se,confidence:.95}}
  function readiness(series,minPoints=8){
    const a=(series||[]).filter(x=>finite(x.value)&&finite(x.time));
    if(a.length<minPoints)return{ready:false,reason:`needs at least ${minPoints} numeric observations`,points:a.length};
    const times=new Set(a.map(x=>Number(x.time)));if(times.size<3)return{ready:false,reason:'needs observations across at least 3 distinct times',points:a.length};
    return{ready:true,points:a.length};
  }
  window.DOMStatisticalPrediction=Object.freeze({mean,variance,stdev,linearRegression,forecastLinear,ewma,poissonRate,readiness});
})();
