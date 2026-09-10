(()=>{
  const exports={};
  try{if(typeof DOMObservationModel!=='undefined')exports.DOMObservationModel=DOMObservationModel}catch(_){}
  try{if(typeof DOMHazardTaxonomy!=='undefined')exports.DOMHazardTaxonomy=DOMHazardTaxonomy}catch(_){}
  try{if(typeof DOMEnvironmentalFusion!=='undefined')exports.DOMEnvironmentalFusion=DOMEnvironmentalFusion}catch(_){}
  try{if(typeof DOMEnvironmentalDefense!=='undefined')exports.DOMEnvironmentalDefense=DOMEnvironmentalDefense}catch(_){}
  try{if(typeof DOMPlanetHealth!=='undefined')exports.DOMPlanetHealth=DOMPlanetHealth}catch(_){}
  try{if(typeof DOMPublicSensorRegistry!=='undefined')exports.DOMPublicSensorRegistry=DOMPublicSensorRegistry}catch(_){}
  try{if(typeof DOMSensorActivation!=='undefined')exports.DOMSensorActivation=DOMSensorActivation}catch(_){}
  try{if(typeof DOMGlobalSensorGlobe!=='undefined')exports.DOMGlobalSensorGlobe=DOMGlobalSensorGlobe}catch(_){}
  try{if(typeof DOMSHazardResearch!=='undefined')exports.DOMSHazardResearch=DOMSHazardResearch}catch(_){}
  try{if(typeof DOMSHazardVoice!=='undefined')exports.DOMSHazardVoice=DOMSHazardVoice}catch(_){}
  for(const [k,v] of Object.entries(exports)){if(!window[k])window[k]=v}
  window.DOMGlobalCompat={count:Object.keys(exports).length,exports:Object.keys(exports),ok:Object.keys(exports).length>=10};
})();
