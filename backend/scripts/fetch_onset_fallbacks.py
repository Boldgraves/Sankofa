"""Fetch the real 2001-2024 onset series for the seven reference sites.

Run from backend/:  python scripts/fetch_onset_fallbacks.py

The output file is what /onset serves when NASA POWER is unreachable, so it is
real POWER data captured once, not invented numbers.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.locations import CACHED_LOCATIONS  # noqa: E402
from app.nasa_power import fetch_daily_precip  # noqa: E402
from app.onset import END_DATE, START_DATE, _onset_doy  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "app" / "data" / "onset_fallbacks.json"


def main() -> None:
    locations: dict[str, dict[str, int]] = {}
    for name, site in CACHED_LOCATIONS.items():
        series = fetch_daily_precip(site["lat"], site["lon"], START_DATE, END_DATE)
        if not series:
            raise SystemExit(f"POWER unreachable for {name}; aborting")
        years: dict[str, int] = {}
        for year in range(2001, 2025):
            doy = _onset_doy(series, year)
            if doy:
                years[str(year)] = doy
        locations[name] = years
        print(f"{name:14s} {len(years)} years, latest onset {years.get('2024')}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "definition": "first day after 1 March with a 10-day rolling rainfall sum above 20 mm",
                "period": "2001-2024",
                "source": "NASA POWER daily PRECTOTCORR (AG community), fetched once",
                "fetched": date.today().isoformat(),
                "locations": locations,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
