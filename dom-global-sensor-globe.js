const DOMGlobalSensorGlobe=(()=>{
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
  const validLatLon=(lat,lon)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  const ACTIVATION=[
    {min:.90,color:'red',label:'critical contribution'},
    {min:.75,color:'orange',label:'heavy contribution'},
    {min:.55,color:'yellow',label:'elevated contribution'},
    {min:.30,color:'green',label:'active contribution'},
    {min:.10,color:'cyan',label:'watching'},
    {min:0,color:'gray',label:'idle / insufficient signal'}
  ];
  function activationBand(v){v=clamp(v);return ACTIVATION.find(x=>v>=x.min)||ACTIVATION[ACTIVATION.length-1]}
  function environmentalActivation(raw={}){
    if(window.DOMEnvironmentalDefense&&DOMEnvironmentalDefense.activationFromEvidence){
      return DOMEnvironmentalDefense.activationFromEvidence({anomalyZ:raw.anomalyZ,quality:raw.quality,freshness:raw.freshness,corroboration:raw.corroboration,persistence:raw.persistence});
    }
    return raw.activation==null?0:clamp(raw.activation);
  }
  function normalizeSensor(raw={}){
    const lat=Number(raw.lat),lon=Number(raw.lon),activation=raw.activation==null?environmentalActivation(raw):clamp(raw.activation);
    const temperature=raw.temperature&&window.DOMEnvironmentalDefense?DOMEnvironmentalDefense.normalizeTemperature(raw.temperature):null;
    return{
      id:String(raw.id||raw.stationId||raw.instrumentId||''),
      stationId:String(raw.stationId||raw.id||''),
      agency:String(raw.agency||''),
      network:String(raw.network||''),
      instrument:String(raw.instrument||raw.modality||''),
      modality:String(raw.modality||''),
      lat:validLatLon(lat,lon)?lat:null,
      lon:validLatLon(lat,lon)?lon:null,
      elevation:raw.elevation==null?null:Number(raw.elevation),
      observedAt:raw.observedAt||null,
      receivedAt:raw.receivedAt||null,
      activation,
      band:activationBand(activation),
      lineageId:String(raw.lineageId||raw.network||raw.agency||''),
      sourceUrl:raw.sourceUrl||null,
      authoritative:!!raw.authoritative,
      measurements:Array.isArray(raw.measurements)?raw.measurements:[],
      temperature,
      quality:raw.quality==null?null:clamp(raw.quality),
      freshness:raw.freshness==null?null:clamp(raw.freshness),
      anomalyZ:raw.anomalyZ==null?null:Number(raw.anomalyZ),
      persistence:raw.persistence==null?null:clamp(raw.persistence),
      corroboration:raw.corroboration==null?null:clamp(raw.corroboration)
    };
  }
  function normalizeEvent(raw={}){
    const lat=Number(raw.lat),lon=Number(raw.lon);
    return{
      id:String(raw.id||''),kind:String(raw.kind||'Unknown hazard'),
      lat:validLatLon(lat,lon)?lat:null,lon:validLatLon(lat,lon)?lon:null,
      geometry:raw.geometry||null,officialCategory:raw.officialCategory||null,
      derivedCategory:raw.derivedCategory||null,strengthResolved:!!raw.strengthResolved,
      evidenceStrength:raw.evidenceStrength==null?null:clamp(raw.evidenceStrength),
      source:raw.source||null,time:raw.time||null
    };
  }
  function lodForAltitudeKm(km){
    km=Math.max(0,Number(km)||0);
    if(km>12000)return{level:0,name:'orbital',sensorMode:'clusters',terrain:'coarse-globe',maxSensors:300};
    if(km>4000)return{level:1,name:'hemisphere',sensorMode:'regional-clusters',terrain:'low',maxSensors:800};
    if(km>1000)return{level:2,name:'continental',sensorMode:'network-clusters',terrain:'medium',maxSensors:1600};
    if(km>250)return{level:3,name:'regional',sensorMode:'selected-stations',terrain:'high',maxSensors:3000};
    if(km>50)return{level:4,name:'local',sensorMode:'stations',terrain:'very-high',maxSensors:5000};
    return{level:5,name:'surface',sensorMode:'precise-stations',terrain:'maximum-available',maxSensors:8000};
  }
  function viewportFilter(sensors,{south=-90,north=90,west=-180,east=180,max=1500}={}){
    const rows=(sensors||[]).filter(s=>s&&s.lat!=null&&s.lon!=null&&s.lat>=south&&s.lat<=north&&s.lon>=west&&s.lon<=east);
    rows.sort((a,b)=>(b.activation||0)-(a.activation||0));
    return rows.slice(0,Math.max(1,Math.min(10000,Number(max)||1500)));
  }
  function clusterKey(sensor,level=2){
    const size=[30,15,8,3,1,.25][Math.max(0,Math.min(5,level))];
    return `${Math.floor(sensor.lat/size)*size}:${Math.floor(sensor.lon/size)*size}`;
  }
  function cluster(sensors,level=2){
    const m=new Map();for(const s of sensors||[]){if(s.lat==null||s.lon==null)continue;const k=clusterKey(s,level),r=m.get(k)||{key:k,count:0,lat:0,lon:0,maxActivation:0,modalities:new Set(),temperatureCells:[]};r.count++;r.lat+=s.lat;r.lon+=s.lon;r.maxActivation=Math.max(r.maxActivation,s.activation||0);if(s.modality)r.modalities.add(s.modality);if(s.temperature&&Number.isFinite(s.temperature.valueC))r.temperatureCells.push({lat:s.lat,valueC:s.temperature.valueC,uncertaintyC:s.temperature.uncertaintyC,quality:s.quality==null?1:s.quality,coverage:1});m.set(k,r)}
    return [...m.values()].map(r=>{const temp=window.DOMEnvironmentalDefense&&r.temperatureCells.length?DOMEnvironmentalDefense.globalAreaWeightedMean(r.temperatureCells):null;return{key:r.key,count:r.count,lat:r.lat/r.count,lon:r.lon/r.count,maxActivation:r.maxActivation,band:activationBand(r.maxActivation),modalities:[...r.modalities],temperatureSummary:temp}});
  }
  function temperatureField(sensors=[]){
    if(!window.DOMEnvironmentalDefense)return null;
    const cells=(sensors||[]).filter(s=>s&&s.temperature&&Number.isFinite(s.temperature.valueC)&&s.lat!=null).map(s=>({lat:s.lat,valueC:s.temperature.valueC,uncertaintyC:s.temperature.uncertaintyC,quality:s.quality==null?1:s.quality,coverage:1}));
    return DOMEnvironmentalDefense.globalAreaWeightedMean(cells);
  }
  function renderPlan({altitudeKm,sensors=[],events=[],viewport}={}){
    const normalized=(sensors||[]).map(normalizeSensor),lod=lodForAltitudeKm(altitudeKm),visible=viewportFilter(normalized,{...(viewport||{}),max:lod.maxSensors});
    return{lod,sensors:lod.level<=2?cluster(visible,lod.level):visible,events:(events||[]).map(normalizeEvent),temperatureField:temperatureField(visible)};
  }
  return{ACTIVATION,activationBand,normalizeSensor,normalizeEvent,lodForAltitudeKm,viewportFilter,cluster,temperatureField,renderPlan};
})();
