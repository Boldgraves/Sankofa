export default function Header() {
  return (
    <header className="border-b border-line bg-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="#b5451b"
              d="M7 8.5C7.6 6.8 9.2 5.6 11 5.6C12.9 5.6 14.4 6.9 15 8.7C18.4 9.7 21 12.3 22 16L27.5 17.6C28.4 17.9 28.1 19.2 27.1 19.1L21.4 18.4C20.9 21.3 19.2 23.6 16.8 25L17.6 27.1C17.9 27.8 17.1 28.3 16.6 27.7L14.8 25.4C13.9 25.6 13 25.7 12.1 25.6L10.3 27.8C9.8 28.4 9 27.9 9.3 27.2L10.1 25.1C8.4 23.7 7.4 21.7 7.4 19.4C7.4 17.6 7.9 15.9 8.9 14.5C7.5 13.4 6.6 11.9 6.6 10.3C6.6 9.6 6.8 9 7 8.5Z"
            />
          </svg>
          <div>
            <h1 className="font-brand text-2xl leading-none text-ink">Sankofa</h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink/50">
              Field Rotation Intelligence
            </p>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-ink/50 lg:text-right">
          NASA Space Apps Challenge 2026 · Field Shift
          <br className="hidden sm:block" /> CypherSpace · Takoradi, Ghana
        </p>
      </div>
    </header>
  );
}
