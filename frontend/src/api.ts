import type {
  CropOption,
  NdviResponse,
  OnsetResponse,
  PriorityLevel,
  RecommendResponse,
  Site,
} from "./types";

const BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "/api").replace(
  /\/+$/,
  "",
);

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { signal });
  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* keep the status code */
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export interface RecommendParams {
  lat: number;
  lon: number;
  currentCrop: string;
  priorities: { water: PriorityLevel; soil: PriorityLevel; market: PriorityLevel };
  rainfallFactor: number;
  language: string;
}

export function fetchRecommend(params: RecommendParams, signal?: AbortSignal) {
  const query = new URLSearchParams({
    lat: params.lat.toFixed(4),
    lon: params.lon.toFixed(4),
    water_priority: params.priorities.water,
    soil_priority: params.priorities.soil,
    market_priority: params.priorities.market,
    rainfall_factor: String(params.rainfallFactor),
    language: params.language,
  });
  if (params.currentCrop) query.set("current_crop", params.currentCrop);
  return getJson<RecommendResponse>(`/recommend?${query.toString()}`, signal);
}

export function fetchOnset(lat: number, lon: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  return getJson<OnsetResponse>(`/onset?${query.toString()}`, signal);
}

export function fetchNdvi(lat: number, lon: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  return getJson<NdviResponse>(`/ndvi-history?${query.toString()}`, signal);
}

export function fetchCrops() {
  return getJson<{ crops: CropOption[] }>("/crops");
}

export function fetchSites() {
  return getJson<{ locations: Site[] }>("/locations");
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
}

async function nominatimDirect(q: string): Promise<GeocodeResult> {
  const url =
    "https://nominatim.openstreetmap.org/search?q=" +
    encodeURIComponent(q) +
    "&countrycodes=gh&format=json&limit=1";
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Nominatim unavailable");
  const results = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  if (!results.length) throw new Error(`No Ghanaian place found for "${q}"`);
  return { name: results[0].display_name, lat: Number(results[0].lat), lon: Number(results[0].lon) };
}

export async function searchPlace(q: string): Promise<GeocodeResult> {
  try {
    return await getJson<GeocodeResult>(`/geocode?q=${encodeURIComponent(q)}`);
  } catch {
    // Direct Nominatim call, exactly as documented for the browser path.
    return nominatimDirect(q);
  }
}
