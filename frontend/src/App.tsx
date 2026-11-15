import { useEffect, useMemo, useState } from "react";
import { fetchCrops, fetchNdvi, fetchOnset, fetchRecommend, fetchSites } from "./api";
import Header from "./components/Header";
import LocationPanel, { type Point } from "./components/LocationPanel";
import NdviChart from "./components/NdviChart";
import PromptCard from "./components/PromptCard";
import RotationCard from "./components/RotationCard";
import SankofaStatBanner from "./components/SankofaStatBanner";
import ScenarioSlider from "./components/ScenarioSlider";
import ZoneMap from "./components/ZoneMap";
import { ThemeContext, THEME_STORAGE_KEY, type Theme } from "./theme";
import type {
  CropOption,
  NdviResponse,
  OnsetResponse,
  PriorityLevel,
  RecommendResponse,
  Site,
} from "./types";

const SCENARIOS = [0.7, 1.0, 1.3] as const;

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = typeof window === "undefined" ? null : localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  });
  const [point, setPoint] = useState<Point>({ lat: 9.4, lon: -0.85, label: "Tamale" });
  const [currentCrop, setCurrentCrop] = useState("");
  const [priorities, setPriorities] = useState<{
    water: PriorityLevel;
    soil: PriorityLevel;
    market: PriorityLevel;
  }>({ water: "Medium", soil: "Medium", market: "Medium" });
  const [scenarioIndex, setScenarioIndex] = useState<0 | 1 | 2>(1);

  const [rec, setRec] = useState<RecommendResponse | null>(null);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);

  const [onset, setOnset] = useState<OnsetResponse | null>(null);
  const [onsetLoading, setOnsetLoading] = useState(true);
  const [onsetError, setOnsetError] = useState<string | null>(null);

  const [ndvi, setNdvi] = useState<NdviResponse | null>(null);
  const [ndviLoading, setNdviLoading] = useState(true);

  const [crops, setCrops] = useState<CropOption[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const rainfallFactor = SCENARIOS[scenarioIndex];

  useEffect(() => {
    const background = theme === "light" ? "#f5f5f5" : "#0d1117";
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
  }, [theme]);

  useEffect(() => {
    fetchCrops()
      .then((data) => setCrops(data.crops))
      .catch(() => setCrops([]));
    fetchSites()
      .then((data) => setSites(data.locations))
      .catch(() => setSites([]));
  }, []);

  // Sankofa Stat and NDVI are independent of /recommend: never block the cards.
  useEffect(() => {
    const controller = new AbortController();
    setOnsetLoading(true);
    setOnsetError(null);
    setNdviLoading(true);

    fetchOnset(point.lat, point.lon, controller.signal)
      .then((data) => setOnset(data))
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setOnset(null);
          setOnsetError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOnsetLoading(false);
      });

    fetchNdvi(point.lat, point.lon, controller.signal)
      .then((data) => setNdvi(data))
      .catch(() => {
        if (!controller.signal.aborted) setNdvi(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setNdviLoading(false);
      });

    return () => controller.abort();
  }, [point.lat, point.lon]);

  useEffect(() => {
    const controller = new AbortController();
    setRecLoading(true);
    setRecError(null);

    fetchRecommend(
      {
        lat: point.lat,
        lon: point.lon,
        currentCrop,
        priorities,
        rainfallFactor,
      },
      controller.signal,
    )
      .then((data) => setRec(data))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setRecError(error.message || "Could not score rotations");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecLoading(false);
      });

    return () => controller.abort();
  }, [point.lat, point.lon, currentCrop, priorities, rainfallFactor]);

  const orderedCards = useMemo(() => {
    if (!rec) return [];
    const baseline = rec.cards.find((card) => card.is_baseline);
    const alternatives = rec.cards.filter((card) => !card.is_baseline);
    return baseline ? [baseline, ...alternatives] : alternatives;
  }, [rec]);

  const selectPoint = (lat: number, lon: number, label: string) =>
    setPoint({ lat, lon, label });

  return (
    <ThemeContext.Provider value={theme}>
    <div
      className={`min-h-screen bg-base text-text-primary${theme === "light" ? " theme-light" : ""}`}
    >
      <Header theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 lg:grid lg:grid-cols-[310px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="space-y-3 lg:border-r lg:border-border lg:bg-surface lg:pb-4 lg:pr-5 lg:pt-1">
          <LocationPanel
            point={point}
            onPoint={selectPoint}
            crops={crops}
            currentCrop={currentCrop}
            onCurrentCrop={setCurrentCrop}
            priorities={priorities}
            onPriority={(key, level) => setPriorities((prev) => ({ ...prev, [key]: level }))}
            rec={rec}
          />
          <div className="hidden lg:block">
            <ZoneMap sites={sites} lat={point.lat} lon={point.lon} onSelect={selectPoint} />
          </div>
          <div className="lg:hidden">
            <ZoneMap sites={sites} lat={point.lat} lon={point.lon} onSelect={selectPoint} />
          </div>
        </aside>

        <section className="mt-5 space-y-3 lg:mt-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary">
            <span>
              {rec
                ? `${rec.location.zone} · ${rec.location.name}`
                : "Loading field context…"}
            </span>
            <span>
              {rec
                ? `Tiebreak: ${rec.tiebreak_field} sub-score · ${rec.climate.source}`
                : ""}
            </span>
          </div>

          <SankofaStatBanner onset={onset} loading={onsetLoading} error={onsetError} />

          <NdviChart data={ndvi} loading={ndviLoading} />

          <ScenarioSlider
            index={scenarioIndex}
            onChange={setScenarioIndex}
            factor={rainfallFactor}
            updating={recLoading}
          />

          <div className="flex items-baseline justify-between gap-3 pt-1">
            <h2 className="font-display text-lg tracking-[0.05em] text-text-primary">Rotation options</h2>
            {rec && (
              <p className="text-[10px] leading-relaxed text-text-secondary">
                {rec.alternatives_above_baseline} alternative
                {rec.alternatives_above_baseline === 1 ? "" : "s"} clear your rotation by ≥0.2
              </p>
            )}
          </div>

          {recError && (
            <div className="border border-accent-amber bg-elevated px-4 py-3 text-sm text-accent-amber">
              {recError}
            </div>
          )}

          {!rec && recLoading && (
            <div className="space-y-3" aria-busy="true">
              {[0, 1].map((key) => (
                <div key={key} className="border border-border bg-surface p-4">
                  <div className="skeleton h-24 w-24 rounded-full" />
                  <div className="skeleton mt-3 h-4 w-1/2" />
                  <div className="skeleton mt-2 h-3 w-2/3" />
                </div>
              ))}
            </div>
          )}

          <div
            className={[
              "space-y-3 transition-opacity",
              recLoading && rec ? "opacity-60" : "opacity-100",
            ].join(" ")}
            aria-busy={recLoading}
          >
            {rec && !rec.baseline_present && <PromptCard />}
            {orderedCards.map((card) => (
              <RotationCard key={card.id} card={card} />
            ))}
          </div>

          {rec?.narration && (
            <section className="border border-border bg-surface p-4">
              <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                {rec.narration.generated
                  ? `AI-generated explanation · ${rec.narration.model}`
                  : "Rule-based summary"}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-text-primary">{rec.narration.text}</p>
            </section>
          )}

          <footer className="border-t border-border pt-3 text-[10px] leading-relaxed text-text-secondary">
            <p>
              Scores are deterministic: NASA POWER rainfall and temperature, FAO GAEZ suitability,
              ISRIC SoilGrids properties. Sankofa supports — it does not replace — farmer judgment.
              Verify with a MoFA extension officer.
            </p>
            <p className="mt-1">
              Sankofa · CypherSpace · NASA Space Apps Challenge 2026, Field Shift · Takoradi, Ghana
            </p>
          </footer>
        </section>
      </main>
    </div>
    </ThemeContext.Provider>
  );
}
