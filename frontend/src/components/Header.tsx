export default function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-text-primary">
            Sankofa
          </h1>
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-accent-amber">
            Field Rotation Intelligence
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-text-secondary lg:text-right">
          NASA Space Apps Challenge 2026 · Field Shift
          <br className="hidden sm:block" /> CypherSpace · Takoradi, Ghana
        </p>
      </div>
    </header>
  );
}
