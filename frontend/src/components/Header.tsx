import type { Theme } from "../theme";

export const LANGUAGE_OPTIONS = [
  { code: "eng", label: "English" },
  { code: "twi", label: "Twi" },
  { code: "ewe", label: "Ewe" },
  { code: "gaa", label: "Ga" },
  { code: "fat", label: "Fante" },
  { code: "dag", label: "Dagbani" },
  { code: "gur", label: "Gurene" },
  { code: "kus", label: "Kusaal" },
] as const;

interface Props {
  theme: Theme;
  onToggle: () => void;
  language: string;
  onLanguage: (code: string) => void;
}

export default function Header({ theme, onToggle, language, onLanguage }: Props) {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-text-primary">
            Sankofa
          </h1>
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-accent-amber">
            Field Rotation Intelligence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[11px] leading-relaxed text-text-secondary lg:text-right">
            NASA Space Apps Challenge 2026 · Field Shift
            <br className="hidden sm:block" /> CypherSpace · Takoradi, Ghana
          </p>

          <label className="shrink-0">
            <span className="sr-only">Narration language</span>
            <select
              value={language}
              onChange={(event) => onLanguage(event.target.value)}
              className="h-9 border border-border bg-surface px-2 text-[11px] font-medium text-text-secondary transition hover:text-text-primary focus:border-accent-amber focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onToggle}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border text-text-secondary transition hover:bg-elevated hover:text-text-primary"
          >
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20.5 14.8A8.6 8.6 0 1 1 9.2 3.5a6.9 6.9 0 0 0 11.3 11.3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
