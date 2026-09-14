const fs=require('fs');
const assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');

const hazards=read('hazards.html');
const geo=read('dom-hazard-geophysical-adapter.js');
const recon=read('dom-hazard-render-reconciler.js');
const fire=read('dom-wildfire-symbol-layer.js');
const quake=read('dom-earthquake-visual-restoration.js');
const dash=read('dom-observatory-dashboard-shell.js');
const fusion=read('dom-earthquake-tsunami-atmospheric-fusion.js');
const seismic=read('dom-global-seismic-heartbeat.js');

assert(hazards.includes('USGS all magnitudes · past 24h · source epicenters'),'public earthquake card must state all-magnitude source semantics');
assert(hazards.includes('waveform availability, not measured shaking amplitude'),'station presence/waveform availability must not masquerade as measured shaking');

assert(/all_day\.geojson/.test(geo),'earthquake adapter must ingest the USGS all-earthquakes daily feed');
assert(!/magnitudeStatus[^\n]*0\.0/.test(geo),'unresolved earthquake magnitude must never be serialized as fake 0.0');
assert(/sourceGeometry/.test(geo),'earthquake records must preserve source geometry');

assert(recon.includes('BOUND_TO_SOURCE_POINT_GEOMETRY'),'render reconciliation must repair display coordinates back to source Point geometry');
assert(recon.includes('TITLE_REGION_CONFLICT_US_STATE_OUTSIDE_US'),'obvious title/region coordinate conflicts must quarantine instead of render');
assert(recon.includes("geometryIntegrity='QUARANTINED'"),'quarantined events must carry explicit integrity state');

assert(fire.includes("basis:'exact upstream Point geometry'"),'wildfire markers must prefer exact upstream Point geometry');
assert(fire.includes("'icon-allow-overlap':false"),'global wildfire flames must collision-manage rather than blindly overlap');
assert(fire.includes('dom-wildfire-origin-dot'),'wildfire layer must preserve an exact origin point');
assert(fire.includes('dom-hazard-wildfire-flame')&&fire.includes("visibility','none"),'wildfire layer must suppress legacy duplicate fire visuals');

assert(quake.includes("PINK='#ff4fa3'"),'earthquake origin and wave system must remain pink');
assert(quake.includes('dom-eira-quake-origin'),'earthquake layer must expose a dedicated source-origin dot');
assert(quake.includes('dom-eira-quake-wave-0')&&quake.includes('dom-eira-quake-wave-2'),'earthquake layer must preserve the current expanding wave set');
assert(quake.includes('hideLegacy()'),'authoritative earthquake layer must suppress duplicate legacy rings');

assert(dash.includes("['Earthquakes',['dom-eira-quake-origin'"),'dashboard earthquake filter must control current authoritative quake layers');
assert(dash.includes("['Wildfires',['dom-wildfire-origin-dot'"),'dashboard wildfire filter must control current wildfire layers');
assert(!dash.includes("['Wildfires',['dom-hazard-wildfire-flame'"),'dashboard must not make a legacy wildfire layer authoritative again');

assert(fusion.includes('USGS tsunami flag'),'fusion must preserve the source-qualified USGS tsunami-screening semantics');
assert(fusion.includes('not an issued tsunami product')||fusion.includes('not a tsunami product'),'USGS tsunami flag must not be presented as an issued tsunami product');
assert(/0\.18/.test(fusion)&&/0\.40/.test(fusion),'atmospheric association must retain a physically bounded apparent propagation-speed gate');

assert(seismic.includes('presence')||seismic.includes('instrument'),'seismic heartbeat must distinguish station/instrument presence');
assert(seismic.includes('waveform'),'seismic heartbeat must distinguish waveform availability from station presence');
assert(!/measured shaking amplitude[^\n]*=/.test(seismic),'seismic heartbeat must not synthesize measured shaking amplitude');

for(const f of ['dom-hazard-geophysical-adapter.js','dom-hazard-render-reconciler.js','dom-wildfire-symbol-layer.js','dom-earthquake-visual-restoration.js','dom-observatory-dashboard-shell.js','dom-earthquake-tsunami-atmospheric-fusion.js','dom-global-seismic-heartbeat.js']){
  const s=read(f);
  assert(!/Math\.random\(\)/.test(s),`${f} must not randomly relocate or synthesize hazard positions`);
}

console.log('D.O.M. hazard truth invariants PASS');
