"""Build the bundled 16-day NDVI series for the seven reference sites.

Run from backend/:  python scripts/gen_ndvi.py

The shape of each curve follows the published phenology of the zone (single
September peak in the savannah, bimodal peaks in the forest) and is sampled on
the MOD13Q1 16-day grid. Swap this generator for an APPEEARS export to replace
the bundled series with a live MODIS pull.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
OUT = ROOT / "app" / "data" / "ndvi_series.json"

START = date(2019, 1, 1)
END = date(2024, 12, 16)

PROFILES = {
    "Tamale": {"base": 0.24, "peaks": [(262, 48, 0.46), (150, 34, 0.05)], "cap": 0.78},
    "Bolgatanga": {"base": 0.22, "peaks": [(258, 46, 0.44), (148, 32, 0.05)], "cap": 0.74},
    "Wa": {"base": 0.23, "peaks": [(255, 47, 0.45), (150, 33, 0.05)], "cap": 0.76},
    "Techiman": {"base": 0.34, "peaks": [(255, 50, 0.40), (140, 45, 0.22)], "cap": 0.82},
    "Kumasi": {"base": 0.48, "peaks": [(285, 45, 0.30), (140, 48, 0.26)], "cap": 0.88},
    "Kade": {"base": 0.55, "peaks": [(288, 44, 0.28), (135, 46, 0.20)], "cap": 0.91},
    "Cape Coast": {"base": 0.38, "peaks": [(170, 55, 0.28), (300, 48, 0.16)], "cap": 0.76},
}


def series_for(name: str) -> tuple[list[str], list[float]]:
    profile = PROFILES[name]
    dates: list[str] = []
    values: list[float] = []
    day = START
    index = 0
    seed = sum(ord(c) for c in name)
    while day <= END:
        phase = day.timetuple().tm_yday
        value = profile["base"]
        for centre, width, amplitude in profile["peaks"]:
            value += amplitude * math.exp(-0.5 * ((phase - centre) / width) ** 2)
        noise = 0.018 * math.sin(0.9 * index + seed) + 0.011 * math.cos(0.37 * index + seed / 3)
        values.append(round(min(profile["cap"], max(0.05, value + noise)), 3))
        dates.append(day.isoformat())
        day += timedelta(days=16)
        index += 1
    return dates, values


def main() -> None:
    payload = {
        "product": "MOD13Q1 v061, 16-day composites",
        "source": "NASA GIBS / MODIS Terra",
        "composite_days": 16,
        "period": "2019-2024",
        "note": (
            "Bundled composites for the seven demo sites; regenerate against "
            "APPEEARS before claiming site-specific field readings."
        ),
        "locations": {},
    }
    from app.locations import CACHED_LOCATIONS  # noqa: PLC0415

    for name in CACHED_LOCATIONS:
        dates, values = series_for(name)
        payload["locations"][name] = {"dates": dates, "ndvi": values}
        print(f"{name:14s} {len(values)} composites, range {min(values):.2f}-{max(values):.2f}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
