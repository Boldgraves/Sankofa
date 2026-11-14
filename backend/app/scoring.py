"""Deterministic rotation scoring.

No generative model touches a score. Every sub-score is a documented function of
GAEZ suitability, SoilGrids properties and NASA POWER rainfall/temperature. The
Gemini narration layer (gemini_client.py) only rephrases the numbers returned
here, and the UI labels it as AI generated.
"""

from __future__ import annotations

from statistics import mean

from .locations import (
    CACHED_LOCATIONS,
    CROPS,
    GAEZ_SUITABILITY,
    ROTATIONS,
    ZONE_MARKETS,
    zone_for,
)

DISCLAIMER = (
    "Sankofa supports — it does not replace — farmer judgment. "
    "Verify with a MoFA extension officer."
)
SOIL_CONFIDENCE = (
    "Soil data: 250m resolution (SoilGrids) — confirm with a local soil test "
    "or MoFA extension officer."
)

PRIORITY_WEIGHTS = {"High": 0.40, "Medium": 0.28, "Low": 0.16}
DEFAULT_PRIORITY = {"water": "Medium", "soil": "Medium", "market": "Medium", "yield": "Medium"}


def _clamp(value: float, low: float = 0.0, high: float = 10.0) -> float:
    return max(low, min(high, value))


def _temp_factor(mean_temp: float, crop: dict) -> float:
    low, high = crop["temp_range"]
    if low <= mean_temp <= high:
        return 1.0
    distance = low - mean_temp if mean_temp < low else mean_temp - high
    return max(0.45, 1.0 - 0.09 * distance)


SEASON_LENGTH_DAYS = 245  # 1 March - 31 October, the rain-fed window


def _crop_water_score(seasonal_rain_mm: float, crop: dict) -> float:
    """Rainfall adequacy for one crop inside its own growing window.

    A crop only receives the rain that falls while it is in the ground, so the
    seasonal total is prorated by crop duration before it meets the crop water
    requirement.
    """
    window_rain = seasonal_rain_mm * min(1.0, crop["duration_days"] / SEASON_LENGTH_DAYS)
    ratio = window_rain / crop["water_mm"]
    if ratio >= 1.0:
        score = 8.5 + 1.5 * min((ratio - 1.0) / 0.5, 1.0)
    else:
        score = 8.5 * ratio**0.75
    if ratio > 1.6 and crop["family"] in ("root", "vegetable"):
        score -= 0.4  # waterlogging risk on poorly drained plots
    return _clamp(score)


def _water_score(seasonal_rain_mm: float, crops: list[dict]) -> float:
    """Mean rainfall adequacy across the rotation."""
    return _clamp(mean(_crop_water_score(seasonal_rain_mm, crop) for crop in crops))


def _soil_score(soil: dict, crops: list[dict]) -> float:
    ph = float(soil["ph"])
    soc = float(soil["soc_g_kg"])
    clay = float(soil["clay_pct"])

    ph_score = _clamp(10 - 2.6 * abs(ph - 6.4))
    soc_score = _clamp(soc / 14.0 * 10.0)
    clay_score = _clamp(10 - abs(clay - 24.0) * 0.45)

    legumes = sum(1 for c in crops if c["legume"])
    legume_credit = min(1.2, 0.7 * legumes)

    families = [c["family"] for c in crops]
    depletion = 0.0
    if len(set(families)) == 1 and len(crops) > 1:
        depletion += 0.6  # same family every season
    if any(f == "root" for f in families):
        depletion += 0.45

    return _clamp(0.35 * ph_score + 0.40 * soc_score + 0.25 * clay_score + legume_credit - depletion)


def _yield_score_for(zone: str, crops: list[dict], mean_temp: float, ids: list[str]) -> float:
    suitability = GAEZ_SUITABILITY[zone]
    values = [10.0 * suitability.get(cid, 0.0) * _temp_factor(mean_temp, crop) for cid, crop in zip(ids, crops)]
    return _clamp(mean(values))


def _market_score(zone: str, crops: list[dict]) -> float:
    access = ZONE_MARKETS[zone]
    value = mean(c["market"] for c in crops) * access * 10.0
    if len(set(c["family"] for c in crops)) > 1:
        value += 0.25  # staggered harvest spreads price risk
    return _clamp(value)


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            out.append(value)
    return out


def _confidence(crops: list[dict], soil: dict, zone: str) -> dict:
    gaps = _unique([g for c in crops for g in c["gaps"]])
    return {
        "soil_statement": SOIL_CONFIDENCE,
        "data_gaps": gaps,
        "soil_source": soil.get("source", "ISRIC SoilGrids 250m"),
        "suitability_source": f"FAO GAEZ v4 — {zone}",
        "needs_local_verification": any(
            ("local" in g.lower() or "field" in g.lower()) for g in gaps
        ),
    }


def _build_crop_entries(ids: list[str]) -> list[dict]:
    missing = [cid for cid in ids if cid not in CROPS]
    if missing:
        raise KeyError(f"unknown crop id(s): {', '.join(missing)}")
    return [CROPS[cid] for cid in ids]


def _score_option(
    *,
    option_id: str,
    title: str,
    crop_ids: list[str],
    cycle: str,
    ctx: dict,
    priorities: dict,
    is_baseline: bool = False,
) -> dict:
    crops = _build_crop_entries(crop_ids)
    zone = ctx["zone"]
    soil = ctx["soil"]
    rain = ctx["seasonal_rainfall_mm"] * ctx["rainfall_factor"]
    temp = ctx["mean_temp_c"]

    sub = {
        "water": round(_water_score(rain, crops), 2),
        "soil": round(_soil_score(soil, crops), 2),
        "yield": round(_yield_score_for(zone, crops, temp, crop_ids), 2),
        "market": round(_market_score(zone, crops), 2),
    }

    weights = {k: PRIORITY_WEIGHTS.get(str(priorities.get(k, "Medium")).title(), 0.28) for k in sub}
    weight_total = sum(weights.values())
    weighted = sum(sub[k] * weights[k] for k in sub) / weight_total

    confidence = _confidence(crops, soil, zone)
    risks = _unique([r for c in crops for r in c["risks"]])
    penalty = min(1.4, 0.22 * len(risks) + 0.12 * len(confidence["data_gaps"]))

    total = round(_clamp(weighted - penalty), 2)

    return {
        "id": f"baseline_{option_id}" if is_baseline else option_id,
        "title": title,
        "crops": crop_ids,
        "crop_names": [c["name"] for c in crops],
        "cycle": cycle,
        "is_baseline": is_baseline,
        "score": total,
        "raw_weighted": round(weighted, 3),
        "penalty": round(penalty, 2),
        "subscores": sub,
        "weights": {k: round(v / weight_total, 3) for k, v in weights.items()},
        "risks": risks,
        "confidence": confidence,
        "disclaimer": DISCLAIMER,
    }


def _tiebreak_field(priorities: dict) -> str:
    def level(key: str) -> str:
        return str(priorities.get(key, "Medium")).title()

    if level("water") in ("Medium", "High"):
        return "water"
    if level("soil") in ("Medium", "High"):
        return "soil"
    return "market"


def _rank(options: list[dict], priorities: dict) -> list[dict]:
    """Sort by weighted total, then break near-ties (within 0.05) by sub-score.

    Options are grouped into clusters anchored on their best score so the
    comparison stays transitive; a plain comparator with a 0.05 tolerance can
    contradict itself when three options sit inside one another's tolerance.
    """
    field = _tiebreak_field(priorities)
    ordered = sorted(options, key=lambda option: (-option["score"], option["title"]))

    clusters: list[list[dict]] = []
    for option in ordered:
        if clusters and abs(option["score"] - clusters[-1][0]["score"]) <= 0.05:
            clusters[-1].append(option)
        else:
            clusters.append([option])

    ranked: list[dict] = []
    for cluster in clusters:
        cluster.sort(
            key=lambda option: (
                -option["subscores"][field],
                -option["subscores"]["water"],
                -option["subscores"]["soil"],
                -option["subscores"]["market"],
                option["title"],
            )
        )
        ranked.extend(cluster)
    return ranked


def recommend(
    *,
    lat: float,
    lon: float,
    soil: dict,
    climate: dict,
    current_crop: str | None = None,
    priorities: dict | None = None,
    rainfall_factor: float = 1.0,
    max_cards: int = 6,
) -> dict:
    """Rank rotations for a point. Returns the baseline card plus alternatives."""
    priorities = {**DEFAULT_PRIORITY, **(priorities or {})}
    zone = zone_for(lat, lon)
    ctx = {
        "zone": zone,
        "soil": soil,
        "seasonal_rainfall_mm": climate["seasonal_rainfall_mm"],
        "mean_temp_c": climate["mean_temp_c"],
        "rainfall_factor": rainfall_factor,
    }

    baseline = None
    if current_crop and current_crop in CROPS:
        baseline = _score_option(
            option_id=current_crop,
            title=CROPS[current_crop]["name"],
            crop_ids=[current_crop],
            cycle="1 season (your current practice)",
            ctx=ctx,
            priorities=priorities,
            is_baseline=True,
        )

    suitability = GAEZ_SUITABILITY[zone]
    options: list[dict] = []
    for rotation in ROTATIONS:
        score_ids = rotation["crops"]
        avg_suitability = mean(suitability.get(cid, 0.0) for cid in score_ids)
        if avg_suitability < 0.30:
            continue
        if baseline and sorted(set(score_ids)) == [current_crop]:
            continue  # the monoculture card would duplicate the baseline
        options.append(
            _score_option(
                option_id=rotation["id"],
                title=rotation["title"],
                crop_ids=score_ids,
                cycle=rotation["cycle"],
                ctx=ctx,
                priorities=priorities,
            )
        )

    options = _rank(options, priorities)

    if baseline:
        threshold = baseline["score"] + 0.2
        above = [o for o in options if o["score"] >= threshold]
        below = [o for o in options if o["score"] < threshold]
        for option in options:
            option["beats_baseline"] = option["score"] >= threshold
            option["score_delta"] = round(option["score"] - baseline["score"], 2)
        ranked = above + [baseline] + below
    else:
        ranked = options

    ranked = ranked[:max_cards]

    return {
        "location": {
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "zone": zone,
            "soil": soil,
        },
        "climate": climate,
        "priorities": priorities,
        "rainfall_factor": rainfall_factor,
        "tiebreak_field": _tiebreak_field(priorities),
        "baseline_present": baseline is not None,
        "baseline_score": baseline["score"] if baseline else None,
        "alternatives_above_baseline": sum(1 for o in ranked if o.get("beats_baseline")),
        "cards": ranked,
        "disclaimer": DISCLAIMER,
        "soil_confidence": SOIL_CONFIDENCE,
    }


def crop_catalogue() -> list[dict]:
    """Crops offered in the frontend selector."""
    theme = {
        "maize": "Staple · cereal",
        "cowpea": "Legume · cash",
        "groundnut": "Legume · cash",
        "soybean": "Legume · cash",
        "sorghum": "Staple · cereal",
        "millet": "Staple · cereal",
        "rice": "Staple · cereal",
        "cassava": "Root · staple",
        "yam": "Root · cash",
        "tomato": "Vegetable · cash",
        "pepper": "Vegetable · cash",
        "plantain": "Perennial · staple",
        "cocoa": "Perennial · export",
    }
    return [{"id": cid, "name": crop["name"], "tag": theme.get(cid, "")} for cid, crop in CROPS.items()]


def cached_site_names() -> list[str]:
    return list(CACHED_LOCATIONS.keys())
