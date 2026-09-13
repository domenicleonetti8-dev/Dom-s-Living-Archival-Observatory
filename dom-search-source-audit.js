(()=>{
  'use strict';
  const DEFINITIONS=[
    ['Project Gutenberg','archive','INLINE API','gutendex.com','CATALOG METADATA','D.O.M. queries the public books/catalog API from the search bar. Full text remains at the source.'],
    ['Library of Congress','archive','INLINE API','www.loc.gov','CATALOG METADATA','D.O.M. queries the public JSON catalog/search interface from the search bar.'],
    ['Internet Archive','archive','INLINE API','archive.org','SEARCH METADATA','D.O.M. queries Advanced Search metadata from the search bar. Underlying files remain at the source.'],
    ['Biodiversity Heritage Library','archive','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into the authoritative source search. Browser cross-origin rules prevent this static page from ingesting arbitrary result pages directly.'],
    ['DOAB','research','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into the authoritative source search. Browser cross-origin rules prevent this static page from ingesting arbitrary result pages directly.'],
    ['U.S. National Archives','government','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into the authoritative Catalog search. Browser cross-origin rules prevent this static page from ingesting arbitrary result pages directly.'],
    ['GovInfo','government','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into GovInfo search. Browser cross-origin rules prevent this static page from ingesting arbitrary result pages directly.'],
    ['FOIA.gov','government','QUERY HANDOFF',null,'INDIRECT DISCOVERY','Your query is handed to a web search scoped to foia.gov. This is discovery coverage, not a FOIA.gov API claim.'],
    ['Data.gov','science','INLINE API','catalog.data.gov','CATALOG METADATA','D.O.M. queries the public CKAN catalog API from the search bar; dataset metadata is returned, not every dataset payload.'],
    ['Google Patents','research','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into Google Patents search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['Crossref','research','INLINE API','api.crossref.org','METADATA','D.O.M. queries Crossref DOI/publication metadata from the search bar.'],
    ['OpenAlex','research','INLINE API','api.openalex.org','METADATA','D.O.M. queries OpenAlex scholarly metadata from the search bar.'],
    ['PubMed','research','INLINE API','eutils.ncbi.nlm.nih.gov','INDEX METADATA','D.O.M. queries NCBI E-utilities search/summary from the search bar.'],
    ['arXiv','research','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into arXiv search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['WorldCat','archive','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into WorldCat search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['Europeana','archive','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into Europeana search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['DPLA','archive','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into DPLA search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['Smithsonian','archive','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into Smithsonian search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['Trove / NLA','archive','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into Trove search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['Zenodo','research','INLINE API','zenodo.org','RECORD METADATA','D.O.M. queries the Zenodo records API from the search bar; deposited files remain at the source.'],
    ['CORE','research','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into CORE search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['ClinicalTrials.gov','research','INLINE API','clinicaltrials.gov','REGISTRY RECORDS','D.O.M. queries the ClinicalTrials.gov API v2 from the search bar.'],
    ['PubChem','science','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into PubChem search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['NASA Earthdata','science','INLINE API','cmr.earthdata.nasa.gov','COLLECTION METADATA','D.O.M. queries NASA CMR collection metadata from the search bar; this does not imply direct access to every underlying granule or imagery product.'],
    ['USGS ScienceBase','science','QUERY HANDOFF',null,'SOURCE SEARCH','Your D.O.M. query is preloaded into USGS ScienceBase search. Browser cross-origin rules prevent direct ingestion from this static page.'],
    ['DataCite','research','INLINE API','api.datacite.org','METADATA','D.O.M. queries DataCite DOI metadata from the search bar.'],
    ['Europe PMC','research','INLINE API','www.ebi.ac.uk','INDEX METADATA','D.O.M. queries Europe PMC search metadata from the search bar.']
  ].map(([name,cat,mode,host,contentClass,note])=>({name,cat,mode,host,contentClass,note,state:mode==='INLINE API'?'READY · SEARCH TO VERIFY':'QUERY READY',httpStatus:null,requestedAt:null,respondedAt:null,responseMs:null,error:null}));
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byHost=new Map(DEFINITIONS.filter(x=>x.host).map(x=>[x.host,x]));
  const originalFetch=window.fetch.bind(window);
  function stateClass(s){return /RESPONDED|READY|QUERY READY/.test(s)?'ok':/RATE LIMITED|ACCESS RESTRICTED|SOURCE ERROR|UNAVAILABLE|FAILED/.test(s)?'fail':/REQUESTING/.test(s)?'loading':''}
  function classifyHttp(response){if(response.ok)return'RESPONDED';if(response.status===429)return'RATE LIMITED';if(response.status===401||response.status===403)return'ACCESS RESTRICTED';if(response.status>=500)return'SOURCE ERROR';return'UNAVAILABLE'}
  function render(){
    const box=document.querySelector('#sources');if(!box)return;
    box.innerHTML=DEFINITIONS.map(x=>`<article><small>${esc(x.cat.toUpperCase())} · ${esc(x.mode)} · ${esc(x.contentClass)}</small><h3>${esc(x.name)}</h3><p>${esc(x.note)}</p><strong class="${stateClass(x.state)}">${esc(x.state)}${x.httpStatus?` · HTTP ${esc(x.httpStatus)}`:''}</strong>${x.requestedAt?`<small>browser requestedAt ${esc(x.requestedAt)}</small>`:''}${x.respondedAt?`<small>browser respondedAt ${esc(x.respondedAt)}${x.responseMs!=null?` · ${esc(x.responseMs)} ms`:''}</small>`:''}${x.respondedAt?'<small>Connector response time is not the publication, observation, or update time of returned records.</small>':''}${x.error?`<small>${esc(x.error)}</small>`:''}</article>`).join('');
  }
  function sourceForUrl(input){try{const u=new URL(typeof input==='string'?input:input?.url,location.href);return byHost.get(u.hostname)||null}catch(_){return null}}
  window.fetch=async function(input,init){const src=sourceForUrl(input);if(!src)return originalFetch(input,init);src.state='REQUESTING';src.httpStatus=null;src.error=null;src.responseMs=null;src.requestedAt=new Date().toISOString();src.respondedAt=null;const started=performance.now();render();try{const response=await originalFetch(input,init);src.responseMs=Math.max(0,Math.round(performance.now()-started));src.respondedAt=new Date().toISOString();src.httpStatus=response.status;src.state=classifyHttp(response);if(!response.ok)src.error=`HTTP ${response.status} ${response.statusText||''}`.trim();render();return response}catch(err){src.responseMs=Math.max(0,Math.round(performance.now()-started));src.respondedAt=new Date().toISOString();src.state='UNAVAILABLE';src.error=String(err?.message||err||'request failed');render();throw err}}
  function truthifySearchCopy(){
    const intent=document.querySelector('#intent');if(intent){const current=intent.textContent,next=current.replace(/live connectors/gi,'inline API connectors').replace(/federated research network/gi,'federated source network');if(next!==current)intent.textContent=next}
    const results=document.querySelector('#results');if(results){for(const p of results.querySelectorAll('.eyebrow'))if(/RANKED LIVE RESULTS/i.test(p.textContent))p.textContent='RANKED FEDERATED RESULTS';for(const p of results.querySelectorAll('p'))if(/Direct authoritative searches remain available/i.test(p.textContent))p.textContent='For sources that do not expose a browser-safe API, D.O.M. carries the same query into the authoritative source search. Those handoffs extend search coverage without falsely claiming that a static browser page scraped a protected site.'}
  }
  function truthifyObservatoryLinks(){const box=document.querySelector('#obs');if(!box)return;for(const a of box.querySelectorAll('a')){const small=a.querySelector('small');if(small&&small.textContent!=='OFFICIAL PORTAL')small.textContent='OFFICIAL PORTAL';const span=a.querySelector('span');if(span&&span.textContent!=='Open official portal →')span.textContent='Open official portal →'}}
  function installObservers(){const intent=document.querySelector('#intent'),results=document.querySelector('#results');if(intent)new MutationObserver(truthifySearchCopy).observe(intent,{subtree:true,childList:true,characterData:true});if(results)new MutationObserver(truthifySearchCopy).observe(results,{subtree:true,childList:true});}
  function boot(){render();truthifySearchCopy();truthifyObservatoryLinks();installObservers()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.DOMSearchSourceAudit=Object.freeze({definitions:()=>DEFINITIONS.map(x=>({...x})),render,classifyHttp});
})();
