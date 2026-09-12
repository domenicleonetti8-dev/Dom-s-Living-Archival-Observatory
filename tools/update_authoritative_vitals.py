#!/usr/bin/env python3
import csv
import io
import json
import math
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "DOMS-Living-Archival-Observatory/1.0 (+public research; source-backed vitals)"
OUT = Path("data/live-vitals.json")

CENSUS = "https://www.census.gov/popclock/data/population.php/world"
GISS = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
SEA = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_SLR_timeseries_global.php"


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
        return {
            **base,
            "status": "live",
            "value": int(round(value)),
            "estimate": bool(w.get("estimate")),
            "date": w.get("date"),
            "ratePerSecond": finite_number(w.get("population_rate")),
            "sourceUpdatedAt": source_updated,
            "unit": "people",
        }
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
            m = months[month_num - 1]
            i = idx.get(m)
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


def sea_record(fetched_at):
    base = {"status": "failed", "source": "NOAA NESDIS Laboratory for Satellite Altimetry", "sourceUrl": SEA, "fetchedAt": fetched_at, "scope": "global ocean satellite-altimetry series", "unit": "mm/year"}
    try:
        raw, _ = get(SEA)
        text = raw.decode("utf-8", errors="replace")
        patterns = [
            r"trend\s*:\s*([0-9.]+)\s*(?:±|&plusmn;|\+\/-)\s*([0-9.]+)\s*mm\s*/\s*year",
            r"trend[^0-9]{0,30}([0-9.]+)\s*(?:±|&plusmn;|\+\/-)\s*([0-9.]+)\s*mm\s*(?:/|per)\s*(?:year|yr)",
        ]
        m = None
        for p in patterns:
            m = re.search(p, text, re.I)
            if m:
                break
        if not m:
            raise ValueError("NOAA trend and uncertainty not machine-readable")
        trend = finite_number(m.group(1))
        uncertainty = finite_number(m.group(2))
        if trend is None or uncertainty is None or trend < 0 or trend > 20 or uncertainty < 0 or uncertainty > 10:
            raise ValueError("sea-level trend failed sanity bounds")
        return {**base, "status": "live", "trendMmPerYear": trend, "uncertaintyMmPerYear": uncertainty}
    except Exception as e:
        return {**base, "error": f"{type(e).__name__}: {e}"}


def main():
    fetched_at = now_iso()
    payload = {
        "schema": "doms-authoritative-vitals-v1",
        "generatedAt": fetched_at,
        "transport": "server-side-authoritative-source-refresh",
        "policy": "No numeric fallback constants. A failed source remains unavailable until an authoritative fetch succeeds.",
        "population": census_record(fetched_at),
        "temperature": giss_record(fetched_at),
        "seaLevel": sea_record(fetched_at),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({k: payload[k].get("status") for k in ("population", "temperature", "seaLevel")}, sort_keys=True))


if __name__ == "__main__":
    main()
