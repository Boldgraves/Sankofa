"""NASA POWER API client with an in-process cache.

Two products are used:
  * monthly PRECTOTCORR + T2M  -> seasonal rainfall and mean temperature
  * daily PRECTOTCORR          -> 10-day onset detection (see onset.py)

Every call degrades to a documented reference value when POWER is unreachable:
POWER has no local back-up, so the fallback numbers are labelled as such in the
API response and never passed off as a live reading.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from .locations import ZONE_CLIMATE, zone_for

log = logging.getLogger("sankofa.power")

POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
POWER_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
COMMUNITY = "AG"
TTL_SECONDS = 6 * 60 * 60

# (lat_1dp, lon_1dp) -> (fetched_at, payload). Same pattern for both products.
_DAILY_CACHE: dict[tuple[float, float, str, str], tuple[float, dict[str, float]]] = {}
_CLIMATE_CACHE: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}

_MONTH_DAYS = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)


def _get_json(url: str, params: dict[str, Any], timeout: float) -> dict:
    with httpx.Client(timeout=timeout) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        return response.json()


def _clean(values: dict[str, float]) -> dict[str, float]:
    """Drop POWER fill values (-999 means 'no data')."""
    return {k: float(v) for k, v in values.items() if float(v) > -900}


def fetch_daily_precip(lat: float, lon: float, start: str, end: str) -> dict[str, float] | None:
    """Daily PRECTOTCORR keyed by YYYYMMDD, or None when POWER is unreachable."""
    key = (round(lat, 1), round(lon, 1), start, end)
    now = time.time()
    cached = _DAILY_CACHE.get(key)
    if cached and now - cached[0] < TTL_SECONDS:
        return cached[1]

    try:
        payload = _get_json(
            POWER_DAILY_URL,
            {
                "parameters": "PRECTOTCORR",
                "community": COMMUNITY,
                "latitude": round(lat, 2),
                "longitude": round(lon, 2),
                "start": start,
                "end": end,
                "format": "JSON",
            },
            timeout=45.0,
        )
        series = _clean(payload["properties"]["parameter"]["PRECTOTCORR"])
        if not series:
            raise ValueError("POWER returned an empty PRECTOTCORR series")
        _DAILY_CACHE[key] = (now, series)
        return series
    except Exception as exc:  # network, HTTP, schema - all end in the same fallback
        log.warning("NASA POWER daily request failed (%s); serving fallback", exc)
        return None


def seasonal_climate(lat: float, lon: float, years: int = 5) -> dict[str, Any]:
    """March-October rainfall (mm) and mean temperature, averaged over `years`."""
    key = (round(lat, 1), round(lon, 1))
    now = time.time()
    cached = _CLIMATE_CACHE.get(key)
    if cached and now - cached[0] < TTL_SECONDS:
        return cached[1]

    zone = zone_for(lat, lon)
    fallback = ZONE_CLIMATE[zone]
    end_year = 2023
    start_year = end_year - years + 1

    try:
        payload = _get_json(
            POWER_MONTHLY_URL,
            {
                "parameters": "PRECTOTCORR,T2M",
                "community": COMMUNITY,
                "latitude": round(lat, 2),
                "longitude": round(lon, 2),
                "start": str(start_year),
                "end": str(end_year),
                "format": "JSON",
            },
            timeout=30.0,
        )
        params = payload["properties"]["parameter"]
        rain = _clean(params["PRECTOTCORR"])
        temp = _clean(params["T2M"])

        rain_totals: list[float] = []
        temps: list[float] = []
        for year in range(start_year, end_year + 1):
            total = 0.0
            tvals: list[float] = []
            for month in range(3, 11):
                stamp = f"{year}{month:02d}"
                if stamp in rain:
                    total += rain[stamp] * _MONTH_DAYS[month - 1]
                if stamp in temp:
                    tvals.append(temp[stamp])
            if total > 50:
                rain_totals.append(total)
            if tvals:
                temps.append(sum(tvals) / len(tvals))
        if not rain_totals:
            raise ValueError("no usable monthly rainfall")

        result = {
            "seasonal_rainfall_mm": round(sum(rain_totals) / len(rain_totals)),
            "mean_temp_c": round(sum(temps) / len(temps), 1) if temps else fallback["temp_c"],
            "period": f"{start_year}-{end_year}",
            "source": "NASA POWER",
        }
    except Exception as exc:
        log.warning("NASA POWER monthly request failed (%s); serving zone reference", exc)
        result = {
            "seasonal_rainfall_mm": fallback["rain_mm"],
            "mean_temp_c": fallback["temp_c"],
            "period": "zone reference",
            "source": "Zone reference (POWER unreachable)",
        }

    _CLIMATE_CACHE[key] = (now, result)
    return result
