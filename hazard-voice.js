const DOMSHazardVoice=(()=>{
  const S={enabled:false,muted:false,lastSpoken:new Set(),tagOrder:[],voice:null,rate:.91,pitch:.88,volume:1,active:null,maxTags:500,voicesReady:false};
  const supported=()=>('speechSynthesis'in window)&&('SpeechSynthesisUtterance'in window);
  const maleNames=['Alex','Daniel','Aaron','Arthur','Fred','Ralph','Evan','Tom','Reed','Rocko','Grandpa','Albert'];
  function english(v){return /^en(?:-|_)/i.test(String(v&&v.lang||''))}
  function maleNamed(v){const n=String(v&&v.name||'');return maleNames.some(x=>new RegExp(`(^|\\b)${x}(\\b|$)`,'i').test(n))}
  function chooseVoice(){
    if(!supported())return null;
    const vs=speechSynthesis.getVoices()||[];
    S.voicesReady=vs.length>0;
    S.voice=vs.find(v=>english(v)&&maleNamed(v))||null;
    return S.voice;
  }
  function waitForMaleVoice(timeout=1200){
    return new Promise(resolve=>{
      const immediate=chooseVoice();if(immediate)return resolve(immediate);
      const start=Date.now(),tick=()=>{const v=chooseVoice();if(v||Date.now()-start>=timeout)return resolve(v);setTimeout(tick,80)};tick();
    })
  }
  function speechText(text){return String(text).replace(/\bD\.O\.M\./g,'D O M').replace(/\bDOM\b/g,'D O M').replace(/\bDerived statistics\b/gi,'Statistics calculated from source data').replace(/\bUNSCORED\b/g,'unscored').replace(/\bOLS\b/g,'ordinary least squares')}
  function rememberTag(tag){if(!tag||S.lastSpoken.has(tag))return;S.lastSpoken.add(tag);S.tagOrder.push(tag);while(S.tagOrder.length>S.maxTags){const old=S.tagOrder.shift();S.lastSpoken.delete(old)}}
  async function speak(text,{force=false,tag='',autoEnable=false}={}){
    if(!supported()||!text)return false;
    if(autoEnable&&!S.enabled){S.enabled=true;S.muted=false}
    if(!S.enabled||S.muted)return false;
    if(tag&&!force&&S.lastSpoken.has(tag))return false;
    if(S.active)return false;
    const voice=await waitForMaleVoice();
    if(!voice)return false;
    rememberTag(tag);
    const u=new SpeechSynthesisUtterance(speechText(text));u.rate=S.rate;u.pitch=S.pitch;u.volume=S.volume;u.lang='en-US';u.voice=voice;
    S.active=u;u.onend=()=>{if(S.active===u)S.active=null};u.onerror=()=>{if(S.active===u)S.active=null};
    try{speechSynthesis.speak(u);return true}catch(_){S.active=null;return false}
  }
  function summary(e){if(e&&e.evidence&&e.evidence.text)return e.evidence.text;const bits=[];bits.push(`${e.kind}. ${e.title}.`);if(Number.isFinite(e.mag))bits.push(`Magnitude ${Number(e.mag).toFixed(1)}.`);if(e.strengthClass&&e.strengthClass!=='unknown')bits.push(`Class ${e.strengthClass}.`);if(Number.isFinite(e.score))bits.push(`Decision score ${e.score} out of 100.`);if(Number.isFinite(e.evidenceStrength)){const g=e.evidenceGrade?`, ${e.evidenceGrade}`:'';bits.push(`Evidence strength ${Math.round(e.evidenceStrength*100)} percent${g}.`)}else bits.push('Evidence strength is unavailable.');if(e.officialAlert)bits.push('An official alert is active; follow the issuing authority.');else bits.push('This is a research assessment, not an official warning.');bits.push('Use the linked source for authoritative details.');return bits.join(' ')}
  function announce(e){return speak(summary(e),{tag:e.id})}
  function describe(e){return speak(summary(e),{force:true,autoEnable:true})}
  function enable({silent=false}={}){if(!supported())return{ok:false,message:'Speech synthesis is unavailable in this browser.'};S.enabled=true;S.muted=false;chooseVoice();if(!silent)speak('D.O.M. voice enabled. Spoken hazard statements are tied to the visible evidence block for each event.',{force:true});return{ok:true,message:'D.O.M. voice on · male voice locked'}}
  function mute(v=true){S.muted=!!v;return S.muted}
  function stop(){S.muted=true;if(supported())try{speechSynthesis.cancel()}catch(_){ }S.active=null}
  function state(){return{enabled:S.enabled,muted:S.muted,supported:supported(),speaking:!!S.active,queuedTags:S.tagOrder.length,voice:S.voice?S.voice.name:null,maleVoiceRequired:true}}
  if(supported()&&'onvoiceschanged'in speechSynthesis)speechSynthesis.addEventListener('voiceschanged',chooseVoice);
  return{enable,mute,stop,state,announce,describe,speak};
})();
