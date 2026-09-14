#!/usr/bin/env python3
import datetime, json, pathlib, urllib.parse, urllib.request, urllib.error

OUT=pathlib.Path('data/global-realtime')
OUT.mkdir(parents=True, exist_ok=True)
UA={'User-Agent':'DOM-Living-Observatory/1.0'}

def get(url):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=90) as r:
        return r.read()

now=datetime.datetime.now(datetime.timezone.utc)
start=now-datetime.timedelta(minutes=20)
station_path=OUT/'seismic_stations.json'
stations=[]
if station_path.exists():
    stations=json.loads(station_path.read_text()).get('stations',[])
index={str(s.get('id','')):s for s in stations if s.get('id')}
params={
    'format':'text',
    'starttime':start.strftime('%Y-%m-%dT%H:%M:%S'),
    'endtime':now.strftime('%Y-%m-%dT%H:%M:%S'),
    'merge':'quality',
    'show':'latestupdate',
    'nodata':'404'
}
url='https://service.earthscope.org/fdsnws/availability/1/query?'+urllib.parse.urlencode(params)
active={}
status='LIVE'
notice='Recent waveform availability returned by EarthScope.'
try:
    raw=get(url).decode('utf-8','replace')
    for line in raw.splitlines():
        if not line or line.startswith('#'): continue
        p=[x.strip() for x in (line.split('|') if '|' in line else line.split())]
        if len(p)<2: continue
        sid=f'{p[0]}.{p[1]}'
        s=index.get(sid)
        if not s: continue
        a=active.setdefault(sid,{
            'id':sid,'network':s.get('network'),'station':s.get('station'),
            'name':s.get('name') or sid,'lat':s.get('lat'),'lon':s.get('lon'),
            'family':'seismic-waveform-heartbeat','source':'NSF EarthScope FDSN availability',
            'channels':0,'windowMinutes':20
        })
        a['channels']+=1
        if len(p)>=8: a['latestSampleEnd']=p[7]
        if len(p)>=9: a['latestUpdate']=p[8]
except urllib.error.HTTPError as e:
    status='UPSTREAM_UNAVAILABLE' if e.code in (404,410,503) else f'HTTP_{e.code}'
    notice=f'EarthScope FDSN availability endpoint returned HTTP {e.code}. No recent-waveform activity is inferred while the service is unavailable.'
except Exception as e:
    status='UPSTREAM_UNAVAILABLE'
    notice=f'EarthScope recent availability could not be verified: {e}. No recent-waveform activity is inferred.'

obj={
    'updatedAt':now.isoformat(),
    'windowStart':start.isoformat(),
    'windowEnd':now.isoformat(),
    'status':status,
    'source':'NSF EarthScope FDSN availability',
    'serviceNotice':notice,
    'meaning':'Station presence is independent of this file. activeStations is populated only when EarthScope explicitly returns recent waveform availability. An unavailable service never becomes a synthetic tremor or activity signal.',
    'activeStations':list(active.values())
}
(OUT/'seismic_activity.json').write_text(json.dumps(obj,separators=(',',':')))
print('seismic heartbeat status',status,'stations',len(active))
