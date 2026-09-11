const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
function assert(ok,msg){if(!ok){console.error('FAIL',msg);process.exitCode=1}else console.log('PASS',msg)}
const index=read('index.html');
const hazards=read('hazards.html');
const earth=read('earth.html');
const js=read('earth.js');
const audit=read('earth-source-audit.js');
assert(index.includes('href="./hazards.html"')&&index.includes('href="./earth.html"'),'home exposes distinct hazard and Earth routes');
assert(!index.includes('href="./hazards.html#apple-ar"'),'Apple Earth no longer aliases hazard page');
assert(hazards.includes('href="./earth.html"')&&hazards.includes('OPEN GEOGRAPHIC EARTH'),'hazard dashboard routes Apple Earth outward');
assert(earth.includes('id="earthMap"')&&earth.includes('Google Maps overlay'),'Earth page exposes geographic map and optional Google provider path');
assert(js.includes("style:'https://demotiles.maplibre.org/globe.json'")&&js.includes("map.setProjection({type:'globe'})"),'renderer uses geographic globe projection');
assert(js.includes('validLatLon')&&js.includes("coordinates:[r.lon,r.lat]"),'observations are surface-anchored from validated longitude/latitude');
assert(js.includes('earthquake.usgs.gov')&&js.includes('eonet.gsfc.nasa.gov')&&js.includes('ndbc.noaa.gov')&&js.includes('tidesandcurrents.noaa.gov')&&js.includes('api.weather.gov'),'multi-source live fabric is wired');
assert(js.includes("'dom-event-areas'")&&js.includes("'dom-event-area-fill'")&&js.includes("'dom-event-area-line'"),'Earth renderer has dedicated authoritative polygon geometry layers');
assert(js.includes("['Polygon','MultiPolygon']")&&js.includes("placement:'source-geometry'"),'polygon/multipolygon source geometry is preserved rather than collapsed to a fake exact point');
assert(js.includes('authoritative polygons')&&js.includes('without geometry'),'NWS Earth status distinguishes rendered source polygons from unlocated alerts');
assert(js.includes("getJSON(`${root}/v1/sources`")&&js.includes("x.status==='stale'")&&js.includes("x.status==='error'"),'Earth broker panel consumes active/stale/error source health');
assert(!/Math\.random\s*\(/.test(js),'Earth renderer does not randomly scatter sensor positions');
assert(audit.includes("DIRECT_BROWSER=new Set(['usgs-eq','nasa-eonet','nws-alerts'])"),'source audit limits direct-browser measurement claims to feeds actually fetched');
assert(audit.includes("INVENTORY_ONLY=new Set(['ndbc-stdmet','ndbc-ocean','ndbc-waterlevel'])"),'NDBC measurement families are explicitly marked inventory-only on the Earth audit');
assert(audit.includes("label:'LIVE'")&&audit.includes("label:'STALE'")&&audit.includes("label:'FAILED'")&&audit.includes('/v1/sources'),'source audit exposes broker live/stale/failed states when configured');
assert(audit.includes('LIVE/STALE/FAILED come from the configured broker'),'source audit explains runtime truth semantics');
if(process.exitCode)process.exit(process.exitCode);