(()=>{
  'use strict';
  const finite=x=>Number.isFinite(Number(x));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const variance=a=>{if(a.length<2)return null;const m=mean(a);return a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)};
  const stdev=a=>{const v=variance(a);return v==null?null:Math.sqrt(v)};
  function critical95(df){if(df<=1)return 12.706;if(df===2)return 4.303;if(df===3)return 3.182;if(df===4)return 2.776;if(df===5)return 2.571;if(df<=7)return 2.447;if(df<=9)return 2.306;if(df<=14)return 2.145;if(df<=19)return 2.093;if(df<=29)return 2.045;if(df<=59)return 2.000;if(df<=119)return 1.980;return 1.96}
  function linearRegression(points){
    const rows=(points||[]).filter(p=>finite(p.x)&&finite(p.y)).map(p=>({x:Number(p.x),y:Number(p.y)})).sort((a,b)=>a.x-b.x);
    if(rows.length<3)return null;
    const mx=mean(rows.map(r=>r.x)),my=mean(rows.map(r=>r.y));let sxx=0,sxy=0;
    for(const r of rows){sxx+=(r.x-mx)**2;sxy+=(r.x-mx)*(r.y-my)}
    if(!sxx)return null;
    const slope=sxy/sxx,intercept=my-slope*mx,residuals=rows.map(r=>r.y-(intercept+slope*r.x));
    const sse=residuals.reduce((s,x)=>s+x*x,0),df=rows.length-2,sigma=Math.sqrt(sse/df),slopeSE=sigma/Math.sqrt(sxx),slopeT=slopeSE?slope/slopeSE:(slope===0?0:Infinity);
    const syy=rows.reduce((s,r)=>s+(r.y-my)**2,0),r2=syy?Math.max(0,Math.min(1,1-sse/syy)):0;
    return {n:rows.length,slope,intercept,sigma,r2,xMean:mx,sxx,slopeSE,slopeT,df};
  }
  function forecastLinear(points,targetX,confidence=.95){
    const model=linearRegression(points);if(!model||!finite(targetX))return null;
    const x=Number(targetX),estimate=model.intercept+model.slope*x;
    const crit=confidence>=.99?2.576:confidence>=.95?critical95(model.df):1.645;
    const predictionSE=model.sigma*Math.sqrt(1+1/model.n+((x-model.xMean)**2/model.sxx));
    const margin=crit*predictionSE;
    return {...model,estimate,low:estimate-margin,high:estimate+margin,confidence,predictionSE,criticalValue:crit};
  }
  function ewma(values,alpha=.3){const a=(values||[]).filter(finite).map(Number);if(!a.length)return null;const k=Math.min(.99,Math.max(.01,Number(alpha)||.3));let v=a[0];for(let i=1;i<a.length;i++)v=k*a[i]+(1-k)*v;return v}
  function poissonRate(count,duration){if(!finite(count)||!finite(duration)||Number(duration)<=0)return null;const c=Math.max(0,Number(count)),d=Number(duration),rate=c/d,se=Math.sqrt(Math.max(c,1))/d;return{rate,low:Math.max(0,rate-1.96*se),high:rate+1.96*se,confidence:.95}}
  function readiness(series,minPoints=8){
    const a=(series||[]).filter(x=>finite(x.value)&&finite(x.time)).map(x=>({time:Number(x.time),value:Number(x.value)})).sort((x,y)=>x.time-y.time);
    if(a.length<minPoints)return{ready:false,reason:`needs at least ${minPoints} numeric observations`,points:a.length};
    const times=[...new Set(a.map(x=>x.time))];if(times.length<3)return{ready:false,reason:'needs observations across at least 3 distinct times',points:a.length};
    if(times.at(-1)<=times[0])return{ready:false,reason:'time span must be positive',points:a.length};
    const vals=a.map(x=>x.value);if(stdev(vals)===0)return{ready:false,reason:'series has no measurable variation',points:a.length};
    return{ready:true,points:a.length,spanMs:times.at(-1)-times[0],distinctTimes:times.length};
  }
  window.DOMStatisticalPrediction=Object.freeze({mean,variance,stdev,linearRegression,forecastLinear,ewma,poissonRate,readiness});
})();
