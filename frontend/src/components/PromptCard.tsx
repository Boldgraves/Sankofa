export default function PromptCard() {
  return (
    <div className="rounded-md border border-dashed border-[#b6a992] bg-[#f2ecdf] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55">Baseline missing</p>
      <h3 className="mt-1 font-display text-lg leading-tight text-ink">
        Tell us your current crop to see how your rotation compares.
      </h3>
      <a
        href="#current-crop"
        className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-forest px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-forest-soft"
      >
        Set my current crop
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
