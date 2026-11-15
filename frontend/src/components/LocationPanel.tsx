import { useState } from "react";
import { searchPlace } from "../api";
import type { CropOption, PriorityLevel, RecommendResponse } from "../types";

export interface Point {
  lat: number;
  lon: number;
  label: string;
}

interface Props {
  point: Point;
  onPoint: (lat: number, lon: number, label: string) => void;
  crops: CropOption[];
  currentCrop: string;
  onCurrentCrop: (id: string) => void;
  priorities: { water: PriorityLevel; soil: PriorityLevel; market: PriorityLevel };
  onPriority: (key: "water" | "soil" | "market", level: PriorityLevel) => void;
  rec: RecommendResponse | null;
}

const DEMO_SITES = [
  { name: "Tamale", lat: 9.4, lon: -0.85 },
  { name: "Techiman", lat: 7.59, lon: -1.93 },
  { name: "Cape Coast", lat: 5.11, lon: -1.29 },
];

const LEVELS: PriorityLevel[] = ["Low", "Medium", "High"];

const FIELD = "border border-border bg-elevated text-text-primary outline-none focus:border-accent-blue";

export default function LocationPanel({
  point,
  onPoint,
  crops,
  currentCrop,
  onCurrentCrop,
  priorities,
  onPriority,
  rec,
}: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("This browser has no location support.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPoint(
          Number(position.coords.latitude.toFixed(4)),
          Number(position.coords.longitude.toFixed(4)),
          "My location",
        );
        setLocating(false);
      },
      () => {
        setGeoError("Location permission denied — search by place name instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await searchPlace(term);
      onPoint(result.lat, result.lon, result.name.split(",")[0]);
      setQuery("");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Place not found");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Field location
          </h2>
          {rec && (
            <span className="rounded-full bg-accent-blue px-2 py-0.5 text-[10px] font-semibold text-white">
              {rec.location.zone}
            </span>
          )}
        </div>

        <p className="mt-1 font-display text-lg leading-tight text-text-primary">{point.label}</p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-text-secondary">
          {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
        </p>

        <button
          type="button"
          onClick={useMyLocation}
          className="mt-3 w-full bg-accent-blue px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {locating ? "Locating…" : "Use my location"}
        </button>

        <form onSubmit={submitSearch} className="mt-3">
          <label htmlFor="place-search" className="text-[11px] text-text-secondary">
            Or search by place name
          </label>
          <div className="mt-1 flex gap-1.5">
            <input
              id="place-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Bolgatanga"
              className={`min-w-0 flex-1 px-2.5 py-1.5 text-sm placeholder:text-text-secondary/60 ${FIELD}`}
            />
            <button
              type="submit"
              disabled={searching}
              className="border border-border px-2.5 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-elevated disabled:opacity-50"
            >
              {searching ? "…" : "Search"}
            </button>
          </div>
        </form>
        {searchError && <p className="mt-1 text-[11px] text-accent-amber">{searchError}</p>}
        {geoError && <p className="mt-1 text-[11px] text-accent-amber">{geoError}</p>}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {DEMO_SITES.map((site) => (
            <button
              key={site.name}
              type="button"
              onClick={() => onPoint(site.lat, site.lon, site.name)}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary transition hover:border-accent-amber hover:text-accent-amber"
            >
              {site.name}
            </button>
          ))}
        </div>

        {rec && (
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
            <div>
              <dt className="text-text-secondary">Season rainfall</dt>
              <dd className="font-semibold tabular-nums text-text-primary">
                {rec.climate.seasonal_rainfall_mm} mm
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Mean temp.</dt>
              <dd className="font-semibold tabular-nums text-text-primary">
                {rec.climate.mean_temp_c} °C
              </dd>
            </div>
            <div className="col-span-2 text-[10px] leading-relaxed text-text-secondary/80">
              {rec.climate.source} · {rec.climate.period} ·{" "}
              {rec.location.cached
                ? "reference site (cached)"
                : `${rec.location.distance_to_site_km} km from ${rec.location.nearest_site}`}
            </div>
            <div className="col-span-2 text-[10px] leading-relaxed text-text-secondary/80">
              {rec.location.soil.texture} · pH {rec.location.soil.ph} · SOC{" "}
              {rec.location.soil.soc_g_kg} g/kg · {rec.location.soil.source}
            </div>
          </dl>
        )}
      </section>

      <section className="border border-border bg-surface p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Your field
        </h2>

        <label htmlFor="current-crop" className="mt-2 block text-[11px] text-text-secondary">
          Current crop
        </label>
        <select
          id="current-crop"
          value={currentCrop}
          onChange={(event) => onCurrentCrop(event.target.value)}
          className={`mt-1 w-full px-2.5 py-1.5 text-sm ${FIELD}`}
        >
          <option value="">Not set</option>
          {crops.map((crop) => (
            <option key={crop.id} value={crop.id}>
              {crop.name}
            </option>
          ))}
        </select>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Priorities
        </p>
        {(["water", "soil", "market"] as const).map((key) => (
          <div key={key} className="mt-2">
            <span id={`priority-${key}-label`} className="text-xs capitalize text-text-secondary">
              {key === "market" ? "Market access" : `${key} security`}
            </span>
            <div
              role="group"
              aria-labelledby={`priority-${key}-label`}
              className="mt-1 grid grid-cols-3 gap-1"
            >
              {LEVELS.map((level) => {
                const active = priorities[key] === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPriority(key, level)}
                    className={[
                      "border px-1 py-1 text-[11px] font-semibold transition",
                      active
                        ? "border-accent-amber bg-accent-amber text-[#0d1117]"
                        : "border-border bg-elevated text-text-secondary hover:text-text-primary",
                    ].join(" ")}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
