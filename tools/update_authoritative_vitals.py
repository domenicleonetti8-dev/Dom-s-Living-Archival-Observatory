#!/usr/bin/env python3
import csv
import io
import json
import math
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "DOMS-Living-Archival-Observatory/1.0 (+public research; source-backed vitals)"
OUT = Path("data/live-vitals.json")

CENSUS = "https://www.census.gov/popclock/data/population.php/world"
GISS = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
SEA = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_all_66.csv"


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), dict(r.headers)


def finite_number(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def census_record(fetched_at):
    base = {"status": "failed", "source": "U.S. Census Bureau Population Clock", "sourceUrl": CENSUS, "fetchedAt": fetched_at}
    try:
        raw, _ = get(CENSUS)
        j = json.loads(raw.decode("utf-8"))
        w = j.get("world") or {}
        value = finite_number(w.get("population"))
        if value is None or value <= 0:
            raise ValueError("population missing or non-positive")
        last = finite_number(w.get("last_updated"))
        source_updated = datetime.fromtimestamp(last, tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z") if last else None
        return {**base, "status": "live", "value": int(round(value)), "estimate": bool(w.get("estimate")), "date": w.get("date"), "ratePerSecond": finite_number(w.get("population_rate")), "sourceUpdatedAt": source_updated, "unit": "people"}
    except Exception as e:
        return {**base, "error": f"{type(e).__name__}: {e}"}


def latest_giss(csv_text):
    rows = list(csv.reader(io.StringIO(csv_text)))
    if len(rows) < 2:
        return None
    header = [x.strip() for x in rows[0]]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    idx = {m: header.index(m) for m in months if m in header}
    for row in reversed(rows[1:]):
        if not row:
            continue
        year = finite_number(row[0])
        if year is None:
            continue
        for month_num in range(12, 0, -1):
            i = idx.get(months[month_num - 1])
            if i is None or i >= len(row):
                continue
            value = finite_number(row[i].strip())
            if value is not None:
                return {"year": int(year), "month": month_num, "anomalyC": value}
    return None


def giss_record(fetched_at):
    base = {"status": "failed", "source": "NASA GISS GISTEMP v4", "sourceUrl": GISS, "fetchedAt": fetched_at, "baseline": "1951-1980", "unit": "degC anomaly"}
    try:
        raw, _ = get(GISS)
        v = latest_giss(raw.decode("utf-8", errors="strict"))
        if not v:
            raise ValueError("no finite monthly anomaly found")
        if not (-5 <= v["anomalyC"] <= 5):
            raise ValueError("anomaly outside physical sanity bound")
        return {**base, "status": "live", **v, "observationPeriod": f"{v['year']:04d}-{v['month']:02d}"}
    except Exception as e:
        return {**base, "error": f"{type(e).__name__}: {e}"}


def ols_slope(points):
    if len(points) < 24:
        raise ValueError("insufficient sea-level samples")
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    xbar = sum(xs) / len(xs)
    ybar = sum(ys) / len(ys)
    den = sum((x - xbar) ** 2 for x in xs)
    if den <= 0:
        raise ValueError("sea-level regression singular")
    slope = sum((x - xbar) * (y - ybar) for x, y in points) / den
    fitted = [ybar + slope * (x - xbar) for x in xs]
    sse = sum((y - yhat) ** 2 for y, yhat in zip(ys, fitted))
    sst = sum((y - ybar) ** 2 for y in ys)
    r2 = 1 - sse / sst if sst > 0 else None
    return slope, r2


def parse_noaa_sea_csv(text):
    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 25:
        raise ValueError("NOAA sea-level CSV too short")
    points = []
    for row in rows[1:]:
        if not row:
            continue
        year = finite_number(row[0])
        vals = [finite_number(v.strip()) for v in row[1:]]
        vals = [v for v in vals if v is not None]
        if year is None or not vals:
            continue
        points.append((year, sum(vals) / len(vals)))
    slope, r2 = ols_slope(points)
    if not (0 <= slope <= 20):
        raise ValueError("computed sea-level slope outside sanity bound")
    return {"trendMmPerYear": slope, "r2": r2, "sampleCount": len(points), "startDecimalYear": points[0][0], "endDecimalYear": points[-1][0]}


def sea_record(fetched_at):
    base = {"status": "failed", "source": "NOAA NESDIS Laboratory for Satellite Altimetry", "sourceUrl": SEA, "fetchedAt": fetched_at, "scope": "global ocean 66S-66N, seasonal signals removed, multi-altimeter CSV", "unit": "mm/year", "method": "D.O.M. ordinary-least-squares trend of per-timestamp mean across available NOAA altimeter columns"}
    try:
        raw, _ = get(SEA)
        v = parse_noaa_sea_csv(raw.decode("utf-8", errors="strict"))
        return {**base, "status": "live", **v}
    except Exception as e:
        return {**base, "error": f"{type(e).__name__}: {e}"}


def main():
    fetched_at = now_iso()
    payload = {"schema": "doms-authoritative-vitals-v1", "generatedAt": fetched_at, "transport": "server-side-authoritative-source-refresh", "policy": "No numeric fallback constants. A failed source remains unavailable until an authoritative fetch succeeds.", "population": census_record(fetched_at), "temperature": giss_record(fetched_at), "seaLevel": sea_record(fetched_at)}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({k: payload[k].get("status") for k in ("population", "temperature", "seaLevel")}, sort_keys=True))


if __name__ == "__main__":
    main()
