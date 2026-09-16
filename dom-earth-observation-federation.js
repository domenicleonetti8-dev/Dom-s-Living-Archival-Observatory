(()=>{
'use strict';
const SCHEMA='dom-earth-observation-federation/v1';
const now=()=>new Date().toISOString();
const SOURCES=Object.freeze([
{id:'nasa-gibs',agency:'NASA EOSDIS',kind:['satellite','research'],coverage:'global',access:'WMTS/WMS/TWMS/XYZ',cadence:'product-dependent',public:true,endpoint:'https://gibs.earthdata.nasa.gov',products:['VIIRS','MODIS','IMERG','fires','snow-ice','aerosol']},
{id:'noaa-goes',agency:'NOAA/NESDIS',kind:['satellite','lightning'],coverage:'Americas/Atlantic/Pacific',access:'public products/open data',cadence:'minutes',public:true,products:['GOES-East','GOES-West','ABI','GLM']},
{id:'noaa-nexrad',agency:'NOAA/NWS/NCEI',kind:['radar'],coverage:'United States/territories',access:'public archive/open data',cadence:'minutes',public:true,products:['Level II','Level III','reflectivity','velocity','dual-pol']},
{id:'eumetnet-opera',agency:'EUMETNET OPERA',kind:['radar'],coverage:'Europe',access:'ORD API/MQTT/S3',cadence:'near-real-time',public:true,endpoint:'https://api.meteogate.eu/eu-eumetnet-weather-radar',products:['DBZH','VRADH','RATE','ACRR','ODIM HDF5']},
{id:'eumetsat-mtg',agency:'EUMETSAT',kind:['satellite'],coverage:'Europe/Africa/Atlantic',access:'Data Store/EUMETView/OGC',cadence:'minutes',public:true,products:['Meteosat','MTG FCI','SEVIRI']},
{id:'jma-himawari',agency:'Japan Meteorological Agency',kind:['satellite'],coverage:'Asia/Oceania/Western Pacific',access:'public imagery/products',cadence:'10 minutes full disk',public:true,products:['Himawari-9','AHI','visible','infrared','water vapor']},
{id:'jma-radar',agency:'Japan Meteorological Agency',kind:['radar'],coverage:'Japan',access:'public products',cadence:'minutes',public:true,products:['Doppler','dual-polarization','precipitation']},
{id:'bom-observation',agency:'Australian Bureau of Meteorology',kind:['radar','satellite','surface'],coverage:'Australia/Oceania',access:'public data feeds',cadence:'5m radar / 10m satellite',public:true,products:['individual radar','Himawari-9 JPG','Himawari-9 GeoTIFF','stations']},
{id:'eccc-geomet',agency:'Environment and Climate Change Canada',kind:['satellite','radar','surface','hydrology'],coverage:'Canada/North America',access:'MSC GeoMet/Datamart',cadence:'product-dependent',public:true,products:['GOES-East','radar','weather','water']},
{id:'inpe-goes',agency:'INPE Brazil',kind:['satellite','research'],coverage:'South America',access:'STAC/catalog',cadence:'~10 minutes full disk',public:true,products:['GOES-19','ABI']},
{id:'dmi-arctic',agency:'Danish Meteorological Institute',kind:['satellite','ice'],coverage:'Greenland/Arctic',access:'public research products',cadence:'multiple/day or product-dependent',public:true,products:['Sentinel-1','MODIS','NOAA imagery','ice']},
{id:'metno-ice',agency:'MET Norway',kind:['ice','satellite'],coverage:'Arctic/Europe/Africa/Atlantic',access:'public APIs',cadence:'product-dependent',public:true,products:['Icemap','Meteosat imagery']},
{id:'usgs-landsat',agency:'USGS/NASA',kind:['satellite','research'],coverage:'global',access:'EarthExplorer/M2M/cloud',cadence:'orbital',public:true,products:['Landsat','surface reflectance','thermal','land change']},
{id:'copernicus-sentinel',agency:'EU Copernicus/ESA',kind:['satellite','research'],coverage:'global',access:'Copernicus Data Space',cadence:'orbital',public:true,products:['Sentinel-1 SAR','Sentinel-2 optical','Sentinel-3 ocean/land','Sentinel-5P atmosphere']},
{id:'wmo-wis2',agency:'WMO Members',kind:['surface','upper-air','marine','hydrology'],coverage:'global',access:'WIS 2.0/public where licensed',cadence:'network-dependent',public:true,products:['SYNOP','BUOY','TEMP','marine','hydrology']}
]);
const state=new Map(SOURCES.map(s=>[s.id,{...s,status:'REGISTERED',truth:'UNVERIFIED',lastObservation:null,lastChecked:null,error:null}]));
function classifyAge(acquiredAt,cadenceMinutes){const t=Date.parse(acquiredAt||'');if(!Number.isFinite(t))return{truth:'COVERAGE_GAP',ageMinutes:null};const age=Math.max(0,(Date.now()-t)/60000);const limit=Math.max(Number(cadenceMinutes||60)*3,45);return{truth:age<=limit?'OBSERVED':'STALE',ageMinutes:age};}
function reportObservation(id,meta={}){const cur=state.get(id);if(!cur)return false;const f=classifyAge(meta.acquiredAt,meta.cadenceMinutes);state.set(id,{...cur,...meta,...f,status:f.truth==='OBSERVED'?'ACTIVE':f.truth,lastChecked:now(),error:null});emit();return f.truth==='OBSERVED';}
function reportGap(id,reason){const cur=state.get(id);if(!cur)return;state.set(id,{...cur,status:'COVERAGE_GAP',truth:'COVERAGE_GAP',lastChecked:now(),error:String(reason||'authoritative observation unavailable')});emit();}
function emit(){window.dispatchEvent(new CustomEvent('dom:earth-observation-federation',{detail:{schema:SCHEMA,generatedAt:now(),sources:[...state.values()].map(x=>({...x}))}}));}
function eligible(filter={}){return [...state.values()].filter(s=>(!filter.kind||s.kind.includes(filter.kind))&&(!filter.coverage||s.coverage.toLowerCase().includes(String(filter.coverage).toLowerCase()))).map(x=>({...x}));}
function ingestSatelliteFabric(){const sat=window.DOMLiveSatelliteObservationFabric?.sources?.()||[];for(const s of sat){const map={worldview:'nasa-gibs',meteosat:'eumetsat-mtg','goes-east':'noaa-goes','goes-west':'noaa-goes',himawari:'jma-himawari'};const id=map[s.id];if(!id)continue;if(s.truth==='OBSERVED'&&s.acquiredAt)reportObservation(id,{acquiredAt:s.acquiredAt,cadenceMinutes:s.cadenceMin,upstream:s});else if(s.truth==='COVERAGE_GAP')reportGap(id,s.gapReason||s.status);}}
window.addEventListener('dom:satellite-observation-fabric',ingestSatelliteFabric);
window.addEventListener('dom:authoritative-observation',e=>{const d=e.detail||{};if(d.federationSourceId&&d.acquiredAt)reportObservation(d.federationSourceId,d);});
window.DOMEarthObservationFederation=Object.freeze({schema:SCHEMA,sources:()=>[...state.values()].map(x=>({...x})),eligible,reportObservation,reportGap,refreshFromSatelliteFabric:ingestSatelliteFabric});
emit();setTimeout(ingestSatelliteFabric,0);
})();