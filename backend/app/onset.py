"""Season onset detection from NASA POWER daily rainfall.

Onset definition (Field Shift brief):
  the first date after 1 March where the 10-day rolling rainfall total exceeds
  20 mm. Reported as day-of-year, one value per year 2001-2024.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import date, timedelta
from pathlib import Path

from .locations import nearest_cached
from .nasa_power import fetch_daily_precip

log = logging.getLogger("sankofa.onset")

EARLIEST_YEAR = 2001
LATEST_YEAR = 2024
START_DATE = f"{EARLIEST_YEAR}0301"
END_DATE = f"{LATEST_YEAR}1231"
WINDOW_DAYS = 10
THRESHOLD_MM = 20.0

_FALLBACK_PATH = Path(__file__).with_name("data") / "onset_fallbacks.json"
_CACHE: dict[tuple[float, float], dict] = {}


def _load_fallbacks() -> dict:
    with _FALLBACK_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _onset_doy(series: dict[str, float], year: int) -> int | None:
    """First day-of-year whose trailing 10-day rainfall total exceeds 20 mm."""
    start = date(year, 3, 1)
    end = date(year, 10, 31)
    window: list[tuple[date, float]] = []
    cursor = start - timedelta(days=WINDOW_DAYS - 1)
    day = cursor
    rolling: list[float] = []

    while day <= end:
        stamp = day.strftime("%Y%m%d")
        value = series.get(stamp)
        rolling.append(value if value is not None else 0.0)
        if len(rolling) > WINDOW_DAYS:
            rolling.pop(0)
        if day >= start and len(rolling) == WINDOW_DAYS and sum(rolling) > THRESHOLD_MM:
            return day.timetuple().tm_yday
        day += timedelta(days=1)
    return None


def _trend_days(onset_by_year: dict[int, int]) -> int:
    """Least-squares slope of onset DOY against year, expressed over 23 years."""
    years = sorted(onset_by_year)
    if len(years) < 3:
        return 0
    xs = [float(y) for y in years]
    ys = [float(onset_by_year[y]) for y in years]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0:
        return 0
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denom
    return int(round(slope * (LATEST_YEAR - EARLIEST_YEAR)))


def _fallback_payload(lat: float, lon: float) -> dict:
    fallbacks = _load_fallbacks()
    site_name, distance_km = nearest_cached(lat, lon)
    series = fallbacks["locations"].get(site_name)
    if not series:
        # Should not happen; keep the contract even if the file is edited.
        return {
            "onset_by_year": {},
            "trend_days": 0,
            "latest_year": LATEST_YEAR,
            "earliest_year": EARLIEST_YEAR,
            "source": "unavailable",
        }

    onset = {str(y): series[str(y)] for y in sorted(int(k) for k in series)}
    return {
        "onset_by_year": onset,
        "trend_days": _trend_days({int(k): v for k, v in onset.items()}),
        "latest_year": LATEST_YEAR,
        "earliest_year": EARLIEST_YEAR,
        "source": "cached-fallback",
        "fallback_site": site_name,
        "fallback_distance_km": round(distance_km, 1),
        "live": False,
    }


def onset_for(lat: float, lon: float) -> dict:
    key = (round(lat, 1), round(lon, 1))
    cached = _CACHE.get(key)
    if cached and time.time() - cached["_fetched_at"] < 6 * 60 * 60:
        return {k: v for k, v in cached.items() if k != "_fetched_at"}

    series = fetch_daily_precip(lat, lon, START_DATE, END_DATE)
    if not series:
        return _fallback_payload(lat, lon)

    onset_by_year: dict[str, int] = {}
    for year in range(EARLIEST_YEAR, LATEST_YEAR + 1):
        doy = _onset_doy(series, year)
        if doy is not None:
            onset_by_year[str(year)] = doy

    if len(onset_by_year) < 10:
        log.warning("too few onset years from POWER (%s); using fallback", len(onset_by_year))
        return _fallback_payload(lat, lon)

    payload = {
        "onset_by_year": onset_by_year,
        "trend_days": _trend_days({int(k): v for k, v in onset_by_year.items()}),
        "latest_year": LATEST_YEAR,
        "earliest_year": EARLIEST_YEAR,
        "source": "nasa-power",
        "live": True,
    }
    _CACHE[key] = {**payload, "_fetched_at": time.time()}
    return payload
