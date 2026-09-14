#!/usr/bin/env python3
import json, pathlib, re, urllib.request
from datetime import datetime, timezone

URL='https://nasagrace.unl.edu/'
OUT=pathlib.Path('data/global-hydrology.json')

def fetch_text(url):
    req=urllib.request.Request(url,headers={'User-Agent':'D.O.M.-Hazard-Observatory/1.0'})
    with urllib.request.urlopen(req,timeout=30) as r:
        return r.read().decode('utf-8','replace')

def latest_product_date(html):
    dates=[]
    for token in re.findall(r'\b20\d{6}\b',html):
        try: dates.append(datetime.strptime(token,'%Y%m%d').date())
        except ValueError: pass
    if not dates: raise RuntimeError('no GRACE-FO product date found')
    return max(dates).isoformat()

def main():
    now=datetime.now(timezone.utc)
    html=fetch_text(URL)
    product_date=latest_product_date(html)
    doc={
      'schema':'dom-global-hydrology-source-v1',
      'status':'source-connected',
      'source':'NASA GSFC GRACE-FO Groundwater and Soil Moisture Drought Indicators',
      'publisher':'NASA Goddard Space Flight Center / National Drought Mitigation Center, University of Nebraska-Lincoln',
      'sourceUrl':URL,
      'coverage':'global land',
      'resolutionDegrees':0.25,
      'cadence':'weekly',
      'latestProductDate':product_date,
      'observations':['groundwater percentile','root-zone soil-moisture percentile','surface soil-moisture percentile'],
      'basis':'GRACE-FO terrestrial water storage assimilated with land-surface observations/modeling',
      'healthIndex':None,
      'qualification':'SOURCE_CONNECTED_INDEX_WITHHELD',
      'caveat':'This connects a current global hydrology observation product. D.O.M. does not convert the spatial percentile fields into one global water-health score until a documented area-weighted aggregation and uncertainty/coverage qualification are implemented.',
      'verifiedAsOf':now.date().isoformat(),
      'fetchedAt':now.replace(microsecond=0).isoformat().replace('+00:00','Z')
    }
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(doc,indent=2,sort_keys=True)+'\n')
    print(f"GLOBAL_HYDROLOGY=PASS product={product_date}")

if __name__=='__main__': main()
