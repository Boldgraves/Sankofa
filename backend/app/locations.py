"""Static agronomic reference data for Sankofa.

Sources:
  * Soil properties — ISRIC SoilGrids 250 m (sand / clay / SOC / pH / nitrogen),
    sampled at the seven demo sites and inverse-distance interpolated elsewhere.
  * Crop suitability — FAO GAEZ v4 suitability index by agro-ecological zone.
  * Crop water requirement — FAO-56 seasonal totals for Ghanaian varieties.
  * Market indices — indicative gross margin ranking for northern/forest markets.
"""

from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

# --------------------------------------------------------------------------
# Seven reference sites: the cached locations used for offline fallbacks.
# --------------------------------------------------------------------------
CACHED_LOCATIONS: dict[str, dict] = {
    "Tamale": {
        "lat": 9.40,
        "lon": -0.85,
        "zone": "Guinea Savannah",
        "soil": {
            "texture": "Sandy loam",
            "sand_pct": 70.0,
            "clay_pct": 12.0,
            "soc_g_kg": 6.5,
            "ph": 6.0,
            "nitrogen_g_kg": 0.6,
            "drainage": "Well drained",
        },
    },
    "Bolgatanga": {
        "lat": 10.79,
        "lon": -0.85,
        "zone": "Guinea Savannah",
        "soil": {
            "texture": "Sandy loam",
            "sand_pct": 74.0,
            "clay_pct": 10.0,
            "soc_g_kg": 5.2,
            "ph": 6.2,
            "nitrogen_g_kg": 0.5,
            "drainage": "Excessively drained",
        },
    },
    "Wa": {
        "lat": 10.06,
        "lon": -2.50,
        "zone": "Guinea Savannah",
        "soil": {
            "texture": "Sandy loam",
            "sand_pct": 72.0,
            "clay_pct": 11.0,
            "soc_g_kg": 6.0,
            "ph": 5.9,
            "nitrogen_g_kg": 0.55,
            "drainage": "Well drained",
        },
    },
    "Techiman": {
        "lat": 7.59,
        "lon": -1.93,
        "zone": "Transition",
        "soil": {
            "texture": "Sandy clay loam",
            "sand_pct": 62.0,
            "clay_pct": 22.0,
            "soc_g_kg": 9.5,
            "ph": 5.8,
            "nitrogen_g_kg": 0.9,
            "drainage": "Well drained",
        },
    },
    "Kumasi": {
        "lat": 6.69,
        "lon": -1.57,
        "zone": "Forest",
        "soil": {
            "texture": "Sandy clay loam",
            "sand_pct": 58.0,
            "clay_pct": 26.0,
            "soc_g_kg": 12.5,
            "ph": 5.6,
            "nitrogen_g_kg": 1.1,
            "drainage": "Well drained",
        },
    },
    "Kade": {
        "lat": 6.09,
        "lon": -0.83,
        "zone": "Forest",
        "soil": {
            "texture": "Clay loam",
            "sand_pct": 48.0,
            "clay_pct": 30.0,
            "soc_g_kg": 14.0,
            "ph": 5.4,
            "nitrogen_g_kg": 1.2,
            "drainage": "Moderately drained",
        },
    },
    "Cape Coast": {
        "lat": 5.11,
        "lon": -1.29,
        "zone": "Coastal Savannah",
        "soil": {
            "texture": "Sandy loam",
            "sand_pct": 66.0,
            "clay_pct": 18.0,
            "soc_g_kg": 8.0,
            "ph": 5.9,
            "nitrogen_g_kg": 0.7,
            "drainage": "Well drained",
        },
    },
}

# Seasonal rainfall (mm, March-October) and mean temperature used only when
# NASA POWER cannot be reached.
ZONE_CLIMATE = {
    "Sudan Savannah": {"rain_mm": 720.0, "temp_c": 29.8},
    "Guinea Savannah": {"rain_mm": 1010.0, "temp_c": 28.4},
    "Transition": {"rain_mm": 1220.0, "temp_c": 27.4},
    "Forest": {"rain_mm": 1420.0, "temp_c": 26.6},
    "Coastal Savannah": {"rain_mm": 940.0, "temp_c": 26.9},
}

ZONE_MARKETS = {
    "Sudan Savannah": 0.52,
    "Guinea Savannah": 0.62,
    "Transition": 0.80,
    "Forest": 0.90,
    "Coastal Savannah": 0.84,
}

# --------------------------------------------------------------------------
# Crops. water_mm = seasonal crop water requirement (FAO-56, Ghana varieties).
# market = indicative gross margin index (0-1) in Ghanaian markets.
# --------------------------------------------------------------------------
CROPS: dict[str, dict] = {
    "maize": {
        "name": "Maize",
        "water_mm": 550,
        "temp_range": (21, 33),
        "market": 0.72,
        "legume": False,
        "family": "cereal",
        "duration_days": 105,
        "risks": [
            "Fall armyworm pressure peaks at tasselling",
            "Mid-season dry spell during grain fill",
        ],
        "gaps": [
            "District yield averages are three seasons old",
            "Field-level soil test needed before the next fertiliser decision",
        ],
    },
    "cowpea": {
        "name": "Cowpea",
        "water_mm": 300,
        "temp_range": (22, 36),
        "market": 0.66,
        "legume": True,
        "family": "legume",
        "duration_days": 70,
        "risks": [
            "Aphid and pod borer pressure between flowering and podding",
            "Harvest must be completed within five days of maturity",
        ],
        "gaps": [
            "Local cowpea price series missing for this district",
            "Field-level soil test needed for phosphorus advice",
        ],
    },
    "groundnut": {
        "name": "Groundnut",
        "water_mm": 450,
        "temp_range": (22, 34),
        "market": 0.79,
        "legume": True,
        "family": "legume",
        "duration_days": 100,
        "risks": [
            "Groundnut rosette where aphids are unmanaged",
            "Aflatoxin risk if drying is delayed after lifting",
        ],
        "gaps": ["Local aggregator prices unavailable for the current season"],
    },
    "soybean": {
        "name": "Soybean",
        "water_mm": 480,
        "temp_range": (20, 32),
        "market": 0.70,
        "legume": True,
        "family": "legume",
        "duration_days": 100,
        "risks": [
            "Seed viability falls quickly without cool storage",
            "Pod shattering when harvest is late",
        ],
        "gaps": ["Local soybean buyer contracts not tracked by district"],
    },
    "sorghum": {
        "name": "Sorghum",
        "water_mm": 380,
        "temp_range": (23, 36),
        "market": 0.55,
        "legume": False,
        "family": "cereal",
        "duration_days": 110,
        "risks": [
            "Quelea bird damage near ripening",
            "Striga pressure on continuously cropped fields",
        ],
        "gaps": ["Field-level soil test recommended for this plot"],
    },
    "millet": {
        "name": "Millet",
        "water_mm": 300,
        "temp_range": (24, 37),
        "market": 0.46,
        "legume": False,
        "family": "cereal",
        "duration_days": 90,
        "risks": [
            "Bird damage at grain fill",
            "Low yield ceiling without organic matter",
        ],
        "gaps": ["Local millet price data collected only annually"],
    },
    "rice": {
        "name": "Rice (upland)",
        "water_mm": 700,
        "temp_range": (22, 34),
        "market": 0.80,
        "legume": False,
        "family": "cereal",
        "duration_days": 120,
        "risks": [
            "Drought stress at panicle initiation",
            "Weed competition in the first four weeks",
        ],
        "gaps": ["Field-level soil test needed for nitrogen splitting"],
    },
    "cassava": {
        "name": "Cassava",
        "water_mm": 650,
        "temp_range": (22, 34),
        "market": 0.68,
        "legume": False,
        "family": "root",
        "duration_days": 300,
        "risks": [
            "Mosaic disease where planting material is recycled",
            "Nutrient mining if grown in consecutive cycles",
        ],
        "gaps": ["Local processor demand is not published in this district"],
    },
    "yam": {
        "name": "Yam",
        "water_mm": 800,
        "temp_range": (22, 34),
        "market": 0.76,
        "legume": False,
        "family": "root",
        "duration_days": 240,
        "risks": [
            "Seed yam cost dominates the budget",
            "Nematode build-up on reused mounds",
        ],
        "gaps": ["Field-level soil test needed for nematode history"],
    },
    "tomato": {
        "name": "Tomato",
        "water_mm": 600,
        "temp_range": (18, 31),
        "market": 0.90,
        "legume": False,
        "family": "vegetable",
        "duration_days": 95,
        "risks": [
            "Late blight and fruit fly in humid weeks",
            "Price collapses at district harvest peaks",
        ],
        "gaps": [
            "Local weekly price data unavailable for this market",
            "Field-level soil test needed before drip scheduling",
        ],
    },
    "pepper": {
        "name": "Pepper",
        "water_mm": 550,
        "temp_range": (20, 32),
        "market": 0.83,
        "legume": False,
        "family": "vegetable",
        "duration_days": 110,
        "risks": [
            "Thrips and mite pressure in dry spells",
            "Perishable within four days of harvest",
        ],
        "gaps": ["Local cold-chain availability not mapped for this district"],
    },
    "plantain": {
        "name": "Plantain",
        "water_mm": 1200,
        "temp_range": (22, 33),
        "market": 0.62,
        "legume": False,
        "family": "perennial",
        "duration_days": 330,
        "risks": [
            "Bunchy top and weevil pressure in old stands",
            "Wind damage on exposed plots",
        ],
        "gaps": ["Field-level soil test recommended before replanting"],
    },
    "cocoa": {
        "name": "Cocoa",
        "water_mm": 1300,
        "temp_range": (21, 32),
        "market": 0.95,
        "legume": False,
        "family": "perennial",
        "duration_days": 1095,
        "risks": [
            "Black pod in extended wet spells",
            "Swollen shoot where certified material is not used",
        ],
        "gaps": ["Local licenced buying station prices are not tracked"],
    },
}

# --------------------------------------------------------------------------
# FAO GAEZ suitability index (0-1) by agro-ecological zone.
# --------------------------------------------------------------------------
GAEZ_SUITABILITY: dict[str, dict[str, float]] = {
    "Sudan Savannah": {
        "maize": 0.45, "cowpea": 0.82, "groundnut": 0.78, "soybean": 0.50,
        "sorghum": 0.88, "millet": 0.90, "rice": 0.25, "cassava": 0.35,
        "yam": 0.30, "tomato": 0.35, "pepper": 0.40, "plantain": 0.10,
        "cocoa": 0.02,
    },
    "Guinea Savannah": {
        "maize": 0.72, "cowpea": 0.85, "groundnut": 0.82, "soybean": 0.70,
        "sorghum": 0.85, "millet": 0.82, "rice": 0.45, "cassava": 0.60,
        "yam": 0.65, "tomato": 0.45, "pepper": 0.50, "plantain": 0.25,
        "cocoa": 0.05,
    },
    "Transition": {
        "maize": 0.85, "cowpea": 0.78, "groundnut": 0.72, "soybean": 0.78,
        "sorghum": 0.65, "millet": 0.55, "rice": 0.60, "cassava": 0.82,
        "yam": 0.80, "tomato": 0.60, "pepper": 0.65, "plantain": 0.55,
        "cocoa": 0.30,
    },
    "Forest": {
        "maize": 0.80, "cowpea": 0.60, "groundnut": 0.55, "soybean": 0.55,
        "sorghum": 0.35, "millet": 0.30, "rice": 0.55, "cassava": 0.90,
        "yam": 0.85, "tomato": 0.55, "pepper": 0.60, "plantain": 0.82,
        "cocoa": 0.88,
    },
    "Coastal Savannah": {
        "maize": 0.70, "cowpea": 0.80, "groundnut": 0.70, "soybean": 0.45,
        "sorghum": 0.50, "millet": 0.45, "rice": 0.35, "cassava": 0.85,
        "yam": 0.50, "tomato": 0.60, "pepper": 0.65, "plantain": 0.60,
        "cocoa": 0.20,
    },
}

# --------------------------------------------------------------------------
# Candidate rotations. Scored identically to the farmer's current practice.
# --------------------------------------------------------------------------
ROTATIONS: list[dict] = [
    {"id": "maize_cowpea", "title": "Maize → Cowpea", "crops": ["maize", "cowpea"], "cycle": "2 seasons"},
    {"id": "maize_soybean", "title": "Maize → Soybean → Maize", "crops": ["maize", "soybean", "maize"], "cycle": "3 seasons"},
    {"id": "maize_groundnut", "title": "Maize → Groundnut", "crops": ["maize", "groundnut"], "cycle": "2 seasons"},
    {"id": "groundnut_millet", "title": "Groundnut → Millet", "crops": ["groundnut", "millet"], "cycle": "2 seasons"},
    {"id": "sorghum_cowpea", "title": "Sorghum → Cowpea", "crops": ["sorghum", "cowpea"], "cycle": "2 seasons"},
    {"id": "millet_sorghum", "title": "Millet → Sorghum", "crops": ["millet", "sorghum"], "cycle": "2 seasons"},
    {"id": "rice_cowpea", "title": "Rice → Cowpea", "crops": ["rice", "cowpea"], "cycle": "2 seasons"},
    {"id": "cassava_cowpea_maize", "title": "Cassava → Cowpea → Maize", "crops": ["cassava", "cowpea", "maize"], "cycle": "3 seasons"},
    {"id": "yam_maize", "title": "Yam → Maize", "crops": ["yam", "maize"], "cycle": "2 seasons"},
    {"id": "tomato_cowpea", "title": "Tomato → Cowpea", "crops": ["tomato", "cowpea"], "cycle": "2 seasons"},
    {"id": "pepper_groundnut", "title": "Pepper → Groundnut", "crops": ["pepper", "groundnut"], "cycle": "2 seasons"},
    {"id": "plantain_cassava", "title": "Plantain → Cassava", "crops": ["plantain", "cassava"], "cycle": "3 seasons"},
    {"id": "cocoa_plantain", "title": "Cocoa → Plantain (shaded)", "crops": ["cocoa", "plantain"], "cycle": "4 seasons"},
]


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def zone_for(lat: float, lon: float) -> str:  # noqa: ARG001 - lon kept for future zone edges
    """Agro-ecological zone from latitude bands used by MoFA/GSSP."""
    if lat >= 11.0:
        return "Sudan Savannah"
    if lat >= 9.0:
        return "Guinea Savannah"
    if lat >= 7.3:
        return "Transition"
    if lat >= 6.0:
        return "Forest"
    return "Coastal Savannah"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(a))


def nearest_cached(lat: float, lon: float) -> tuple[str, float]:
    """Nearest reference site and its distance in km."""
    best_name, best_km = "Tamale", float("inf")
    for name, site in CACHED_LOCATIONS.items():
        km = _haversine_km(lat, lon, site["lat"], site["lon"])
        if km < best_km:
            best_name, best_km = name, km
    return best_name, best_km


def is_cached(lat: float, lon: float, tolerance_km: float = 12.0) -> bool:
    _, km = nearest_cached(lat, lon)
    return km <= tolerance_km


def soil_for(lat: float, lon: float) -> dict:
    """SoilGrids properties at a point.

    Reference sites return their sampled profile; any other point is filled by
    inverse-distance weighting of the seven sampled profiles (250 m resolution
    would be misleading at this demo scale, and this keeps the number honest).
    """
    for name, site in CACHED_LOCATIONS.items():
        if _haversine_km(lat, lon, site["lat"], site["lon"]) <= 3.0:
            return {**site["soil"], "source": f"SoilGrids sample at {name}", "interpolated": False}

    weights: list[tuple[float, dict]] = []
    for site in CACHED_LOCATIONS.values():
        d = max(_haversine_km(lat, lon, site["lat"], site["lon"]), 1.0)
        weights.append((1.0 / d**2, site["soil"]))

    total = sum(w for w, _ in weights)
    fields = ("sand_pct", "clay_pct", "soc_g_kg", "ph", "nitrogen_g_kg")
    blended = {
        f: round(sum(w * s[f] for w, s in weights) / total, 2) for f in fields
    }
    nearest_name, nearest_km = nearest_cached(lat, lon)
    blended["texture"] = _texture_from(blended["sand_pct"], blended["clay_pct"])
    blended["drainage"] = "Well drained"
    blended["source"] = (
        f"SoilGrids, interpolated from {nearest_name} ({nearest_km:.0f} km away)"
    )
    blended["interpolated"] = True
    return blended


def _texture_from(sand: float, clay: float) -> str:
    if clay >= 35:
        return "Clay"
    if clay >= 27:
        return "Clay loam"
    if clay >= 20:
        return "Sandy clay loam" if sand >= 55 else "Clay loam"
    if sand >= 70:
        return "Sandy loam"
    if sand >= 50:
        return "Loam"
    return "Silt loam"


def location_summary(lat: float, lon: float) -> dict:
    nearest_name, nearest_km = nearest_cached(lat, lon)
    cached = is_cached(lat, lon)
    return {
        "lat": round(lat, 4),
        "lon": round(lon, 4),
        "name": nearest_name if cached else f"Near {nearest_name}",
        "zone": zone_for(lat, lon),
        "cached": cached,
        "nearest_site": nearest_name,
        "distance_to_site_km": round(nearest_km, 1),
        "soil": soil_for(lat, lon),
    }
