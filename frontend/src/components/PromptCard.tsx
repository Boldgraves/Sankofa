export default function PromptCard() {
  return (
    <div className="border border-dashed border-border bg-surface p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
        Baseline missing
      </p>
      <h3 className="mt-1 font-display text-lg leading-tight text-text-primary">
        Tell us your current crop to see how your rotation compares.
      </h3>
      <a
        href="#current-crop"
        className="mt-3 inline-flex items-center gap-1.5 bg-accent-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
      >
        Set my current crop
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
