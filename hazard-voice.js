const DOMSHazardVoice=(()=>{
  const S={enabled:false,muted:false,lastSpoken:new Set(),voice:null,rate:.96,pitch:1,volume:1};
  const supported=()=>('speechSynthesis'in window)&&('SpeechSynthesisUtterance'in window);
  function chooseVoice(){if(!supported())return null;const vs=speechSynthesis.getVoices()||[];S.voice=vs.find(v=>/en-US/i.test(v.lang)&&/Samantha|Alex|Daniel|Google US English/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang))||vs[0]||null;return S.voice}
  function speak(text,{force=false,tag=''}={}){if(!supported()||!S.enabled||S.muted||!text)return false;if(tag&&!force&&S.lastSpoken.has(tag))return false;if(tag)S.lastSpoken.add(tag);const u=new SpeechSynthesisUtterance(String(text));u.rate=S.rate;u.pitch=S.pitch;u.volume=S.volume;u.lang='en-US';u.voice=chooseVoice();speechSynthesis.cancel();speechSynthesis.speak(u);return true}
  function summary(e){const bits=[];bits.push(`${e.kind}. ${e.title}.`);if(Number.isFinite(e.mag))bits.push(`Magnitude ${Number(e.mag).toFixed(1)}.`);if(Number.isFinite(e.distance))bits.push(`Approximately ${Math.round(e.distance)} kilometers from your location.`);if(Number.isFinite(e.score))bits.push(`Decision score ${e.score} out of 100.`);if(Number.isFinite(e.confidence))bits.push(`Evidence confidence ${Math.round(e.confidence*100)} percent.`);if(e.official)bits.push('An official alert is active.');bits.push('Use the linked official source for instructions.');return bits.join(' ')}
  function announce(e){return speak(summary(e),{tag:e.id})}
  function describe(e){return speak(summary(e),{force:true})}
  function enable(){if(!supported())return{ok:false,message:'Speech synthesis is unavailable in this browser.'};S.enabled=true;S.muted=false;chooseVoice();speak('DOMS voice enabled. Hazard announcements will use evidence gated alerts.',{force:true});return{ok:true,message:'DOMS voice on'}}
  function mute(v=true){S.muted=!!v;if(S.muted&&supported())speechSynthesis.cancel();return S.muted}
  function stop(){if(supported())speechSynthesis.cancel()}
  function state(){return{enabled:S.enabled,muted:S.muted,supported:supported()}}
  if(supported()){speechSynthesis.onvoiceschanged=chooseVoice;chooseVoice()}
  return{enable,mute,stop,state,announce,describe,speak};
})();
