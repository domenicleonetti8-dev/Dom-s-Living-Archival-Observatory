(()=>{
  const exports={};
  try{if(typeof DOMObservationModel!=='undefined')exports.DOMObservationModel=DOMObservationModel}catch(_){}
  try{if(typeof DOMHazardTaxonomy!=='undefined')exports.DOMHazardTaxonomy=DOMHazardTaxonomy}catch(_){}
  try{if(typeof DOMEnvironmentalFusion!=='undefined')exports.DOMEnvironmentalFusion=DOMEnvironmentalFusion}catch(_){}
  try{if(typeof DOMEnvironmentalDefense!=='undefined')exports.DOMEnvironmentalDefense=DOMEnvironmentalDefense}catch(_){}
  try{if(typeof DOMPlanetHealth!=='undefined')exports.DOMPlanetHealth=DOMPlanetHealth}catch(_){}
  try{if(typeof DOMPlanetaryEcosystemDefense!=='undefined')exports.DOMPlanetaryEcosystemDefense=DOMPlanetaryEcosystemDefense}catch(_){}
  try{if(typeof DOMPublicSensorRegistry!=='undefined')exports.DOMPublicSensorRegistry=DOMPublicSensorRegistry}catch(_){}
  try{if(typeof DOMSensorActivation!=='undefined')exports.DOMSensorActivation=DOMSensorActivation}catch(_){}
  try{if(typeof DOMObservationIngress!=='undefined')exports.DOMObservationIngress=DOMObservationIngress}catch(_){}
  try{if(typeof DOMObservationBroker!=='undefined')exports.DOMObservationBroker=DOMObservationBroker}catch(_){}
  try{if(typeof DOMGlobalSensorGlobe!=='undefined')exports.DOMGlobalSensorGlobe=DOMGlobalSensorGlobe}catch(_){}
  try{if(typeof DOMOrganismRuntime!=='undefined')exports.DOMOrganismRuntime=DOMOrganismRuntime}catch(_){}
  try{if(typeof DOMLiveGlobeRenderer!=='undefined')exports.DOMLiveGlobeRenderer=DOMLiveGlobeRenderer}catch(_){}
  try{if(typeof DOMHazardObservationBridge!=='undefined')exports.DOMHazardObservationBridge=DOMHazardObservationBridge}catch(_){}
  try{if(typeof DOMObservationHazardBridge!=='undefined')exports.DOMObservationHazardBridge=DOMObservationHazardBridge}catch(_){}
  try{if(typeof DOMBrokerStatus!=='undefined')exports.DOMBrokerStatus=DOMBrokerStatus}catch(_){}
  try{if(typeof DOMSHazardResearch!=='undefined')exports.DOMSHazardResearch=DOMSHazardResearch}catch(_){}
  try{if(typeof DOMSHazardVoice!=='undefined')exports.DOMSHazardVoice=DOMSHazardVoice}catch(_){}
  for(const [k,v] of Object.entries(exports)){if(!window[k])window[k]=v}
  const required=['DOMObservationModel','DOMHazardTaxonomy','DOMEnvironmentalFusion','DOMEnvironmentalDefense','DOMPlanetHealth','DOMPlanetaryEcosystemDefense','DOMPublicSensorRegistry','DOMSensorActivation','DOMObservationIngress','DOMObservationBroker','DOMGlobalSensorGlobe','DOMOrganismRuntime','DOMLiveGlobeRenderer','DOMHazardObservationBridge','DOMObservationHazardBridge','DOMBrokerStatus','DOMSHazardResearch','DOMSHazardVoice'];
  window.DOMGlobalCompat={count:Object.keys(exports).length,exports:Object.keys(exports),missing:required.filter(k=>!exports[k]),ok:required.every(k=>!!exports[k])};
})();
