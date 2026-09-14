#!/usr/bin/env python3
import datetime, json, pathlib, urllib.parse, urllib.request

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
if not station_path.exists():
    raise SystemExit('seismic_stations.json missing')

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
raw=get(url).decode('utf-8','replace')
active={}
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

obj={
    'updatedAt':now.isoformat(),
    'windowStart':start.isoformat(),
    'windowEnd':now.isoformat(),
    'source':'NSF EarthScope FDSN availability',
    'meaning':'Station returned waveform availability during the recent window. This is a sensor heartbeat/data-presence signal, not a claim that a local earthquake or tremor occurred.',
    'activeStations':list(active.values())
}
(OUT/'seismic_activity.json').write_text(json.dumps(obj,separators=(',',':')))
print('seismic heartbeat stations',len(active))
