"""Public scientific-station adapters for the isolated D.O.M. Earth build.

Adapters in this module emit normalized, geolocated station/platform inventory
records only. They never synthesize coordinates and keep network/platform
provenance explicit. Inventory snapshot time is distinct from measurement time.
"""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from typing import Callable, Iterable, List

USER_AGENT = "DOMS-Living-Archival-Observatory/0.3 scientific-station-fabric"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_text(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/plain,application/json,application/xml"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def _get_json(url: str, timeout: int = 20):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json,application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def parse_fdsn_station_text(text: str, make_record: Callable, valid_lat_lon: Callable, *, source_url: str, snapshot_time: str | None = None) -> List[dict]:
    """Parse FDSN level=station text output.

    Format: Network|Station|Latitude|Longitude|Elevation|SiteName|StartTime|EndTime
    Multiple historical epochs for the same station/coordinate are collapsed to
    one visible platform marker within a retrieval cycle.
    """
    observed_at = snapshot_time or _now_iso()
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
            observed_at=observed_at,
            lat=lat,
            lon=lon,
            source=source_url,
            title=site.strip() or f"{net.strip()} {sta.strip()}",
            authoritative=True,
            observationStatus="reported",
            locationPrecision="source-coordinate",
            quality=1.0,
            elevation=elev,
            stationId=sta.strip(),
            platformClass="surface-station",
            inventorySnapshot=True,
            upstream={"stationStartTime": start.strip() or None, "stationEndTime": end.strip() or None},
        )
        if r:
            out.append(r)
    return out


def poll_earthscope_fdsn(make_record: Callable, valid_lat_lon: Callable, get_text: Callable[[str], str] = _get_text) -> List[dict]:
    """Fetch station metadata from the EarthScope FDSN station service.

    This covers the EarthScope repository, not every FDSN data center worldwide.
    The parser is reusable across additional compliant centers.
    """
    url = "https://service.earthscope.org/fdsnws/station/1/query?level=station&format=text&matchtimeseries=true"
    return parse_fdsn_station_text(get_text(url), make_record, valid_lat_lon, source_url=url)


def parse_generic_station_json(payload, make_record: Callable, valid_lat_lon: Callable, *, source_url: str, lineage: str, agency: str, modality: str, id_keys: Iterable[str] = ("id", "station", "code"), lat_keys: Iterable[str] = ("lat", "latitude"), lon_keys: Iterable[str] = ("lon", "lng", "longitude"), title_keys: Iterable[str] = ("name", "title"), snapshot_time: str | None = None, platform_class: str = "surface-station") -> List[dict]:
    """Conservative helper for public station inventories with simple JSON rows."""
    observed_at = snapshot_time or _now_iso()
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
            kind="Scientific Station", modality=modality, observed_at=observed_at,
            lat=lat, lon=lon, source=source_url, title=str(title), authoritative=True,
            observationStatus="reported", locationPrecision="source-coordinate", quality=1.0,
            stationId=str(sid), platformClass=platform_class, inventorySnapshot=True,
            upstream={"inventory": True},
        )
        if r:
            out.append(r)
    return out


def parse_usgs_monitoring_locations(payload, make_record: Callable, valid_lat_lon: Callable, *, source_url: str, snapshot_time: str | None = None) -> List[dict]:
    """Parse USGS Water Data OGC monitoring-location GeoJSON.

    The API geometry is authoritative EPSG:4326 location metadata. No centroid or
    guessed coordinate is created: only Point features with valid coordinates
    become D.O.M. scientific platforms.
    """
    observed_at = snapshot_time or _now_iso()
    out = []
    for feature in (payload or {}).get("features", []) if isinstance(payload, dict) else []:
        if not isinstance(feature, dict):
            continue
        geom = feature.get("geometry") or {}
        if geom.get("type") != "Point":
            continue
        co = geom.get("coordinates") or []
        if len(co) < 2 or not valid_lat_lon(co[1], co[0]):
            continue
        props = feature.get("properties") or {}
        sid = feature.get("id") or props.get("id") or props.get("monitoring_location_id")
        if not sid:
            continue
        agency = props.get("agency_name") or props.get("agency_code") or "USGS Water Data"
        site_type = props.get("site_type") or props.get("site_type_code") or "water monitoring location"
        title = props.get("monitoring_location_name") or str(sid)
        r = make_record(
            source_id=f"usgs-water-site:{sid}", lineage="usgs-water-monitoring-locations",
            agency=str(agency), network="USGS Water Data for the Nation",
            kind="Scientific Station", modality="water-monitoring-station", observed_at=observed_at,
            lat=float(co[1]), lon=float(co[0]), source=source_url, title=str(title), authoritative=True,
            observationStatus="reported", locationPrecision="source-coordinate", quality=1.0,
            stationId=str(sid), platformClass="water-monitoring-site", inventorySnapshot=True,
            siteType=str(site_type), altitude=props.get("altitude"),
            upstream={"country": props.get("country_name"), "state": props.get("state_name"), "county": props.get("county_name")},
        )
        if r:
            out.append(r)
    return out


def poll_usgs_monitoring_locations(make_record: Callable, valid_lat_lon: Callable, get_json: Callable[[str], object] = _get_json, *, limit: int = 10000, max_pages: int = 10) -> List[dict]:
    """Fetch public USGS monitoring locations with bounded OGC pagination."""
    base = f"https://api.waterdata.usgs.gov/ogcapi/v1/collections/monitoring-locations/items?f=json&limit={max(1, min(int(limit), 10000))}"
    url = base
    out: List[dict] = []
    pages = 0
    seen_urls = set()
    snapshot = _now_iso()
    while url and pages < max(1, int(max_pages)) and url not in seen_urls:
        seen_urls.add(url)
        payload = get_json(url)
        out.extend(parse_usgs_monitoring_locations(payload, make_record, valid_lat_lon, source_url=url, snapshot_time=snapshot))
        pages += 1
        next_url = None
        for link in payload.get("links", []) if isinstance(payload, dict) else []:
            if isinstance(link, dict) and link.get("rel") == "next" and isinstance(link.get("href"), str):
                next_url = link["href"]
                break
        url = next_url
    return out


__all__ = [
    "parse_fdsn_station_text", "poll_earthscope_fdsn", "parse_generic_station_json",
    "parse_usgs_monitoring_locations", "poll_usgs_monitoring_locations",
]
