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
  { name: "Sudan Savannah", from: 11.0, to: 11.4, fill: "#e7cd93" },
  { name: "Guinea Savannah", from: 9.0, to: 11.0, fill: "#eeddaf" },
  { name: "Transition", from: 7.3, to: 9.0, fill: "#dde2ad" },
  { name: "Forest", from: 6.0, to: 7.3, fill: "#c3d8a9" },
  { name: "Coastal Savannah", from: 4.6, to: 6.0, fill: "#d5e3c3" },
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
    <section className="rounded-md border border-line bg-white/60 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55">
          Agro-ecological zones
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-sm border border-line px-2 py-0.5 text-[10px] font-semibold text-ink/60 lg:hidden"
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

            <rect width={WIDTH} height={HEIGHT} fill="#eef3ea" />
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
                  fill="#3c4a37"
                  opacity={0.7}
                >
                  {zone.name}
                </text>
              ))}
            </g>

            <polygon
              points={outlinePoints}
              fill="none"
              stroke="#5b6b52"
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
                  fill="#1e4030"
                  stroke="#faf6ec"
                  strokeWidth={1}
                />
                <title>{`${site.name} — ${site.zone}`}</title>
              </g>
            ))}

            <circle cx={markerX} cy={markerY} r={7} fill="none" stroke="#a86b13" strokeWidth={1.4} />
            <circle cx={markerX} cy={markerY} r={3.4} fill="#a86b13" stroke="#faf6ec" strokeWidth={1.2} />
          </svg>

          <p className="mt-1 text-[10px] leading-relaxed text-ink/45">
            Schematic zones, not a survey boundary. {sites.length} reference sites are clickable.
          </p>
        </>
      )}
    </section>
  );
}
