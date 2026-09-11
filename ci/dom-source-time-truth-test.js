const fs=require('fs'),vm=require('vm');
function read(p){return fs.readFileSync(p,'utf8')}
function assert(ok,msg){if(!ok){console.error('FAIL',msg);process.exitCode=1}else console.log('PASS',msg)}
const src=read('dom-source-time.js'),xo=read('extreme-events.js'),earth=read('earth-freshness-ui.js'),search=read('dom-search-source-audit.js'),earthHtml=read('earth.html'),xoHtml=read('extreme-events.html');
const sandbox={window:{},console,Date};vm.runInNewContext(src,sandbox);const T=sandbox.window.DOMSourceTime;
assert(T&&typeof T.classify==='function'&&typeof T.canonical==='function','canonical source-time runtime loads');
const now=Date.parse('2026-09-11T22:00:00Z');
let x=T.classify({observedAt:'2026-09-11T21:00:00Z',fetchedAt:'2026-09-11T21:59:59Z'},{now,kind:'observation',staleAfterSeconds:7200});
assert(x.state==='CURRENT'&&x.referenceField==='observedAt'&&Math.round(x.ageSeconds)===3600,'observation freshness uses observedAt rather than fetchedAt');
x=T.classify({observedAt:'2026-09-10T21:00:00Z',fetchedAt:'2026-09-11T21:59:59Z'},{now,kind:'observation',staleAfterSeconds:7200});
assert(x.state==='STALE','recent browser fetch cannot make an old observation current');
x=T.classify({validAt:'2026-09-12T03:00:00Z',fetchedAt:'2026-09-11T22:00:00Z'},{now,kind:'model',staleAfterSeconds:21600});
assert(x.state==='FUTURE VALID'&&x.referenceField==='validAt','forecast/model validity uses validAt and preserves future-valid state');
x=T.classify({publishedAt:'2026-09-11T21:30:00Z',expiresAt:'2026-09-11T21:45:00Z'},{now,kind:'publication',staleAfterSeconds:86400});
assert(x.state==='EXPIRED','expiresAt overrides apparent recency');
assert(xo.includes('observedAt:null,publishedAt:p.sent')&&xo.includes('validAt:p.effective||p.onset')&&xo.includes('expiresAt:p.expires'),'NWS alert times are separated into published/valid/expires semantics');
assert(xo.includes('fetch time never substitutes for event/valid time')&&xo.includes("schema:'dom.ar.extreme-events.v2'"),'extreme-events UI and AR packet preserve temporal truth boundary');
assert(earth.includes('Station inventory points without observation times remain age UNKNOWN')&&earth.includes('Browser fetch time never makes an old event current'),'Earth freshness audit keeps inventory age unknown and fetch time separate');
assert(earthHtml.includes('SOURCE TIME + FRESHNESS')&&earthHtml.includes('dom-source-time.js')&&earthHtml.includes('earth-freshness-ui.js'),'Earth page exposes canonical source-time audit');
assert(xoHtml.includes('observedAt is the source observation/event time')&&xoHtml.includes('fetchedAt is only when this browser retrieved the source'),'Extreme Events page explains temporal field meanings');
assert(search.includes('requestedAt')&&search.includes('respondedAt')&&search.includes('Connector response time is not the publication, observation, or update time'),'search connector timing is explicitly separated from record freshness');
if(process.exitCode)process.exit(process.exitCode);
