#!/usr/bin/env python3
import csv
import html
import io
import json
import math
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path('data/live-vitals.json')
UA = 'D.O.M.-Living-Archival-Observatory/2026 (+public research; source-backed vitals)'
NOAA_CORAL_BSE = 'https://coralreefwatch.noaa.gov/data_current/5km/v3.1_op/daily/csv/5km-v3.1_stats-alert01_baa5-max-365d_dailyupdate.csv'
NOAA_CORAL_PAGE = 'https://coralreefwatch.noaa.gov/product/5km/index_5km_bse-365d.php'
NASA_SEA_LEVEL = 'https://science.nasa.gov/earth/explore/earth-indicators/sea-leve/'
FAO_FRA_2025 = 'https://www.fao.org/forest-resources-assessment/past-assessments/fra-2025/en'
GCRMN_2025 = 'https://gcrmn.net/2025-report/full-report/'


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def get_text(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,text/csv,text/plain,*/*'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')


def finite(v):
    try:
        n = float(str(v).strip().replace('%', ''))
    except (TypeError, ValueError):
        return None
    return n if math.isfinite(n) else None


def norm(s):
    return re.sub(r'[^a-z0-9]+', '', str(s).lower())


def parse_date(row, header):
    h = [norm(x) for x in header]
    for i, key in enumerate(h):
        if 'date' in key and i < len(row):
            raw = row[i].strip()
            for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%Y/%m/%d', '%Y%m%d'):
                try:
                    return datetime.strptime(raw, fmt).date().isoformat()
                except ValueError:
                    pass
    idx = {k: i for i, k in enumerate(h)}
    yi = next((idx[k] for k in idx if k in ('year', 'yyyy')), None)
    mi = next((idx[k] for k in idx if k in ('month', 'mm')), None)
    di = next((idx[k] for k in idx if k in ('day', 'dd')), None)
    if None not in (yi, mi, di) and max(yi, mi, di) < len(row):
        try:
            return datetime(int(float(row[yi])), int(float(row[mi])), int(float(row[di]))).date().isoformat()
        except Exception:
            return None
    return None


def parse_noaa_coral_bse(text):
    rows = [r for r in csv.reader(io.StringIO(text)) if any(str(x).strip() for x in r)]
    if len(rows) < 3:
        raise ValueError('NOAA coral CSV too short')
    header_index = None
    global_index = None
    for i, row in enumerate(rows[:40]):
        normalized = [norm(x) for x in row]
        candidates = [j for j, key in enumerate(normalized) if 'global' in key and ('extent' in key or 'alert' in key or 'reef' in key or 'percent' in key or 'pct' in key or key == 'global')]
        if candidates:
            header_index = i
            global_index = candidates[-1]
            break
    if header_index is None:
        for i, row in enumerate(rows[:40]):
            normalized = [norm(x) for x in row]
            if any('date' in x or x == 'year' for x in normalized) and any('global' in x for x in normalized):
                header_index = i
                global_index = next(j for j, x in enumerate(normalized) if 'global' in x)
                break
    if header_index is None or global_index is None:
        raise ValueError('NOAA coral CSV header/global column not recognized')
    header = rows[header_index]
    parsed = []
    for row in rows[header_index + 1:]:
        if global_index >= len(row):
            continue
        value = finite(row[global_index])
        date = parse_date(row, header)
        if date and value is not None and 0 <= value <= 100:
            parsed.append((date, value))
    if not parsed:
        raise ValueError('NOAA coral CSV contained no qualified dated global values')
    parsed.sort(key=lambda x: x[0])
    latest_date, latest_value = parsed[-1]
    return {'status':'live','source':'NOAA Coral Reef Watch Daily 5km 365-day Bleaching Stress Extent v3.1','sourceUrl':NOAA_CORAL_BSE,'productUrl':NOAA_CORAL_PAGE,'productVersion':'3.1','productReleased':'2026-04-30','updatedCadence':'daily; NOAA states about 13:30 U.S. Eastern Time','observationDate':latest_date,'globalReefPixelsExposedPct':latest_value,'windowDays':365,'threshold':'Bleaching Alert Level 1 or higher at any time during rolling 365-day window','historySampleCount':len(parsed),'historyStartDate':parsed[0][0],'historyEndDate':latest_date,'unit':'percent of 5 km reef-containing pixels','current':True,'fetchedAt':now_iso()}


def coral_record():
    try:
        return parse_noaa_coral_bse(get_text(NOAA_CORAL_BSE))
    except Exception as e:
        return {'status':'failed','source':'NOAA Coral Reef Watch Daily 5km 365-day Bleaching Stress Extent v3.1','sourceUrl':NOAA_CORAL_BSE,'productUrl':NOAA_CORAL_PAGE,'productVersion':'3.1','productReleased':'2026-04-30','current':False,'fetchedAt':now_iso(),'error':f'{type(e).__name__}: {e}'}


def text_window(markup, marker, span=5000):
    low = markup.lower(); i = low.find(marker.lower())
    if i < 0: raise ValueError(f'marker not found: {marker}')
    raw = markup[i:i + span]
    plain = re.sub(r'<script\b[^>]*>.*?</script>', ' ', raw, flags=re.I | re.S)
    plain = re.sub(r'<style\b[^>]*>.*?</style>', ' ', plain, flags=re.I | re.S)
    plain = re.sub(r'<[^>]+>', ' ', plain)
    plain = html.unescape(plain)
    return re.sub(r'\s+', ' ', plain).strip()


def parse_nasa_sea_level(markup):
    measurement = text_window(markup, 'Latest Measurement', 3500)
    date_text = text_window(markup, 'Latest Measurement Date', 2500)
    value_match = re.search(r'Latest Measurement\s+([0-9]+(?:\.[0-9]+)?)\s*(?:\(\s*[±+/-]\s*([0-9]+(?:\.[0-9]+)?)\s*\))?\s*mm', measurement, re.I)
    if not value_match:
        value_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*\(\s*±\s*([0-9]+(?:\.[0-9]+)?)\s*\)\s*mm', measurement, re.I)
    date_match = re.search(r'Latest Measurement Date\s+([A-Z][a-z]+\s+20\d{2})', date_text)
    if not value_match or not date_match:
        raise ValueError('NASA sea-level latest measurement or date not recognized')
    value = finite(value_match.group(1)); uncertainty = finite(value_match.group(2)) if value_match.lastindex and value_match.lastindex >= 2 else None
    if value is None or not (0 <= value <= 1000): raise ValueError('NASA sea-level latest measurement outside sanity bounds')
    obs = datetime.strptime(date_match.group(1), '%B %Y')
    return {'status':'live','source':'NASA Earth Indicator — Sea Level','sourceUrl':NASA_SEA_LEVEL,'measurementMm':value,'uncertaintyMm':uncertainty,'observationPeriod':obs.strftime('%Y-%m'),'observationLabel':date_match.group(1),'reference':'change in global mean sea level since 1993 satellite record','unit':'mm','current':True,'fetchedAt':now_iso()}


def sea_level_current_record():
    try:
        return parse_nasa_sea_level(get_text(NASA_SEA_LEVEL))
    except Exception as e:
        return {'status':'failed','source':'NASA Earth Indicator — Sea Level','sourceUrl':NASA_SEA_LEVEL,'current':False,'fetchedAt':now_iso(),'error':f'{type(e).__name__}: {e}'}


def main():
    if not OUT.exists(): raise SystemExit('data/live-vitals.json missing; run update_authoritative_vitals.py first')
    payload = json.loads(OUT.read_text(encoding='utf-8'))
    payload['schema'] = 'dom-authoritative-vitals-2026-v2'
    payload['verifiedAsOf'] = datetime.now(timezone.utc).date().isoformat()
    payload['currentSourcePolicy'] = 'Use the freshest authoritative source available as of 2026; retain older periods only when they are the latest authoritative assessment or required historical baseline.'
    payload['coralBleaching'] = coral_record(); payload['seaLevelCurrent'] = sea_level_current_record()
    payload['latestAssessments'] = {'forests':{'source':'FAO Global Forest Resources Assessment 2025','sourceUrl':FAO_FRA_2025,'latestAvailableAsOf2026':True,'coveragePeriod':'1990-2025','note':'Latest FAO global assessment available as of 2026; 2015-2025 deforestation rate remains a published reference, not a live feed.'},'coralCover':{'source':'GCRMN Status of Coral Reefs of the World: 2025','sourceUrl':GCRMN_2025,'released':'2026-08-31','latestAvailableAsOf2026':True,'observationCoverage':'1980-2024','note':'Latest global coral-cover assessment available as of 2026.'}}
    OUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({'coralBleaching':payload['coralBleaching']['status'],'seaLevelCurrent':payload['seaLevelCurrent']['status'],'schema':payload['schema']}, sort_keys=True))


if __name__ == '__main__': main()
