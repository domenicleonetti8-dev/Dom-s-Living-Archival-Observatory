const DOMLiveGlobeRenderer=(()=>{
  'use strict';
  let host=null,map=null,maplibre=null,events=[],sensors=[],expiryTimer=null,loadPromise=null,lastError=null,observer=null,remountQueued=false,pulseTimer=null,pulsePhase=0;
  const OSM_STYLE={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm-basemap',type:'raster',source:'osm',paint:{'raster-opacity':1}}]};
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
    if(!isLive(item,now))return{id:'off',severity:'off',animate:false,color:'#4b545c',alpha:.18,scale:1,halo:0};
    if(item.stale===true||staleStatus(statusOf(item))||staleStatus(item.sourceStatus))return{id:'unknown',severity:'unknown',animate:false,color:'#6f8494',alpha:.34,scale:1,halo:.65};
    const activation=item.activation&&typeof item.activation==='object'?item.activation:null;
    const aid=String((activation&&activation.id)||item.band?.id||'').toLowerCase();
    const level=String(item.level||'').toLowerCase();
    const official=!!item.officialAlert,animateAllowed=!reducedMotion();
    if(official&&/extreme|severe/i.test(String(item.severityText||'')))return{id:'high',severity:'critical',animate:animateAllowed,color:'#ff2b2b',alpha:.98,scale:1.34,halo:4,period:780};
    if(level==='extreme'||aid==='critical')return{id:'high',severity:'critical',animate:animateAllowed,color:'#ff2b2b',alpha:.98,scale:1.34,halo:4,period:780};
    if(level==='high'||aid==='heavy')return{id:'high',severity:'heavy',animate:animateAllowed,color:'#ff7a1a',alpha:.95,scale:1.26,halo:3.3,period:1050};
    if(level==='watch'||aid==='elevated')return{id:'medium',severity:'elevated',animate:animateAllowed,color:'#ffd43b',alpha:.90,scale:1.16,halo:2.5,period:1600};
    if(level==='info'||aid==='active')return{id:'low',severity:'active',animate:false,color:'#34d17b',alpha:.82,scale:1.08,halo:1.7};
    if(aid==='watching'||type==='sensor')return{id:'steady',severity:'watching',animate:false,color:'#39c6ff',alpha:.70,scale:1,halo:1.2};
    return{id:'steady',severity:'watching',animate:false,color:'#59ecff',alpha:.64,scale:1,halo:1.1};
  }
  function clean(rows,max){return(rows||[]).filter(r=>r&&valid(r.lat,r.lon)).slice(0,max)}
  function feature(item,type,index){
    const p=profile(item,type),activation=Number(item.activation&&item.activation.score!=null?item.activation.score:item.activation||0);
    return{type:'Feature',id:`${type}-${String(item.id||item.sensorId||item.sourceId||index)}`,geometry:{type:'Point',coordinates:[Number(item.lon),Number(item.lat)]},properties:{kind:type,color:p.color,state:p.id,severity:p.severity,animate:p.animate?1:0,halo:Number(p.halo||0),alpha:Number(p.alpha||.7),scale:Number(p.scale||1),title:String(item.title||item.kind||item.sensorId||item.id||type),source:String(item.agency||item.source||item.network||''),activation:Number.isFinite(activation)?activation:0,lat:Number(item.lat),lon:Number(item.lon),observedAt:item.observedAt||item.time||null,locationPrecision:item.locationPrecision||'unresolved',country:String(item.country||''),state:String(item.stateName||item.stateProvince||item.state||''),region:String(item.region||item.adminRegion||''),town:String(item.town||item.city||item.locality||'')}};
  }
  function geojson(){return{type:'FeatureCollection',features:[...sensors.map((x,i)=>feature(x,'sensor',i)),...events.map((x,i)=>feature(x,'event',i))]}}
  function ensureCss(){if(document.querySelector('link[data-dom-maplibre-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.css';l.dataset.domMaplibreCss='1';document.head.appendChild(l)}
  function setStatus(text){let el=document.getElementById('domGeoTruth');if(!host)return;if(!el){el=document.createElement('div');el.id='domGeoTruth';el.style.cssText='position:absolute;left:12px;top:10px;z-index:8;padding:7px 10px;border-radius:10px;background:rgba(2,14,22,.84);border:1px solid rgba(105,231,255,.28);font:600 12px system-ui;color:#d7f8ff;pointer-events:none;max-width:82%;';host.appendChild(el)}el.textContent=text}
  async function loadMapLibre(){if(maplibre)return maplibre;if(!loadPromise){ensureCss();loadPromise=import('https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs').then(m=>{maplibre=m;return m})}return loadPromise}
  function mapAttached(){try{const canvas=map&&typeof map.getCanvas==='function'?map.getCanvas():null;return !!(map&&host&&canvas&&host.contains(canvas))}catch(_){return false}}
  function stopPulse(){if(pulseTimer){clearInterval(pulseTimer);pulseTimer=null}}
  function destroyMap(){stopPulse();if(map){try{map.remove()}catch(_){ }map=null}}
  function queueRemount(){if(remountQueued)return;remountQueued=true;queueMicrotask(()=>{remountQueued=false;if(!mapAttached())mount().then(refresh)})}
  function watchHost(){if(observer||!host||typeof MutationObserver==='undefined')return;observer=new MutationObserver(()=>{if(map&&!mapAttached())queueRemount()});observer.observe(host,{childList:true,subtree:false})}
  function applyPulse(){
    if(!mapAttached()||!map.getLayer('dom-live-pulse'))return;
    pulsePhase=(pulsePhase+1)%24;
    const wave=(Math.sin((pulsePhase/24)*Math.PI*2)+1)/2;
    const radius=11+wave*9,opacity=.16+wave*.42;
    try{map.setPaintProperty('dom-live-pulse','circle-radius',['case',['==',['get','animate'],1],['*',['max',1,['get','halo']],radius],0]);map.setPaintProperty('dom-live-pulse','circle-opacity',['case',['==',['get','animate'],1],opacity,0])}catch(_){ }
  }
  function startPulse(){stopPulse();if(reducedMotion())return;pulseTimer=setInterval(applyPulse,120)}
  function addObservationLayers(){
    if(!map||!map.loaded()||!mapAttached())return;
    const data=geojson();
    if(!map.getSource('dom-live-points'))map.addSource('dom-live-points',{type:'geojson',data,cluster:true,clusterRadius:34,clusterMaxZoom:5});else map.getSource('dom-live-points').setData(data);
    if(!map.getLayer('dom-clusters'))map.addLayer({id:'dom-clusters',type:'circle',source:'dom-live-points',filter:['has','point_count'],paint:{'circle-color':'#173f52','circle-radius':['step',['get','point_count'],13,25,17,100,21],'circle-stroke-color':'#b7f6ff','circle-stroke-width':1.2,'circle-opacity':.88}});
    if(!map.getLayer('dom-cluster-count'))map.addLayer({id:'dom-cluster-count',type:'symbol',source:'dom-live-points',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':11},paint:{'text-color':'#effcff','text-halo-color':'#06131b','text-halo-width':1}});
    if(!map.getLayer('dom-live-pulse'))map.addLayer({id:'dom-live-pulse',type:'circle',source:'dom-live-points',filter:['all',['!',['has','point_count']],['==',['get','animate'],1]],paint:{'circle-color':['get','color'],'circle-radius':12,'circle-opacity':.35,'circle-blur':.45,'circle-stroke-width':0}});
    if(!map.getLayer('dom-live-points-layer'))map.addLayer({id:'dom-live-points-layer',type:'circle',source:'dom-live-points',filter:['!',['has','point_count']],paint:{'circle-color':['get','color'],'circle-radius':['*',['case',['==',['get','kind'],'event'],7,5],['get','scale']],'circle-stroke-color':'#06131b','circle-stroke-width':1.4,'circle-opacity':['get','alpha']}});
    startPulse();
    setStatus(`${events.length} live events · ${sensors.length} source-coordinate sensor states · mapped geographic Earth · colors and pulses follow current severity/activation`);
  }
  function locationText(p){return[p.town,p.region,p.state,p.country].map(x=>String(x||'').trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')}
  function popupNode(p){
    const root=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=String(p.title||'Observation');root.appendChild(strong);
    const source=document.createElement('div');source.textContent=String(p.source||'Source unavailable');root.appendChild(source);
    const sev=document.createElement('div');sev.textContent=`Severity: ${String(p.severity||p.state||'watching')}`;root.appendChild(sev);
    const loc=locationText(p);if(loc){const place=document.createElement('div');place.textContent=loc;root.appendChild(place)}
    const coord=document.createElement('small');coord.textContent=`${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)} · ${String(p.locationPrecision||'unresolved')}`;root.appendChild(coord);
    return root;
  }
  function bindClicks(){
    map.on('click','dom-live-points-layer',e=>{const f=e.features&&e.features[0];if(!f)return;new maplibre.Popup({closeButton:true,maxWidth:'300px'}).setLngLat(f.geometry.coordinates).setDOMContent(popupNode(f.properties||{})).addTo(map)});
    map.on('mouseenter','dom-live-points-layer',()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave','dom-live-points-layer',()=>{map.getCanvas().style.cursor=''})
  }
  async function mount(){
    host=document.getElementById('map');if(!host)return false;
    watchHost();
    if(mapAttached())return true;
    if(map)destroyMap();
    host.querySelectorAll('canvas[data-dom-live-globe],.globe-grid,.plot').forEach(n=>n.remove());
    host.style.background='#010813';host.style.overflow='hidden';
    try{
      await loadMapLibre();
      if(mapAttached())return true;
      map=new maplibre.Map({container:host,style:OSM_STYLE,center:[-25,18],zoom:0.55,pitch:0,bearing:0,attributionControl:true,renderWorldCopies:false,antialias:true});
      const canvas=map.getCanvas();if(canvas)canvas.dataset.domGeographicEarth='1';
      map.setProjection({type:'globe'});
      map.addControl(new maplibre.NavigationControl({showCompass:true,showZoom:true}),'bottom-right');
      map.on('load',()=>{addObservationLayers();bindClicks()});
      map.on('error',e=>{lastError=String(e&&e.error&&e.error.message||e&&e.message||'map error');setStatus(`Geographic basemap error: ${lastError}`)});
      return true;
    }catch(e){lastError=String(e&&e.message||e);destroyMap();setStatus('Geographic Earth renderer unavailable — no synthetic placement shown');return false}
  }
  function refresh(){if(mapAttached()&&map.loaded())addObservationLayers();else if(host)queueRemount()}
  function scheduleExpiry(){if(expiryTimer)clearTimeout(expiryTimer);const now=Date.now(),times=[...events,...sensors].map(x=>x&&x.expiresAt?new Date(x.expiresAt).getTime():NaN).filter(t=>Number.isFinite(t)&&t>now).sort((a,b)=>a-b);if(times.length)expiryTimer=setTimeout(()=>{expiryTimer=null;events=clean(events.filter(isLive),1200);sensors=clean(sensors.filter(isLive),15000);refresh();scheduleExpiry()},Math.min(2147483647,Math.max(50,times[0]-now+25)))}
  function setEvents(rows=[]){events=clean(rows,1200);mount().then(refresh);scheduleExpiry()}
  function setSensors(rows=[]){sensors=clean(rows,15000);mount().then(refresh);scheduleExpiry()}
  function resetView(){if(mapAttached())map.easeTo({center:[-25,18],zoom:.55,pitch:0,bearing:0,duration:450})}
  window.addEventListener('dom:hazard-refresh',ev=>setEvents((ev.detail&&ev.detail.events)||[]));
  window.addEventListener('dom:organism-state',ev=>setSensors((ev.detail&&ev.detail.sensors)||[]));
  window.addEventListener('pagehide',()=>{if(expiryTimer)clearTimeout(expiryTimer);if(observer){observer.disconnect();observer=null}destroyMap()},{once:true});
  return{mount,setEvents,setSensors,resetView,isLive,profile,state:()=>({eventCount:events.length,sensorCount:sensors.length,renderer:'maplibre-globe',imagery:'OpenStreetMap geographic basemap',labels:'country/state/region/town from basemap',severityPulse:true,lastError})};
})();
