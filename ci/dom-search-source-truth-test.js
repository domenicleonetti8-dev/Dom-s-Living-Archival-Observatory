const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
function assert(ok,msg){if(!ok){console.error('FAIL',msg);process.exitCode=1}else console.log('PASS',msg)}
const home=read('index.html');
const app=read('app.js');
const audit=read('dom-search-source-audit.js');
assert(home.includes('dom-search-source-audit.js'),'homepage loads search connector truth audit');
assert(home.indexOf('app.js?v=4')<home.indexOf('dom-search-source-audit.js'),'search truth audit loads after search application runtime');
assert(home.includes('INLINE API means this browser has executable API code')&&home.includes('DIRECT SEARCH ONLY'),'homepage explains API-vs-launcher distinction');
assert(audit.includes("'INLINE API'")&&audit.includes("'DIRECT SEARCH ONLY'")&&audit.includes("'INDIRECT SEARCH LINK'"),'source audit exposes distinct connector modes');
assert(audit.includes("['FOIA.gov','government','INDIRECT SEARCH LINK'")&&audit.includes('not a FOIA.gov API connector'),'FOIA launcher is not mislabeled as a direct API connection');
for(const host of ['gutendex.com','www.loc.gov','archive.org','api.crossref.org','api.openalex.org','eutils.ncbi.nlm.nih.gov','catalog.data.gov','clinicaltrials.gov','cmr.earthdata.nasa.gov','zenodo.org','api.datacite.org','www.ebi.ac.uk'])assert(audit.includes(host),`runtime connector audit maps ${host}`);
assert(audit.includes("src.state='REQUESTING'")&&audit.includes('classifyHttp(response)')&&audit.includes("src.state='UNAVAILABLE'"),'browser request state is measured rather than assumed');
assert(audit.includes("response.status===429")&&audit.includes("return'RATE LIMITED'")&&audit.includes("return'ACCESS RESTRICTED'")&&audit.includes("return'SOURCE ERROR'"),'runtime audit distinguishes rate limits, access restrictions and server errors');
assert(audit.includes('responseMs')&&audit.includes('performance.now()'),'runtime audit records browser response latency without treating latency as source freshness');
assert(audit.includes("'METADATA ONLY'")&&audit.includes("'CATALOG METADATA'")&&audit.includes("'INDEX METADATA'")&&audit.includes("'REGISTRY RECORDS'")&&audit.includes("'COLLECTION METADATA'"),'source cards distinguish metadata/search/registry content from underlying full content');
assert(audit.includes('NOT TESTED THIS SESSION'),'inline connectors are not called live before a request succeeds');
assert(audit.includes("p.textContent='RANKED INLINE API RESULTS'")&&audit.includes("replace(/live connectors/gi,'inline API connectors')"),'search result copy is corrected from live claims to inline API response claims');
assert(audit.includes("small.textContent='OFFICIAL PORTAL'")&&!audit.includes("small.textContent='LIVE SOURCE'"),'static observatory links are labeled as portals rather than live feeds');
assert(app.includes('Promise.allSettled(active.map(a=>a.run(q)))'),'search engine continues isolating connector failures');
if(process.exitCode)process.exit(process.exitCode);