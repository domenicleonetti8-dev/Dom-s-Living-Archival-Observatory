const DOMLiveGlobeRenderer=(()=>{
  'use strict';
  let host=null,svg=null,events=[],sensors=[],resizeObserver=null,expiryTimer=null,lastError=null;
  const NS='http://www.w3.org/2000/svg';
  const stoppedStatus=s=>/cancel|ended|expired|inactive|closed|resolved|cleared/i.test(String(s||''));
  const staleStatus=s=>/stale|unknown|unavailable|source[-_ ]?stale/i.test(String(s||''));
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const reducedMotion=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function valid(lat,lon){return finite(lat)&&finite(lon)&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180}
  function statusOf(item){return String(item&&((item.observationStatus||item.status||item.state||item.sourceStatus))||'')}
  function isLive(item,now=Date.now()){if(!item||stoppedStatus(statusOf(item)))return false;const exp=item.expiresAt?new Date(item.expiresAt).getTime():NaN;return !(Number.isFinite(exp)&&exp<=now)}
  function profile(item,type,now=Date.now()){
    if(type==='sensor'&&item.infrastructure)return{id:'registered',severity:'registered',animate:false,color:'#39c6ff',alpha:.58,scale:.86,halo:.7};
    if(!isLive(item,now))return{id:'off',severity:'off',animate:false,color:'#4b545c',alpha:.18,scale:1,halo:0};
    if(item.stale===true||staleStatus(statusOf(item))||staleStatus(item.sourceStatus))return{id:'unknown',severity:'unknown',animate:false,color:'#6f8494',alpha:.34,scale:1,halo:.65};
    const activation=item.activation&&typeof item.activation==='object'?item.activation:null;
    const aid=String((activation&&activation.id)||item.band?.id||'').toLowerCase(),level=String(item.level||'').toLowerCase(),animateAllowed=!reducedMotion();
    if((item.officialAlert&&/extreme|severe/i.test(String(item.severityText||'')))||level==='extreme'||aid==='critical')return{id:'high',severity:'critical',animate:animateAllowed,color:'#ff2b2b',alpha:.98,scale:1.34,halo:4};
    if(level==='high'||aid==='heavy')return{id:'high',severity:'heavy',animate:animateAllowed,color:'#ff7a1a',alpha:.95,scale:1.26,halo:3.3};
    if(level==='watch'||aid==='elevated')return{id:'medium',severity:'elevated',animate:animateAllowed,color:'#ffd43b',alpha:.90,scale:1.16,halo:2.5};
    if(level==='info'||aid==='active')return{id:'low',severity:'active',animate:false,color:'#34d17b',alpha:.82,scale:1.08,halo:1.7};
    return{id:'steady',severity:'watching',animate:false,color:'#39c6ff',alpha:.70,scale:1,halo:1.2};
  }
  function clean(rows,max){return(rows||[]).filter(r=>r&&valid(r.lat,r.lon)).slice(0,max)}
  function el(name,attrs={}){const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n}
  function project(lat,lon,w,h){return{x:(Number(lon)+180)/360*w,y:(90-Number(lat))/180*h}}
  function text(x,y,value,size=11,opacity=.65,anchor='start'){const n=el('text',{x,y,fill:'#b8eaf3','font-size':size,'font-family':'system-ui, -apple-system, sans-serif','font-weight':'600',opacity,'text-anchor':anchor});n.textContent=value;return n}
  function drawGrid(layer,w,h){
    const bg=el('rect',{x:0,y:0,width:w,height:h,fill:'#010813'});layer.appendChild(bg);
    for(let lon=-150;lon<=150;lon+=30){const x=(lon+180)/360*w;layer.appendChild(el('line',{x1:x,y1:0,x2:x,y2:h,stroke:'#163643','stroke-width':1,opacity:.45}))}
    for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*h;layer.appendChild(el('line',{x1:0,y1:y,x2:w,y2:y,stroke:'#163643','stroke-width':1,opacity:.45}))}
    const eq=(90/180)*h;layer.appendChild(el('line',{x1:0,y1:eq,x2:w,y2:eq,stroke:'#245364','stroke-width':1.2,opacity:.65}));
    layer.appendChild(text(10,20,'AUTHORITATIVE SOURCE COORDINATES · GLOBAL EQUIRECTANGULAR FIELD',10,.68));
    layer.appendChild(text(10,h-10,'No synthetic placement · tap a marker for source details',10,.52));
  }
  function makePoint(item,type,index,w,h){
    const p=profile(item,type),pos=project(item.lat,item.lon,w,h),g=el('g',{'data-dom-point':'1',tabindex:'0',role:'button'}),base=type==='event'?5.8:3.6,r=base*p.scale;
    if(p.animate){const halo=el('circle',{cx:pos.x,cy:pos.y,r:r+6,fill:'none',stroke:p.color,'stroke-width':2,opacity:.35});halo.innerHTML='<animate attributeName="r" values="8;15;8" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".4;.05;.4" dur="1.8s" repeatCount="indefinite"/>';g.appendChild(halo)}
    const c=el('circle',{cx:pos.x,cy:pos.y,r,fill:p.color,opacity:p.alpha,stroke:'#06131b','stroke-width':1});g.appendChild(c);
    const title=String(item.title||item.kind||item.sensorId||item.id||type),source=String(item.agency||item.source||item.network||'Source unavailable'),label=type==='sensor'&&item.infrastructure?'Registered observing station':'Hazard observation';
    const show=()=>showTooltip(pos.x,pos.y,`${title} · ${label} · ${source} · ${Number(item.lat).toFixed(3)}, ${Number(item.lon).toFixed(3)} · ${p.severity}`);
    g.addEventListener('click',show);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}});return g;
  }
  function showTooltip(x,y,value){if(!svg)return;svg.querySelectorAll('[data-dom-tooltip]').forEach(n=>n.remove());const w=Number(svg.getAttribute('viewBox').split(' ')[2])||800,h=Number(svg.getAttribute('viewBox').split(' ')[3])||500,max=320,tx=Math.max(8,Math.min(w-max-8,x+10)),ty=Math.max(28,Math.min(h-48,y-12)),g=el('g',{'data-dom-tooltip':'1'});g.appendChild(el('rect',{x:tx,y:ty-22,width:max,height:40,rx:8,fill:'#051821',stroke:'#4bdff0','stroke-width':1,opacity:.96}));const t=text(tx+9,ty,value.length>52?`${value.slice(0,49)}…`:value,10,.94);g.appendChild(t);svg.appendChild(g)}
  function render(){
    host=document.getElementById('map');if(!host)return false;const rect=host.getBoundingClientRect(),w=Math.max(320,Math.round(rect.width||800)),h=Math.max(300,Math.round(rect.height||500));host.replaceChildren();svg=el('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%',height:'100%',preserveAspectRatio:'none','aria-label':'Live global hazard field'});svg.style.display='block';svg.style.touchAction='manipulation';const layer=el('g');drawGrid(layer,w,h);svg.appendChild(layer);
    const seen=new Set(),rows=[];for(const[type,list]of[['sensor',sensors],['event',events]])for(let i=0;i<list.length;i++){const item=list[i],k=`${type}|${String(item.agency||item.source||item.network||'')}|${Number(item.lon).toFixed(5)}|${Number(item.lat).toFixed(5)}`;if(seen.has(k))continue;seen.add(k);rows.push({type,item,index:i})}
    for(const r of rows)svg.appendChild(makePoint(r.item,r.type,r.index,w,h));host.appendChild(svg);const infra=sensors.filter(x=>x&&x.infrastructure).length,other=Math.max(0,sensors.length-infra);setStatus(`${infra.toLocaleString()} registered stations · ${events.length.toLocaleString()} active hazard observations${other?` · ${other.toLocaleString()} runtime sensors`:''}`);return true;
  }
  function setStatus(value){if(!host)return;let n=document.getElementById('domGeoTruth');if(!n){n=document.createElement('div');n.id='domGeoTruth';n.style.cssText='position:absolute;left:10px;top:10px;z-index:8;padding:6px 9px;border-radius:9px;background:rgba(2,14,22,.88);border:1px solid rgba(105,231,255,.24);font:600 11px system-ui;color:#d7f8ff;pointer-events:none;max-width:78%;';host.appendChild(n)}n.textContent=value}
  function mount(){host=document.getElementById('map');if(!host)return Promise.resolve(false);if(!resizeObserver&&typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(()=>render());resizeObserver.observe(host)}try{return Promise.resolve(render())}catch(e){lastError=String(e?.message||e);host.replaceChildren();setStatus(`Global hazard field unavailable: ${lastError}`);return Promise.resolve(false)}}
  function refresh(){try{render()}catch(e){lastError=String(e?.message||e)}}
  function scheduleExpiry(){if(expiryTimer)clearTimeout(expiryTimer);const now=Date.now(),times=[...events,...sensors].map(x=>x?.expiresAt?new Date(x.expiresAt).getTime():NaN).filter(t=>Number.isFinite(t)&&t>now).sort((a,b)=>a-b);if(times.length)expiryTimer=setTimeout(()=>{expiryTimer=null;events=clean(events.filter(isLive),1200);sensors=clean(sensors.filter(x=>x.infrastructure||isLive(x)),15000);refresh();scheduleExpiry()},Math.max(100,times[0]-now+25))}
  function setEvents(rows=[]){events=clean(rows,1200);mount().then(refresh);scheduleExpiry()}
  function setSensors(rows=[]){sensors=clean(rows,15000);mount().then(refresh);scheduleExpiry()}
  function resetView(){refresh()}
  window.addEventListener('dom:hazard-refresh',ev=>setEvents(ev.detail?.events||[]));window.addEventListener('dom:organism-state',ev=>setSensors(ev.detail?.sensors||[]));window.addEventListener('pagehide',()=>{if(expiryTimer)clearTimeout(expiryTimer);if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});else mount();
  return{mount,setEvents,setSensors,resetView,isLive,profile,state:()=>({eventCount:events.length,sensorCount:sensors.length,registeredStationCount:sensors.filter(x=>x&&x.infrastructure).length,renderer:'dependency-free-svg-equirectangular',imagery:'none-coordinate-grid',severityPulse:true,lastError})};
})();