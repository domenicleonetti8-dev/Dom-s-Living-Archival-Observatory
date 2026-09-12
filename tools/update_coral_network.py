#!/usr/bin/env python3
import io,json,re,urllib.request,zipfile,xml.etree.ElementTree as ET
from datetime import datetime,timezone
from pathlib import Path

OUT=Path('data/coral-live.json')
PAGE='https://coralreefwatch.noaa.gov/product/vs/data.php'
XLSX='https://coralreefwatch.noaa.gov/product/vs/CRW_RVS_Name_and_Marker_Location.xlsx'
UA='D.O.M.-Living-Archival-Observatory/2026 (+public research; coral network)'

def now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
def get(url,binary=False):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'*/*'})
    with urllib.request.urlopen(req,timeout=35) as r:
        b=r.read(); return b if binary else b.decode('utf-8','replace')
def norm(s): return re.sub(r'[^a-z0-9]+','',str(s).lower())
def clean_html(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s)).strip()
def stress_rank(s):
    t=str(s).lower()
    if 'alert level 5' in t:return 7
    if 'alert level 4' in t:return 6
    if 'alert level 3' in t:return 5
    if 'alert level 2' in t:return 4
    if 'alert level 1' in t:return 3
    if 'warning' in t:return 2
    if 'watch' in t:return 1
    if 'no stress' in t:return 0
    return -1

def parse_status_page(markup):
    latest=None
    m=re.search(r'Latest Data Date:\s*([^<\n]+)',markup,re.I)
    if m: latest=clean_html(m.group(1))
    out={}
    for tr in re.findall(r'<tr\b[^>]*>(.*?)</tr>',markup,re.I|re.S):
        cells=re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',tr,re.I|re.S)
        if len(cells)<2: continue
        name=clean_html(cells[0]); stress=clean_html(cells[1])
        if not name or stress_rank(stress)<0: continue
        out[norm(name)]={'name':name,'stressLevel':stress,'stressRank':stress_rank(stress)}
    return latest,out

def xlsx_rows(blob):
    z=zipfile.ZipFile(io.BytesIO(blob)); ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si',ns): shared.append(''.join(t.text or '' for t in si.findall('.//m:t',ns)))
    sheet=next((n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')),None)
    if not sheet: return []
    root=ET.fromstring(z.read(sheet)); rows=[]
    for r in root.findall('.//m:sheetData/m:row',ns):
        vals=[]
        for c in r.findall('m:c',ns):
            typ=c.attrib.get('t',''); v=c.find('m:v',ns); x=''
            if typ=='inlineStr': x=''.join(t.text or '' for t in c.findall('.//m:t',ns))
            elif v is not None:
                x=v.text or ''
                if typ=='s':
                    try:x=shared[int(x)]
                    except Exception: pass
            vals.append(x)
        if any(str(x).strip() for x in vals): rows.append(vals)
    return rows

def parse_locations(blob):
    rows=xlsx_rows(blob); header_i=None; cols={}
    for i,row in enumerate(rows[:30]):
        n=[norm(x) for x in row]
        name_i=next((j for j,x in enumerate(n) if 'station' in x and 'name' in x or x=='name'),None)
        lat_i=next((j for j,x in enumerate(n) if 'lat' in x),None)
        lon_i=next((j for j,x in enumerate(n) if 'lon' in x or 'long' in x),None)
        if None not in (name_i,lat_i,lon_i): header_i=i; cols={'name':name_i,'lat':lat_i,'lon':lon_i}; break
    if header_i is None: raise ValueError('NOAA coral station location columns not found')
    out={}
    for row in rows[header_i+1:]:
        try:
            name=str(row[cols['name']]).strip(); lat=float(row[cols['lat']]); lon=float(row[cols['lon']])
        except Exception: continue
        if name and -90<=lat<=90 and -180<=lon<=180: out[norm(name)]={'name':name,'lat':lat,'lon':lon}
    return out

def main():
    fetched=now_iso(); latest,status=parse_status_page(get(PAGE)); loc=parse_locations(get(XLSX,True)); stations=[]
    for key,s in status.items():
        p=loc.get(key)
        if not p: continue
        stations.append({**s,'lat':p['lat'],'lon':p['lon'],'source':'NOAA Coral Reef Watch Regional Virtual Station','sourceUrl':PAGE,'locationSource':XLSX,'observationDateLabel':latest})
    payload={'schema':'dom-coral-live-v1','fetchedAt':fetched,'source':'NOAA Coral Reef Watch','sourceUrl':PAGE,'locationSource':XLSX,'networkType':'satellite-based 5 km Regional Virtual Stations','stationCount':len(stations),'latestDataDateLabel':latest,'truthNote':'Stress level is NOAA thermal-stress status, not direct observation of coral mortality. Grey/dead styling requires an explicit in-situ bleaching or mortality observation.','stations':stations}
    if len(stations)<150: raise SystemExit(f'coral station join too small: {len(stations)}')
    OUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print(json.dumps({'stationCount':len(stations),'latestDataDateLabel':latest},sort_keys=True))
if __name__=='__main__': main()
