(()=>{
  'use strict';
  const DEFINITIONS=[
    ['Project Gutenberg','archive','INLINE API','gutendex.com','CATALOG METADATA','Browser books/catalog API connector; runtime state is measured per request. Full text remains at the source.'],
    ['Library of Congress','archive','INLINE API','www.loc.gov','CATALOG METADATA','Browser JSON catalog/search connector; runtime state is measured per request.'],
    ['Internet Archive','archive','INLINE API','archive.org','SEARCH METADATA','Browser Advanced Search connector; returned search metadata is not a claim that every underlying file is mirrored by D.O.M.'],
    ['Biodiversity Heritage Library','archive','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['DOAB','research','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['U.S. National Archives','government','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External Catalog search link; no inline API connector in this build.'],
    ['GovInfo','government','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External GovInfo search link; no inline API connector in this build.'],
    ['FOIA.gov','government','INDIRECT SEARCH LINK',null,'INDIRECT DISCOVERY','The current launcher uses an external web search scoped to foia.gov; it is not a FOIA.gov API connector.'],
    ['Data.gov','science','INLINE API','catalog.data.gov','CATALOG METADATA','Browser CKAN catalog API connector; dataset metadata is returned, not the complete contents of every dataset.'],
    ['Google Patents','research','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External search link; no inline patents API connector in this build.'],
    ['Crossref','research','INLINE API','api.crossref.org','METADATA ONLY','Browser DOI/publication metadata API connector; runtime state is measured per request.'],
    ['OpenAlex','research','INLINE API','api.openalex.org','METADATA ONLY','Browser scholarly metadata API connector; runtime state is measured per request.'],
    ['PubMed','research','INLINE API','eutils.ncbi.nlm.nih.gov','INDEX METADATA','NCBI E-utilities search/summary connector; runtime state is measured per request.'],
    ['arXiv','research','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['WorldCat','archive','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['Europeana','archive','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['DPLA','archive','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['Smithsonian','archive','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['Trove / NLA','archive','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['Zenodo','research','INLINE API','zenodo.org','RECORD METADATA','Browser records API connector; metadata and source links are returned. D.O.M. does not mirror the deposited files.'],
    ['CORE','research','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['ClinicalTrials.gov','research','INLINE API','clinicaltrials.gov','REGISTRY RECORDS','Browser API v2 connector for registered study records; runtime state is measured per request.'],
    ['PubChem','science','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['NASA Earthdata','science','INLINE API','cmr.earthdata.nasa.gov','COLLECTION METADATA','NASA CMR collection metadata connector; this does not imply direct access to every underlying granule or imagery product.'],
    ['USGS ScienceBase','science','DIRECT SEARCH ONLY',null,'SOURCE PORTAL','External source search link; no inline API connector in this build.'],
    ['DataCite','research','INLINE API','api.datacite.org','METADATA ONLY','Browser DOI metadata API connector; runtime state is measured per request.'],
    ['Europe PMC','research','INLINE API','www.ebi.ac.uk','INDEX METADATA','Europe PMC search metadata connector; runtime state is measured per request.']
  ].map(([name,cat,mode,host,contentClass,note])=>({name,cat,mode,host,contentClass,note,state:mode==='INLINE API'?'NOT TESTED THIS SESSION':mode,httpStatus:null,requestedAt:null,respondedAt:null,responseMs:null,error:null}));
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byHost=new Map(DEFINITIONS.filter(x=>x.host).map(x=>[x.host,x]));
  const originalFetch=window.fetch.bind(window);
  function stateClass(s){return /RESPONDED/.test(s)?'ok':/RATE LIMITED|ACCESS RESTRICTED|SOURCE ERROR|UNAVAILABLE|FAILED/.test(s)?'fail':/REQUESTING/.test(s)?'loading':''}
  function classifyHttp(response){if(response.ok)return'RESPONDED';if(response.status===429)return'RATE LIMITED';if(response.status===401||response.status===403)return'ACCESS RESTRICTED';if(response.status>=500)return'SOURCE ERROR';return'UNAVAILABLE'}
  function render(){
    const box=document.querySelector('#sources');if(!box)return;
    box.innerHTML=DEFINITIONS.map(x=>`<article><small>${esc(x.cat.toUpperCase())} · ${esc(x.mode)} · ${esc(x.contentClass)}</small><h3>${esc(x.name)}</h3><p>${esc(x.note)}</p><strong class="${stateClass(x.state)}">${esc(x.state)}${x.httpStatus?` · HTTP ${esc(x.httpStatus)}`:''}</strong>${x.requestedAt?`<small>browser requestedAt ${esc(x.requestedAt)}</small>`:''}${x.respondedAt?`<small>browser respondedAt ${esc(x.respondedAt)}${x.responseMs!=null?` · ${esc(x.responseMs)} ms`:''}</small>`:''}${x.respondedAt?'<small>Connector response time is not the publication, observation, or update time of returned records.</small>':''}${x.error?`<small>${esc(x.error)}</small>`:''}</article>`).join('');
  }
  function sourceForUrl(input){try{const u=new URL(typeof input==='string'?input:input?.url,location.href);return byHost.get(u.hostname)||null}catch(_){return null}}
  window.fetch=async function(input,init){const src=sourceForUrl(input);if(!src)return originalFetch(input,init);src.state='REQUESTING';src.httpStatus=null;src.error=null;src.responseMs=null;src.requestedAt=new Date().toISOString();src.respondedAt=null;const started=performance.now();render();try{const response=await originalFetch(input,init);src.responseMs=Math.max(0,Math.round(performance.now()-started));src.respondedAt=new Date().toISOString();src.httpStatus=response.status;src.state=classifyHttp(response);if(!response.ok)src.error=`HTTP ${response.status} ${response.statusText||''}`.trim();render();return response}catch(err){src.responseMs=Math.max(0,Math.round(performance.now()-started));src.respondedAt=new Date().toISOString();src.state='UNAVAILABLE';src.error=String(err?.message||err||'request failed');render();throw err}}
  function truthifySearchCopy(){
    const intent=document.querySelector('#intent');if(intent){const current=intent.textContent,next=current.replace(/live connectors/gi,'inline API connectors').replace(/federated research network/gi,'configured inline API connectors');if(next!==current)intent.textContent=next}
    const results=document.querySelector('#results');if(results){for(const p of results.querySelectorAll('.eyebrow'))if(/RANKED LIVE RESULTS/i.test(p.textContent))p.textContent='RANKED INLINE API RESULTS';for(const p of results.querySelectorAll('p'))if(/Direct authoritative searches remain available/i.test(p.textContent))p.textContent='External source-search launchers remain available below. A launcher is not counted as an inline API connector.'}
  }
  function truthifyObservatoryLinks(){const box=document.querySelector('#obs');if(!box)return;for(const a of box.querySelectorAll('a')){const small=a.querySelector('small');if(small&&small.textContent!=='OFFICIAL PORTAL')small.textContent='OFFICIAL PORTAL';const span=a.querySelector('span');if(span&&span.textContent!=='Open official portal →')span.textContent='Open official portal →'}}
  function installObservers(){const intent=document.querySelector('#intent'),results=document.querySelector('#results');if(intent)new MutationObserver(truthifySearchCopy).observe(intent,{subtree:true,childList:true,characterData:true});if(results)new MutationObserver(truthifySearchCopy).observe(results,{subtree:true,childList:true});}
  function boot(){render();truthifySearchCopy();truthifyObservatoryLinks();installObservers()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.DOMSearchSourceAudit=Object.freeze({definitions:()=>DEFINITIONS.map(x=>({...x})),render,classifyHttp});
})();
