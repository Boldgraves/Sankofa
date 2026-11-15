"""Sankofa API — field rotation intelligence for Ghana.

Endpoints
  GET /health
  GET /crops
  GET /locations
  GET /recommend?lat&lon&current_crop&water_priority&soil_priority&market_priority&rainfall_factor
  GET /onset?lat&lon
  GET /ndvi-history?lat&lon
  GET /geocode?q
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Read backend/.env (if present) before anything reads os.environ. Real
# environment variables always win, so a deployed secret is never overridden.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

from . import ndvi_data, onset, scoring  # noqa: E402
from .gemini_client import narrate
from .khaya_client import SUPPORTED_LANGUAGES, translate_text
from .locations import CACHED_LOCATIONS, CROPS, location_summary
from .nasa_power import seasonal_climate

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Sankofa API", version="1.0.0", description="Field rotation intelligence")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

PRIORITY_LEVELS = {"low": "Low", "medium": "Medium", "high": "High"}
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def _priority(value: str, field: str) -> str:
    level = PRIORITY_LEVELS.get(value.strip().lower())
    if not level:
        raise HTTPException(status_code=400, detail=f"{field} must be Low, Medium or High")
    return level


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "sankofa", "version": "1.0.0"}


@app.get("/crops")
def crops() -> dict:
    return {"crops": scoring.crop_catalogue()}


@app.get("/locations")
def locations() -> dict:
    return {
        "locations": [
            {"name": name, "lat": site["lat"], "lon": site["lon"], "zone": site["zone"]}
            for name, site in CACHED_LOCATIONS.items()
        ]
    }


@app.get("/recommend")
def recommend(
    lat: float = Query(..., ge=-90, le=90, description="Latitude (WGS84)"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude (WGS84)"),
    current_crop: str | None = Query(None, description="Crop the farmer plants now"),
    water_priority: str = Query("Medium"),
    soil_priority: str = Query("Medium"),
    market_priority: str = Query("Medium"),
    rainfall_factor: float = Query(1.0, ge=0.5, le=1.5, description="Scenario multiplier on POWER rainfall"),
    language: str = Query("eng", description="Narration language: eng, twi, ewe, gaa, fat, dag, gur, kus"),
) -> dict:
    if current_crop is not None and current_crop not in CROPS:
        raise HTTPException(status_code=400, detail=f"unknown current_crop '{current_crop}'")

    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"language must be one of {', '.join(SUPPORTED_LANGUAGES)}",
        )

    priorities = {
        "water": _priority(water_priority, "water_priority"),
        "soil": _priority(soil_priority, "soil_priority"),
        "market": _priority(market_priority, "market_priority"),
        "yield": "Medium",
    }

    location = location_summary(lat, lon)
    climate = seasonal_climate(lat, lon)

    result = scoring.recommend(
        lat=lat,
        lon=lon,
        soil=location["soil"],
        climate=climate,
        current_crop=current_crop,
        priorities=priorities,
        rainfall_factor=rainfall_factor,
    )
    result["location"] = {**location, **result["location"]}
    narration = narrate(result["cards"], result["location"], result["climate"])
    # This endpoint is sync (POWER/Nominatim are blocking httpx clients), so it
    # runs in FastAPI's threadpool: asyncio.run is safe here and keeps Khaya's
    # async client unchanged.
    translation = asyncio.run(translate_text(narration["text"], language))
    translated = translation != narration["text"]
    narration["text"] = translation
    result["narration"] = narration
    result["language"] = {
        "code": language,
        "label": SUPPORTED_LANGUAGES[language],
        "translated": translated,
    }
    result["scenario"] = {
        "rainfall_factor": rainfall_factor,
        "label": "Low" if rainfall_factor < 0.95 else "High" if rainfall_factor > 1.05 else "Normal",
    }
    return result


@app.get("/onset")
def onset_endpoint(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> dict:
    return onset.onset_for(lat, lon)


@app.get("/ndvi-history")
def ndvi_history_endpoint(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> dict:
    return ndvi_data.ndvi_history(lat, lon)


@app.get("/geocode")
def geocode(q: str = Query(..., min_length=2, description="Place name in Ghana")) -> dict:
    """Nominatim proxy (server-side keeps a compliant User-Agent)."""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                NOMINATIM_URL,
                params={"q": q, "countrycodes": "gh", "format": "json", "limit": 1},
                headers={"User-Agent": "Sankofa/1.0 (NASA Space Apps 2026; CypherSpace)"},
            )
            response.raise_for_status()
            results = response.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Geocoding service unavailable") from exc

    if not results:
        raise HTTPException(status_code=404, detail=f"No Ghanaian place found for '{q}'")

    first = results[0]
    return {
        "name": first.get("display_name", q),
        "lat": float(first["lat"]),
        "lon": float(first["lon"]),
    }
