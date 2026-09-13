(()=>{
  'use strict';
  const finite=x=>Number.isFinite(Number(x));
  const nums=a=>(a||[]).filter(finite).map(Number);
  const mean=a=>{const v=nums(a);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};
  const variance=a=>{const v=nums(a);if(v.length<2)return null;const m=mean(v);return v.reduce((s,x)=>s+(x-m)**2,0)/(v.length-1)};
  const stdev=a=>{const v=variance(a);return v==null?null:Math.sqrt(v)};
  function covariance(a,b){const x=nums(a),y=nums(b),n=Math.min(x.length,y.length);if(n<2)return null;const xx=x.slice(0,n),yy=y.slice(0,n),mx=mean(xx),my=mean(yy);return xx.reduce((s,v,i)=>s+(v-mx)*(yy[i]-my),0)/(n-1)}
  function correlation(a,b){const c=covariance(a,b),sx=stdev(a),sy=stdev(b);return c==null||!(sx>0)||!(sy>0)?null:Math.max(-1,Math.min(1,c/(sx*sy)))}
  function lag1Autocorrelation(values){const v=nums(values);if(v.length<4)return null;const a=v.slice(0,-1),b=v.slice(1);return correlation(a,b)}
  function effectiveSampleSize(values){const v=nums(values),n=v.length,r=lag1Autocorrelation(v);if(n<2)return 0;if(r==null)return n;const ne=n*(1-r)/(1+r);return Math.max(1,Math.min(n,ne))}
  function standardErrorMean(values){const v=nums(values);if(v.length<2)return null;const ne=effectiveSampleSize(v),s=stdev(v);return ne>0?s/Math.sqrt(ne):null}
  function anomaly(value,baselineMean,baselineSigma=null){if(!finite(value)||!finite(baselineMean))return null;const delta=Number(value)-Number(baselineMean);return{value:Number(value),baselineMean:Number(baselineMean),anomaly:delta,zScore:finite(baselineSigma)&&Number(baselineSigma)>0?delta/Number(baselineSigma):null}}
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
    const residualLag1=lag1Autocorrelation(residuals),effectiveN=effectiveSampleSize(residuals);
    return {n:rows.length,effectiveN,slope,intercept,sigma,r2,xMean:mx,sxx,slopeSE,slopeT,df,residualLag1,autocorrelationWarning:residualLag1!=null&&Math.abs(residualLag1)>=.3};
  }
  function quadraticRegression(points){
    const rows=(points||[]).filter(p=>finite(p.x)&&finite(p.y)).map(p=>({x:Number(p.x),y:Number(p.y)})).sort((a,b)=>a.x-b.x);if(rows.length<5)return null;
    const x0=mean(rows.map(r=>r.x)),x=rows.map(r=>r.x-x0),y=rows.map(r=>r.y),n=rows.length;
    const S0=n,S1=x.reduce((s,v)=>s+v,0),S2=x.reduce((s,v)=>s+v*v,0),S3=x.reduce((s,v)=>s+v*v*v,0),S4=x.reduce((s,v)=>s+v*v*v*v,0);
    const T0=y.reduce((s,v)=>s+v,0),T1=y.reduce((s,v,i)=>s+x[i]*v,0),T2=y.reduce((s,v,i)=>s+x[i]*x[i]*v,0);
    const det=S0*(S2*S4-S3*S3)-S1*(S1*S4-S3*S2)+S2*(S1*S3-S2*S2);if(Math.abs(det)<1e-18)return null;
    const da=T0*(S2*S4-S3*S3)-S1*(T1*S4-S3*T2)+S2*(T1*S3-S2*T2);
    const db=S0*(T1*S4-S3*T2)-T0*(S1*S4-S3*S2)+S2*(S1*T2-T1*S2);
    const dc=S0*(S2*T2-T1*S3)-S1*(S1*T2-T1*S2)+T0*(S1*S3-S2*S2);
    const a=da/det,b=db/det,c=dc/det,residuals=rows.map((r,i)=>r.y-(a+b*x[i]+c*x[i]*x[i])),sse=residuals.reduce((s,v)=>s+v*v,0),my=mean(y),sst=y.reduce((s,v)=>s+(v-my)**2,0),r2=sst?Math.max(0,Math.min(1,1-sse/sst)):0;
    return{n,a,b,c,xReference:x0,acceleration:2*c,r2,residualSigma:Math.sqrt(sse/Math.max(1,n-3)),residualLag1:lag1Autocorrelation(residuals),warning:'Quadratic acceleration is descriptive unless supported by mechanism, sufficient span, and stable residuals.'};
  }
  function forecastLinear(points,targetX,confidence=.95){
    const model=linearRegression(points);if(!model||!finite(targetX))return null;
    const x=Number(targetX),estimate=model.intercept+model.slope*x;
    const crit=confidence>=.99?2.576:confidence>=.95?critical95(model.df):1.645;
    const predictionSE=model.sigma*Math.sqrt(1+1/model.n+((x-model.xMean)**2/model.sxx));
    const acfInflation=model.residualLag1==null?1:Math.sqrt(Math.max(1,(1+model.residualLag1)/(1-model.residualLag1)));
    const margin=crit*predictionSE*acfInflation;
    return {...model,estimate,low:estimate-margin,high:estimate+margin,confidence,predictionSE,criticalValue:crit,acfInflation,warning:'Prediction interval includes a first-order autocorrelation inflation but not structural or scenario uncertainty.'};
  }
  function propagateIndependentUncertainty(terms){const rows=(terms||[]).filter(t=>finite(t.sensitivity)&&finite(t.sigma)&&Number(t.sigma)>=0);const variance=rows.reduce((s,t)=>s+(Number(t.sensitivity)*Number(t.sigma))**2,0);return{sigma:Math.sqrt(variance),variance,terms:rows.length,assumption:'independent errors'}}
  function propagateCovariance(sensitivities,covMatrix){const g=nums(sensitivities);if(!g.length||!Array.isArray(covMatrix)||covMatrix.length<g.length)return null;let v=0;for(let i=0;i<g.length;i++){if(!Array.isArray(covMatrix[i])||covMatrix[i].length<g.length)return null;for(let j=0;j<g.length;j++){if(!finite(covMatrix[i][j]))return null;v+=g[i]*Number(covMatrix[i][j])*g[j]}}return{variance:Math.max(0,v),sigma:Math.sqrt(Math.max(0,v)),assumption:'supplied covariance matrix'}}
  function ewma(values,alpha=.3){const a=nums(values);if(!a.length)return null;const k=Math.min(.99,Math.max(.01,Number(alpha)||.3));let v=a[0];for(let i=1;i<a.length;i++)v=k*a[i]+(1-k)*v;return v}
  function poissonRate(count,duration){if(!finite(count)||!finite(duration)||Number(duration)<=0)return null;const c=Math.max(0,Number(count)),d=Number(duration),rate=c/d,se=Math.sqrt(Math.max(c,1))/d;return{rate,low:Math.max(0,rate-1.96*se),high:rate+1.96*se,confidence:.95,warning:'Poisson interval assumes independent events and a locally stationary event rate.'}}
  function readiness(series,minPoints=8){
    const a=(series||[]).filter(x=>finite(x.value)&&finite(x.time)).map(x=>({time:Number(x.time),value:Number(x.value)})).sort((x,y)=>x.time-y.time);
    if(a.length<minPoints)return{ready:false,reason:`needs at least ${minPoints} numeric observations`,points:a.length};
    const times=[...new Set(a.map(x=>x.time))];if(times.length<3)return{ready:false,reason:'needs observations across at least 3 distinct times',points:a.length};
    if(times.at(-1)<=times[0])return{ready:false,reason:'time span must be positive',points:a.length};
    const vals=a.map(x=>x.value);if(stdev(vals)===0)return{ready:false,reason:'series has no measurable variation',points:a.length};
    return{ready:true,points:a.length,spanMs:times.at(-1)-times[0],distinctTimes:times.length,effectiveN:effectiveSampleSize(vals),lag1:lag1Autocorrelation(vals)};
  }
  window.DOMStatisticalPrediction=Object.freeze({mean,variance,stdev,covariance,correlation,lag1Autocorrelation,effectiveSampleSize,standardErrorMean,anomaly,linearRegression,quadraticRegression,forecastLinear,propagateIndependentUncertainty,propagateCovariance,ewma,poissonRate,readiness});
})();
