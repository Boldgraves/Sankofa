"""Pre-fetched MODIS NDVI 16-day composites for the seven reference sites.

APPEEARS requires an Earthdata token, so Sankofa bundles one composite series per
reference site and serves it instantly. Non-reference points return null and the
UI falls back to the MODIS tile overlay message.

Regenerate with: python -m scripts.gen_ndvi
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .locations import is_cached, nearest_cached

_PATH = Path(__file__).with_name("data") / "ndvi_series.json"
SOURCE_LABEL = "NASA GIBS / MODIS Terra"


@lru_cache(maxsize=1)
def _series() -> dict:
    with _PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ndvi_history(lat: float, lon: float) -> dict:
    """16-day NDVI series for a reference site, else nulls."""
    site_name, distance_km = nearest_cached(lat, lon)
    if not is_cached(lat, lon):
        return {
            "dates": None,
            "ndvi": None,
            "source": SOURCE_LABEL,
            "nearest_site": site_name,
            "distance_to_site_km": round(distance_km, 1),
            "message": "NDVI trend unavailable for this location — tile overlay active.",
        }

    payload = _series()
    entry = payload["locations"].get(site_name)
    if not entry:
        return {
            "dates": None,
            "ndvi": None,
            "source": SOURCE_LABEL,
            "nearest_site": site_name,
            "message": "NDVI trend unavailable for this location — tile overlay active.",
        }

    return {
        "dates": entry["dates"],
        "ndvi": entry["ndvi"],
        "source": SOURCE_LABEL,
        "product": payload.get("product", "MOD13Q1 v061, 16-day composites"),
        "site": site_name,
        "composite_days": payload.get("composite_days", 16),
        "period": payload.get("period", "2019-2024"),
    }
