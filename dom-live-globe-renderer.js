const DOMLiveGlobeRenderer=(()=>{
  'use strict';
  let host=null,map=null,maplibre=null,events=[],sensors=[],expiryTimer=null,loadPromise=null,lastError=null;
  const MAPLIBRE_BASE_STYLE='https://demotiles.maplibre.org/globe.json';
  const NASA_BLUE_MARBLE_WMS='https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&FORMAT=image/jpeg&TRANSPARENT=FALSE&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
  const stoppedStatus=s=>/cancel|ended|expired|inactive|closed|resolved|cleared/i.test(String(s||''));
  const staleStatus=s=>/stale|unknown|unavailable|source[-_ ]?stale/i.test(String(s||''));
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const reducedMotion=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function valid(lat,lon){return finite(lat)&&finite(lon)&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180}
  function statusOf(item){return String(item&&((item.observationStatus||item.status||item.state||item.sourceStatus))||'')}
  function isLive(item,now=Date.now()){
    if(!item||stoppedStatus(statusOf(item)))return false;
    const exp=item.expiresAt?new Date(item.expiresAt).getTime():NaN;
    return !(Number.isFinite(exp)&&exp<=now);
  }
  function profile(item,type,now=Date.now()){
    if(!isLive(item,now))return{id:'off',animate:false,color:'#4b545c',alpha:.18,scale:1,halo:0};
    if(item.stale===true||staleStatus(statusOf(item))||staleStatus(item.sourceStatus))return{id:'unknown',animate:false,color:'#6f8494',alpha:.34,scale:1,halo:.65};
    const activation=item.activation&&typeof item.activation==='object'?item.activation:null;
    const aid=String((activation&&activation.id)||item.band?.id||'').toLowerCase();
    const level=String(item.level||'').toLowerCase();
    const official=!!item.officialAlert,animateAllowed=!reducedMotion();
    if(official&&/extreme|severe/i.test(String(item.severityText||'')))return{id:'high',animate:animateAllowed,color:'#ff2b2b',alpha:.96,scale:1.28,halo:3.5,period:900};
    if(level==='extreme'||level==='high'||aid==='critical'||aid==='heavy')return{id:'high',animate:animateAllowed,color:aid==='heavy'?'#ff7a1a':'#ff355e',alpha:.94,scale:1.22,halo:3.1,period:1050};
    if(level==='watch'||aid==='elevated')return{id:'medium',animate:animateAllowed,color:'#ffd43b',alpha:.88,scale:1.13,halo:2.35,period:1800};
    if(level==='info'||aid==='active')return{id:'low',animate:false,color:'#34d17b',alpha:.78,scale:1.05,halo:1.55};
    if(aid==='watching'||type==='sensor')return{id:'steady',animate:false,color:aid==='watching'?'#39c6ff':'#59ecff',alpha:.62,scale:1,halo:1.15};
    return{id:'steady',animate:false,color:'#59ecff',alpha:.58,scale:1,halo:1.1};
  }
  function clean(rows,max){return(rows||[]).filter(r=>r&&valid(r.lat,r.lon)).slice(0,max)}
  function feature(item,type,index){
    const p=profile(item,type),activation=Number(item.activation&&item.activation.score!=null?item.activation.score:item.activation||0);
    return{type:'Feature',id:`${type}-${String(item.id||item.sensorId||item.sourceId||index)}`,geometry:{type:'Point',coordinates:[Number(item.lon),Number(item.lat)]},properties:{kind:type,color:p.color,state:p.id,title:String(item.title||item.kind||item.sensorId||item.id||type),source:String(item.agency||item.source||item.network||''),activation:Number.isFinite(activation)?activation:0,lat:Number(item.lat),lon:Number(item.lon),observedAt:item.observedAt||item.time||null,locationPrecision:item.locationPrecision||'unresolved',country:String(item.country||''),state:String(item.stateName||item.stateProvince||item.state||''),region:String(item.region||item.adminRegion||''),town:String(item.town||item.city||item.locality||'')}};
  }
  function geojson(){return{type:'FeatureCollection',features:[...sensors.map((x,i)=>feature(x,'sensor',i)),...events.map((x,i)=>feature(x,'event',i))]}}
  function ensureCss(){if(document.querySelector('link[data-dom-maplibre-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.css';l.dataset.domMaplibreCss='1';document.head.appendChild(l)}
  function setStatus(text){let el=document.getElementById('domGeoTruth');if(!host)return;if(!el){el=document.createElement('div');el.id='domGeoTruth';el.style.cssText='position:absolute;left:12px;top:10px;z-index:8;padding:7px 10px;border-radius:10px;background:rgba(2,14,22,.78);border:1px solid rgba(105,231,255,.28);font:600 12px system-ui;color:#d7f8ff;pointer-events:none;max-width:82%;';host.appendChild(el)}el.textContent=text}
  async function loadMapLibre(){if(maplibre)return maplibre;if(!loadPromise){ensureCss();loadPromise=import('https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs').then(m=>{maplibre=m;return m})}return loadPromise}
  function installEarthImagery(){
    if(!map||map.getSource('dom-earth-imagery'))return;
    map.addSource('dom-earth-imagery',{type:'raster',tiles:[NASA_BLUE_MARBLE_WMS],tileSize:256,attribution:'NASA EOSDIS GIBS · Blue Marble'});
    const firstSymbol=(map.getStyle().layers||[]).find(l=>l.type==='symbol');
    map.addLayer({id:'dom-earth-imagery-layer',type:'raster',source:'dom-earth-imagery',paint:{'raster-opacity':.92,'raster-saturation':-.04,'raster-contrast':.08}},firstSymbol&&firstSymbol.id);
  }
  function addObservationLayers(){
    if(!map||!map.loaded())return;
    const data=geojson();
    if(!map.getSource('dom-live-points'))map.addSource('dom-live-points',{type:'geojson',data,cluster:true,clusterRadius:34,clusterMaxZoom:5});else map.getSource('dom-live-points').setData(data);
    if(!map.getLayer('dom-clusters'))map.addLayer({id:'dom-clusters',type:'circle',source:'dom-live-points',filter:['has','point_count'],paint:{'circle-color':'#173f52','circle-radius':['step',['get','point_count'],13,25,17,100,21],'circle-stroke-color':'#b7f6ff','circle-stroke-width':1.2,'circle-opacity':.88}});
    if(!map.getLayer('dom-cluster-count'))map.addLayer({id:'dom-cluster-count',type:'symbol',source:'dom-live-points',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':11},paint:{'text-color':'#effcff','text-halo-color':'#06131b','text-halo-width':1}});
    if(!map.getLayer('dom-live-points-layer'))map.addLayer({id:'dom-live-points-layer',type:'circle',source:'dom-live-points',filter:['!',['has','point_count']],paint:{'circle-color':['get','color'],'circle-radius':['case',['==',['get','kind'],'event'],7,5],'circle-stroke-color':'#06131b','circle-stroke-width':1.4,'circle-opacity':.92}});
    setStatus(`${events.length} events · ${sensors.length} source-coordinate sensors · NASA Earth · country/region/town labels from geographic basemap`);
  }
  function locationText(p){return[p.town,p.region,p.state,p.country].map(x=>String(x||'').trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')}
  function popupNode(p){
    const root=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=String(p.title||'Observation');root.appendChild(strong);
    const source=document.createElement('div');source.textContent=String(p.source||'Source unavailable');root.appendChild(source);
    const loc=locationText(p);if(loc){const place=document.createElement('div');place.textContent=loc;root.appendChild(place)}
    const coord=document.createElement('small');coord.textContent=`${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)} · ${String(p.locationPrecision||'unresolved')}`;root.appendChild(coord);
    return root;
  }
  function bindClicks(){
    map.on('click','dom-live-points-layer',e=>{const f=e.features&&e.features[0];if(!f)return;new maplibre.Popup({closeButton:true,maxWidth:'300px'}).setLngLat(f.geometry.coordinates).setDOMContent(popupNode(f.properties||{})).addTo(map)});
    map.on('mouseenter','dom-live-points-layer',()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave','dom-live-points-layer',()=>{map.getCanvas().style.cursor=''})
  }
  async function mount(){
    host=document.getElementById('map');if(!host)return false;if(map)return true;
    host.querySelectorAll('canvas[data-dom-live-globe],.globe-grid').forEach(n=>n.remove());
    host.style.background='#010813';host.style.overflow='hidden';
    try{
      await loadMapLibre();
      map=new maplibre.Map({container:host,style:MAPLIBRE_BASE_STYLE,center:[-25,18],zoom:0.55,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true});
      map.setProjection({type:'globe'});
      map.addControl(new maplibre.NavigationControl({showCompass:true,showZoom:true}),'bottom-right');
      map.on('load',()=>{installEarthImagery();addObservationLayers();bindClicks()});
      map.on('error',e=>{lastError=String(e&&e.error&&e.error.message||e&&e.message||'map error')});
      return true;
    }catch(e){lastError=String(e&&e.message||e);setStatus('Geographic Earth renderer unavailable — refusing to show synthetic/fake placement');return false}
  }
  function refresh(){if(map&&map.loaded())addObservationLayers()}
  function scheduleExpiry(){if(expiryTimer)clearTimeout(expiryTimer);const now=Date.now(),times=[...events,...sensors].map(x=>x&&x.expiresAt?new Date(x.expiresAt).getTime():NaN).filter(t=>Number.isFinite(t)&&t>now).sort((a,b)=>a-b);if(times.length)expiryTimer=setTimeout(()=>{expiryTimer=null;events=clean(events.filter(isLive),1200);sensors=clean(sensors.filter(isLive),15000);refresh();scheduleExpiry()},Math.min(2147483647,Math.max(50,times[0]-now+25)))}
  function setEvents(rows=[]){events=clean(rows,1200);mount().then(refresh);scheduleExpiry()}
  function setSensors(rows=[]){sensors=clean(rows,15000);mount().then(refresh);scheduleExpiry()}
  function resetView(){if(map)map.easeTo({center:[-25,18],zoom:.55,pitch:0,bearing:0,duration:450})}
  window.addEventListener('dom:hazard-refresh',ev=>setEvents((ev.detail&&ev.detail.events)||[]));
  window.addEventListener('dom:organism-state',ev=>setSensors((ev.detail&&ev.detail.sensors)||[]));
  window.addEventListener('pagehide',()=>{if(expiryTimer)clearTimeout(expiryTimer);if(map){map.remove();map=null}},{once:true});
  return{mount,setEvents,setSensors,resetView,isLive,profile,state:()=>({eventCount:events.length,sensorCount:sensors.length,renderer:'maplibre-globe',imagery:'NASA GIBS Blue Marble',labels:'geographic basemap country/region/town',lastError})};
})();
