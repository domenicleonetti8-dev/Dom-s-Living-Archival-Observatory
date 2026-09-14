#!/usr/bin/env python3
import datetime, json, pathlib, urllib.request

OUT=pathlib.Path('data/global-realtime'); OUT.mkdir(parents=True,exist_ok=True)
API='https://www.gdacs.org/gdacsapi/api/events/geteventlist/events4app'
GEOJSON='https://www.gdacs.org/contentdata/xml/gdacsAPP_Home.geojson'
UA={'User-Agent':'DOM-Living-Observatory/1.0','Accept':'application/json, application/geo+json'}
KIND={'EQ':'Earthquake','TC':'Severe Storm','FL':'Flood','VO':'Volcano','WF':'Wildfire','DR':'Drought'}

def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=90) as r:return json.load(r)

def valid(lat,lon):
    try:return -90<=float(lat)<=90 and -180<=float(lon)<=180
    except:return False

def points(g):
    out=[]
    def walk(x):
        if isinstance(x,list) and len(x)>=2 and all(isinstance(v,(int,float)) for v in x[:2]):
            if valid(x[1],x[0]):out.append((float(x[0]),float(x[1])))
        elif isinstance(x,list):
            for y in x:walk(y)
    if isinstance(g,dict):walk(g.get('coordinates'))
    return out

def center(g):
    p=points(g)
    if not p:return None
    if isinstance(g,dict) and g.get('type')=='Point':return p[0][1],p[0][0],'source-point'
    # Circular mean longitude avoids antimeridian centroids jumping across the planet.
    import math
    lat=sum(x[1] for x in p)/len(p)
    sin=sum(math.sin(math.radians(x[0])) for x in p)
    cos=sum(math.cos(math.radians(x[0])) for x in p)
    lon=math.degrees(math.atan2(sin,cos))
    return (lat,lon,'source-geometry-centroid') if valid(lat,lon) else None

def first(p,*names):
    for n in names:
        v=p.get(n)
        if v not in (None,''):return v
    return None

def feature_rows(raw):
    if isinstance(raw,dict) and isinstance(raw.get('features'),list):return raw['features']
    if isinstance(raw,dict):
        for key in ('events','data','results'):
            rows=raw.get(key)
            if isinstance(rows,list):
                out=[]
                for x in rows:
                    if not isinstance(x,dict):continue
                    g=x.get('geometry')
                    props=x.get('properties') if isinstance(x.get('properties'),dict) else x
                    out.append({'type':'Feature','id':x.get('id'),'geometry':g,'properties':props})
                return out
    return []

def normalize(features):
    events=[]; quarantined=0
    for f in features:
        p=f.get('properties') or {}
        code=str(first(p,'eventtype','eventType','event_type','type') or '').upper()
        kind=KIND.get(code)
        if not kind:continue
        g=f.get('geometry')
        c=center(g)
        if not c:
            # Some API records expose lon/lat as properties instead of GeoJSON geometry.
            lat=first(p,'latitude','lat'); lon=first(p,'longitude','lon')
            if valid(lat,lon):
                lat=float(lat); lon=float(lon); precision='source-point-properties'; g={'type':'Point','coordinates':[lon,lat]}
            else:
                quarantined+=1; continue
        else:lat,lon,precision=c
        eid=str(first(p,'eventid','eventId','event_id','id') or f.get('id') or '')
        episode=str(first(p,'episodeid','episodeId','episode_id') or '')
        title=str(first(p,'name','eventname','eventName','title','description') or f'{kind} {eid}')
        alert=str(first(p,'alertlevel','alertLevel','alert_level') or 'unknown')
        country=first(p,'country','countryname','countryName')
        observed=first(p,'fromdate','fromDate','from_date','date','datemodified','toDate','todate')
        url=first(p,'url','link','detailUrl')
        events.append({'id':f'gdacs:{code}:{eid}:{episode}','gdacsEventId':eid,'episodeId':episode,'eventCode':code,'kind':kind,'title':title,'lat':lat,'lon':lon,'locationPrecision':precision,'sourceGeometry':g,'alertLevel':alert,'country':country,'observedAt':observed,'source':'Global Disaster Alert and Coordination System (GDACS)','agency':'UN / European Commission JRC GDACS','sourceType':'global-disaster-system','authoritative':True,'detailUrl':url,'truthClass':'curated-global-disaster-event'})
    return events,quarantined

now=datetime.datetime.now(datetime.timezone.utc)
errors=[]; used=None; events=[]; quarantined=0
for url in (API,GEOJSON):
    try:
        raw=get_json(url); rows=feature_rows(raw)
        if not rows:raise RuntimeError('source returned no event records')
        events,quarantined=normalize(rows); used=url
        if events:break
        errors.append(f'{url}: no supported current hazard records')
    except Exception as e:errors.append(f'{url}: {e}')

if used and events:
    obj={'updatedAt':now.isoformat(),'status':'CURRENT','source':'GDACS worldwide event feed','sourceUrl':used,'events':events,'quarantined':quarantined,'meaning':'Worldwide curated disaster events. Coordinates remain bound to GDACS source geometry. Wildfire records are GDACS/GWIS wildfire events, not raw satellite thermal anomalies.'}
else:
    obj={'updatedAt':now.isoformat(),'status':'UPSTREAM_UNAVAILABLE','source':'GDACS worldwide event feed','sourceUrl':API,'events':[],'quarantined':quarantined,'serviceNotice':' | '.join(errors),'meaning':'No disaster activity is inferred when GDACS sources are unavailable.'}
(OUT/'gdacs_events.json').write_text(json.dumps(obj,separators=(',',':')))
print('gdacs events',len(obj['events']),obj['status'],'source',obj.get('sourceUrl'))
