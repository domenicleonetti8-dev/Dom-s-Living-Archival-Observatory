"""Additional D.O.M. broker source adapters kept separate from broker state logic."""
from __future__ import annotations

import math
from datetime import datetime
from typing import List, Optional


def _iso(value) -> Optional[str]:
    if not value:
        return None
    try:
        datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return str(value)
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


def poll_nws(get_json, make_record, valid_lat_lon) -> List[dict]:
    """Official currently-active NWS alerts for U.S. jurisdictions.

    Uses /alerts/active. Geometry is summarized as a dateline-safe centroid for
    globe placement while the alert URL remains the authority for boundaries.
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
        c = _centroid(feature.get("geometry"), valid_lat_lon)
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
        )
        if r:
            out.append(r)
    return out


__all__ = ["poll_nws"]
