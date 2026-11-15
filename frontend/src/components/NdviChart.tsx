import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { paletteFor, useTheme } from "../theme";
import type { NdviResponse } from "../types";

interface Props {
  data: NdviResponse | null;
  loading: boolean;
}

const STRESS = 0.3;
const COLOR_STRESSED = "#E6912A";
const COLOR_HEALTHY = "#2D9E2D";
const COLOR_THRESHOLD = "#f85149";

export default function NdviChart({ data, loading }: Props) {
  const palette = paletteFor(useTheme());
  const hasSeries = Boolean(data?.dates && data?.ndvi && data.ndvi.length > 1);

  const points = hasSeries
    ? (data!.dates as string[]).map((date, index) => ({
        date,
        value: (data!.ndvi as number[])[index],
      }))
    : [];

  const yearTicks = points
    .filter((p, i) => i === 0 || p.date.slice(0, 4) !== points[i - 1].date.slice(0, 4))
    .map((p) => p.date);

  return (
    <section className="border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-lg tracking-[0.05em] text-text-primary">
          Field Vegetation Health (MODIS NDVI, 2019–2024)
        </h2>
        {hasSeries && !loading && (
          <span className="border border-border bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Pre-fetched MODIS NDVI Data
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="skeleton h-[180px] w-full" />
          <div className="skeleton h-3 w-40" />
        </div>
      ) : hasSeries ? (
        <>
          <div className="mt-2 h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
                <CartesianGrid stroke={palette.chartGrid} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  ticks={yearTicks}
                  tickFormatter={(value: string) => value.slice(0, 4)}
                  tick={{ fill: palette.chartAxis, fontSize: 11 }}
                  axisLine={{ stroke: palette.chartGrid }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tick={{ fill: palette.chartAxis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: palette.chartGrid, fillOpacity: 0.35 }}
                  contentStyle={{
                    borderRadius: 4,
                    border: `1px solid ${palette.tooltipBorder}`,
                    fontSize: 12,
                    background: palette.tooltipBg,
                    color: palette.tooltipText,
                  }}
                  labelStyle={{ color: palette.chartAxis }}
                  labelFormatter={(value) => String(value)}
                  formatter={(value) => [String(value), "NDVI"]}
                />
                <ReferenceLine
                  y={STRESS}
                  stroke={COLOR_THRESHOLD}
                  strokeDasharray="4 3"
                  label={{
                    value: "0.3 stress",
                    position: "insideTopRight",
                    fill: COLOR_THRESHOLD,
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="value" isAnimationActive={false}>
                  {points.map((point) => (
                    <Cell
                      key={point.date}
                      fill={point.value < STRESS ? COLOR_STRESSED : COLOR_HEALTHY}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-secondary">
            <span>Source: NASA GIBS / MODIS Terra</span>
            <span>
              {data?.composite_days ?? 16}-day composites
              {data?.site ? ` · ${data.site}` : ""} · one value per composite
            </span>
          </div>
        </>
      ) : (
        <div className="mt-2 flex h-[200px] flex-col items-center justify-center border border-border bg-elevated px-5 text-center">
          <p className="text-sm font-medium text-text-secondary">
            NDVI time series unavailable for this location
          </p>
          <p className="mt-2 max-w-md text-[11px] leading-relaxed text-text-secondary/80">
            Showing MODIS tile overlay on map. Pre-fetched series available for 7 reference sites:
            Tamale, Bolgatanga, Wa, Techiman, Kumasi, Kade, Cape Coast.
          </p>
        </div>
      )}
    </section>
  );
}
