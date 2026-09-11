"""Additional D.O.M. broker source adapters kept separate from broker state logic."""
from __future__ import annotations

import math
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable

ADAPTER_USER_AGENT = "DOMS-Living-Archival-Observatory/0.1 public-research-adapters"


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


def _centroid(geometry, valid_lat_lon):
    if not isinstance(geometry, dict):
        return None
    points = []
    def walk(x):
        if isinstance(x, list) and len(x) >= 2 and not isinstance(x[0], (list, dict)):
            try:
                lon, lat = float(x[0]), float(x[1])
            except (TypeError, ValueError):
                return
            if valid_lat_lon(lat, lon):
                points.append((lat, lon))
            return
        if isinstance(x, list):
            for item in x:
                walk(item)
    walk(geometry.get("coordinates"))
    if not points:
        return None
    lat = sum(p[0] for p in points) / len(points)
    sin_lon = sum(math.sin(math.radians(p[1])) for p in points)
    cos_lon = sum(math.cos(math.radians(p[1])) for p in points)
    lon = math.degrees(math.atan2(sin_lon, cos_lon))
    return (lat, lon) if valid_lat_lon(lat, lon) else None


def _source_geometry(geometry):
    """Return only supported authoritative GeoJSON geometry; never synthesize it."""
    if not isinstance(geometry, dict):
        return None
    kind = geometry.get("type")
    coords = geometry.get("coordinates")
    if kind not in {"Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"}:
        return None
    if not isinstance(coords, list):
        return None
    return {"type": kind, "coordinates": coords}


def _get_text(url: str, timeout: int = 15) -> str:
    req = urllib.request.Request(url, headers={"Accept": "application/atom+xml,text/xml,application/xml", "User-Agent": ADAPTER_USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def _local(tag: str) -> str:
    return str(tag).rsplit("}", 1)[-1].lower()


def _child_text(node, name: str) -> str:
    want = name.lower()
    for child in list(node):
        if _local(child.tag) == want:
            return "".join(child.itertext()).strip()
    return ""


def _entry_link(entry) -> str:
    fallback = ""
    for child in list(entry):
        if _local(child.tag) != "link":
            continue
        href = str(child.attrib.get("href") or "").strip()
        rel = str(child.attrib.get("rel") or "alternate").lower()
        if href and rel == "alternate":
            return href
        if href and not fallback:
            fallback = href
    return fallback


def poll_tsunami_atom(get_text, make_record, center: str) -> List[dict]:
    """Official U.S. Tsunami Warning Center Atom products.

    Product metadata is authoritative, but this adapter intentionally does not
    invent event coordinates from free text. Warning/watch/advisory products are
    official alerts; information/cancellation products remain official reports.
    """
    center = str(center or "").strip().lower()
    if center == "ntwc":
        url, agency, network, lineage = "https://www.tsunami.gov/events/xml/PAAQAtom.xml", "NOAA NTWC", "National Tsunami Warning Center", "noaa-ntwc-atom"
    elif center == "ptwc":
        url, agency, network, lineage = "https://www.tsunami.gov/events/xml/PHEBAtom.xml", "NOAA PTWC", "Pacific Tsunami Warning Center", "noaa-ptwc-atom"
    else:
        raise ValueError("unknown tsunami warning center")
    text = get_text(url)
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise ValueError(f"invalid Atom XML: {exc}") from exc
    out = []
    for entry in root.iter():
        if _local(entry.tag) != "entry":
            continue
        entry_id = _child_text(entry, "id")
        title = _child_text(entry, "title") or "Tsunami Warning Center product"
        updated = _iso(_child_text(entry, "updated") or _child_text(entry, "published"))
        link = _entry_link(entry) or entry_id
        if not entry_id or not updated or not link:
            continue
        product = title.upper()
        alert_class = next((x for x in ("WARNING", "ADVISORY", "WATCH") if x in product), None)
        cancellation = "CANCEL" in product
        official_alert = bool(alert_class and not cancellation)
        status = "forecast" if official_alert else "reported"
        severity = f"Tsunami {alert_class.title()}" if alert_class else "Tsunami product"
        if cancellation:
            severity = "Tsunami cancellation"
        r = make_record(
            source_id=f"{center}:{entry_id}", lineage=lineage, agency=agency, network=network,
            kind="Tsunami", modality="official-tsunami-product", observed_at=updated,
            lat=None, lon=None, source=link, title=title[:300], authoritative=True,
            officialAlert=official_alert, observationStatus=status, locationPrecision="unresolved",
            severityText=severity, quality=1.0,
            upstream={"atomEntryId": entry_id, "center": center.upper(), "feed": url},
        )
        if r:
            out.append(r)
    return out


def poll_nws(get_json, make_record, valid_lat_lon) -> List[dict]:
    """Official currently-active NWS alerts for U.S. jurisdictions.

    The source GeoJSON geometry is preserved verbatim (within supported geometry
    types). A centroid is carried only as a representative point for consumers
    that require one; it is never a replacement for the authoritative polygon.
    """
    data = get_json("https://api.weather.gov/alerts/active")
    out = []
    for feature in data.get("features", []):
        p = feature.get("properties") or {}
        raw_id = feature.get("id") or p.get("id") or p.get("@id")
        url = p.get("@id") or feature.get("id")
        sent = _iso(p.get("sent") or p.get("effective") or p.get("onset"))
        if not raw_id or not url or not sent:
            continue
        geometry = _source_geometry(feature.get("geometry"))
        c = _centroid(geometry, valid_lat_lon)
        certainty = str(p.get("certainty") or "")
        r = make_record(
            source_id=f"nws:{raw_id}", lineage="nws-cap", agency="NWS", network="NWS CAP",
            kind="Official Weather Alert", modality="official-warning", observed_at=sent,
            lat=c[0] if c else None, lon=c[1] if c else None, source=url,
            title=p.get("event") or p.get("headline") or "NWS Alert", authoritative=True,
            locationPrecision="alert-geometry-centroid" if c else "unresolved",
            officialAlert=True, observationStatus="observed" if certainty.lower() == "observed" else "reported",
            expiresAt=_iso(p.get("expires") or p.get("ends")), severityText=str(p.get("severity") or ""),
            certaintyText=certainty, urgencyText=str(p.get("urgency") or ""), quality=1.0,
            geometry=geometry, geometryRole="warning-area" if geometry and geometry.get("type") in {"Polygon", "MultiPolygon"} else "source-geometry" if geometry else None,
            representativePoint={"lat": c[0], "lon": c[1]} if c else None,
        )
        if r:
            out.append(r)
    return out


def poll_swpc(get_json, make_record, _valid_lat_lon) -> List[dict]:
    """NOAA SWPC machine-readable alert/watch products.

    These are intentionally unlocated. D.O.M. must not invent a geographic pin
    for global/polar space-weather products.
    """
    url = "https://services.swpc.noaa.gov/products/alerts.json"
    data = get_json(url)
    if not isinstance(data, list):
        return []
    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        product = str(item.get("product_id") or "").strip()
        issued = _iso(item.get("issue_datetime"))
        message = str(item.get("message") or "").strip()
        if not product or not issued or not message:
            continue
        first = next((x.strip() for x in message.splitlines() if x.strip() and not x.startswith("Space Weather Message Code")), product)
        status = "forecast" if re.search(r"\b(WATCH|PREDICTED|EXPECTED)\b", message, re.I) else "observed" if re.search(r"\b(ALERT|THRESHOLD REACHED)\b", message, re.I) else "reported"
        scale = re.search(r"(?:NOAA\s+Scale|Noaa\s+Scale)\s*:\s*([A-Z]\d(?:\s*-\s*[^\r\n]+)?)", message)
        r = make_record(
            source_id=f"swpc:{product}:{issued}", lineage="noaa-swpc-alerts", agency="NOAA SWPC", network="NOAA SWPC",
            kind="Space Weather", modality="space-weather-alert", observed_at=issued, lat=None, lon=None, source=url,
            title=first[:240], authoritative=True, observationStatus=status, severityText=scale.group(1).strip() if scale else "",
            quality=1.0, upstream={"productId": product},
        )
        if r:
            out.append(r)
    return out


def builtin_adapters(get_json, make_record, valid_lat_lon) -> Dict[str, Callable[[], List[dict]]]:
    return {
        "nws-alerts": lambda: poll_nws(get_json, make_record, valid_lat_lon),
        "swpc": lambda: poll_swpc(get_json, make_record, valid_lat_lon),
        "ntwc": lambda: poll_tsunami_atom(_get_text, make_record, "ntwc"),
        "ptwc": lambda: poll_tsunami_atom(_get_text, make_record, "ptwc"),
    }


__all__ = ["poll_nws", "poll_swpc", "poll_tsunami_atom", "builtin_adapters"]