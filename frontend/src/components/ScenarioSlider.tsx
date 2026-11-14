interface Props {
  index: 0 | 1 | 2;
  onChange: (index: 0 | 1 | 2) => void;
  factor: number;
  updating: boolean;
}

const LABELS = ["Low", "Normal", "High"] as const;

export default function ScenarioSlider({ index, onChange, factor, updating }: Props) {
  return (
    <section className="rounded-md border border-line bg-white/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor="rainfall-scenario" className="font-brand text-base text-ink">
          Adjust expected rainfall
        </label>
        <span className="text-[11px] text-ink/55">
          {updating ? "Rescoring…" : `POWER rainfall × ${factor.toFixed(1)}`}
        </span>
      </div>

      <input
        id="rainfall-scenario"
        type="range"
        min={0}
        max={2}
        step={1}
        value={index}
        onChange={(event) => onChange(Number(event.target.value) as 0 | 1 | 2)}
        className="slider-track mt-3 w-full cursor-pointer"
        aria-valuetext={LABELS[index]}
      />

      <div className="mt-1 flex justify-between text-[11px] font-semibold uppercase tracking-[0.1em]">
        {LABELS.map((label, i) => (
          <span key={label} className={i === index ? "text-forest" : "text-ink/35"}>
            {label}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink/50">
        Low applies 0.7× to NASA POWER precipitation, High 1.3×, before the rain-fed water score is
        recalculated.
      </p>
    </section>
  );
}
