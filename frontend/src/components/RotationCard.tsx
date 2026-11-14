import type { RotationCardData, SubScores } from "../types";
import ScoreGauge from "./ScoreGauge";

const DIMENSIONS: Array<[keyof SubScores, string]> = [
  ["water", "Rain fit"],
  ["soil", "Soil fit"],
  ["market", "Market"],
  ["yield", "Suitability"],
];

export default function RotationCard({ card }: { card: RotationCardData }) {
  const baseline = card.is_baseline;
  const gaps = card.confidence.data_gaps;

  return (
    <article
      className={[
        "rounded-md p-4 sm:p-5",
        baseline
          ? "border-2 border-[#b6a992] bg-[#f2ecdf]"
          : "border border-line bg-white/70 shadow-[0_1px_0_rgba(24,35,25,0.04)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <ScoreGauge score={card.score} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {baseline && (
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60">
                  Your Current Rotation
                </p>
              )}
              <h3 className="font-display text-xl leading-tight text-ink">
                {baseline ? card.crop_names[0] : card.title}
              </h3>
              <p className="mt-1 text-xs text-ink/55">
                {baseline ? card.cycle : `${card.cycle} · ${card.crop_names.join(" → ")}`}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {baseline ? (
                <span className="rounded-full bg-ink/75 px-2 py-0.5 text-[9px] font-bold tracking-[0.16em] text-cream">
                  BASELINE
                </span>
              ) : (
                card.score_delta !== undefined && (
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      (card.score_delta ?? 0) > 0
                        ? "bg-forest/10 text-forest"
                        : "bg-ink/5 text-ink/50",
                    ].join(" ")}
                  >
                    {(card.score_delta ?? 0) > 0 ? "+" : ""}
                    {card.score_delta?.toFixed(2)} vs yours
                  </span>
                )
              )}
              {gaps.length > 0 && !card.confidence.needs_local_verification && (
                <span className="rounded-full bg-[#e6ddc9] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/60">
                  Needs local data
                </span>
              )}
              {card.confidence.needs_local_verification && (
                <span className="rounded-full bg-[#f5d98e] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#5c4006]">
                  Needs local verification
                </span>
              )}
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {DIMENSIONS.map(([key, label]) => (
              <div key={key}>
                <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.08em] text-ink/50">
                  <dt>{label}</dt>
                  <dd className="font-semibold tabular-nums text-ink/70">
                    {card.subscores[key].toFixed(1)}
                  </dd>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e7ddc9]">
                  <div
                    className="h-full rounded-full bg-forest-soft"
                    style={{ width: `${Math.min(100, card.subscores[key] * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/50">
            Risks &amp; Gaps
          </h4>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-ink/70">
            {card.risks.map((risk) => (
              <li key={risk} className="flex gap-1.5">
                <span className="text-clay">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/50">
            Data Confidence
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/70">
            {card.confidence.soil_statement}
          </p>
          {gaps.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {gaps.map((gap) => (
                <li
                  key={gap}
                  className="rounded-full bg-[#e8e4da] px-2 py-0.5 text-[10px] leading-snug text-ink/65"
                >
                  <span aria-hidden="true">⚠️</span> {gap}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-ink/40">
            {card.confidence.suitability_source} · {card.confidence.soil_source}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-ink/10 pt-2 text-[11px] leading-relaxed text-ink/55">
        {card.disclaimer}
      </p>
    </article>
  );
}
