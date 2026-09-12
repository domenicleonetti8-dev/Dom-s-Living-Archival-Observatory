(()=>{
'use strict';
const state={population:null,temperature:null,seaLevel:null,forest:null,coral:null,updatedAt:null};
const SOURCE={
  population:{name:'U.S. Census Bureau Population Clock',url:'https://www.census.gov/popclock/data/population.php/world'},
  temperature:{name:'NASA GISS GISTEMP v4',url:'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv'},
  seaLevel:{name:'NOAA NESDIS Laboratory for Satellite Altimetry',url:'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_SLR_timeseries_global.php'}
};
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const clone=v=>JSON.parse(JSON.stringify(v));
const annualized=(loss,years)=>{const l=Number(loss),y=Number(years);if(!Number.isFinite(l)||!Number.isFinite(y)||l<0||l>=100||y<=0)return null;return 100*(1-Math.pow(1-l/100,1/y))};
const percentOfArea=(lossMillionHa,areaMillionHa)=>{const a=Number(areaMillionHa),l=Number(lossMillionHa);return Number.isFinite(a)&&Number.isFinite(l)&&a>0&&l>=0?l/a*100:null};
function ecosystemVitals(){
  const forestAreaMillionHa=4140,deforestationMillionHaPerYear=10.9,southAmericaAreaMillionHa=849,southAmericaLossMillionHa=4.22;
  state.forest={dataClass:'published-reference',live:false,source:'FAO Global Forest Resources Assessment 2025',url:'https://www.fao.org/newsroom/detail/global-deforestation-slows--but-forests-remain-under-pressure--fao-report-shows/en',period:'2015–2025',forestAreaBillionHa:forestAreaMillionHa/1000,deforestationMillionHaPerYear,deforestationPctForestAreaPerYear:percentOfArea(deforestationMillionHaPerYear,forestAreaMillionHa),netForestLossMillionHaPerYear:4.12,southAmerica:{forestAreaMillionHa:southAmericaAreaMillionHa,annualLossMillionHa:southAmericaLossMillionHa,annualLossPctForestArea:percentOfArea(southAmericaLossMillionHa,southAmericaAreaMillionHa),source:'FAO FRA 2025 South America'},note:'Published reference period, not a live sensor feed. Percent/year is derived exactly as annual reported deforestation area divided by reported forest area; deforestation is not net forest-area change.'};
  const globalLoss=14,globalYears=9,caribbeanLoss=48,caribbeanYears=44;
  state.coral={dataClass:'published-reference',live:false,source:'GCRMN / UNEP Status of Coral Reefs of the World',url:'https://www.unep.org/resources/status-coral-reefs-world-2020',period:'2009–2018',globalCoralLossPct:globalLoss,annualizedLossPct:annualized(globalLoss,globalYears),annualizationYears:globalYears,lostAreaKm2:11700,caribbean:{source:'GCRMN Status and Trends of Caribbean Coral Reefs 1970–2024',url:'https://gcrmn.net/2025/12/09/caribbean-2025-report/',declinePct:caribbeanLoss,period:'1980–2024',annualizedLossPct:annualized(caribbeanLoss,caribbeanYears),annualizationYears:caribbeanYears,sharpDeclines:[{year:1998,pct:9.0},{year:2005,pct:17.1},{year:2023,pct:16.9}]},bleachingExposure:{source:'NOAA Coral Reef Watch',url:'https://www.coralreefwatch.noaa.gov/satellite/research/coral_bleaching_report.php',period:'2023–2025',reefAreaExposedPct:84.4,note:'Published heat-stress exposure statistic; exposure is not coral mortality.'},note:'Published reference observations, not a live feed. Annualized loss is the compound-equivalent rate 100×(1−(1−L/100)^(1/years)); it is not constant annual mortality.'};
}
function timeout(ms=12000){const c=new AbortController(),id=setTimeout(()=>c.abort(),ms);return{signal:c.signal,done:()=>clearTimeout(id)}}
async function get(url,as='json',ms=12000){const t=timeout(ms);try{const r=await fetch(url,{cache:'no-store',signal:t.signal,headers:{Accept:as==='json'?'application/json':'text/plain,*/*'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return as==='text'?await r.text():await r.json()}finally{t.done()}}
function latestGISTEMP(csv){
  const lines=String(csv||'').trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)return null;
  const header=lines[0].split(',').map(x=>x.trim()),months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(let i=lines.length-1;i>=1;i--){const row=lines[i].split(',').map(x=>x.trim()),year=Number(row[0]);if(!Number.isFinite(year))continue;for(let m=11;m>=0;m--){const idx=header.indexOf(months[m]);if(idx<=0||idx>=row.length)continue;const value=Number(row[idx]);if(Number.isFinite(value)&&value>=-5&&value<=5)return{year,month:m+1,anomalyC:value,baseline:'1951–1980'}}}
  return null;
}
function parseSeaLevel(text){const patterns=[/trend\s*:\s*([0-9.]+)\s*(?:±|&plusmn;|\+\/-)\s*([0-9.]+)\s*mm\s*\/\s*year/i,/trend[^0-9]{0,30}([0-9.]+)\s*(?:±|&plusmn;|\+\/-)\s*([0-9.]+)\s*mm\s*(?:\/|per)\s*(?:year|yr)/i];for(const p of patterns){const m=String(text||'').match(p);if(!m)continue;const trend=Number(m[1]),uncertainty=Number(m[2]);if(Number.isFinite(trend)&&Number.isFinite(uncertainty)&&trend>=0&&trend<=20&&uncertainty>=0&&uncertainty<=10)return{trendMmPerYear:trend,uncertaintyMmPerYear:uncertainty}}return null}
let snapshotPromise=null;
async function loadSnapshot(){
  if(!snapshotPromise)snapshotPromise=get(`./data/live-vitals.json?ts=${Date.now()}`,'json',8000).catch(()=>null);
  return snapshotPromise;
}
function snapshotValue(snapshot,key){const x=snapshot&&snapshot[key];return x&&x.status==='live'?x:null}
function unavailable(source,error){return{status:'unavailable',live:false,source:source.name,url:source.url,error:String(error?.message||error||'authoritative source unavailable'),fetchedAt:new Date().toISOString()}}
async function pollPopulation(){
  try{const j=await get(SOURCE.population.url,'json'),w=j&&j.world;if(!w||!finite(w.population)||Number(w.population)<=0)throw new Error('invalid world population');const last=finite(w.last_updated)?new Date(Number(w.last_updated)*1000).toISOString():null;state.population={status:'live',live:true,transport:'direct-browser',value:Math.round(Number(w.population)),estimate:!!w.estimate,date:w.date||null,ratePerSecond:finite(w.population_rate)?Number(w.population_rate):null,sourceUpdatedAt:last,fetchedAt:new Date().toISOString(),source:SOURCE.population.name,url:'https://www.census.gov/popclock/world',unit:'people'};return true}catch(e){const s=snapshotValue(await loadSnapshot(),'population');state.population=s&&finite(s.value)?{...s,live:true,transport:'same-origin-authoritative-snapshot',source:s.source||SOURCE.population.name,url:s.sourceUrl||SOURCE.population.url}:unavailable(SOURCE.population,e);return !!s}
}
async function pollTemperature(){
  try{const csv=await get(SOURCE.temperature.url,'text'),v=latestGISTEMP(csv);if(!v)throw new Error('no finite monthly anomaly');state.temperature={status:'live',live:true,transport:'direct-browser',...v,source:SOURCE.temperature.name,url:'https://data.giss.nasa.gov/gistemp/',fetchedAt:new Date().toISOString(),unit:'°C anomaly'};return true}catch(e){const s=snapshotValue(await loadSnapshot(),'temperature');state.temperature=s&&finite(s.anomalyC)?{...s,live:true,transport:'same-origin-authoritative-snapshot',source:s.source||SOURCE.temperature.name,url:s.sourceUrl||SOURCE.temperature.url}:unavailable(SOURCE.temperature,e);return !!s}
}
async function pollSeaLevel(){
  try{const text=await get(SOURCE.seaLevel.url,'text'),v=parseSeaLevel(text);if(!v)throw new Error('trend and uncertainty not machine-readable');state.seaLevel={status:'live',live:true,transport:'direct-browser',...v,source:SOURCE.seaLevel.name,url:SOURCE.seaLevel.url,scope:'global ocean satellite-altimetry series',fetchedAt:new Date().toISOString(),unit:'mm/year'};return true}catch(e){const s=snapshotValue(await loadSnapshot(),'seaLevel');state.seaLevel=s&&finite(s.trendMmPerYear)?{...s,live:true,transport:'same-origin-authoritative-snapshot',source:s.source||SOURCE.seaLevel.name,url:s.sourceUrl||SOURCE.seaLevel.url}:unavailable(SOURCE.seaLevel,e);return !!s}
}
function emit(){state.updatedAt=new Date().toISOString();window.dispatchEvent(new CustomEvent('dom:earth-vitals',{detail:clone(state)}));return clone(state)}
async function refresh(){snapshotPromise=null;ecosystemVitals();await Promise.allSettled([pollPopulation(),pollTemperature(),pollSeaLevel()]);return emit()}
window.DOMEarthVitals=Object.freeze({refresh,state:()=>clone(state),latestGISTEMP,parseSeaLevel,annualized,percentOfArea});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
setInterval(refresh,300000);
})();
