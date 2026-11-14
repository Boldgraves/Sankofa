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
        "border border-border p-4 transition-colors sm:p-5",
        baseline ? "bg-elevated" : "bg-surface hover:bg-elevated",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <ScoreGauge score={card.score} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {baseline && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  Your Current Rotation
                </p>
              )}
              <h3 className="font-display text-xl leading-tight text-text-primary">
                {baseline ? card.crop_names[0] : card.title}
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                {baseline ? card.cycle : `${card.cycle} · ${card.crop_names.join(" → ")}`}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {baseline ? (
                <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-text-secondary">
                  BASELINE
                </span>
              ) : (
                card.score_delta !== undefined && (
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      (card.score_delta ?? 0) > 0
                        ? "bg-accent-green/15 text-accent-green"
                        : "bg-elevated text-text-secondary",
                    ].join(" ")}
                  >
                    {(card.score_delta ?? 0) > 0 ? "+" : ""}
                    {card.score_delta?.toFixed(2)} vs yours
                  </span>
                )
              )}
              {gaps.length > 0 && !card.confidence.needs_local_verification && (
                <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                  Needs local data
                </span>
              )}
              {card.confidence.needs_local_verification && (
                <span className="rounded-full bg-accent-amber px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#0d1117]">
                  Needs local verification
                </span>
              )}
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {DIMENSIONS.map(([key, label]) => (
              <div key={key}>
                <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                  <dt>{label}</dt>
                  <dd className="font-semibold tabular-nums text-text-primary">
                    {card.subscores[key].toFixed(1)}
                  </dd>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden bg-elevated">
                  <div
                    className="h-full bg-accent-green"
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
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Risks &amp; Gaps
          </h4>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-text-secondary">
            {card.risks.map((risk) => (
              <li key={risk} className="flex gap-1.5">
                <span className="text-accent-amber">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Data Confidence
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
            {card.confidence.soil_statement}
          </p>
          {gaps.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {gaps.map((gap) => (
                <li
                  key={gap}
                  className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] leading-snug text-text-secondary"
                >
                  <span aria-hidden="true">⚠️</span> {gap}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-text-secondary/70">
            {card.confidence.suitability_source} · {card.confidence.soil_source}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-2 text-[11px] leading-relaxed text-text-secondary">
        {card.disclaimer}
      </p>
    </article>
  );
}
