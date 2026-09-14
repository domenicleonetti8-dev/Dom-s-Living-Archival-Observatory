(()=>{
'use strict';
const S={stations:[],status:'WAITING',error:null};
async function refresh(){
 S.status='LOADING';
 try{
  const r=await fetch('https://service.earthscope.org/fdsnws/station/1/query?format=text&level=channel&channel=*DF&nodata=404',{cache:'no-store'});
  if(!r.ok)throw Error(`${r.status} ${r.statusText}`);
  const text=await r.text(),rows=[];
  for(const line of text.split(/\r?\n/)){
   if(!line||line.startsWith('#'))continue;
   const p=line.split('|');
   if(p.length<7)continue;
   const [network,station,location,channel,lat,lon,elevation]=p;
   if(!network||!station||!channel||channel.length<3||channel[1]!=='D'||channel[2]!=='F')continue;
   if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon)))continue;
   rows.push({id:`earthscope-infrasound:${network}:${station}:${location}:${channel}`,sensorId:`${network}.${station}.${location}.${channel}`,agency:'NSF EarthScope',network,sensorFamily:'infrasound',instrumentType:'atmospheric pressure / infrasound',title:`${station} · ${channel} infrasound channel`,lat:Number(lat),lon:Number(lon),elevationM:Number.isFinite(Number(elevation))?Number(elevation):null,sourceStatus:'official-registry',waveformAvailable:false,signalDetected:false});
  }
  S.stations=rows;S.status='LIVE';S.error=null;
 }catch(e){S.stations=[];S.status='FAILED';S.error=String(e.message||e)}
 window.dispatchEvent(new CustomEvent('dom:infrasound-registry',{detail:{source:'NSF EarthScope FDSN',status:S.status,stations:S.stations,error:S.error}}));
 return S;
}
window.DOMEarthScopeInfrasound=Object.freeze({refresh,state:()=>({status:S.status,count:S.stations.length,error:S.error})});
refresh();
})();