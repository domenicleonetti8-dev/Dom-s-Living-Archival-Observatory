const fs=require('fs');const vm=require('vm');
function read(p){return fs.readFileSync(p,'utf8')}
function assert(ok,msg){if(!ok){console.error('FAIL',msg);process.exitCode=1}else console.log('PASS',msg)}
const html=read('earth.html'),earth=read('earth.js'),ui=read('earth-ar-prediction-ui.js'),pred=read('dom-statistical-prediction.js'),geo=read('dom-earth-geodesy.js');
for(const id of ['resetEarth','earthImagery','surfaceMode','locateMe','googleOverlay','checkAR','exportAR','runPrediction'])assert(html.includes(`id="${id}"`),`Earth exposes ${id} control`);
for(const id of ['resetEarth','earthImagery','surfaceMode','locateMe','googleOverlay'])assert(earth.includes(`'#${id}'`)||earth.includes(`"#${id}"`),`${id} is connected in Earth runtime`);
for(const id of ['checkAR','exportAR','runPrediction'])assert(ui.includes(`bind('${id}'`),`${id} is connected in AR/prediction runtime`);
assert(earth.includes('BlueMarble_ShadedRelief_Bathymetry')&&earth.includes('gibs.earthdata.nasa.gov'),'Earth physical imagery uses NASA GIBS Blue Marble rather than invented texture');
assert(earth.includes("type:'raster'")&&earth.includes("'dom-earth-imagery-layer'"),'NASA Earth imagery is installed as a real map raster layer');
assert(html.includes('not a claim of live satellite photography'),'UI distinguishes physical Earth baseline imagery from live satellite evidence');
assert(html.indexOf('dom-earth-geodesy.js')<html.indexOf('earth-ar-prediction-ui.js'),'geodesy loads before AR bridge');
assert(ui.includes("schema:'dom.ar.scene.v2'")&&ui.includes('latitude:lat')&&ui.includes('longitude:lon'),'AR packet uses canonical source-backed geographic coordinates');
assert(ui.includes('ecef_m')&&ui.includes('ar_position_m')&&ui.includes('measurements:measurementsOf(r)'),'AR packet carries WGS84 placement and measurement metadata');
assert(ui.includes('/v1/observations'),'AR and prediction paths consume canonical broker observations');
const sandbox={window:{},console};vm.runInNewContext(pred,sandbox);const P=sandbox.window.DOMStatisticalPrediction;
assert(P&&typeof P.linearRegression==='function','statistical engine loads');
const fit=P.linearRegression([{x:0,y:1},{x:1,y:3},{x:2,y:5},{x:3,y:7}]);
assert(fit&&Math.abs(fit.slope-2)<1e-9&&fit.r2>0.999999,'linear regression recovers deterministic trend');
const fc=P.forecastLinear([{x:0,y:1},{x:1,y:3},{x:2,y:5},{x:3,y:7}],4,.95);
assert(fc&&Math.abs(fc.estimate-9)<1e-9&&fc.low<=fc.estimate&&fc.high>=fc.estimate&&fc.predictionSE>=0,'forecast emits estimate and prediction interval');
assert(P.readiness([{time:1,value:1}],8).ready===false,'prediction refuses insufficient evidence');
assert(P.readiness(Array.from({length:8},(_,i)=>({time:i,value:1})),8).ready===false,'prediction refuses constant series');
assert(P.poissonRate(25,5).rate===5,'Poisson event-rate math is available');
const gs={window:{},console};vm.runInNewContext(geo,gs);const G=gs.window.DOMEarthGeodesy;
assert(G&&G.earthShell.datum==='WGS84','WGS84 Earth shell contract loads');
const equator=G.geodeticToECEF(0,0,0);assert(Math.abs(equator.x-6378137)<1e-6&&Math.abs(equator.y)<1e-6&&Math.abs(equator.z)<1e-6,'equator maps to WGS84 semi-major axis');
const pole=G.geodeticToECEF(90,0,0);assert(Math.abs(pole.z-6356752.314245179)<1e-5,'pole maps to WGS84 semi-minor axis');
if(process.exitCode)process.exit(process.exitCode);
