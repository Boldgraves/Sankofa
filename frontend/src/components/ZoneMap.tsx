import { useId, useState } from "react";
import type { Site } from "../types";

const WIDTH = 300;
const HEIGHT = 330;
const BOUNDS = { minLon: -3.4, maxLon: 1.4, minLat: 4.6, maxLat: 11.4 };

const OUTLINE: Array<[number, number]> = [
  [-2.83, 10.98],
  [0.99, 11.0],
  [0.55, 10.35],
  [0.5, 9.5],
  [0.35, 8.6],
  [0.55, 7.8],
  [0.8, 7.35],
  [0.62, 6.6],
  [1.19, 6.1],
  [0.8, 5.75],
  [0.35, 5.35],
  [-0.3, 5.15],
  [-1.1, 4.95],
  [-2.1, 5.05],
  [-3.1, 5.05],
];

const ZONES = [
  { name: "Sudan Savannah", from: 11.0, to: 11.4, fill: "#2a2318" },
  { name: "Guinea Savannah", from: 9.0, to: 11.0, fill: "#312a1a" },
  { name: "Transition", from: 7.3, to: 9.0, fill: "#23301c" },
  { name: "Forest", from: 6.0, to: 7.3, fill: "#1b3024" },
  { name: "Coastal Savannah", from: 4.6, to: 6.0, fill: "#172a2c" },
];

const px = (lon: number) =>
  ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * WIDTH;
const py = (lat: number) =>
  ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * HEIGHT;

interface Props {
  sites: Site[];
  lat: number;
  lon: number;
  onSelect: (lat: number, lon: number, label: string) => void;
}

export default function ZoneMap({ sites, lat, lon, onSelect }: Props) {
  const [open, setOpen] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1024,
  );
  const clipId = `ghana-clip-${useId().replace(/:/g, "")}`;

  const outlinePoints = OUTLINE.map(([lo, la]) => `${px(lo)},${py(la)}`).join(" ");
  const markerX = px(lon);
  const markerY = py(lat);

  return (
    <section className="border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Agro-ecological zones
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="border border-border px-2 py-0.5 text-[10px] font-semibold text-text-secondary transition hover:bg-elevated lg:hidden"
          aria-expanded={open}
        >
          {open ? "Hide map" : "Show map"}
        </button>
      </div>

      {open && (
        <>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="mt-2 h-auto w-full"
            role="img"
            aria-label="Schematic map of Ghana's agro-ecological zones with reference sites"
          >
            <defs>
              <clipPath id={clipId}>
                <polygon points={outlinePoints} />
              </clipPath>
            </defs>

            <rect width={WIDTH} height={HEIGHT} fill="#0d1117" />
            <g clipPath={`url(#${clipId})`}>
              {ZONES.map((zone) => (
                <rect
                  key={zone.name}
                  x={0}
                  y={py(zone.to)}
                  width={WIDTH}
                  height={py(zone.from) - py(zone.to)}
                  fill={zone.fill}
                />
              ))}
              {ZONES.map((zone) => (
                <text
                  key={`${zone.name}-label`}
                  x={10}
                  y={(py(zone.to) + py(zone.from)) / 2}
                  fontSize={8}
                  fill="#8b949e"
                >
                  {zone.name}
                </text>
              ))}
            </g>

            <polygon
              points={outlinePoints}
              fill="none"
              stroke="#30363d"
              strokeWidth={1.2}
              strokeLinejoin="round"
            />

            {sites.map((site) => (
              <g
                key={site.name}
                onClick={() => onSelect(site.lat, site.lon, site.name)}
                className="cursor-pointer"
              >
                <circle cx={px(site.lon)} cy={py(site.lat)} r={9} fill="transparent" />
                <circle
                  cx={px(site.lon)}
                  cy={py(site.lat)}
                  r={2.6}
                  fill="#e6edf3"
                  stroke="#0d1117"
                  strokeWidth={1}
                />
                <title>{`${site.name} — ${site.zone}`}</title>
              </g>
            ))}

            <circle cx={markerX} cy={markerY} r={7} fill="none" stroke="#e6912a" strokeWidth={1.4} />
            <circle cx={markerX} cy={markerY} r={3.4} fill="#e6912a" stroke="#0d1117" strokeWidth={1.2} />
          </svg>

          <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">
            Schematic zones, not a survey boundary. {sites.length} reference sites are clickable.
          </p>
        </>
      )}
    </section>
  );
}
