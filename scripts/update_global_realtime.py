#!/usr/bin/env python3
import csv, gzip, io, json, os, pathlib, urllib.parse, urllib.request, datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

OUT=pathlib.Path('data/global-realtime'); OUT.mkdir(parents=True, exist_ok=True)
UA={'User-Agent':'DOM-Living-Observatory/1.0'}
NOW=datetime.datetime.now(datetime.timezone.utc)

def get(url,timeout=30):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=timeout) as r:return r.read()

def write(name,obj):
    (OUT/name).write_text(json.dumps(obj,separators=(',',':')))

def valid(lat,lon):
    return -90<=lat<=90 and -180<=lon<=180

def parse_time(v):
    if not v:return None
    try:return datetime.datetime.fromisoformat(str(v).replace('Z','+00:00')).astimezone(datetime.timezone.utc)
    except:return None

def active_epoch(start,end):
    s=parse_time(start); e=parse_time(end)
    return (s is None or s<=NOW) and (e is None or e>=NOW)

# NOAA Aviation Weather: worldwide station metadata + current METAR observations.
try:
    raw=gzip.decompress(get('https://aviationweather.gov/data/cache/stations.cache.json.gz'))
    data=json.loads(raw); rows=data if isinstance(data,list) else data.get('data') or data.get('stations') or []
    stations=[]
    for r in rows:
        lat=r.get('latitude',r.get('lat')); lon=r.get('longitude',r.get('lon'))
        try: lat=float(lat); lon=float(lon)
        except: continue
        if not valid(lat,lon): continue
        sid=str(r.get('icaoId') or r.get('icao_id') or r.get('id') or r.get('stationId') or '').strip()
        if not sid: continue
        stations.append({'id':sid,'name':r.get('site') or r.get('name') or sid,'lat':lat,'lon':lon,'elevationM':r.get('elev') or r.get('elevation_m'),'country':r.get('country'),'state':r.get('state'),'wmoId':r.get('wmoId') or r.get('wmo_id'),'family':'metar-weather','network':'NOAA Aviation Weather / WMO-METAR'})
    write('weather_stations.json',{'updatedAt':NOW.isoformat(),'source':'NOAA Aviation Weather worldwide station cache','stations':stations})
except Exception as e: print('weather stations:',e)

try:
    raw=gzip.decompress(get('https://aviationweather.gov/data/cache/metars.cache.csv.gz')).decode('utf-8','replace')
    reader=csv.DictReader(io.StringIO(raw)); obs=[]
    for r in reader:
        sid=r.get('station_id') or r.get('stationId') or r.get('icaoId') or r.get('icao_id'); lat=r.get('latitude') or r.get('lat'); lon=r.get('longitude') or r.get('lon')
        try: lat=float(lat); lon=float(lon)
        except: continue
        if not sid or not valid(lat,lon): continue
        obs.append({'id':sid,'lat':lat,'lon':lon,'obsTime':r.get('observation_time') or r.get('obsTime'),'tempC':r.get('temp_c') or r.get('temp'),'dewpointC':r.get('dewpoint_c') or r.get('dewp'),'windDir':r.get('wind_dir_degrees') or r.get('wdir'),'windKt':r.get('wind_speed_kt') or r.get('wspd'),'visibility':r.get('visibility_statute_mi') or r.get('visib'),'raw':r.get('raw_text') or r.get('rawOb')})
    write('metar_observations.json',{'updatedAt':NOW.isoformat(),'source':'NOAA Aviation Weather worldwide METAR cache','observations':obs})
except Exception as e: print('metars:',e)

# Global seismic station metadata. Discover current FDSN station services from the
# official FDSN data-center registry. A verified fallback set prevents a registry
# outage from collapsing global coverage.
REGISTRY='https://www.fdsn.org/ws/datacenters/1/query?services=fdsnws-station-1'
FALLBACK=[
 ('EarthScope','https://service.earthscope.org/fdsnws/station/1/'),
 ('GEOFON','https://geofon.gfz.de/fdsnws/station/1/'),
 ('BGR','https://eida.bgr.de/fdsnws/station/1/'),
 ('UIB-NORSAR','https://eida.geo.uib.no/fdsnws/station/1/'),
 ('KOERI','https://eida.koeri.boun.edu.tr/fdsnws/station/1/'),
 ('INGV','https://webservices.ingv.it/fdsnws/station/1/'),
 ('NCEDC','https://service.ncedc.org/fdsnws/station/1/'),
 ('SCEDC','https://service.scedc.caltech.edu/fdsnws/station/1/'),
]

def discover_station_sources():
    discovered=[]; seen=set(); registry_error=None
    try:
        root=json.loads(get(REGISTRY,20).decode('utf-8','replace'))
        def walk(node,center=None):
            if isinstance(node,list):
                for x in node: walk(x,center)
                return
            if not isinstance(node,dict): return
            here=center
            if 'services' in node:
                here=str(node.get('name') or node.get('id') or node.get('title') or center or 'FDSN')
            name=str(node.get('name') or node.get('service') or '').lower()
            compat=node.get('compatible-with') or node.get('compatible_with') or []
            if isinstance(compat,str): compat=[compat]
            is_station=name=='fdsnws-station-1' or any(str(x).lower()=='fdsnws-station-1' for x in compat)
            if is_station:
                url=node.get('url') or node.get('endpoint') or node.get('base_url') or node.get('baseUrl')
                if isinstance(url,str) and url.startswith(('http://','https://')):
                    key=url.rstrip('/')
                    if key not in seen:
                        seen.add(key); discovered.append((here or 'FDSN',key+'/'))
            for k,v in node.items():
                if k!='services': walk(v,here)
            if 'services' in node: walk(node['services'],here)
        walk(root)
    except Exception as e:
        registry_error=str(e)
    for p,u in FALLBACK:
        key=u.rstrip('/')
        if key not in seen:
            seen.add(key); discovered.append((p,key+'/'))
    # Stable ordering makes conflict handling reproducible.
    discovered.sort(key=lambda x:(str(x[0]).lower(),x[1]))
    return discovered,registry_error

def station_query(base):
    params={'level':'station','format':'text','starttime':f'{NOW.year}-01-01','endtime':f'{NOW.year+1}-01-01','nodata':'404'}
    return base.rstrip('/')+'/query?'+urllib.parse.urlencode(params)

def fetch_station_provider(provider,base):
    text=get(station_query(base),30).decode('utf-8','replace'); grouped={}; raw_count=0
    for line in text.splitlines():
        if not line or line.startswith('#'): continue
        p=[x.strip() for x in line.split('|')]
        if len(p)<6: continue
        try: lat=float(p[2]); lon=float(p[3]); elev=float(p[4] or 0)
        except: continue
        if not valid(lat,lon): continue
        net,sta=p[0],p[1]
        if not net or not sta: continue
        start=p[6] if len(p)>6 else None; end=p[7] if len(p)>7 else None
        if not active_epoch(start,end): continue
        raw_count+=1; sid=f'{net}.{sta}'
        c={'id':sid,'network':net,'station':sta,'lat':lat,'lon':lon,'elevationM':elev,'name':p[5] or sid,'family':'seismic','coordinateSource':provider,'coordinateService':base,'coordinateVerified':True,'epochStart':start or None,'epochEnd':end or None}
        old=grouped.get(sid)
        # A station can have historical relocations. Prefer the active epoch with
        # the newest explicit start time; never average coordinates.
        if old is None or (parse_time(c['epochStart']) or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)) > (parse_time(old['epochStart']) or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)):
            grouped[sid]=c
    return list(grouped.values()),raw_count

FDSN_STATION_SOURCES,registry_error=discover_station_sources()
provider_rows={}; provider_status=[]
workers=max(1,min(12,len(FDSN_STATION_SOURCES)))
with ThreadPoolExecutor(max_workers=workers) as ex:
    futures={ex.submit(fetch_station_provider,p,u):(p,u) for p,u in FDSN_STATION_SOURCES}
    for fut in as_completed(futures):
        provider,url=futures[fut]
        try:
            rows,raw_count=fut.result(); provider_rows[(provider,url)]=rows; provider_status.append({'provider':provider,'service':url,'status':'ok','records':len(rows),'rawCurrentEpochRows':raw_count})
        except Exception as e:
            provider_rows[(provider,url)]=[]; provider_status.append({'provider':provider,'service':url,'status':'unavailable','error':str(e)}); print('seismic provider',provider,e)

station_candidates={}
for provider,url in FDSN_STATION_SOURCES:
    for c in provider_rows.get((provider,url),[]): station_candidates.setdefault(c['id'],[]).append(c)

stations=[]; coordinate_conflicts=[]
for sid,candidates in station_candidates.items():
    # Prefer the newest active epoch. Tie-break deterministically by provider.
    candidates.sort(key=lambda c:((parse_time(c.get('epochStart')) or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)),str(c.get('coordinateSource',''))),reverse=True)
    kept=dict(candidates[0]); providers=[]
    for c in candidates:
        p=c.get('coordinateSource')
        if p and p not in providers: providers.append(p)
        dlat=abs(float(kept['lat'])-float(c['lat'])); dlon=abs(float(kept['lon'])-float(c['lon']))
        if dlat>0.02 or dlon>0.02:
            coordinate_conflicts.append({'id':sid,'keptSource':kept.get('coordinateSource'),'keptEpochStart':kept.get('epochStart'),'kept':[kept['lat'],kept['lon']],'otherSource':c.get('coordinateSource'),'otherEpochStart':c.get('epochStart'),'other':[c['lat'],c['lon']]})
    kept['providers']=providers; kept['source']=' + '.join(providers)+' FDSN'; stations.append(kept)
stations.sort(key=lambda x:x['id'])

write('seismic_stations.json',{
 'updatedAt':NOW.isoformat(),
 'source':'Official FDSN data-center registry + verified fallback station services',
 'registry':'FDSN Data Center Registry',
 'registryStatus':'ok' if registry_error is None else 'fallback-active',
 'registryError':registry_error,
 'discoveredServiceCount':len(FDSN_STATION_SOURCES),
 'coordinatePolicy':'Render exact upstream coordinates from the newest active station epoch. Never derive sensor coordinates from earthquake/event locations and never average conflicting station coordinates. Cross-provider conflicts are retained in coordinateConflicts for audit.',
 'providers':sorted(provider_status,key=lambda x:(str(x.get('provider','')).lower(),str(x.get('service','')))),
 'coordinateConflicts':coordinate_conflicts,
 'stations':stations
})

# NASA FIRMS global VIIRS NOAA-20/21 hotspots. Requires repository secret FIRMS_MAP_KEY.
key=os.environ.get('FIRMS_MAP_KEY','').strip()
if key:
    hotspots=[]
    for sensor in ('VIIRS_NOAA20_NRT','VIIRS_NOAA21_NRT'):
        try:
            raw=get(f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{sensor}/world/1').decode('utf-8','replace')
            for r in csv.DictReader(io.StringIO(raw)):
                try: lat=float(r['latitude']); lon=float(r['longitude'])
                except: continue
                if not valid(lat,lon): continue
                hotspots.append({'id':f"{sensor}:{r.get('acq_date','')}:{r.get('acq_time','')}:{lat:.4f}:{lon:.4f}",'lat':lat,'lon':lon,'sensor':sensor,'acqDate':r.get('acq_date'),'acqTime':r.get('acq_time'),'confidence':r.get('confidence'),'frp':r.get('frp'),'brightT4':r.get('bright_ti4'),'daynight':r.get('daynight'),'family':'satellite-fire-detection'})
        except Exception as e: print('firms',sensor,e)
    write('firms_hotspots.json',{'updatedAt':NOW.isoformat(),'source':'NASA FIRMS VIIRS NOAA-20/21 NRT','hotspots':hotspots})
else:
    print('FIRMS_MAP_KEY not configured; leaving FIRMS snapshot unchanged')
