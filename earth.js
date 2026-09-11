import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const $=s=>document.querySelector(s);
const records=[];
const recordKeys=new Set();
const sourceStates=new Map();
let map=null;
let googleMap=null;
let googleLayer=null;
let googleMarkers=[];
const colorFor={earthquake:'#5ae5ff',hazard:'#ffd43b',station:'#36e58b',alert:'#ff536f'};

function validLatLon(lat,lon){return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180}
function safeText(v){return String(v==null?'':v)}
function escapeHtml(v){return safeText(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function withTimeout(ms=12000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);return{signal:controller.signal,done:()=>clearTimeout(timer)}}
async function getJSON(url,ms=12000){const t=withTimeout(ms);try{const r=await fetch(url,{signal:t.signal,cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.json()}finally{t.done()}}
async function getText(url,ms=12000){const t=withTimeout(ms);try{const r=await fetch(url,{signal:t.signal,cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.text()}finally{t.done()}}

function addRecord(r){
  if(!r||!validLatLon(r.lat,r.lon))return false;
  const id=safeText(r.id||`${r.source}:${r.lat}:${r.lon}`);
  const key=`${id}|${Number(r.lat).toFixed(6)}|${Number(r.lon).toFixed(6)}`;
  if(recordKeys.has(key))return false;
  recordKeys.add(key);
  records.push({id,source:safeText(r.source||'Unknown'),type:r.type||'station',title:safeText(r.title||r.source||'Observation'),lat:Number(r.lat),lon:Number(r.lon),time:r.time||null,url:r.url||null,detail:safeText(r.detail||'')});
  return true;
}
function clearRecords(){records.length=0;recordKeys.clear()}
function setSource(id,label,state,count=0,detail=''){sourceStates.set(id,{label,state,count,detail});renderSourceFabric()}
function renderSourceFabric(){
  const box=$('#sourceFabric');
  if(!box)return;
  box.innerHTML=[...sourceStates.values()].map(s=>{
    const klass=s.state==='ok'?'ok':s.state==='fail'?'fail':'loading';
    const label=s.state==='ok'?`${s.count} live`:s.state==='fail'?'failed':s.state==='idle'?'not configured':'loading';
    return `<div class="source-row"><div><strong>${escapeHtml(s.label)}</strong><small>${escapeHtml(s.detail||'')}</small></div><strong class="${klass}">${label}</strong></div>`;
  }).join('')||'<p>No adapters started.</p>';
  const live=[...sourceStates.values()].filter(x=>x.state==='ok').length;
  const failed=[...sourceStates.values()].filter(x=>x.state==='fail').length;
  const summary=$('#coverageSummary');
  if(summary)summary.innerHTML=`<div class="coverage-chip"><span>Responding adapters</span><strong>${live}/${sourceStates.size}</strong></div><div class="coverage-chip"><span>Failed / blocked adapters</span><strong>${failed}</strong></div><div class="coverage-chip"><span>Geographic records</span><strong>${records.length.toLocaleString()}</strong></div>`;
}
function asGeoJSON(){return{type:'FeatureCollection',features:records.map(r=>({type:'Feature',id:r.id,geometry:{type:'Point',coordinates:[r.lon,r.lat]},properties:{id:r.id,source:r.source,type:r.type,title:r.title,time:r.time||'',url:r.url||'',detail:r.detail||''}}))}}
function updateMapData(){const src=map&&map.getSource('dom-live');if(src)src.setData(asGeoJSON());const c=$('#earthCount');if(c)c.textContent=`${records.length.toLocaleString()} live geographic records`;renderSourceFabric();refreshGoogleMarkers()}
function currentView(){if(!map)return{lat:0,lon:0,zoom:1};const c=map.getCenter();return{lat:c.lat,lon:c.lng,zoom:map.getZoom()}}
function updateGoogleLink(){const a=$('#openGoogle');if(!a)return;const v=currentView();a.href=`https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(v.lat+','+v.lon)}&zoom=${Math.max(1,Math.round(v.zoom))}`}
function viewLabel(){const v=currentView();const n=$('#earthView');if(n)n.textContent=`${Math.abs(v.lat).toFixed(2)}° ${v.lat>=0?'N':'S'}, ${Math.abs(v.lon).toFixed(2)}° ${v.lon>=0?'E':'W'} · zoom ${v.zoom.toFixed(1)}`;updateGoogleLink()}

function centroidOfGeometry(g){if(!g)return null;const pts=[];const walk=x=>{if(Array.isArray(x)&&x.length>=2&&Number.isFinite(Number(x[0]))&&Number.isFinite(Number(x[1]))&&!Array.isArray(x[0]))pts.push([Number(x[0]),Number(x[1])]);else if(Array.isArray(x))x.forEach(walk)};walk(g.coordinates);if(!pts.length)return null;let lat=0,sin=0,cos=0,valid=0;for(const [lon,la] of pts){if(!validLatLon(la,lon))continue;lat+=la;sin+=Math.sin(lon*Math.PI/180);cos+=Math.cos(lon*Math.PI/180);valid++}return valid?[lat/valid,Math.atan2(sin,cos)*180/Math.PI]:null}

async function loadUSGS(){const id='usgs';setSource(id,'USGS earthquakes','loading',0,'Global earthquake events, all magnitudes · past 24h');try{const d=await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');let count=0;for(const f of d.features||[]){const p=f.properties||{},co=f.geometry&&f.geometry.coordinates;if(!co||!validLatLon(co[1],co[0]))continue;if(addRecord({id:`usgs:${f.id}`,source:'USGS',type:'earthquake',title:p.place||'Earthquake',lat:co[1],lon:co[0],time:p.time?new Date(p.time).toISOString():null,url:p.url,detail:Number.isFinite(Number(p.mag))?`M${Number(p.mag).toFixed(1)}`:''}))count++}setSource(id,'USGS earthquakes','ok',count,'Global earthquake events, all magnitudes · past 24h')}catch(e){setSource(id,'USGS earthquakes','fail',0,e.message)}}
async function loadEONET(){const id='eonet';setSource(id,'NASA EONET','loading',0,'Global open natural-event catalog');try{const d=await getJSON('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=500');let count=0;for(const e of d.events||[]){const g=[...(e.geometry||[])].reverse().find(x=>Array.isArray(x.coordinates)&&validLatLon(x.coordinates[1],x.coordinates[0]));if(!g)continue;const cats=(e.categories||[]).map(x=>x.title).filter(Boolean).join(', ');if(addRecord({id:`eonet:${e.id}`,source:'NASA EONET',type:'hazard',title:e.title||cats||'Natural event',lat:g.coordinates[1],lon:g.coordinates[0],time:g.date||null,url:(e.sources&&e.sources[0]&&e.sources[0].url)||null,detail:cats}))count++}setSource(id,'NASA EONET','ok',count,'Global open natural-event catalog')}catch(e){setSource(id,'NASA EONET','fail',0,e.message)}}
async function loadNDBC(){const id='ndbc';setSource(id,'NOAA NDBC stations','loading',0,'Active buoy and marine station inventory');try{const text=await getText('https://www.ndbc.noaa.gov/activestations.xml');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('invalid station XML');let count=0;for(const s of doc.querySelectorAll('station')){const lat=Number(s.getAttribute('lat')),lon=Number(s.getAttribute('lon'));if(!validLatLon(lat,lon))continue;if(addRecord({id:`ndbc:${s.getAttribute('id')}`,source:'NOAA NDBC',type:'station',title:s.getAttribute('name')||s.getAttribute('id')||'NDBC station',lat,lon,url:`https://www.ndbc.noaa.gov/station_page.php?station=${encodeURIComponent(s.getAttribute('id')||'')}`,detail:[s.getAttribute('owner'),s.getAttribute('pgm')].filter(Boolean).join(' · ')}))count++}setSource(id,'NOAA NDBC stations','ok',count,'Active buoy and marine station inventory')}catch(e){setSource(id,'NOAA NDBC stations','fail',0,e.message)}}
async function loadCOOPS(){const id='coops';setSource(id,'NOAA CO-OPS water-level stations','loading',0,'Coastal tide/water-level station inventory');try{const d=await getJSON('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels');let count=0;for(const s of d.stations||[]){const lat=Number(s.lat),lon=Number(s.lng??s.lon);if(!validLatLon(lat,lon))continue;if(addRecord({id:`coops:${s.id}`,source:'NOAA CO-OPS',type:'station',title:s.name||s.id||'CO-OPS station',lat,lon,url:s.id?`https://tidesandcurrents.noaa.gov/stationhome.html?id=${encodeURIComponent(s.id)}`:null,detail:'water level / tide station'}))count++}setSource(id,'NOAA CO-OPS water-level stations','ok',count,'Coastal tide/water-level station inventory')}catch(e){setSource(id,'NOAA CO-OPS water-level stations','fail',0,e.message)}}
async function loadNWS(){const id='nws';setSource(id,'NOAA/NWS active alerts','loading',0,'Official active U.S. alert geometries');try{const d=await getJSON('https://api.weather.gov/alerts/active');let count=0;for(const f of d.features||[]){const p=f.properties||{},c=centroidOfGeometry(f.geometry);if(!c||!validLatLon(c[0],c[1]))continue;if(addRecord({id:`nws:${f.id||p.id||count}`,source:'NOAA/NWS',type:'alert',title:p.event||p.headline||'Official weather alert',lat:c[0],lon:c[1],time:p.sent||p.effective||null,url:p['@id']||f.id||null,detail:[p.severity,p.certainty,p.urgency].filter(Boolean).join(' · ')}))count++}setSource(id,'NOAA/NWS active alerts','ok',count,'Official active U.S. alert geometries')}catch(e){setSource(id,'NOAA/NWS active alerts','fail',0,e.message)}}

function brokerRecordType(r){if(r&&r.officialAlert)return'alert';if(r&&r.kind==='Earthquake')return'earthquake';if(r&&r.kind==='Scientific Station')return'station';return'hazard'}
async function loadBroker(){
  const base=String(window.DOMSRuntimeConfig&&window.DOMSRuntimeConfig.brokerUrl||'').replace(/\/$/,'');
  if(!base){setSource('broker','Persistent D.O.M. broker','idle',0,'Not configured on this public build · browser feeds continue independently');return}
  setSource('broker','Persistent D.O.M. broker','loading',0,'Loading normalized scientific instruments and observations');
  try{
    const batch=await getJSON(`${base}/v1/observations`,20000);
    let count=0;
    for(const r of batch.records||[]){
      if(!validLatLon(r.lat,r.lon))continue;
      if(addRecord({id:`broker:${r.lineageId||r.network||'source'}:${r.sourceId}`,source:r.sourceAgency||r.network||'D.O.M. broker',type:brokerRecordType(r),title:r.title||r.kind||'Observation',lat:r.lat,lon:r.lon,time:r.observedAt||null,url:r.sourceUrl||null,detail:[r.network,r.modality,r.platformClass,r.siteType].filter(Boolean).join(' · ')}))count++;
    }
    setSource('broker','Persistent D.O.M. broker','ok',count,'Normalized scientific instruments + hazard observations with canonical provenance');
  }catch(e){setSource('broker','Persistent D.O.M. broker','fail',0,e.message)}
}

function popupNode(p){const d=document.createElement('div');const h=document.createElement('strong');h.textContent=p.title||'Observation';d.appendChild(h);const meta=document.createElement('div');meta.style.marginTop='6px';meta.style.fontSize='.82rem';meta.textContent=`${p.source||'Source'} · ${p.detail||p.type||''}`;d.appendChild(meta);if(p.time){const t=document.createElement('div');t.style.fontSize='.76rem';t.style.opacity=.72;t.textContent=new Date(p.time).toLocaleString();d.appendChild(t)}if(p.url){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Source ↗';a.style.display='inline-block';a.style.marginTop='7px';d.appendChild(a)}return d}
function installLayers(){if(map.getSource('dom-live'))return;map.addSource('dom-live',{type:'geojson',data:asGeoJSON(),cluster:true,clusterRadius:26,clusterMaxZoom:7});map.addLayer({id:'dom-clusters',type:'circle',source:'dom-live',filter:['has','point_count'],paint:{'circle-color':'#32d9cf','circle-radius':['step',['get','point_count'],13,100,18,500,24,2000,30],'circle-opacity':.72,'circle-stroke-width':1.5,'circle-stroke-color':'#d9ffff'}});map.addLayer({id:'dom-cluster-count',type:'symbol',source:'dom-live',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':11},paint:{'text-color':'#001417'}});map.addLayer({id:'dom-points',type:'circle',source:'dom-live',filter:['!',['has','point_count']],paint:{'circle-radius':['interpolate',['linear'],['zoom'],1,3,8,5,13,7],'circle-color':['match',['get','type'],'earthquake',colorFor.earthquake,'hazard',colorFor.hazard,'alert',colorFor.alert,'station',colorFor.station,'#8fefff'],'circle-opacity':.86,'circle-stroke-color':'rgba(255,255,255,.72)','circle-stroke-width':.7}});map.on('click','dom-clusters',async e=>{const f=e.features&&e.features[0];if(!f)return;const src=map.getSource('dom-live');const z=await src.getClusterExpansionZoom(f.properties.cluster_id);map.easeTo({center:f.geometry.coordinates,zoom:z})});map.on('click','dom-points',e=>{const f=e.features&&e.features[0];if(!f)return;new maplibregl.Popup({closeButton:true,maxWidth:'320px'}).setLngLat(f.geometry.coordinates).setDOMContent(popupNode(f.properties||{})).addTo(map)});for(const id of ['dom-clusters','dom-points']){map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',id,()=>map.getCanvas().style.cursor='')}}
function initMap(){map=new maplibregl.Map({container:'earthMap',style:'https://demotiles.maplibre.org/globe.json',center:[-20,18],zoom:1.35,maxZoom:18,attributionControl:true});map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');map.on('load',()=>{try{map.setProjection({type:'globe'})}catch(_){}installLayers();updateMapData();$('#providerState').textContent='Geographic Earth active · map geography + source-backed D.O.M. observations anchored by latitude/longitude.'});map.on('moveend',viewLabel);map.on('zoomend',viewLabel);map.on('error',e=>{$('#providerState').textContent=`Map provider warning: ${e.error&&e.error.message?e.error.message:'map resource failed'}`});viewLabel()}

async function loadGoogleMaps(){const key=String(window.DOMS_GOOGLE_MAPS_API_KEY||'').trim();if(!key){$('#providerState').textContent='Google Maps overlay is wired but no browser API key is configured. The geographic Earth remains active with the open map layer; use “Open current view in Google Maps” now.';return false}if(window.google&&window.google.maps)return true;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Google Maps API failed to load'));document.head.appendChild(s)});return !!(window.google&&window.google.maps)}
function refreshGoogleMarkers(){if(!googleMap||!window.google)return;for(const m of googleMarkers)m.setMap(null);googleMarkers=[];for(const r of records.slice(0,2500)){const marker=new google.maps.Marker({map:googleMap,position:{lat:r.lat,lng:r.lon},title:r.title,icon:{path:google.maps.SymbolPath.CIRCLE,scale:r.type==='station'?3.2:4.5,fillColor:colorFor[r.type]||'#8fefff',fillOpacity:.82,strokeColor:'#eaffff',strokeWeight:.7}});googleMarkers.push(marker)}}
async function toggleGoogle(){try{const ok=await loadGoogleMaps();if(!ok)return;if(!googleLayer){googleLayer=document.createElement('div');googleLayer.style.cssText='position:absolute;inset:0;z-index:4;';$('#earthMap').parentElement.appendChild(googleLayer)}if(googleLayer.style.display==='none'||!googleMap){const v=currentView();googleLayer.style.display='block';googleMap=new google.maps.Map(googleLayer,{center:{lat:v.lat,lng:v.lon},zoom:Math.max(2,Math.round(v.zoom)),mapTypeId:'hybrid',streetViewControl:true,fullscreenControl:true});refreshGoogleMarkers();$('#googleOverlay').textContent='Return to D.O.M. globe';$('#providerState').textContent='Google Maps overlay active. D.O.M. points are overlaid from the same normalized geographic records.'}else{googleLayer.style.display='none';googleMap=null;googleMarkers=[];$('#googleOverlay').textContent='Google Maps overlay';$('#providerState').textContent='Returned to D.O.M. geographic globe.'}}catch(e){$('#providerState').textContent=`Google Maps overlay failed: ${e.message}`}}

$('#resetEarth').addEventListener('click',()=>map&&map.easeTo({center:[-20,18],zoom:1.35,pitch:0,bearing:0,duration:900}));
$('#surfaceMode').addEventListener('click',()=>{if(!map)return;const c=map.getCenter();map.easeTo({center:c,zoom:Math.max(10,map.getZoom()),pitch:50,duration:1100})});
$('#locateMe').addEventListener('click',()=>{if(!navigator.geolocation){$('#providerState').textContent='Geolocation is not available in this browser.';return}navigator.geolocation.getCurrentPosition(p=>map&&map.easeTo({center:[p.coords.longitude,p.coords.latitude],zoom:9,duration:1100}),e=>{$('#providerState').textContent=`Location unavailable: ${e.message}`},{enableHighAccuracy:false,timeout:8000,maximumAge:300000})});
$('#googleOverlay').addEventListener('click',toggleGoogle);

const loaders=[loadUSGS,loadEONET,loadNDBC,loadCOOPS,loadNWS,loadBroker];
async function refreshFabric(){clearRecords();await Promise.allSettled(loaders.map(fn=>fn()));updateMapData()}

initMap();
refreshFabric();
setInterval(refreshFabric,5*60*1000);
