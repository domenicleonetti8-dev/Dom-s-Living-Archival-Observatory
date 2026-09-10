const DOMSHazardVoice=(()=>{
  const S={enabled:false,muted:false,lastSpoken:new Set(),tagOrder:[],voice:null,rate:.96,pitch:1,volume:1,active:null,maxTags:500};
  const supported=()=>('speechSynthesis'in window)&&('SpeechSynthesisUtterance'in window);
  function chooseVoice(){if(!supported())return null;const vs=speechSynthesis.getVoices()||[];S.voice=vs.find(v=>/en-US/i.test(v.lang)&&/Samantha|Alex|Daniel|Google US English/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang))||vs[0]||null;return S.voice}
  function rememberTag(tag){if(!tag||S.lastSpoken.has(tag))return;S.lastSpoken.add(tag);S.tagOrder.push(tag);while(S.tagOrder.length>S.maxTags){const old=S.tagOrder.shift();S.lastSpoken.delete(old)}}
  function speak(text,{force=false,tag='',autoEnable=false}={}){
    if(!supported()||!text)return false;
    if(autoEnable&&!S.enabled){S.enabled=true;S.muted=false;chooseVoice()}
    if(!S.enabled||S.muted)return false;
    if(tag&&!force&&S.lastSpoken.has(tag))return false;
    if(S.active)return false;
    rememberTag(tag);
    const u=new SpeechSynthesisUtterance(String(text));u.rate=S.rate;u.pitch=S.pitch;u.volume=S.volume;u.lang='en-US';u.voice=chooseVoice();
    S.active=u;u.onend=()=>{if(S.active===u)S.active=null};u.onerror=()=>{if(S.active===u)S.active=null};
    try{speechSynthesis.speak(u);return true}catch(_){S.active=null;return false}
  }
  function summary(e){if(e&&e.evidence&&e.evidence.text)return e.evidence.text;const bits=[];bits.push(`${e.kind}. ${e.title}.`);if(Number.isFinite(e.mag))bits.push(`Magnitude ${Number(e.mag).toFixed(1)}.`);if(e.strengthClass&&e.strengthClass!=='unknown')bits.push(`Class ${e.strengthClass}.`);if(Number.isFinite(e.score))bits.push(`Decision score ${e.score} out of 100.`);if(Number.isFinite(e.evidenceStrength)){const g=e.evidenceGrade?`, ${e.evidenceGrade}`:'';bits.push(`Evidence strength ${Math.round(e.evidenceStrength*100)} percent${g}.`)}else bits.push('Evidence strength is unavailable.');if(e.officialAlert)bits.push('An official alert is active; follow the issuing authority.');else bits.push('This is a research assessment, not an official warning.');bits.push('Use the linked source for authoritative details.');return bits.join(' ')}
  function announce(e){return speak(summary(e),{tag:e.id})}
  function describe(e){return speak(summary(e),{force:true,autoEnable:true})}
  function enable({silent=false}={}){if(!supported())return{ok:false,message:'Speech synthesis is unavailable in this browser.'};S.enabled=true;S.muted=false;chooseVoice();if(!silent)speak('DOM voice enabled. Spoken hazard statements are tied to the visible evidence block for each event.',{force:true});return{ok:true,message:'DOM voice on · evidence locked'}}
  function mute(v=true){S.muted=!!v;return S.muted}
  function stop(){S.muted=true}
  function state(){return{enabled:S.enabled,muted:S.muted,supported:supported(),speaking:!!S.active,queuedTags:S.tagOrder.length}}
  return{enable,mute,stop,state,announce,describe,speak};
})();
