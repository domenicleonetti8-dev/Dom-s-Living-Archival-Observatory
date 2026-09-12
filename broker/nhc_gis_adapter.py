"""NOAA/NHC current tropical-cyclone center, forecast-track and cone ingestion.

The adapter preserves official NHC geometry from KMZ products. It never derives
or extrapolates a storm path. Point centers come from CurrentStorms.json; track
and cone geometry come from the linked NHC KMZ products.
"""
from __future__ import annotations

import io
import math
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional
from urllib.parse import urljoin

NHC_CURRENT_STORMS = "https://www.nhc.noaa.gov/CurrentStorms.json"
NHC_USER_AGENT = "DOMS-Living-Archival-Observatory/1.0 public-research-broker"


def _iso(value) -> Optional[str]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError):
        return None


def _get_bytes(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml,application/zip,*/*", "User-Agent": NHC_USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _coord_text(text: str) -> List[List[float]]:
    out: List[List[float]] = []
    for token in str(text or "").replace("\n", " ").replace("\t", " ").split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        try:
            lon, lat = float(parts[0]), float(parts[1])
        except (TypeError, ValueError):
            continue
        if math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180:
            out.append([lon, lat])
    return out


def _local(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1]


def _kml_documents(blob: bytes) -> List[bytes]:
    if blob[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".kml")]
            return [zf.read(n) for n in names]
    return [blob]


def parse_kml_geometry(blob: bytes) -> Dict[str, List[dict]]:
    """Return only source-authored line and polygon geometries from KML/KMZ."""
    lines: List[dict] = []
    polygons: List[dict] = []
    for raw in _kml_documents(blob):
        try:
            root = ET.fromstring(raw)
        except ET.ParseError:
            continue
        for node in root.iter():
            kind = _local(node.tag)
            if kind == "LineString":
                coord = next((x for x in node.iter() if _local(x.tag) == "coordinates"), None)
                pts = _coord_text(coord.text if coord is not None else "")
                if len(pts) >= 2:
                    lines.append({"type": "LineString", "coordinates": pts})
            elif kind == "Polygon":
                outer = None
                holes: List[List[List[float]]] = []
                for child in node:
                    ck = _local(child.tag)
                    if ck not in {"outerBoundaryIs", "innerBoundaryIs"}:
                        continue
                    coord = next((x for x in child.iter() if _local(x.tag) == "coordinates"), None)
                    ring = _coord_text(coord.text if coord is not None else "")
                    if len(ring) < 4:
                        continue
                    if ring[0] != ring[-1]:
                        ring.append(list(ring[0]))
                    if ck == "outerBoundaryIs" and outer is None:
                        outer = ring
                    elif ck == "innerBoundaryIs":
                        holes.append(ring)
                if outer:
                    polygons.append({"type": "Polygon", "coordinates": [outer, *holes]})
    return {"lines": lines, "polygons": polygons}


def _aggregate(rows: List[dict], kind: str) -> Optional[dict]:
    if not rows:
        return None
    if len(rows) == 1:
        return rows[0]
    if kind == "line":
        return {"type": "MultiLineString", "coordinates": [r["coordinates"] for r in rows if r.get("type") == "LineString"]}
    return {"type": "MultiPolygon", "coordinates": [r["coordinates"] for r in rows if r.get("type") == "Polygon"]}


def _storm_id(storm: dict) -> str:
    return str(storm.get("id") or storm.get("binNumber") or storm.get("name") or "storm").strip()


def poll_nhc_current_storms(
    get_json: Callable[[str], dict],
    make_record: Callable[..., Optional[dict]],
    valid_lat_lon: Callable[[object, object], bool],
    get_bytes: Callable[[str], bytes] = _get_bytes,
) -> List[dict]:
    data = get_json(NHC_CURRENT_STORMS)
    storms = data.get("activeStorms") if isinstance(data, dict) else None
    if not isinstance(storms, list):
        return []
    out: List[dict] = []
    for storm in storms:
        if not isinstance(storm, dict):
            continue
        sid = _storm_id(storm)
        name = str(storm.get("name") or sid).strip()
        lat, lon = storm.get("latitudeNumeric"), storm.get("longitudeNumeric")
        forecast = storm.get("forecastTrack") if isinstance(storm.get("forecastTrack"), dict) else {}
        cone = storm.get("trackCone") if isinstance(storm.get("trackCone"), dict) else {}
        observed = _iso(storm.get("lastUpdate")) or _iso(forecast.get("issuance")) or _iso(cone.get("issuance"))
        if not observed:
            continue
        public = storm.get("publicAdvisory") if isinstance(storm.get("publicAdvisory"), dict) else {}
        center_source = public.get("url") or storm.get("url") or NHC_CURRENT_STORMS
        product_errors: List[str] = []

        center = make_record(
            source_id=f"nhc:{sid}:center", lineage="noaa-nhc-current-storms", agency="NOAA/NHC", network="National Hurricane Center",
            kind="Tropical Cyclone", modality="official-tropical-cyclone-center", observed_at=observed,
            lat=lat if valid_lat_lon(lat, lon) else None, lon=lon if valid_lat_lon(lat, lon) else None,
            source=center_source, title=name, authoritative=True, locationPrecision="official-center",
            observationStatus="observed", quality=1.0,
            classification=storm.get("classification"), intensityKt=storm.get("intensity"), pressureMb=storm.get("pressure"),
            movementDir=storm.get("movementDir"), movementSpeedMph=storm.get("movementSpeed"),
            forecastTrackUrl=forecast.get("kmzFile"), trackConeUrl=cone.get("kmzFile"),
        )
        if center:
            out.append(center)

        products = (("forecast-track", forecast, "line"), ("forecast-cone", cone, "polygon"))
        for role, product, expected in products:
            raw_url = product.get("kmzFile") if isinstance(product, dict) else None
            if not raw_url:
                continue
            product_url = urljoin(NHC_CURRENT_STORMS, str(raw_url))
            issued = _iso(product.get("issuance")) or observed
            try:
                parsed = parse_kml_geometry(get_bytes(product_url))
                geometry = _aggregate(parsed["lines"] if expected == "line" else parsed["polygons"], expected)
            except Exception as exc:
                product_errors.append(f"{role}:{type(exc).__name__}")
                continue
            if not geometry:
                product_errors.append(f"{role}:no-{expected}-geometry")
                continue
            rec = make_record(
                source_id=f"nhc:{sid}:{role}", lineage="noaa-nhc-gis", agency="NOAA/NHC", network="National Hurricane Center GIS",
                kind="Tropical Cyclone Forecast Geometry", modality="official-nhc-gis", observed_at=None,
                lat=None, lon=None, source=product_url, title=f"{name} {role.replace('-', ' ')}", authoritative=True,
                locationPrecision="source-geometry", observationStatus="forecast", publishedAt=issued, temporalKind="forecast", quality=1.0,
                geometry=geometry, geometryRole=role, stormId=sid, stormName=name,
                advisoryNumber=product.get("advNum"), issuance=issued,
            )
            if rec:
                out.append(rec)

        if product_errors and center:
            center["geometryProductErrors"] = product_errors
    return out


__all__ = ["NHC_CURRENT_STORMS", "parse_kml_geometry", "poll_nhc_current_storms"]
