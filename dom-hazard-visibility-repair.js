(()=>{'use strict';
let map=null,rows=[];
const valid=e=>e&&Number.isFinite(+e.lat)&&Number.isFinite(+e.lon)&&+e.lat>=-90&&+e.lat<=90&&+e.lon>=-180&&+e.lon<=180;
function kind(e={}){const s=`${e.kind||''} ${e.category||''} ${e.type||''} ${e.title||''}`.toLowerCase();if(/thermal anomaly|thermal detection|hotspot|active[- ]fire/.test(s)&&!/confirmed wildfire|wildfire incident/.test(s))return'thermal-anomaly';if(/earthquake|seismic|\bquake\b/.test(s))return'earthquake';if(/tornado|waterspout/.test(s))return'tornado';if(/hurricane|typhoon|tropical cyclone|tropical storm|cyclone/.test(s))return'storm';if(/flood/.test(s))return'flood';if(/volcan|eruption/.test(s))return'volcano';if(/wildfire|forest fire|bushfire/.test(s))return'wildfire';return null}
function feature(e,i){const k=kind(e);return{type:'Feature',id:`truth-repair-${i}`,geometry:{type:'Point',coordinates:[+e.lon,+e.lat]},properties:{hazardKind:k,title:String(e.title||e.kind||k),source:String(e.source||e.agency||''),mag:Number.isFinite(+e.mag)?+e.mag:Number.isFinite(+e.magnitude)?+e.magnitude:-1}}}
function data(){const seen=new Set(),features=[];for(const e of rows){if(!valid(e))continue;const k=kind(e);if(!k)continue;const id=String(e.id||`${k}|${(+e.lat).toFixed(4)}|${(+e.lon).toFixed(4)}|${e.observedAt||e.time||''}`);if(seen.has(id))continue;seen.add(id);features.push(feature(e,features.length))}return{type:'FeatureCollection',features}}
function render(){if(!map||!map.loaded?.())return;const d=data();try{if(!map.getSource('dom-hazard-truth-repair'))map.addSource('dom-hazard-truth-repair',{type:'geojson',data:d});else map.getSource('dom-hazard-truth-repair').setData(d);
const add=(id,filter,color,radius,stroke)=>{if(map.getLayer(id)){try{map.setLayoutProperty(id,'visibility','visible')}catch(_){}return}map.addLayer({id,type:'circle',source:'dom-hazard-truth-repair',filter:['==',['get','hazardKind'],filter],paint:{'circle-color':color,'circle-radius':radius,'circle-opacity':.92,'circle-stroke-color':stroke||'#ffffff','circle-stroke-width':['interpolate',['linear'],['zoom'],0,.6,6,1.1,11,1.7]}})};
add('dom-truth-repair-earthquake','earthquake','#ff2f92',['interpolate',['linear'],['get','mag'],-1,2.8,0,2.8,3,4,5,6,7,9],'#fff1f8');
add('dom-truth-repair-thermal','thermal-anomaly','#ff8a1f',['interpolate',['linear'],['zoom'],0,1.5,4,2.2,8,4.5,12,7],'#ffd28a');
add('dom-truth-repair-storm','storm','#e8f8ff',['interpolate',['linear'],['zoom'],0,3,5,5,9,9],'#8de8ff');
add('dom-truth-repair-tornado','tornado','#d9e3e8',['interpolate',['linear'],['zoom'],0,2,6,4,10,7],'#ffffff');
add('dom-truth-repair-flood','flood','#28b8ff',['interpolate',['linear'],['zoom'],0,2,5,3.5,10,7],'#a9e9ff');
add('dom-truth-repair-volcano','volcano','#ff4747',['interpolate',['linear'],['zoom'],0,2.2,5,4,10,8],'#ffd0b5');
add('dom-truth-repair-wildfire','wildfire','#ff5a00',['interpolate',['linear'],['zoom'],0,2,5,3.5,10,7],'#ffd36b');
}catch(e){console.warn('D.O.M. additive hazard visibility repair:',e)}}
function ingest(ev){const a=ev?.detail?.events;if(!Array.isArray(a))return;const m=new Map(rows.map(e=>[String(e.id||`${e.kind}|${e.lat}|${e.lon}|${e.observedAt||e.time||''}`),e]));for(const e of a)if(valid(e))m.set(String(e.id||`${e.kind}|${e.lat}|${e.lon}|${e.observedAt||e.time||''}`),e);rows=[...m.values()];render()}
window.addEventListener('dom:hazard-refresh',ingest);window.addEventListener('dom:hazard-extension',ingest);window.addEventListener('dom:map-ready',e=>{if(!e.detail?.map)return;map=e.detail.map;render();try{map.on('styledata',render)}catch(_){}});
window.DOMHazardVisibilityRepair=Object.freeze({state:()=>({records:rows.length,renderable:data().features.length,policy:'additive visibility recovery; source coordinates only; thermal detections remain thermal anomalies'})});
})();