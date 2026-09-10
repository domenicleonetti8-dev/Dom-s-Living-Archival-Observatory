const DOMSensorActivation=(()=>{
  const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
  const LEVELS=[
    {min:.90,id:'critical',label:'Critical invocation',color:'#ff2b2b',pulse:1.00},
    {min:.72,id:'heavy',label:'Heavy invocation',color:'#ff7a1a',pulse:.86},
    {min:.52,id:'elevated',label:'Elevated invocation',color:'#ffd43b',pulse:.68},
    {min:.30,id:'active',label:'Active',color:'#34d17b',pulse:.48},
    {min:.01,id:'watching',label:'Watching',color:'#39c6ff',pulse:.28},
    {min:0,id:'idle',label:'Idle / no qualified signal',color:'#65707d',pulse:.10}
  ];
  function level(score){const s=clamp(score);return LEVELS.find(x=>s>=x.min)||LEVELS[LEVELS.length-1]}
  function activation(sensor={}){
    const freshness=clamp(sensor.freshness),quality=clamp(sensor.quality),anomaly=clamp(sensor.anomaly),persistence=clamp(sensor.persistence),corroboration=clamp(sensor.corroboration),hazardCoupling=clamp(sensor.hazardCoupling);
    const score=clamp(.18*freshness+.18*quality+.24*anomaly+.14*persistence+.14*corroboration+.12*hazardCoupling);
    return{score,percent:Math.round(score*100),...level(score)};
  }
  function cycloneFromKnots(knots){const w=Number(knots);if(!Number.isFinite(w))return{type:'Tropical cyclone',category:'unknown',windKt:null};if(w<34)return{type:'Tropical disturbance/depression',category:'Depression',windKt:w};if(w<64)return{type:'Tropical storm',category:'Tropical Storm',windKt:w};if(w<83)return{type:'Hurricane / Typhoon',category:'Category 1',windKt:w};if(w<96)return{type:'Hurricane / Typhoon',category:'Category 2',windKt:w};if(w<113)return{type:'Major hurricane / Typhoon',category:'Category 3',windKt:w};if(w<137)return{type:'Major hurricane / Typhoon',category:'Category 4',windKt:w};return{type:'Major hurricane / Super typhoon range',category:'Category 5',windKt:w}}
  function stormLabel(input={}){
    if(input.officialCategory)return{type:input.officialType||'Storm',category:String(input.officialCategory),source:'official'};
    if(Number.isFinite(Number(input.windKts)))return{...cycloneFromKnots(input.windKts),source:'wind-threshold'};
    return{type:input.type||'Storm',category:'strength unresolved',source:'insufficient-measurement'};
  }
  function sensorPacket(obs={}){
    const hasPoint=Number.isFinite(Number(obs.lat))&&Number.isFinite(Number(obs.lon));
    return{
      sensorId:String(obs.sensorId||obs.stationId||obs.instrumentId||'unknown-sensor'),
      network:String(obs.network||obs.sourceAgency||'unknown-network'),
      instrument:String(obs.instrument||obs.modality||'unknown-instrument'),
      lat:hasPoint?Number(obs.lat):null,
      lon:hasPoint?Number(obs.lon):null,
      locationPrecision:hasPoint?(obs.locationPrecision||'source-coordinate'):'unresolved',
      observedAt:obs.observedAt||null,
      receivedAt:obs.receivedAt||null,
      measurement:obs.measurement||null,
      unit:obs.unit||null,
      lineageId:obs.lineageId||null,
      activation:activation(obs),
      storm:obs.storm?stormLabel(obs.storm):null
    };
  }
  return{LEVELS,level,activation,cycloneFromKnots,stormLabel,sensorPacket};
})();
