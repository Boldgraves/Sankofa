export type PriorityLevel = "Low" | "Medium" | "High";

export interface SubScores {
  water: number;
  soil: number;
  market: number;
  yield: number;
}

export interface CardConfidence {
  soil_statement: string;
  data_gaps: string[];
  soil_source: string;
  suitability_source: string;
  needs_local_verification: boolean;
}

export interface RotationCardData {
  id: string;
  title: string;
  crops: string[];
  crop_names: string[];
  cycle: string;
  is_baseline: boolean;
  score: number;
  raw_weighted: number;
  penalty: number;
  subscores: SubScores;
  weights: Record<string, number>;
  risks: string[];
  confidence: CardConfidence;
  disclaimer: string;
  beats_baseline?: boolean;
  score_delta?: number;
}

export interface Soil {
  texture: string;
  sand_pct: number;
  clay_pct: number;
  soc_g_kg: number;
  ph: number;
  nitrogen_g_kg: number;
  drainage: string;
  source: string;
  interpolated: boolean;
}

export interface LocationInfo {
  lat: number;
  lon: number;
  zone: string;
  name: string;
  cached: boolean;
  nearest_site: string;
  distance_to_site_km: number;
  soil: Soil;
}

export interface Climate {
  seasonal_rainfall_mm: number;
  mean_temp_c: number;
  period: string;
  source: string;
}

export interface Narration {
  text: string;
  generated: boolean;
  model: string | null;
  finish_reason?: string | null;
  cached?: boolean;
}

export interface RecommendResponse {
  location: LocationInfo;
  climate: Climate;
  priorities: Record<string, PriorityLevel>;
  rainfall_factor: number;
  tiebreak_field: string;
  baseline_present: boolean;
  baseline_score: number | null;
  alternatives_above_baseline: number;
  cards: RotationCardData[];
  disclaimer: string;
  soil_confidence: string;
  narration: Narration;
  scenario: { rainfall_factor: number; label: string };
}

export interface OnsetResponse {
  onset_by_year: Record<string, number>;
  trend_days: number;
  latest_year: number;
  earliest_year: number;
  source: string;
  live: boolean;
  fallback_site?: string;
  fallback_distance_km?: number;
}

export interface NdviResponse {
  dates: string[] | null;
  ndvi: number[] | null;
  source: string;
  product?: string;
  site?: string;
  composite_days?: number;
  period?: string;
  nearest_site?: string;
  distance_to_site_km?: number;
  message?: string;
}

export interface CropOption {
  id: string;
  name: string;
  tag: string;
}

export interface Site {
  name: string;
  lat: number;
  lon: number;
  zone: string;
}
