"""Public scientific-station adapters for the isolated D.O.M. Earth build.

Adapters in this module emit normalized, geolocated station/platform records only.
They never synthesize coordinates and keep network/platform provenance explicit.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Callable, Iterable, List, Optional

USER_AGENT = "DOMS-Living-Archival-Observatory/0.2 scientific-station-fabric"


def _get_text(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/plain,application/json,application/xml"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def parse_fdsn_station_text(text: str, make_record: Callable, valid_lat_lon: Callable, *, source_url: str) -> List[dict]:
    """Parse FDSN level=station text output.

    Format: Network|Station|Latitude|Longitude|Elevation|SiteName|StartTime|EndTime
    """
    out: List[dict] = []
    seen = set()
    for raw in str(text or "").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        cols = line.split("|")
        if len(cols) < 8:
            continue
        net, sta, lat_s, lon_s, elev_s, site, start, end = cols[:8]
        try:
            lat, lon = float(lat_s), float(lon_s)
        except (TypeError, ValueError):
            continue
        if not valid_lat_lon(lat, lon):
            continue
        key = (net.strip(), sta.strip(), round(lat, 6), round(lon, 6))
        if key in seen:
            continue
        seen.add(key)
        try:
            elev = float(elev_s)
        except (TypeError, ValueError):
            elev = None
        r = make_record(
            source_id=f"fdsn:{net.strip()}:{sta.strip()}",
            lineage=f"fdsn:{net.strip()}",
            agency="FDSN data center",
            network=net.strip(),
            kind="Scientific Station",
            modality="seismic-station",
            observed_at=start.strip() or None,
            lat=lat,
            lon=lon,
            source=source_url,
            title=site.strip() or f"{net.strip()} {sta.strip()}",
            authoritative=True,
            observationStatus="registered",
            locationPrecision="source-coordinate",
            quality=1.0,
            elevation=elev,
            stationId=sta.strip(),
            upstream={"startTime": start.strip() or None, "endTime": end.strip() or None},
        )
        if r:
            out.append(r)
    return out


def poll_earthscope_fdsn(make_record: Callable, valid_lat_lon: Callable, get_text: Callable[[str], str] = _get_text) -> List[dict]:
    """Fetch station metadata from the EarthScope FDSN station service.

    This is a repository/data-center inventory, not a claim to cover every FDSN
    data center worldwide. Additional FDSN centers can be added through the same
    parser without changing the canonical observation contract.
    """
    url = "https://service.earthscope.org/fdsnws/station/1/query?level=station&format=text&matchtimeseries=true"
    return parse_fdsn_station_text(get_text(url), make_record, valid_lat_lon, source_url=url)


def parse_generic_station_json(payload, make_record: Callable, valid_lat_lon: Callable, *, source_url: str, lineage: str, agency: str, modality: str, id_keys: Iterable[str] = ("id", "station", "code"), lat_keys: Iterable[str] = ("lat", "latitude"), lon_keys: Iterable[str] = ("lon", "lng", "longitude"), title_keys: Iterable[str] = ("name", "title")) -> List[dict]:
    """Conservative helper for public station inventories with simple JSON rows.

    Only rows with explicit numeric coordinates are emitted. This helper exists
    so future network adapters can be small and source-specific while retaining
    the same anti-fabrication rules.
    """
    rows = payload if isinstance(payload, list) else payload.get("stations", []) if isinstance(payload, dict) else []
    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        def first(keys):
            for k in keys:
                if row.get(k) not in (None, ""):
                    return row.get(k)
            return None
        sid, lat_v, lon_v = first(id_keys), first(lat_keys), first(lon_keys)
        if sid is None:
            continue
        try:
            lat, lon = float(lat_v), float(lon_v)
        except (TypeError, ValueError):
            continue
        if not valid_lat_lon(lat, lon):
            continue
        title = first(title_keys) or str(sid)
        r = make_record(
            source_id=f"{lineage}:{sid}", lineage=lineage, agency=agency, network=lineage,
            kind="Scientific Station", modality=modality, observed_at=None,
            lat=lat, lon=lon, source=source_url, title=str(title), authoritative=True,
            observationStatus="registered", locationPrecision="source-coordinate", quality=1.0,
            stationId=str(sid), upstream={"inventory": True},
        )
        if r:
            out.append(r)
    return out


__all__ = ["parse_fdsn_station_text", "poll_earthscope_fdsn", "parse_generic_station_json"]
