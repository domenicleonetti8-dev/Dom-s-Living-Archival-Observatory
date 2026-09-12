(()=>{
  'use strict';
  const parse=v=>{if(v===null||v===undefined||v==='')return null;const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toISOString():null};
  const ms=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null};
  function canonical(r={},fallbackFetchedAt=null){
    return {
      observedAt:parse(r.observedAt??r.observed_at??r.time??null),
      publishedAt:parse(r.publishedAt??r.published_at??r.sent??null),
      validAt:parse(r.validAt??r.valid_at??r.effective??r.validTime??null),
      expiresAt:parse(r.expiresAt??r.expires_at??r.expires??null),
      fetchedAt:parse(r.fetchedAt??r.fetched_at??r.receivedAt??fallbackFetchedAt??null)
    };
  }
  function reference(r={},kind='observation'){
    const t=canonical(r);
    if(kind==='forecast'||kind==='model')return t.validAt?{field:'validAt',time:t.validAt}:t.publishedAt?{field:'publishedAt',time:t.publishedAt}:t.observedAt?{field:'observedAt',time:t.observedAt}:{field:null,time:null};
    if(kind==='publication'||kind==='catalog')return t.publishedAt?{field:'publishedAt',time:t.publishedAt}:t.observedAt?{field:'observedAt',time:t.observedAt}:{field:null,time:null};
    return t.observedAt?{field:'observedAt',time:t.observedAt}:t.publishedAt?{field:'publishedAt',time:t.publishedAt}:t.validAt?{field:'validAt',time:t.validAt}:{field:null,time:null};
  }
  function ageSeconds(v,now=Date.now()){const t=ms(v);return t===null?null:(now-t)/1000}
  function classify(r={},opts={}){
    const kind=opts.kind||r.temporalKind||r.observationStatus||'observation',ref=reference(r,kind),now=Number.isFinite(Number(opts.now))?Number(opts.now):Date.now(),staleAfter=Number.isFinite(Number(opts.staleAfterSeconds))?Number(opts.staleAfterSeconds):null,futureTolerance=Number.isFinite(Number(opts.futureToleranceSeconds))?Number(opts.futureToleranceSeconds):300,t=canonical(r),a=ref.time?ageSeconds(ref.time,now):null;
    let state='UNKNOWN';
    if(ref.time){if(a< -futureTolerance)state='FUTURE VALID';else if(staleAfter!==null&&a>staleAfter)state='STALE';else state='CURRENT'}
    if(t.expiresAt){const ex=ms(t.expiresAt);if(ex!==null&&ex<now)state='EXPIRED'}
    return {...t,referenceField:ref.field,referenceTime:ref.time,ageSeconds:a,state};
  }
  function formatAge(sec){if(sec===null||!Number.isFinite(sec))return'age unknown';const x=Math.abs(sec),future=sec<0;let n,u;if(x<120){n=Math.round(x);u='s'}else if(x<7200){n=Math.round(x/60);u='min'}else if(x<172800){n=Math.round(x/3600);u='h'}else{n=Math.round(x/86400);u='d'}return future?`valid in ${n} ${u}`:`${n} ${u} old`}
  function describe(r={},opts={}){const s=classify(r,opts),parts=[];for(const k of ['observedAt','publishedAt','validAt','fetchedAt','expiresAt'])if(s[k])parts.push(`${k} ${s[k]}`);parts.push(`${s.state}${s.ageSeconds===null?'':` · ${formatAge(s.ageSeconds)}`}`);return parts.join(' · ')}
  window.DOMSourceTime=Object.freeze({parse,canonical,reference,ageSeconds,classify,formatAge,describe});
})();
