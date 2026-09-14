#!/usr/bin/env python3
import datetime, json, pathlib, urllib.parse, urllib.request, urllib.error

OUT=pathlib.Path('data/global-realtime')
OUT.mkdir(parents=True, exist_ok=True)
UA={'User-Agent':'DOM-Living-Observatory/1.0'}

def get(url):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=75) as r:
        return r.read()

now=datetime.datetime.now(datetime.timezone.utc)
start=now-datetime.timedelta(minutes=20)
station_path=OUT/'seismic_stations.json'
stations=[]
if station_path.exists():
    stations=json.loads(station_path.read_text()).get('stations',[])
index={str(s.get('id','')):s for s in stations if s.get('id')}

PROVIDERS=[
    ('NSF EarthScope','https://service.earthscope.org/fdsnws/availability/1/query'),
    ('GFZ GEOFON','https://geofon.gfz.de/fdsnws/availability/1/query'),
    ('EIDA BGR','https://eida.bgr.de/fdsnws/availability/1/query'),
    ('EIDA UIB-NORSAR','https://eida.geo.uib.no/fdsnws/availability/1/query'),
    ('EIDA KOERI','https://eida.koeri.boun.edu.tr/fdsnws/availability/1/query'),
    ('EIDA NIEP','https://eida-sc3.infp.ro/fdsnws/availability/1/query'),
]
params={
    'format':'text',
    'starttime':start.strftime('%Y-%m-%dT%H:%M:%S'),
    'endtime':now.strftime('%Y-%m-%dT%H:%M:%S'),
    'channel':'*Z',
    'merge':'quality',
    'nodata':'404'
}
active={}; provider_status=[]
for provider,base in PROVIDERS:
    url=base+'?'+urllib.parse.urlencode(params)
    try:
        raw=get(url).decode('utf-8','replace'); matched=0; returned=0
        for line in raw.splitlines():
            if not line or line.startswith('#'): continue
            p=[x.strip() for x in (line.split('|') if '|' in line else line.split())]
            if len(p)<2: continue
            returned+=1
            sid=f'{p[0]}.{p[1]}'
            s=index.get(sid)
            if not s: continue
            matched+=1
            a=active.setdefault(sid,{
                'id':sid,'network':s.get('network'),'station':s.get('station'),
                'name':s.get('name') or sid,'lat':s.get('lat'),'lon':s.get('lon'),
                'family':'seismic-waveform-heartbeat','source':'Official FDSN availability',
                'coordinateSource':s.get('coordinateSource') or s.get('source'),
                'channels':0,'windowMinutes':20,'providers':[]
            })
            a['channels']+=1
            if provider not in a['providers']: a['providers'].append(provider)
        provider_status.append({'provider':provider,'status':'ok','rowsReturned':returned,'stationsMatched':matched})
    except urllib.error.HTTPError as e:
        provider_status.append({'provider':provider,'status':'unavailable','http':e.code})
    except Exception as e:
        provider_status.append({'provider':provider,'status':'unavailable','error':str(e)})

ok=[p for p in provider_status if p['status']=='ok']
status='LIVE' if ok and len(ok)==len(PROVIDERS) else ('PARTIAL' if ok else 'UPSTREAM_UNAVAILABLE')
notice=(f'{len(ok)}/{len(PROVIDERS)} official FDSN availability providers responded. '
        f'{len(active)} stations had verified recent vertical-channel waveform availability.') if ok else 'No configured FDSN availability provider responded; no recent-waveform activity is inferred.'
obj={
    'updatedAt':now.isoformat(),
    'windowStart':start.isoformat(),
    'windowEnd':now.isoformat(),
    'status':status,
    'source':'Federated official FDSN availability providers',
    'providers':provider_status,
    'serviceNotice':notice,
    'meaning':'activeStations contains only stations for which an official FDSN availability service reported waveform data in this window. Availability proves data presence, not shaking amplitude, local tremor, or earthquake magnitude.',
    'activeStations':list(active.values())
}
(OUT/'seismic_activity.json').write_text(json.dumps(obj,separators=(',',':')))
print('seismic heartbeat status',status,'providers',len(ok),'stations',len(active))
