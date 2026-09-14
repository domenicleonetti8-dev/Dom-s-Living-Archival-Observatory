#!/usr/bin/env python3
import datetime, json, pathlib, urllib.parse, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

OUT=pathlib.Path('data/global-realtime')
OUT.mkdir(parents=True, exist_ok=True)
UA={'User-Agent':'DOM-Living-Observatory/1.0'}

def get(url,timeout=20):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return r.read()

now=datetime.datetime.now(datetime.timezone.utc)
start=now-datetime.timedelta(minutes=20)
station_path=OUT/'seismic_stations.json'
stations=[]
if station_path.exists():
    stations=json.loads(station_path.read_text()).get('stations',[])
index={str(s.get('id','')):s for s in stations if s.get('id')}

PROVIDERS=[
    ('GFZ GEOFON','https://geofon.gfz.de/fdsnws/availability/1/query',['GE','II','IC']),
    ('EIDA BGR','https://eida.bgr.de/fdsnws/availability/1/query',['GR','GQ','HS','TH','LE','BQ','NH','KQ','SX','RN']),
    ('EIDA UIB-NORSAR','https://eida.geo.uib.no/fdsnws/availability/1/query',['IU','NO','NS','QE']),
    ('EIDA KOERI','https://eida.koeri.boun.edu.tr/fdsnws/availability/1/query',['KO','IJ','TL']),
    ('EIDA NIEP','https://eida-sc3.infp.ro/fdsnws/availability/1/query',['RO','BS','MD','UD','UT','S5','RQ','AM']),
]

# EarthScope explicitly retired this availability endpoint in 2026. Keep that fact in status,
# but do not query it and do not turn the outage into synthetic sensor activity.
provider_status=[{'provider':'NSF EarthScope','status':'retired','http':410}]

def fetch_network(provider,base,net):
    params={
        'format':'text',
        'net':net,
        'cha':'*Z',
        'start':start.strftime('%Y-%m-%dT%H:%M:%S'),
        'end':now.strftime('%Y-%m-%dT%H:%M:%S'),
        'merge':'quality',
        'nodata':'404'
    }
    url=base+'?'+urllib.parse.urlencode(params)
    try:
        raw=get(url).decode('utf-8','replace')
    except urllib.error.HTTPError as e:
        return provider,net,[],{'network':net,'status':'no-data' if e.code in (204,404) else 'unavailable','http':e.code}
    except Exception as e:
        return provider,net,[],{'network':net,'status':'unavailable','error':str(e)}
    rows=[]
    for line in raw.splitlines():
        if not line or line.startswith('#'): continue
        p=[x.strip() for x in (line.split('|') if '|' in line else line.split())]
        if len(p)>=2: rows.append(p)
    return provider,net,rows,{'network':net,'status':'ok','rowsReturned':len(rows)}

tasks=[]
with ThreadPoolExecutor(max_workers=12) as ex:
    for provider,base,nets in PROVIDERS:
        for net in nets:
            tasks.append(ex.submit(fetch_network,provider,base,net))
    provider_rows={p:[] for p,_,_ in PROVIDERS}; network_status={p:[] for p,_,_ in PROVIDERS}
    for fut in as_completed(tasks):
        provider,net,rows,status=fut.result(); provider_rows[provider].extend(rows); network_status[provider].append(status)

active={}
for provider,_,nets in PROVIDERS:
    matched=0
    for p in provider_rows.get(provider,[]):
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
    statuses=network_status.get(provider,[])
    ok=sum(1 for x in statuses if x['status']=='ok')
    provider_status.append({'provider':provider,'status':'ok' if ok else 'unavailable','networksResponded':ok,'networksQueried':len(nets),'stationsMatched':matched,'networks':statuses})

responding=[p for p in provider_status if p.get('status')=='ok']
status='PARTIAL' if responding else 'UPSTREAM_UNAVAILABLE'
notice=(f'{len(responding)} availability providers returned recent data; {len(active)} stations had verified recent vertical-channel waveform availability.') if responding else 'No configured availability provider returned recent waveform data; no sensor movement is inferred.'
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
print('seismic heartbeat status',status,'providers',len(responding),'stations',len(active))
