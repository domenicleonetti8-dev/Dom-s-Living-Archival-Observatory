#!/usr/bin/env python3
"""Incrementally aggregate authoritative GHCN-Daily history for D.O.M.

One run processes one source year by default. Raw daily observations are not
committed. Instead, each station contributes one annual value per element and
those station-year values are spatially aggregated by D.O.M.'s existing 10°
tiles. This prevents stations with more daily rows from receiving more weight.

The result is a transparent historical diagnostic layer, not an official NOAA
climate product and not a replacement for homogenized global climate series.
"""
import csv, gzip, io, json, math, os, urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path('data/weather-climate')
HIST=ROOT/'history'
PROGRESS=HIST/'progress.json'
BASE='https://www.ncei.noaa.gov/pub/data/ghcn/daily/by_year'
UA='D.O.M.-Global-Observatory/2026 (+public research; GHCN historical evaluation)'
ELEMENTS={'TAVG','TMAX','TMIN','PRCP','SNOW','SNWD'}
TEMP={'TAVG','TMAX','TMIN'}
SUM_ELEMENTS={'PRCP','SNOW'}


def now_iso():return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
def load_json(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def write_json(p,obj):
    Path(p).parent.mkdir(parents=True,exist_ok=True)
    Path(p).write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n',encoding='utf-8')
def unit_value(element,raw):
    v=float(raw)
    if element in TEMP:return v/10.0
    if element=='PRCP':return v/10.0
    if element in {'SNOW','SNWD'}:return v
    return v
def tile_area_weight(tile_id):
    import re
    m=re.match(r'^lat_([+-]\d+)_lon_([+-]\d+)$',tile_id)
    if not m:return 0.0
    south=max(-90,min(90,int(m.group(1))));north=max(-90,min(90,south+10))
    west=int(m.group(2));east=min(180,west+10)
    return abs(math.sin(math.radians(north))-math.sin(math.radians(south)))*abs(math.radians(east-west))

def station_universe():
    manifest=load_json(ROOT/'manifest.json')
    ids={};network_counts=defaultdict(int)
    for t in manifest.get('tiles',[]):
        q=load_json(Path(str(t['path']).replace('./','')))
        for s in q.get('stations',[]):
            sid=str(s.get('id') or '')
            network=str(s.get('network') or '')
            if sid:
                ids[sid]={'tile':t['id'],'network':network}
                network_counts[network]+=1
    history=manifest.get('historyCoverage') or {}
    return manifest,ids,dict(network_counts),int(history.get('earliestRecordStartYear') or 1763)

def choose_year(manifest,earliest):
    env=os.getenv('DOM_HISTORY_YEAR')
    if env:
        y=int(env);return max(earliest,min(int(manifest.get('currentYear') or y),y))
    if PROGRESS.exists():
        p=load_json(PROGRESS);y=int(p.get('nextYear') or manifest.get('currentYear'))
    else:y=int(manifest.get('currentYear') or datetime.now(timezone.utc).year)
    return max(earliest,y)

def stream_year(year,universe):
    url=f'{BASE}/{year}.csv.gz'
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/gzip,*/*'})
    daily=defaultdict(lambda:[0.0,0])
    rows=matched=quality_rejected=0
    with urllib.request.urlopen(req,timeout=180) as r:
        with gzip.GzipFile(fileobj=r) as gz, io.TextIOWrapper(gz,encoding='utf-8',errors='replace',newline='') as text:
            for row in csv.reader(text):
                rows+=1
                if len(row)<7:continue
                sid,date,element,raw,mflag,qflag,sflag=row[:7]
                if sid not in universe or element not in ELEMENTS:continue
                if str(qflag).strip():quality_rejected+=1;continue
                try:v=unit_value(element,raw)
                except Exception:continue
                if not math.isfinite(v):continue
                k=(sid,element);daily[k][0]+=v;daily[k][1]+=1;matched+=1
    return url,daily,rows,matched,quality_rejected

def aggregate(year,daily,universe):
    station_year={}
    for (sid,element),(total,n) in daily.items():
        if not n:continue
        # temperature and snow depth -> annual mean; precipitation/snowfall -> annual total
        value=total if element in SUM_ELEMENTS else total/n
        station_year[(sid,element)]={'value':value,'days':n}
    tile_parts=defaultdict(lambda:defaultdict(list))
    for (sid,element),rec in station_year.items():
        tile=universe[sid]['tile'];tile_parts[tile][element].append(rec['value'])
    tiles={};global_parts=defaultdict(list)
    for tile,elements in sorted(tile_parts.items()):
        weight=tile_area_weight(tile);out={}
        for element,values in sorted(elements.items()):
            mean=sum(values)/len(values)
            out[element]={'stationCount':len(values),'stationWeightedAnnualValue':mean}
            global_parts[element].append((mean,weight,len(values)))
        tiles[tile]={'areaWeight':weight,'elements':out}
    global_diag={}
    for element,parts in sorted(global_parts.items()):
        w=sum(p[1] for p in parts if p[1]>0)
        area_mean=sum(p[0]*p[1] for p in parts if p[1]>0)/w if w else None
        global_diag[element]={'populatedTileCount':len(parts),'contributingStationYears':sum(p[2] for p in parts),'areaWeightedTileMean':area_mean}
    return station_year,tiles,global_diag

def main():
    HIST.mkdir(parents=True,exist_ok=True)
    manifest,universe,network_counts,earliest=station_universe()
    year=choose_year(manifest,earliest)
    url,daily,source_rows,matched_rows,quality_rejected=stream_year(year,universe)
    station_year,tiles,global_diag=aggregate(year,daily,universe)
    out={
      'schema':'dom-ghcn-history-annual-v1','generatedAt':now_iso(),'year':year,
      'partialYear':year==datetime.now(timezone.utc).year,
      'source':'NOAA/NCEI GHCN-Daily by-year archive','sourceUrl':url,
      'sourceUniverseIndexedStations':len(universe),'sourceUniverseNetworkCounts':network_counts,
      'ghcnStationUniverse':sum(1 for x in universe.values() if x['network']=='GHCN-D'),
      'sourceRowsRead':source_rows,'matchedQualityAcceptedRows':matched_rows,'qualityFlaggedRowsRejected':quality_rejected,
      'stationElementAnnualRecords':len(station_year),'tiles':tiles,'globalSpatialDiagnostics':global_diag,
      'method':{
        'quality':'Rows with non-blank GHCN Q-FLAG are rejected.',
        'stationWeighting':'Each station contributes one annual value per element, preventing higher reporting frequency from increasing station weight.',
        'spatialWeighting':'Station annual values are averaged within existing 10-degree tiles; populated tile means are then weighted by spherical tile area.',
        'temperature':'TAVG/TMAX/TMIN source tenths-degC converted to degC and averaged across accepted days.',
        'precipitation':'PRCP source tenths-mm converted to mm and summed across accepted days.',
        'snow':'SNOW source mm summed; SNWD source mm averaged across accepted days.',
        'boundary':'D.O.M. diagnostic over currently indexed station IDs. It is not NOAA homogenization and must not be presented as an official global climate index.'
      }
    }
    write_json(HIST/f'annual-{year}.json',out)
    next_year=year-1
    complete=next_year<earliest
    progress={
      'schema':'dom-ghcn-history-progress-v1','updatedAt':now_iso(),'lastProcessedYear':year,
      'nextYear':earliest if complete else next_year,'earliestIndexedRecordYear':earliest,'complete':complete,
      'annualFiles':len(list(HIST.glob('annual-*.json'))),
      'truthNote':'Progress tracks compact annual diagnostics already generated. It does not claim unprocessed years or non-GHCN source families are historically ingested.'
    }
    write_json(PROGRESS,progress)
    print(json.dumps({'year':year,'stationElementAnnualRecords':len(station_year),'globalSpatialDiagnostics':global_diag,'nextYear':progress['nextYear'],'complete':complete},sort_keys=True))

if __name__=='__main__':main()
