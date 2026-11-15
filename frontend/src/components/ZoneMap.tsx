import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import { useId, useState } from "react";
import ghanaZones from "../data/ghana-zones.json";
import { paletteFor, useTheme } from "../theme";
import type { Site } from "../types";

const WIDTH = 300;
const HEIGHT = 330;

type ZoneKey = "guinea" | "transition" | "coastal";

interface RegionProps {
  name: string;
  zone: ZoneKey;
}

const ZONES: Array<{ key: ZoneKey; color: string; label: string[] }> = [
  { key: "guinea", color: "#1a6ebd", label: ["Guinea Savannah"] },
  { key: "transition", color: "#2ea44f", label: ["Transition"] },
  { key: "coastal", color: "#e6912a", label: ["Coastal Savannah", "/ Forest"] },
];

const regions = ghanaZones as unknown as FeatureCollection<Polygon, RegionProps>;

// Mercator fitted to Ghana's bounding box, preserving its true shape.
const projection = geoMercator().fitExtent(
  [
    [16, 16],
    [WIDTH - 16, HEIGHT - 16],
  ],
  regions,
);
const pathFor = geoPath(projection);

function project(lon: number, lat: number): [number, number] {
  const point = projection([lon, lat]);
  return point ? [point[0], point[1]] : [WIDTH / 2, HEIGHT / 2];
}

const zoneFeatures = (zone: ZoneKey): Array<Feature<Polygon, RegionProps>> =>
  regions.features.filter((feature) => feature.properties.zone === zone);

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
  const titleId = `ghana-map-${useId().replace(/:/g, "")}`;
  const palette = paletteFor(useTheme());
  const [markerX, markerY] = project(lon, lat);

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
            aria-labelledby={titleId}
          >
            <title id={titleId}>
              Map of Ghana's regions grouped into Guinea Savannah, Transition and Coastal
              Savannah/Forest zones, with reference sites
            </title>

            <rect width={WIDTH} height={HEIGHT} fill={palette.mapBg} />

            {regions.features.map((feature) => {
              const colour = ZONES.find((zone) => zone.key === feature.properties.zone)?.color;
              return (
                <path
                  key={feature.properties.name}
                  d={pathFor(feature as Feature<Geometry, RegionProps>) ?? undefined}
                  fill={colour}
                  fillOpacity={0.4}
                  stroke={palette.mapStroke}
                  strokeWidth={0.6}
                >
                  <title>{`${feature.properties.name} — ${feature.properties.zone}`}</title>
                </path>
              );
            })}

            {ZONES.map((zone) => {
              const features = zoneFeatures(zone.key);
              if (!features.length) return null;
              // The coastal group also holds Oti and Western North, which reach
              // up into the middle belt, so its full centroid drifts north into
              // the Transition band. Anchor this label on the four southern
              // regions only.
              const labelFeatures =
                zone.key === "coastal"
                  ? features.filter((feature) =>
                      [
                        "Greater Accra Region",
                        "Central Region",
                        "Western Region",
                        "Volta Region",
                      ].includes(feature.properties.name),
                    )
                  : features;
              const [lon0, lat0] = geoCentroid({
                type: "FeatureCollection",
                features: labelFeatures,
              } as FeatureCollection<Polygon, RegionProps>);
              const [cx, cy] = project(lon0, lat0);
              return (
                <text
                  key={zone.key}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={600}
                  fill={palette.siteDot}
                  stroke={palette.mapStroke}
                  strokeWidth={1.8}
                  paintOrder="stroke"
                  letterSpacing="0.3"
                >
                  {zone.label.map((line, index) => (
                    <tspan key={line} x={cx} dy={index === 0 ? 0 : 8}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}

            {sites.map((site) => {
              const [sx, sy] = project(site.lon, site.lat);
              return (
                <g
                  key={site.name}
                  onClick={() => onSelect(site.lat, site.lon, site.name)}
                  className="cursor-pointer"
                >
                  <circle cx={sx} cy={sy} r={9} fill="transparent" />
                  <circle cx={sx} cy={sy} r={2.6} fill={palette.siteDot} stroke={palette.siteDotStroke} strokeWidth={1} />
                  <title>{`${site.name} — ${site.zone}`}</title>
                </g>
              );
            })}

            <circle cx={markerX} cy={markerY} r={7} fill="none" stroke="#e6912a" strokeWidth={1.4} />
            <circle cx={markerX} cy={markerY} r={3.4} fill="#e6912a" stroke={palette.mapStroke} strokeWidth={1.2} />
          </svg>

          <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">
            Region boundaries: geoBoundaries GHA ADM1 (OpenStreetMap). {sites.length} reference
            sites are clickable.
          </p>
        </>
      )}
    </section>
  );
}
