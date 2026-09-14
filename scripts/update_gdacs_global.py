#!/usr/bin/env python3
import datetime, json, pathlib, urllib.request

OUT=pathlib.Path('data/global-realtime'); OUT.mkdir(parents=True,exist_ok=True)
URL='https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP'
UA={'User-Agent':'DOM-Living-Observatory/1.0','Accept':'application/json, application/geo+json'}
KIND={'EQ':'Earthquake','TC':'Severe Storm','FL':'Flood','VO':'Volcano','WF':'Wildfire','DR':'Drought'}

def get():
    with urllib.request.urlopen(urllib.request.Request(URL,headers=UA),timeout=90) as r:return json.load(r)

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
    return sum(x[1] for x in p)/len(p),sum(x[0] for x in p)/len(p),'source-geometry-centroid'

def first(p,*names):
    for n in names:
        v=p.get(n)
        if v not in (None,''):return v
    return None

now=datetime.datetime.now(datetime.timezone.utc)
try:
    raw=get(); features=raw.get('features',[]) if isinstance(raw,dict) else []
    events=[]; quarantined=0
    for f in features:
        p=f.get('properties') or {}; code=str(first(p,'eventtype','eventType','type') or '').upper()
        kind=KIND.get(code)
        if not kind:continue
        c=center(f.get('geometry'))
        if not c:quarantined+=1;continue
        lat,lon,precision=c
        eid=str(first(p,'eventid','eventId','id') or f.get('id') or '')
        episode=str(first(p,'episodeid','episodeId') or '')
        title=str(first(p,'name','eventname','title','description') or f'{kind} {eid}')
        alert=str(first(p,'alertlevel','alertLevel') or 'unknown')
        country=first(p,'country','countryname','countryName')
        fromdate=first(p,'fromdate','fromDate','date','datemodified')
        url=first(p,'url','link')
        events.append({'id':f'gdacs:{code}:{eid}:{episode}','gdacsEventId':eid,'episodeId':episode,'eventCode':code,'kind':kind,'title':title,'lat':lat,'lon':lon,'locationPrecision':precision,'sourceGeometry':f.get('geometry'),'alertLevel':alert,'country':country,'observedAt':fromdate,'source':'Global Disaster Alert and Coordination System (GDACS)','agency':'UN / European Commission JRC GDACS','sourceType':'global-disaster-system','authoritative':True,'detailUrl':url,'truthClass':'curated-global-disaster-event'})
    obj={'updatedAt':now.isoformat(),'status':'CURRENT','source':'GDACS EVENTS4APP','sourceUrl':URL,'events':events,'quarantined':quarantined,'meaning':'Worldwide curated disaster events. Coordinates remain bound to GDACS source geometry. Wildfire records here are GDACS wildfire events, not raw satellite thermal anomalies.'}
except Exception as e:
    obj={'updatedAt':now.isoformat(),'status':'UPSTREAM_UNAVAILABLE','source':'GDACS EVENTS4APP','sourceUrl':URL,'events':[],'quarantined':0,'serviceNotice':str(e),'meaning':'No disaster activity is inferred when GDACS is unavailable.'}
(OUT/'gdacs_events.json').write_text(json.dumps(obj,separators=(',',':')))
print('gdacs events',len(obj['events']),obj['status'])
