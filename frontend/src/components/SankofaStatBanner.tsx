interface Props {
  onset: {
    trend_days: number;
    source: string;
    live: boolean;
    fallback_site?: string;
    earliest_year: number;
    latest_year: number;
  } | null;
  loading: boolean;
  error: string | null;
}

export default function SankofaStatBanner({ onset, loading, error }: Props) {
  if (loading) {
    return (
      <div className="w-full bg-accent-amber px-4 py-3" aria-live="polite" aria-busy="true">
        <div className="skeleton h-4 w-3/4 max-w-md bg-base/20" />
        <span className="sr-only">Loading Sankofa Stat</span>
      </div>
    );
  }

  if (error || !onset) {
    return (
      <div className="w-full border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
        Sankofa Stat unavailable right now — NASA POWER onset record could not be read for this
        point.
      </div>
    );
  }

  const { trend_days: trend, earliest_year } = onset;
  const text =
    trend > 0
      ? `NASA's 24-year record shows the rains at this field now arrive ${trend} days later than in ${earliest_year}.`
      : `NASA's 24-year record shows the rains at this field are arriving earlier — ${Math.abs(trend)} days earlier than in ${earliest_year}.`;

  const detail = onset.live
    ? "Source: NASA POWER daily PRECTOTCORR, 2001–2024"
    : `Source: NASA POWER 2001–2024, cached reference site ${onset.fallback_site ?? ""}`.trim();

  return (
    <div
      className="w-full bg-accent-amber px-4 py-3 font-semibold leading-snug text-[#0d1117]"
      title={detail}
      role="status"
    >
      <p className="text-[15px] leading-snug">
        <span aria-hidden="true">🌧</span> {text}
      </p>
    </div>
  );
}
