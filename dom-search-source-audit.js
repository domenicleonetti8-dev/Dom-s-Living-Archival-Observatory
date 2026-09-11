(()=>{
  'use strict';
  const DEFINITIONS=[
    ['Project Gutenberg','archive','INLINE API','gutendex.com','Browser API connector; runtime state is measured per request.'],
    ['Library of Congress','archive','INLINE API','www.loc.gov','Browser JSON search connector; runtime state is measured per request.'],
    ['Internet Archive','archive','INLINE API','archive.org','Browser Advanced Search API connector; runtime state is measured per request.'],
    ['Biodiversity Heritage Library','archive','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['DOAB','research','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['U.S. National Archives','government','DIRECT SEARCH ONLY',null,'External Catalog search link; no inline API connector in this build.'],
    ['GovInfo','government','DIRECT SEARCH ONLY',null,'External GovInfo search link; no inline API connector in this build.'],
    ['FOIA.gov','government','INDIRECT SEARCH LINK',null,'The current launcher uses an external web search scoped to foia.gov; it is not a FOIA.gov API connector.'],
    ['Data.gov','science','INLINE API','catalog.data.gov','Browser CKAN API connector; runtime state is measured per request.'],
    ['Google Patents','research','DIRECT SEARCH ONLY',null,'External search link; no inline patents API connector in this build.'],
    ['Crossref','research','INLINE API','api.crossref.org','Browser metadata API connector; runtime state is measured per request.'],
    ['OpenAlex','research','INLINE API','api.openalex.org','Browser scholarly metadata API connector; runtime state is measured per request.'],
    ['PubMed','research','INLINE API','eutils.ncbi.nlm.nih.gov','NCBI E-utilities browser connector; runtime state is measured per request.'],
    ['arXiv','research','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['WorldCat','archive','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['Europeana','archive','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['DPLA','archive','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['Smithsonian','archive','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['Trove / NLA','archive','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['Zenodo','research','INLINE API','zenodo.org','Browser records API connector; runtime state is measured per request.'],
    ['CORE','research','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['ClinicalTrials.gov','research','INLINE API','clinicaltrials.gov','Browser API v2 connector; runtime state is measured per request.'],
    ['PubChem','science','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['NASA Earthdata','science','INLINE API','cmr.earthdata.nasa.gov','NASA CMR collections API connector; runtime state is measured per request.'],
    ['USGS ScienceBase','science','DIRECT SEARCH ONLY',null,'External source search link; no inline API connector in this build.'],
    ['DataCite','research','INLINE API','api.datacite.org','Browser DOI metadata API connector; runtime state is measured per request.'],
    ['Europe PMC','research','INLINE API','www.ebi.ac.uk','Europe PMC browser API connector; runtime state is measured per request.']
  ].map(([name,cat,mode,host,note])=>({name,cat,mode,host,note,state:mode==='INLINE API'?'NOT TESTED THIS SESSION':mode,httpStatus:null,lastAttempt:null,error:null}));
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byHost=new Map(DEFINITIONS.filter(x=>x.host).map(x=>[x.host,x]));
  const originalFetch=window.fetch.bind(window);
  function stateClass(s){return /RESPONDED/.test(s)?'ok':/UNAVAILABLE|FAILED/.test(s)?'fail':/REQUESTING/.test(s)?'loading':''}
  function render(){
    const box=document.querySelector('#sources');if(!box)return;
    box.innerHTML=DEFINITIONS.map(x=>`<article><small>${esc(x.cat.toUpperCase())} · ${esc(x.mode)}</small><h3>${esc(x.name)}</h3><p>${esc(x.note)}</p><strong class="${stateClass(x.state)}">${esc(x.state)}${x.httpStatus?` · HTTP ${esc(x.httpStatus)}`:''}</strong>${x.lastAttempt?`<small>Last browser attempt: ${esc(new Date(x.lastAttempt).toLocaleTimeString())}</small>`:''}${x.error?`<small>${esc(x.error)}</small>`:''}</article>`).join('');
  }
  function sourceForUrl(input){try{const u=new URL(typeof input==='string'?input:input?.url,location.href);return byHost.get(u.hostname)||null}catch(_){return null}}
  window.fetch=async function(input,init){const src=sourceForUrl(input);if(!src)return originalFetch(input,init);src.state='REQUESTING';src.httpStatus=null;src.error=null;src.lastAttempt=Date.now();render();try{const response=await originalFetch(input,init);src.httpStatus=response.status;src.state=response.ok?'RESPONDED':'UNAVAILABLE';if(!response.ok)src.error=`HTTP ${response.status} ${response.statusText||''}`.trim();render();return response}catch(err){src.state='UNAVAILABLE';src.error=String(err?.message||err||'request failed');render();throw err}}
  function truthifySearchCopy(){
    const intent=document.querySelector('#intent');if(intent){const current=intent.textContent,next=current.replace(/live connectors/gi,'inline API connectors').replace(/federated research network/gi,'configured inline API connectors');if(next!==current)intent.textContent=next}
    const results=document.querySelector('#results');if(results){for(const p of results.querySelectorAll('.eyebrow'))if(/RANKED LIVE RESULTS/i.test(p.textContent))p.textContent='RANKED INLINE API RESULTS';for(const p of results.querySelectorAll('p'))if(/Direct authoritative searches remain available/i.test(p.textContent))p.textContent='External source-search launchers remain available below. A launcher is not counted as an inline API connector.'}
  }
  function truthifyObservatoryLinks(){const box=document.querySelector('#obs');if(!box)return;for(const a of box.querySelectorAll('a')){const small=a.querySelector('small');if(small&&small.textContent!=='OFFICIAL PORTAL')small.textContent='OFFICIAL PORTAL';const span=a.querySelector('span');if(span&&span.textContent!=='Open official portal →')span.textContent='Open official portal →'}}
  function installObservers(){const intent=document.querySelector('#intent'),results=document.querySelector('#results');if(intent)new MutationObserver(truthifySearchCopy).observe(intent,{subtree:true,childList:true,characterData:true});if(results)new MutationObserver(truthifySearchCopy).observe(results,{subtree:true,childList:true});}
  function boot(){render();truthifySearchCopy();truthifyObservatoryLinks();installObservers()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.DOMSearchSourceAudit=Object.freeze({definitions:()=>DEFINITIONS.map(x=>({...x})),render});
})();
