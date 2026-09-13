#!/usr/bin/env python3
import json, math, re, urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

OUT=Path('data/weather-climate')
UA='D.O.M.-Living-Archival-Observatory/2026 (+public research; weather-climate station fabric)'
YEAR=datetime.now(timezone.utc).year

GHCN_STATIONS='https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt'
GHCN_INVENTORY='https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-inventory.txt'
ISD_HISTORY='https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv'
HOMR_BASE='https://www.ncei.noaa.gov/access/homr/file/'
HOMR={
 'coop':'coop-stations.txt','lcd':'lcd-stations.txt','nexrad':'nexrad-stations.txt','crn':'crn-stations.txt',
 'alrcrn':'alrcrn-stations.txt','awos':'awos-stations.txt','asos':'asos-stations.txt','ccd':'ccd-stations.txt'
}


def now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
def get(url,timeout=60):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/plain,text/csv,*/*'})
    with urllib.request.urlopen(req,timeout=timeout) as r:return r.read().decode('utf-8','replace')
def finite(x):
    try:n=float(str(x).strip())
    except Exception:return None
    return n if math.isfinite(n) else None
def valid(lat,lon): return lat is not None and lon is not None and -90<=lat<=90 and -180<=lon<=180
def clean(s): return re.sub(r'\s+',' ',str(s or '')).strip()


def parse_ghcn(stations_txt,inventory_txt):
    active=set()
    for line in inventory_txt.splitlines():
        if len(line)<45:continue
        try:last=int(line[41:45])
        except Exception:continue
        if last>=YEAR:active.add(line[0:11])
    out=[]
    for line in stations_txt.splitlines():
        if len(line)<71:continue
        sid=line[0:11]
        if sid not in active:continue
        lat=finite(line[12:20]);lon=finite(line[21:30]);elev=finite(line[31:37])
        if not valid(lat,lon):continue
        out.append({'id':sid,'network':'GHCN-D','agency':'NOAA/NCEI','name':clean(line[41:71]) or sid,'lat':lat,'lon':lon,'elevM':elev,'countryCode':sid[:2],'state':clean(line[38:40]),'wmoId':clean(line[80:85]) if len(line)>=85 else '', 'sourceUrl':GHCN_STATIONS,'status':'reporting-current-year'})
    return out


def parse_csv_line(line):
    import csv,io
    return next(csv.reader(io.StringIO(line)))
def parse_isd(text):
    lines=text.splitlines()
    if not lines:return[]
    hdr=parse_csv_line(lines[0]);idx={clean(x).upper():i for i,x in enumerate(hdr)}
    def g(row,*names):
        for n in names:
            i=idx.get(n.upper())
            if i is not None and i<len(row):return row[i]
        return''
    out=[]
    for line in lines[1:]:
        if not line.strip():continue
        try:row=parse_csv_line(line)
        except Exception:continue
        end=re.sub(r'\D','',g(row,'END'))
        if len(end)>=4:
            try:
                if int(end[:4])<YEAR:continue
            except Exception:pass
        lat=finite(g(row,'LAT'));lon=finite(g(row,'LON'))
        if not valid(lat,lon):continue
        usaf=clean(g(row,'USAF'));wban=clean(g(row,'WBAN'));sid=f'{usaf}-{wban}'.strip('-')
        out.append({'id':sid,'network':'ISD','agency':'NOAA/NCEI','name':clean(g(row,'STATION NAME')) or sid,'lat':lat,'lon':lon,'elevM':finite(g(row,'ELEV(M)')),'countryCode':clean(g(row,'CTRY')),'state':clean(g(row,'STATE')),'icao':clean(g(row,'ICAO')),'sourceUrl':ISD_HISTORY,'status':'record-current-year'})
    return out


def fixed_width_rows(text,network,url):
    lines=[x.rstrip('\n') for x in text.splitlines() if x.strip()]
    if len(lines)<3:return[]
    header,dashes=lines[0],lines[1]
    spans=[m.span() for m in re.finditer(r'-+',dashes)]
    if len(spans)<4:return[]
    names=[clean(header[a:b]).upper().replace(' ','_') for a,b in spans]
    out=[]
    for line in lines[2:]:
        row={names[i]:clean(line[a:b] if a<len(line) else '') for i,(a,b) in enumerate(spans)}
        lat=next((finite(row[k]) for k in row if k in ('LAT','LATITUDE') and finite(row[k]) is not None),None)
        lon=next((finite(row[k]) for k in row if k in ('LON','LONG','LONGITUDE') and finite(row[k]) is not None),None)
        if not valid(lat,lon):continue
        sid=next((row.get(k) for k in ('NCDCID','GHCND','WBAN','COOPID','CALL','ICAO','ID') if row.get(k)),None) or f'{network}:{lat:.5f}:{lon:.5f}'
        name=next((row.get(k) for k in ('NAME','STATION_NAME','STATION','ALT_NAME') if row.get(k)),None) or sid
        elev=next((finite(row[k]) for k in row if k.startswith('ELEV') and finite(row[k]) is not None and finite(row[k])>-9000),None)
        out.append({'id':sid,'network':network.upper(),'agency':'NOAA/NCEI HOMR','name':name,'lat':lat,'lon':lon,'elevM':elev,'state':row.get('ST',''),'country':row.get('COUNTRY',''),'call':row.get('CALL',''),'sourceUrl':url,'status':'current-station-list'})
    return out


def tile_id(lat,lon):
    la=max(-90,min(80,int(math.floor(lat/10)*10)));lo=max(-180,min(170,int(math.floor(lon/10)*10)))
    return f'lat_{la:+03d}_lon_{lo:+04d}'

def compact(s):
    return {k:v for k,v in s.items() if v not in ('',None,[]) }

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for old in OUT.glob('tile_*.json'): old.unlink()
    sources=[];stations=[]
    gh=parse_ghcn(get(GHCN_STATIONS),get(GHCN_INVENTORY));stations+=gh;sources.append({'id':'ghcn-d','count':len(gh),'sourceUrl':GHCN_STATIONS,'scope':'global current-year reporting stations'})
    isd=parse_isd(get(ISD_HISTORY));stations+=isd;sources.append({'id':'isd','count':len(isd),'sourceUrl':ISD_HISTORY,'scope':'global hourly/synoptic stations with current-year record'})
    for key,file in HOMR.items():
        url=HOMR_BASE+file
        try:rows=fixed_width_rows(get(url),key,url)
        except Exception as e:
            rows=[];sources.append({'id':key,'count':0,'sourceUrl':url,'scope':'current official station list','error':f'{type(e).__name__}: {e}'});continue
        stations+=rows;sources.append({'id':key,'count':len(rows),'sourceUrl':url,'scope':'current official station list'})
    seen=set();dedup=[]
    for s in stations:
        k=(s['network'],str(s['id']),round(float(s['lat']),5),round(float(s['lon']),5))
        if k in seen:continue
        seen.add(k);dedup.append(compact(s))
    tiles=defaultdict(list)
    for s in dedup:tiles[tile_id(float(s['lat']),float(s['lon']))].append(s)
    tile_meta=[]
    for tid,rows in sorted(tiles.items()):
        p=OUT/f'tile_{tid}.json';p.write_text(json.dumps({'schema':'dom-weather-climate-tile-v1','tile':tid,'stationCount':len(rows),'stations':rows},separators=(',',':'))+'\n',encoding='utf-8')
        tile_meta.append({'id':tid,'path':f'./data/weather-climate/{p.name}','count':len(rows)})
    manifest={'schema':'dom-weather-climate-manifest-v1','generatedAt':now_iso(),'currentYear':YEAR,'stationCount':len(dedup),'tileDegrees':10,'tileCount':len(tile_meta),'sources':sources,'tiles':tile_meta,'truthNote':'Coordinates come from NOAA/NCEI GHCN-D, ISD, and current HOMR station metadata. Current-year filtering indicates records/stations documented as current; it does not imply every instrument is transmitting at this instant.'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print(json.dumps({'stationCount':len(dedup),'tileCount':len(tile_meta),'sources':{x['id']:x['count'] for x in sources}},sort_keys=True))
if __name__=='__main__':main()
