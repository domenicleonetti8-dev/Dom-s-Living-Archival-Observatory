"""D.O.M. lawful server-side federated search.

This module searches documented/public machine-readable endpoints and returns
normalized metadata plus authoritative source handoffs. It intentionally does
not scrape arbitrary HTML pages, bypass robots/access controls, or imply that a
portal without an API was ingested.
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, List, Optional

USER_AGENT = "DOM-Living-Archival-Observatory/1.0 public-research-search"
TIMEOUT = max(3, min(20, int(os.getenv("DOM_SEARCH_TIMEOUT_SECONDS", "10"))))
MAX_RESULTS_PER_SOURCE = max(3, min(25, int(os.getenv("DOM_SEARCH_RESULTS_PER_SOURCE", "10"))))
MAX_TOTAL_RESULTS = max(10, min(250, int(os.getenv("DOM_SEARCH_MAX_RESULTS", "100"))))
MAX_WORKERS = max(2, min(16, int(os.getenv("DOM_SEARCH_MAX_WORKERS", "10"))))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _quote(value: str) -> str:
    return urllib.parse.quote(str(value or ""), safe="")


def _get_json(url: str):
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.load(resp)


def _get_text(url: str, accept: str = "application/xml,text/xml,application/atom+xml") -> str:
    req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def _year(value) -> Optional[str]:
    if value is None:
        return None
    m = re.search(r"\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b", str(value))
    return m.group(1) if m else None


def _text(value, limit: int = 500) -> str:
    if isinstance(value, list):
        value = "; ".join(str(x) for x in value if x is not None)
    value = re.sub(r"\s+", " ", str(value or "")).strip()
    return value[:limit]


def _result(source: str, title, url, *, kind="RESULT", detail="", year=None, doi="", open_access=None):
    url = str(url or "").strip()
    if not url.startswith(("https://", "http://")):
        url = ""
    row = {
        "source": source,
        "type": _text(kind, 80) or "RESULT",
        "title": _text(title, 300) or "Untitled",
        "url": url,
        "detail": _text(detail, 700),
        "year": _year(year) or "",
        "doi": _text(doi, 180),
    }
    if open_access is not None:
        row["openAccess"] = bool(open_access)
    return row


def gutenberg(q):
    d = _get_json(f"https://gutendex.com/books?search={_quote(q)}")
    return [_result("Project Gutenberg", x.get("title"), f"https://www.gutenberg.org/ebooks/{x.get('id')}", kind="BOOK", detail=", ".join(a.get("name", "") for a in x.get("authors", []) if a.get("name"))) for x in (d.get("results") or [])[:MAX_RESULTS_PER_SOURCE]]


def loc(q):
    d = _get_json(f"https://www.loc.gov/search/?q={_quote(q)}&fo=json&c={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in d.get("results") or []:
        typ = x.get("type")
        if isinstance(typ, list): typ = typ[0] if typ else "RECORD"
        desc = x.get("description")
        if isinstance(desc, list): desc = desc[0] if desc else ""
        out.append(_result("Library of Congress", x.get("title"), x.get("id") or x.get("url"), kind=typ or "RECORD", detail=desc or x.get("date"), year=x.get("date")))
    return out[:MAX_RESULTS_PER_SOURCE]


def internet_archive(q):
    fields = "identifier,title,creator,year"
    url = f"https://archive.org/advancedsearch.php?q={_quote(q)}&fl[]={fields.replace(',', '&fl[]=')}&rows={MAX_RESULTS_PER_SOURCE}&page=1&output=json"
    d = _get_json(url)
    out = []
    for x in ((d.get("response") or {}).get("docs") or []):
        creator = x.get("creator")
        if isinstance(creator, list): creator = ", ".join(map(str, creator))
        out.append(_result("Internet Archive", x.get("title") or x.get("identifier"), f"https://archive.org/details/{_quote(x.get('identifier'))}", kind="ARCHIVE", detail=creator, year=x.get("year")))
    return out


def crossref(q):
    d = _get_json(f"https://api.crossref.org/works?query.bibliographic={_quote(q)}&rows={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in ((d.get("message") or {}).get("items") or []):
        title = x.get("title")
        if isinstance(title, list): title = title[0] if title else x.get("DOI")
        authors = ", ".join(" ".join(filter(None, [a.get("given"), a.get("family")])) for a in (x.get("author") or [])[:4])
        date_parts = (((x.get("published") or {}).get("date-parts") or [[None]])[0] or [None])
        doi = x.get("DOI") or ""
        out.append(_result("Crossref", title, x.get("URL") or (f"https://doi.org/{doi}" if doi else ""), kind=x.get("type") or "SCHOLARLY", detail=authors, year=date_parts[0], doi=doi))
    return out


def openalex(q):
    d = _get_json(f"https://api.openalex.org/works?search={_quote(q)}&per-page={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in d.get("results") or []:
        authors = ", ".join((((a.get("author") or {}).get("display_name")) or "") for a in (x.get("authorships") or [])[:4])
        doi = str(x.get("doi") or "").replace("https://doi.org/", "")
        location = x.get("primary_location") or {}
        out.append(_result("OpenAlex", x.get("display_name"), x.get("doi") or location.get("landing_page_url") or x.get("id"), kind=x.get("type") or "RESEARCH", detail=authors, year=x.get("publication_year"), doi=doi, open_access=(x.get("open_access") or {}).get("is_oa")))
    return out


def pubmed(q):
    d = _get_json(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={_quote(q)}&retmode=json&retmax={MAX_RESULTS_PER_SOURCE}")
    ids = ((d.get("esearchresult") or {}).get("idlist") or [])
    if not ids: return []
    s = _get_json(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={','.join(ids)}&retmode=json")
    out = []
    for pid in ids:
        x = (s.get("result") or {}).get(pid) or {}
        authors = ", ".join(a.get("name", "") for a in (x.get("authors") or [])[:4])
        out.append(_result("PubMed", x.get("title") or f"PubMed {pid}", f"https://pubmed.ncbi.nlm.nih.gov/{pid}/", kind="MEDICINE", detail=authors, year=x.get("pubdate")))
    return out


def datagov(q):
    d = _get_json(f"https://catalog.data.gov/api/3/action/package_search?q={_quote(q)}&rows={MAX_RESULTS_PER_SOURCE}")
    return [_result("Data.gov", x.get("title") or x.get("name"), f"https://catalog.data.gov/dataset/{x.get('name')}", kind="DATASET", detail=x.get("notes"), year=x.get("metadata_modified")) for x in ((d.get("result") or {}).get("results") or [])]


def clinical_trials(q):
    d = _get_json(f"https://clinicaltrials.gov/api/v2/studies?query.term={_quote(q)}&pageSize={MAX_RESULTS_PER_SOURCE}&format=json")
    out = []
    for x in d.get("studies") or []:
        p = x.get("protocolSection") or {}; ident = p.get("identificationModule") or {}; cond = p.get("conditionsModule") or {}; stat = p.get("statusModule") or {}
        nct = ident.get("nctId") or ""
        out.append(_result("ClinicalTrials.gov", ident.get("briefTitle") or ident.get("officialTitle") or nct, f"https://clinicaltrials.gov/study/{nct}", kind="CLINICAL TRIAL", detail=" · ".join(filter(None, [", ".join(cond.get("conditions") or []), stat.get("overallStatus")])), year=((stat.get("startDateStruct") or {}).get("date"))))
    return out


def nasa_cmr(q):
    d = _get_json(f"https://cmr.earthdata.nasa.gov/search/collections.json?keyword={_quote(q)}&page_size={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in ((d.get("feed") or {}).get("entry") or []):
        link = next((l.get("href") for l in (x.get("links") or []) if str(l.get("href") or "").startswith("http")), "")
        out.append(_result("NASA Earthdata", x.get("title") or x.get("short_name"), link or f"https://search.earthdata.nasa.gov/search?q={_quote(q)}", kind="EARTH DATA", detail=x.get("summary"), year=x.get("time_start")))
    return out


def zenodo(q):
    d = _get_json(f"https://zenodo.org/api/records?q={_quote(q)}&size={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in (((d.get("hits") or {}).get("hits")) or []):
        m = x.get("metadata") or {}; links = x.get("links") or {}; creators = ", ".join(a.get("name", "") for a in (m.get("creators") or [])[:4]); rt = m.get("resource_type") or {}
        out.append(_result("Zenodo", m.get("title") or f"Zenodo {x.get('id')}", links.get("html") or f"https://zenodo.org/records/{x.get('id')}", kind=rt.get("title") or "RESEARCH RECORD", detail=creators, year=x.get("created"), doi=x.get("doi"), open_access=True))
    return out


def datacite(q):
    d = _get_json(f"https://api.datacite.org/dois?query={_quote(q)}&page[size]={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in d.get("data") or []:
        a = x.get("attributes") or {}; titles = a.get("titles") or []; creators = a.get("creators") or []; typ = a.get("types") or {}; doi = a.get("doi") or x.get("id") or ""
        title = (titles[0] or {}).get("title") if titles else doi
        names = ", ".join(c.get("name") or " ".join(filter(None, [c.get("givenName"), c.get("familyName")])) for c in creators[:4])
        out.append(_result("DataCite", title, a.get("url") or f"https://doi.org/{doi}", kind=typ.get("resourceTypeGeneral") or "RESEARCH", detail=names, year=a.get("publicationYear"), doi=doi))
    return out


def europe_pmc(q):
    d = _get_json(f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={_quote(q)}&format=json&pageSize={MAX_RESULTS_PER_SOURCE}")
    out = []
    for x in (((d.get("resultList") or {}).get("result")) or []):
        doi = x.get("doi") or ""; url = f"https://doi.org/{doi}" if doi else f"https://europepmc.org/article/{_quote(x.get('source') or 'MED')}/{_quote(x.get('id'))}"
        out.append(_result("Europe PMC", x.get("title") or x.get("id"), url, kind=x.get("pubType") or "BIOMEDICAL", detail=" · ".join(filter(None, [x.get("authorString"), x.get("journalTitle")])), year=x.get("pubYear"), doi=doi, open_access=x.get("isOpenAccess") == "Y"))
    return out


def arxiv(q):
    text = _get_text(f"https://export.arxiv.org/api/query?search_query=all:{_quote(q)}&start=0&max_results={MAX_RESULTS_PER_SOURCE}")
    root = ET.fromstring(text); ns = {"a": "http://www.w3.org/2005/Atom"}; out = []
    for e in root.findall("a:entry", ns):
        title = _text(e.findtext("a:title", default="", namespaces=ns), 300); url = e.findtext("a:id", default="", namespaces=ns); summary = e.findtext("a:summary", default="", namespaces=ns); published = e.findtext("a:published", default="", namespaces=ns)
        authors = ", ".join(_text(a.findtext("a:name", default="", namespaces=ns), 100) for a in e.findall("a:author", ns)[:4])
        out.append(_result("arXiv", title, url, kind="PREPRINT", detail=authors or summary, year=published, open_access=True))
    return out


def pubchem(q):
    d = _get_json(f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{_quote(q)}/property/Title,MolecularFormula,IUPACName,CanonicalSMILES/JSON")
    out = []
    for x in ((d.get("PropertyTable") or {}).get("Properties") or [])[:MAX_RESULTS_PER_SOURCE]:
        cid = x.get("CID"); detail = " · ".join(filter(None, [x.get("MolecularFormula"), x.get("IUPACName")]))
        out.append(_result("PubChem", x.get("Title") or x.get("IUPACName") or f"CID {cid}", f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}", kind="CHEMICAL RECORD", detail=detail))
    return out


def sciencebase(q):
    d = _get_json(f"https://www.sciencebase.gov/catalog/items?q={_quote(q)}&max={MAX_RESULTS_PER_SOURCE}&format=json")
    rows = d.get("items") or d.get("results") or []
    return [_result("USGS ScienceBase", x.get("title") or x.get("name") or x.get("id"), x.get("link") or x.get("url") or (f"https://www.sciencebase.gov/catalog/item/{x.get('id')}" if x.get("id") else ""), kind="SCIENCE RECORD", detail=x.get("summary") or x.get("description"), year=x.get("dateCreated") or x.get("dateUpdated")) for x in rows[:MAX_RESULTS_PER_SOURCE]]


ADAPTERS: Dict[str, Dict] = {
    "Project Gutenberg": {"cat": "archive", "run": gutenberg},
    "Library of Congress": {"cat": "archive", "run": loc},
    "Internet Archive": {"cat": "archive", "run": internet_archive},
    "Crossref": {"cat": "research", "run": crossref},
    "OpenAlex": {"cat": "research", "run": openalex},
    "PubMed": {"cat": "research", "run": pubmed},
    "Data.gov": {"cat": "science", "run": datagov},
    "ClinicalTrials.gov": {"cat": "research", "run": clinical_trials},
    "NASA Earthdata": {"cat": "science", "run": nasa_cmr},
    "Zenodo": {"cat": "research", "run": zenodo},
    "DataCite": {"cat": "research", "run": datacite},
    "Europe PMC": {"cat": "research", "run": europe_pmc},
    "arXiv": {"cat": "research", "run": arxiv},
    "PubChem": {"cat": "science", "run": pubchem},
    "USGS ScienceBase": {"cat": "science", "run": sciencebase},
}

PORTALS = {
    "Biodiversity Heritage Library": ("archive", "https://www.biodiversitylibrary.org/search?searchTerm={q}&stype=F#/titles", "portal-handoff"),
    "DOAB": ("research", "https://directory.doabooks.org/discover?query={q}", "portal-handoff"),
    "U.S. National Archives": ("government", "https://catalog.archives.gov/search?q={q}", "portal-handoff"),
    "GovInfo": ("government", "https://www.govinfo.gov/app/search/{q}", "api-key-or-portal"),
    "FOIA.gov": ("government", "https://www.foia.gov/search.html?query={q}", "portal-handoff"),
    "Google Patents": ("research", "https://patents.google.com/?q={q}", "portal-handoff"),
    "WorldCat": ("archive", "https://search.worldcat.org/search?q={q}", "licensed-api-or-portal"),
    "Europeana": ("archive", "https://www.europeana.eu/en/search?query={q}", "api-key-or-portal"),
    "DPLA": ("archive", "https://dp.la/search?q={q}", "api-key-or-portal"),
    "Smithsonian": ("archive", "https://www.si.edu/search?edan_q={q}", "api-key-or-portal"),
    "Trove / NLA": ("archive", "https://trove.nla.gov.au/search?keyword={q}", "api-key-or-portal"),
    "CORE": ("research", "https://core.ac.uk/search?q={q}", "api-key-or-portal"),
}


def _canonical_key(row: dict) -> str:
    doi = str(row.get("doi") or "").lower().replace("https://doi.org/", "").strip()
    if doi: return "doi:" + doi
    title = re.sub(r"[^a-z0-9]+", " ", str(row.get("title") or "").lower()).strip()
    return "title:" + title[:220] if title else ""


def _tokens(q: str) -> List[str]:
    return re.findall(r"[a-z0-9]{2,}", q.lower())


def _score(row: dict, q: str) -> int:
    phrase = q.lower().strip().strip('"“”'); title = str(row.get("title") or "").lower(); detail = str(row.get("detail") or "").lower(); score = 0
    if title == phrase: score += 60
    if phrase and phrase in title: score += 32
    for t in _tokens(phrase):
        if t in title: score += 7
        if t in detail: score += 2
    if row.get("doi"): score += 5
    if row.get("openAccess") is True: score += 3
    score += max(0, int(row.get("confirmations") or 1) - 1) * 8
    return score


def _merge(rows: Iterable[dict], q: str) -> List[dict]:
    merged = {}
    for row in rows:
        key = _canonical_key(row)
        if not key: continue
        if key not in merged:
            row = dict(row); row["sources"] = [row.get("source")]; row["confirmations"] = 1; merged[key] = row; continue
        cur = merged[key]; src = row.get("source")
        if src and src not in cur["sources"]: cur["sources"].append(src)
        cur["confirmations"] = len(cur["sources"]); cur["source"] = " + ".join(cur["sources"])
        if len(str(row.get("detail") or "")) > len(str(cur.get("detail") or "")): cur["detail"] = row.get("detail")
        if not cur.get("url") and row.get("url"): cur["url"] = row.get("url")
        if not cur.get("doi") and row.get("doi"): cur["doi"] = row.get("doi")
        if row.get("openAccess") is True: cur["openAccess"] = True
    out = list(merged.values())
    for row in out: row["score"] = _score(row, q)
    out.sort(key=lambda r: (-int(r.get("score") or 0), str(r.get("title") or "").lower()))
    return out[:MAX_TOTAL_RESULTS]


def search(query: str, scope: str = "all") -> dict:
    q = re.sub(r"\s+", " ", str(query or "")).strip()[:500]
    scope = str(scope or "all").strip().lower()
    if not q: raise ValueError("query is required")
    if scope not in {"all", "archive", "research", "government", "science"}: raise ValueError("invalid scope")
    selected = [(name, spec) for name, spec in ADAPTERS.items() if scope == "all" or spec["cat"] == scope or (scope == "science" and spec["cat"] == "research")]
    statuses = []; rows = []
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, max(1, len(selected)))) as pool:
        futures = {pool.submit(spec["run"], q): (name, spec) for name, spec in selected}
        for fut in as_completed(futures):
            name, spec = futures[fut]
            try:
                got = fut.result() or []; rows.extend(got); statuses.append({"source": name, "category": spec["cat"], "state": "responded", "records": len(got)})
            except Exception as exc:
                statuses.append({"source": name, "category": spec["cat"], "state": "unavailable", "records": 0, "error": _text(exc, 180)})
    handoffs = []
    for name, (cat, template, mode) in PORTALS.items():
        if scope != "all" and cat != scope and not (scope == "science" and cat == "research"): continue
        handoffs.append({"source": name, "category": cat, "mode": mode, "url": template.format(q=_quote(q)), "state": "query-ready"})
    results = _merge(rows, q)
    return {
        "schema": "dom.search.federation.v1",
        "query": q,
        "scope": scope,
        "generatedAt": _now(),
        "policy": "documented/public machine-readable endpoints only; no arbitrary HTML scraping or access-control bypass",
        "resultCount": len(results),
        "results": results,
        "sources": sorted(statuses, key=lambda x: x["source"].lower()),
        "handoffs": handoffs,
    }


__all__ = ["search", "ADAPTERS", "PORTALS"]
