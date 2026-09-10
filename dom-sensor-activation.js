const DOMSensorActivation=(()=>{
  const clamp=x=>{const n=Number(x);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0};
  const finiteCoordinate=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
  const validLatLon=(lat,lon)=>finiteCoordinate(lat)&&finiteCoordinate(lon)&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  const optionalNumber=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
  const LEVELS=[
    {min:.90,id:'critical',label:'Critical invocation',color:'#ff2b2b',pulse:1.00},
    {min:.72,id:'heavy',label:'Heavy invocation',color:'#ff7a1a',pulse:.86},
    {min:.52,id:'elevated',label:'Elevated invocation',color:'#ffd43b',pulse:.68},
    {min:.30,id:'active',label:'Active',color:'#34d17b',pulse:.48},
    {min:.01,id:'watching',label:'Watching',color:'#39c6ff',pulse:.28},
    {min:0,id:'idle',label:'Idle / no qualified signal',color:'#65707d',pulse:.10}
  ];
  function level(score){const s=clamp(score);return LEVELS.find(x=>s>=x.min)||LEVELS[LEVELS.length-1]}
  function anomalyScore(sensor={}){if(sensor.anomaly!=null&&sensor.anomaly!==''&&Number.isFinite(Number(sensor.anomaly)))return clamp(sensor.anomaly);if(sensor.anomalyZ!=null&&sensor.anomalyZ!==''&&Number.isFinite(Number(sensor.anomalyZ)))return clamp(Math.abs(Number(sensor.anomalyZ))/6);return 0}
  function activation(sensor={}){
    const freshness=clamp(sensor.freshness),quality=clamp(sensor.quality),anomaly=anomalyScore(sensor),persistence=clamp(sensor.persistence),corroboration=clamp(sensor.corroboration),hazardCoupling=clamp(sensor.hazardCoupling);
    const score=clamp(.18*freshness+.18*quality+.24*anomaly+.14*persistence+.14*corroboration+.12*hazardCoupling);
    return{score,percent:Math.round(score*100),components:{freshness,quality,anomaly,persistence,corroboration,hazardCoupling},...level(score)};
  }
  function cycloneFromKnots(knots){
    if(knots===null||knots===undefined||knots==='')return{type:'Tropical cyclone',category:'unknown',windKt:null,scale:'Saffir-Simpson one-minute sustained-wind thresholds',reason:'invalid or missing sustained wind'};
    const w=Number(knots),scale='Saffir-Simpson one-minute sustained-wind thresholds';
    if(!Number.isFinite(w)||w<0)return{type:'Tropical cyclone',category:'unknown',windKt:null,scale,reason:'invalid or missing sustained wind'};
    if(w<34)return{type:'Tropical disturbance/depression',category:'Depression',windKt:w,scale};
    if(w<64)return{type:'Tropical storm',category:'Tropical Storm',windKt:w,scale};
    if(w<83)return{type:'Hurricane / Typhoon',category:'Category 1',windKt:w,scale};
    if(w<96)return{type:'Hurricane / Typhoon',category:'Category 2',windKt:w,scale};
    if(w<113)return{type:'Major hurricane / Typhoon',category:'Category 3',windKt:w,scale};
    if(w<137)return{type:'Major hurricane / Typhoon',category:'Category 4',windKt:w,scale};
    return{type:'Major hurricane / Super typhoon range',category:'Category 5',windKt:w,scale};
  }
  function stormLabel(input={}){
    if(input.officialCategory)return{type:input.officialType||'Storm',category:String(input.officialCategory),source:'official',scale:input.officialScale||null};
    if(input.windKts!==null&&input.windKts!==undefined&&input.windKts!==''&&Number.isFinite(Number(input.windKts))&&Number(input.windKts)>=0)return{...cycloneFromKnots(input.windKts),source:'wind-threshold'};
    return{type:input.type||'Storm',category:'strength unresolved',source:'insufficient-measurement',scale:null};
  }
  function sensorPacket(obs={}){
    const hasPoint=validLatLon(obs.lat,obs.lon),a=activation(obs);
    return{
      sensorId:String(obs.sensorId||obs.stationId||obs.instrumentId||'unknown-sensor'),
      stationId:String(obs.stationId||obs.sensorId||''),
      agency:String(obs.agency||obs.sourceAgency||''),
      sourceAgency:String(obs.sourceAgency||obs.agency||''),
      network:String(obs.network||obs.sourceAgency||obs.agency||'unknown-network'),
      instrument:String(obs.instrument||obs.modality||'unknown-instrument'),
      modality:String(obs.modality||obs.instrument||''),
      lat:hasPoint?Number(obs.lat):null,
      lon:hasPoint?Number(obs.lon):null,
      elevation:optionalNumber(obs.elevation),
      depth:optionalNumber(obs.depth),
      nominalAreaWeight:optionalNumber(obs.nominalAreaWeight),
      locationPrecision:hasPoint?(obs.locationPrecision||'source-coordinate'):'unresolved',
      observedAt:obs.observedAt||null,
      receivedAt:obs.receivedAt||null,
      measurement:obs.measurement||null,
      measurements:Array.isArray(obs.measurements)?obs.measurements:[],
      unit:obs.unit||null,
      temperature:obs.temperature||null,
      lineageId:obs.lineageId||null,
      sourceUrl:obs.sourceUrl||null,
      authoritative:!!obs.authoritative,
      quality:obs.quality==null||obs.quality===''?null:clamp(obs.quality),
      freshness:obs.freshness==null||obs.freshness===''?null:clamp(obs.freshness),
      anomaly:obs.anomaly==null||obs.anomaly===''?null:clamp(obs.anomaly),
      anomalyZ:optionalNumber(obs.anomalyZ),
      persistence:obs.persistence==null||obs.persistence===''?null:clamp(obs.persistence),
      corroboration:obs.corroboration==null||obs.corroboration===''?null:clamp(obs.corroboration),
      hazardCoupling:obs.hazardCoupling==null||obs.hazardCoupling===''?null:clamp(obs.hazardCoupling),
      activation:a,
      storm:obs.storm?stormLabel(obs.storm):null
    };
  }
  return{LEVELS,finiteCoordinate,validLatLon,optionalNumber,level,anomalyScore,activation,cycloneFromKnots,stormLabel,sensorPacket};
})();
