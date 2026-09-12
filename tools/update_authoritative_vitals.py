#!/usr/bin/env python3
import csv
import io
import json
import math
import statistics
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "DOMS-Living-Archival-Observatory/1.0 (+public research; source-backed vitals)"
OUT = Path("data/live-vitals.json")

CENSUS = "https://www.census.gov/popclock/data/population.php/world"
GISS = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
SEA = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_all_66.csv"
ARCTIC_ICE = "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv"
ANTARCTIC_ICE = "https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v4.0.csv"


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
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    header_index = None
    header = None
    for i, row in enumerate(rows):
        clean = [x.strip() for x in row]
        if clean and clean[0].lower() == "year" and all(m in clean for m in months):
            header_index = i
            header = clean
            break
    if header_index is None or header is None:
        return None
    idx = {m: header.index(m) for m in months}
    for row in reversed(rows[header_index + 1:]):
        if not row:
            continue
        year = finite_number(row[0].strip() if row else None)
        if year is None:
            continue
        for month_num in range(12, 0, -1):
            i = idx[months[month_num - 1]]
            if i >= len(row):
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
    sxx = sum((x - xbar) ** 2 for x in xs)
    if sxx <= 0:
        raise ValueError("sea-level regression singular")
    slope = sum((x - xbar) * (y - ybar) for x, y in points) / sxx
    intercept = ybar - slope * xbar
    fitted = [intercept + slope * x for x in xs]
    residuals = [y - yhat for y, yhat in zip(ys, fitted)]
    sse = sum(r * r for r in residuals)
    sst = sum((y - ybar) ** 2 for y in ys)
    r2 = 1 - sse / sst if sst > 0 else None
    # This standard error is retained only as a regression diagnostic. Satellite
    # time-series residuals are autocorrelated, so it is NOT advertised as a
    # formal geophysical confidence interval.
    dof = len(points) - 2
    slope_se_naive = math.sqrt((sse / dof) / sxx) if dof > 0 else None
    return slope, intercept, r2, slope_se_naive


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
    points.sort(key=lambda p: p[0])
    slope, intercept, r2, slope_se_naive = ols_slope(points)
    if not (0 <= slope <= 20):
        raise ValueError("computed sea-level slope outside sanity bound")
    return {
        "trendMmPerYear": slope,
        "interceptMm": intercept,
        "r2": r2,
        "naiveSlopeSEMmPerYear": slope_se_naive,
        "sampleCount": len(points),
        "startDecimalYear": points[0][0],
        "endDecimalYear": points[-1][0],
        "statisticalCaveat": "OLS slope is a D.O.M. diagnostic over the NOAA time series. Naive OLS standard error is not a formal confidence interval because temporal residuals are autocorrelated."
    }


def sea_record(fetched_at):
    base = {"status": "failed", "source": "NOAA NESDIS Laboratory for Satellite Altimetry", "sourceUrl": SEA, "fetchedAt": fetched_at, "scope": "global ocean 66S-66N, seasonal signals removed, multi-altimeter CSV", "unit": "mm/year", "method": "D.O.M. linear OLS diagnostic of per-timestamp mean across available NOAA altimeter columns"}
    try:
        raw, _ = get(SEA)
        v = parse_noaa_sea_csv(raw.decode("utf-8", errors="strict"))
        return {**base, "status": "live", **v}
    except Exception as e:
        return {**base, "error": f"{type(e).__name__}: {e}"}


def parse_sea_ice_rows(text):
    out = []
    for row in csv.reader(io.StringIO(text)):
        if len(row) < 4:
            continue
        year, month, day, extent = (finite_number(row[i]) for i in range(4))
        missing = finite_number(row[4]) if len(row) > 4 else None
        if None in (year, month, day, extent):
            continue
        year, month, day = int(year), int(month), int(day)
        if not (1978 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31 and 0 < extent <= 30):
            continue
        out.append({"year": year, "month": month, "day": day, "extentMillionKm2": float(extent), "missingMillionKm2": missing})
    if not out:
        raise ValueError("no qualified sea-ice rows found")
    out.sort(key=lambda r: (r["year"], r["month"], r["day"]))
    return out


def sea_ice_statistics(text):
    rows = parse_sea_ice_rows(text)
    latest = rows[-1]
    # Exact calendar-day baseline, matching NSIDC's standard 1981-2010
    # reference interval. This is a current-condition anomaly, not a long-term trend.
    baseline = [r["extentMillionKm2"] for r in rows if 1981 <= r["year"] <= 2010 and r["month"] == latest["month"] and r["day"] == latest["day"]]
    result = dict(latest)
    if len(baseline) >= 20:
        mean = statistics.fmean(baseline)
        sd = statistics.stdev(baseline) if len(baseline) > 1 else None
        anomaly = latest["extentMillionKm2"] - mean
        result.update({
            "climatologyPeriod": "1981-2010",
            "climatologySampleCount": len(baseline),
            "climatologyMeanMillionKm2": mean,
            "climatologySampleSDMillionKm2": sd,
            "anomalyMillionKm2": anomaly,
            "anomalyPercent": (anomaly / mean * 100) if mean > 0 else None,
            "zScoreVsCalendarDayClimatology": (anomaly / sd) if sd and sd > 0 else None,
            "statisticalInterpretation": "Exact-calendar-day anomaly versus 1981-2010 sample mean; z-score uses sample standard deviation across baseline years. Not a long-term trend estimate."
        })
    else:
        result.update({"climatologyPeriod": "1981-2010", "climatologySampleCount": len(baseline), "statisticalInterpretation": "Insufficient exact-calendar-day baseline samples for anomaly calculation."})
    return result


def sea_ice_record(url, hemisphere, fetched_at):
    base = {"status": "failed", "source": "NOAA/NSIDC Sea Ice Index v4", "sourceUrl": url, "hemisphere": hemisphere, "fetchedAt": fetched_at, "unit": "million km^2 extent"}
    try:
        raw, _ = get(url)
        row = sea_ice_statistics(raw.decode("utf-8", errors="replace"))
        return {**base, "status": "live", **row}
    except Exception as e:
        return {**base, "error": f"{type(e).__name__}: {e}"}


def cryosphere_record(fetched_at):
    arctic = sea_ice_record(ARCTIC_ICE, "north", fetched_at)
    antarctic = sea_ice_record(ANTARCTIC_ICE, "south", fetched_at)
    ok = arctic.get("status") == "live" or antarctic.get("status") == "live"
    return {
        "status": "live" if ok else "failed",
        "source": "NOAA/NSIDC Sea Ice Index v4",
        "fetchedAt": fetched_at,
        "seaIce": {"arctic": arctic, "antarctic": antarctic},
        "note": "Sea-ice extent is distinct from land-ice mass loss. Daily anomaly is relative to the same calendar day in 1981-2010; no trend is inferred from a single daily value."
    }


def main():
    fetched_at = now_iso()
    payload = {
        "schema": "doms-authoritative-vitals-v1",
        "generatedAt": fetched_at,
        "transport": "server-side-authoritative-source-refresh",
        "policy": "No synthetic numeric fallback. Derived statistics identify their baseline, method, sample size, and statistical caveats.",
        "population": census_record(fetched_at),
        "temperature": giss_record(fetched_at),
        "seaLevel": sea_record(fetched_at),
        "cryosphere": cryosphere_record(fetched_at),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({k: payload[k].get("status") for k in ("population", "temperature", "seaLevel", "cryosphere")}, sort_keys=True))


if __name__ == "__main__":
    main()
