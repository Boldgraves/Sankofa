import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NdviResponse } from "../types";

interface Props {
  data: NdviResponse | null;
  loading: boolean;
}

export default function NdviChart({ data, loading }: Props) {
  const hasSeries = Boolean(data?.dates && data?.ndvi && data.ndvi.length > 1);

  const points = hasSeries
    ? (data!.dates as string[]).map((date, index) => ({
        date,
        ndvi: (data!.ndvi as number[])[index],
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
        <span className="border border-border bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Pre-fetched MODIS NDVI Data
        </span>
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
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#21262d" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  ticks={yearTicks}
                  tickFormatter={(value: string) => value.slice(0, 4)}
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  axisLine={{ stroke: "#30363d" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 4,
                    border: "1px solid #30363d",
                    fontSize: 12,
                    background: "#161b22",
                    color: "#e6edf3",
                  }}
                  itemStyle={{ color: "#2ea44f" }}
                  labelStyle={{ color: "#8b949e" }}
                  labelFormatter={(value) => String(value)}
                  formatter={(value) => [String(value), "NDVI"]}
                />
                <ReferenceLine
                  y={0.3}
                  stroke="#e6912a"
                  strokeDasharray="4 3"
                  label={{ value: "0.3 stress", position: "insideTopRight", fill: "#e6912a", fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="ndvi"
                  stroke="#2ea44f"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
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
        <p className="mt-3 bg-elevated px-3 py-6 text-center text-sm text-text-secondary">
          NDVI trend unavailable for this location — tile overlay active.
        </p>
      )}
    </section>
  );
}
