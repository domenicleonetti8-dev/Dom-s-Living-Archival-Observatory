"""Canonical D.O.M. projection for Safari globe and native Apple RealityKit clients.

This module does not create new observations. It projects existing canonical
broker records into a rendering contract and publishes metadata for lawful
public Earth-observation layers. Missing feeds remain explicitly unavailable.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

AR_SCHEMA = "dom.apple-ar.state.v1"

HAZARD_KINDS = {
    "Earthquake", "Tsunami", "Wildfire", "Volcano", "Severe Storm",
    "Official Weather Alert", "Space Weather", "Flood", "Landslide",
    "Extreme Heat", "Extreme Cold", "Drought", "Meteor/Bolide",
}

SATELLITE_LAYERS = [
    {
        "id": "nasa-worldview",
        "agency": "NASA EOSDIS",
        "name": "NASA Worldview / Earthdata imagery",
        "domains": ["atmosphere", "fire", "ocean", "land", "cryosphere"],
        "coverage": "global",
        "timeClass": "near-real-time-or-latest-available",
        "sourceUrl": "https://worldview.earthdata.nasa.gov/",
        "requiresCredential": False,
    },
    {
        "id": "nasa-firms",
        "agency": "NASA FIRMS",
        "name": "VIIRS/MODIS/Landsat active-fire observations",
        "domains": ["fire", "thermal"],
        "coverage": "global",
        "timeClass": "near-real-time; source/product dependent",
        "sourceUrl": "https://firms.modaps.eosdis.nasa.gov/",
        "requiresCredential": True,
    },
    {
        "id": "noaa-goes",
        "agency": "NOAA/NESDIS",
        "name": "GOES operational geostationary imagery",
        "domains": ["atmosphere", "storms", "cloud", "lightning"],
        "coverage": "GOES operational sectors",
        "timeClass": "operational; product dependent",
        "sourceUrl": "https://www.star.nesdis.noaa.gov/GOES/",
        "requiresCredential": False,
    },
    {
        "id": "noaa-jpss",
        "agency": "NOAA/NASA",
        "name": "JPSS / VIIRS polar-orbiting observations",
        "domains": ["atmosphere", "fire", "ocean", "land", "night-lights"],
        "coverage": "global swaths",
        "timeClass": "near-real-time-or-latest-available",
        "sourceUrl": "https://www.nesdis.noaa.gov/current-satellite-missions/currently-flying/joint-polar-satellite-system",
        "requiresCredential": False,
    },
    {
        "id": "landsat",
        "agency": "USGS/NASA",
        "name": "Landsat Earth observation",
        "domains": ["land", "water", "vegetation", "fire-scar"],
        "coverage": "global land",
        "timeClass": "latest-available-or-archival",
        "sourceUrl": "https://www.usgs.gov/landsat-missions",
        "requiresCredential": False,
    },
    {
        "id": "copernicus-sentinel",
        "agency": "ESA / European Commission Copernicus",
        "name": "Sentinel Earth observation missions",
        "domains": ["radar", "optical", "ocean", "atmosphere", "land"],
        "coverage": "global",
        "timeClass": "latest-available; product dependent",
        "sourceUrl": "https://www.copernicus.eu/en/access-data/copernicus-services-catalogue",
        "requiresCredential": True,
    },
    {
        "id": "nasa-gpm",
        "agency": "NASA/JAXA",
        "name": "Global Precipitation Measurement",
        "domains": ["precipitation", "storms", "hydrology"],
        "coverage": "global",
        "timeClass": "near-real-time-or-research-product",
        "sourceUrl": "https://gpm.nasa.gov/",
        "requiresCredential": False,
    },
    {
        "id": "nasa-smap",
        "agency": "NASA",
        "name": "Soil Moisture Active Passive",
        "domains": ["soil-moisture", "freeze-thaw", "drought"],
        "coverage": "global land",
        "timeClass": "latest-available",
        "sourceUrl": "https://smap.jpl.nasa.gov/",
        "requiresCredential": False,
    },
    {
        "id": "nasa-icesat2",
        "agency": "NASA",
        "name": "ICESat-2 laser altimetry",
        "domains": ["ice", "snow", "elevation", "vegetation"],
        "coverage": "global tracks",
        "timeClass": "latest-available-or-archival",
        "sourceUrl": "https://icesat-2.gsfc.nasa.gov/",
        "requiresCredential": False,
    },
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _num(value):
    if value is None or value == "":
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n and abs(n) != float("inf") else None


def _role(record: dict) -> str:
    kind = str(record.get("kind") or "")
    modality = str(record.get("modality") or "").lower()
    if kind in HAZARD_KINDS or record.get("officialAlert"):
        return "event"
    if "satellite" in modality or "imagery" in modality:
        return "satellite-observation"
    return "sensor"


def project_record(record: dict) -> dict:
    lat = _num(record.get("lat"))
    lon = _num(record.get("lon"))
    if lat is not None and not -90 <= lat <= 90:
        lat = None
    if lon is not None and not -180 <= lon <= 180:
        lon = None
    return {
        "id": str(record.get("sourceId") or record.get("id") or ""),
        "schema": str(record.get("schema") or "dom.observation.v1"),
        "role": _role(record),
        "kind": str(record.get("kind") or "Unknown"),
        "modality": str(record.get("modality") or ""),
        "agency": str(record.get("sourceAgency") or record.get("agency") or ""),
        "network": str(record.get("network") or ""),
        "lineageId": str(record.get("lineageId") or ""),
        "lat": lat,
        "lon": lon,
        "elevationM": _num(record.get("elevationM") or record.get("elevation")),
        "depthKm": _num(record.get("depthKm") or record.get("depth")),
        "locationPrecision": str(record.get("locationPrecision") or "unresolved"),
        "observedAt": record.get("observedAt"),
        "receivedAt": record.get("receivedAt"),
        "expiresAt": record.get("expiresAt"),
        "observationStatus": str(record.get("observationStatus") or "reported"),
        "authoritative": bool(record.get("authoritative")),
        "officialAlert": bool(record.get("officialAlert")),
        "quality": _num(record.get("quality")),
        "freshness": _num(record.get("freshness")),
        "anomaly": _num(record.get("anomaly")),
        "anomalyZ": _num(record.get("anomalyZ")),
        "persistence": _num(record.get("persistence")),
        "corroboration": _num(record.get("corroboration")),
        "hazardCoupling": _num(record.get("hazardCoupling")),
        "severityText": str(record.get("severityText") or ""),
        "certaintyText": str(record.get("certaintyText") or ""),
        "urgencyText": str(record.get("urgencyText") or ""),
        "title": str(record.get("title") or record.get("kind") or "Observation"),
        "geometry": record.get("geometry"),
        "measurements": record.get("measurements") or [],
        "sourceUrl": record.get("sourceUrl"),
    }


def build_ar_state(records: Iterable[dict], sources: Iterable[dict], version: int) -> dict:
    objects = [project_record(r) for r in records]
    source_rows = list(sources)
    located = sum(1 for o in objects if o["lat"] is not None and o["lon"] is not None)
    return {
        "schema": AR_SCHEMA,
        "version": int(version),
        "generatedAt": _now_iso(),
        "objects": objects,
        "satelliteLayers": SATELLITE_LAYERS,
        "sourceHealth": source_rows,
        "coverage": {
            "records": len(objects),
            "locatedRecords": located,
            "unlocatedRecords": len(objects) - located,
            "registeredSourceFamilies": len(source_rows),
            "activeSourceFamilies": sum(1 for s in source_rows if s.get("status") == "active"),
            "staleSourceFamilies": sum(1 for s in source_rows if s.get("status") == "stale"),
            "notIngestingSourceFamilies": sum(1 for s in source_rows if s.get("status") == "registered-not-ingesting"),
            "satelliteLayerFamilies": len(SATELLITE_LAYERS),
        },
        "truth": {
            "allSensorsMeaning": "all lawfully and technically connected public networks; not literally every instrument on Earth",
            "missingFeedMeaning": "unknown, never safe",
            "imageryMeaning": "timestamped evidence layer; not a continuous live camera unless source explicitly provides one",
        },
    }


__all__ = ["AR_SCHEMA", "SATELLITE_LAYERS", "project_record", "build_ar_state"]
