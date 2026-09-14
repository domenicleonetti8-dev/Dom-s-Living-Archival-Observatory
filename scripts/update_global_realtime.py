#!/usr/bin/env python3
import csv, gzip, io, json, os, pathlib, urllib.request, datetime

OUT=pathlib.Path('data/global-realtime'); OUT.mkdir(parents=True, exist_ok=True)
UA={'User-Agent':'DOM-Living-Observatory/1.0'}

def get(url):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=90) as r:return r.read()

def write(name,obj):
    (OUT/name).write_text(json.dumps(obj,separators=(',',':')))

# NOAA Aviation Weather: worldwide station metadata + current METAR observations.
try:
    raw=gzip.decompress(get('https://aviationweather.gov/data/cache/stations.cache.json.gz'))
    data=json.loads(raw)
    rows=data if isinstance(data,list) else data.get('data') or data.get('stations') or []
    stations=[]
    for r in rows:
        lat=r.get('latitude',r.get('lat')); lon=r.get('longitude',r.get('lon'))
        try: lat=float(lat); lon=float(lon)
        except: continue
        if not(-90<=lat<=90 and -180<=lon<=180): continue
        sid=str(r.get('icaoId') or r.get('icao_id') or r.get('id') or r.get('stationId') or '').strip()
        if not sid: continue
        stations.append({'id':sid,'name':r.get('site') or r.get('name') or sid,'lat':lat,'lon':lon,'elevationM':r.get('elev') or r.get('elevation_m'),'country':r.get('country'),'state':r.get('state'),'wmoId':r.get('wmoId') or r.get('wmo_id'),'family':'metar-weather','network':'NOAA Aviation Weather / WMO-METAR'})
    write('weather_stations.json',{'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'NOAA Aviation Weather worldwide station cache','stations':stations})
except Exception as e: print('weather stations:',e)

try:
    raw=gzip.decompress(get('https://aviationweather.gov/data/cache/metars.cache.csv.gz')).decode('utf-8','replace')
    reader=csv.DictReader(io.StringIO(raw)); obs=[]
    for r in reader:
        sid=r.get('station_id') or r.get('stationId') or r.get('icaoId') or r.get('icao_id')
        lat=r.get('latitude') or r.get('lat'); lon=r.get('longitude') or r.get('lon')
        try: lat=float(lat); lon=float(lon)
        except: continue
        if not sid or not(-90<=lat<=90 and -180<=lon<=180): continue
        obs.append({'id':sid,'lat':lat,'lon':lon,'obsTime':r.get('observation_time') or r.get('obsTime'),'tempC':r.get('temp_c') or r.get('temp'),'dewpointC':r.get('dewpoint_c') or r.get('dewp'),'windDir':r.get('wind_dir_degrees') or r.get('wdir'),'windKt':r.get('wind_speed_kt') or r.get('wspd'),'visibility':r.get('visibility_statute_mi') or r.get('visib'),'raw':r.get('raw_text') or r.get('rawOb')})
    write('metar_observations.json',{'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'NOAA Aviation Weather worldwide METAR cache','observations':obs})
except Exception as e: print('metars:',e)

# EarthScope/FDSN global seismic station metadata.
try:
    t=get('https://service.earthscope.org/fdsnws/station/1/query?level=station&format=text&starttime=2026-01-01&endtime=2027-01-01&nodata=404').decode('utf-8','replace')
    seen=set(); stations=[]
    for line in t.splitlines():
        if not line or line.startswith('#'): continue
        p=line.split('|')
        if len(p)<6: continue
        try: lat=float(p[2]); lon=float(p[3]); elev=float(p[4] or 0)
        except: continue
        sid=f'{p[0]}.{p[1]}'
        if sid in seen: continue
        seen.add(sid); stations.append({'id':sid,'network':p[0],'station':p[1],'lat':lat,'lon':lon,'elevationM':elev,'name':p[5] or sid,'family':'seismic','source':'NSF EarthScope FDSN'})
    write('seismic_stations.json',{'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'NSF EarthScope FDSN','stations':stations})
except Exception as e: print('seismic:',e)

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
                hotspots.append({'id':f"{sensor}:{r.get('acq_date','')}:{r.get('acq_time','')}:{lat:.4f}:{lon:.4f}",'lat':lat,'lon':lon,'sensor':sensor,'acqDate':r.get('acq_date'),'acqTime':r.get('acq_time'),'confidence':r.get('confidence'),'frp':r.get('frp'),'brightT4':r.get('bright_ti4'),'daynight':r.get('daynight'),'family':'satellite-fire-detection'})
        except Exception as e: print('firms',sensor,e)
    write('firms_hotspots.json',{'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'NASA FIRMS VIIRS NOAA-20/21 NRT','hotspots':hotspots})
else:
    print('FIRMS_MAP_KEY not configured; leaving FIRMS snapshot unchanged')
