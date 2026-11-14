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
    <section className="rounded-md border border-line bg-white/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-brand text-base text-ink">
          Field Vegetation Health (MODIS NDVI, 2019–2024)
        </h2>
        <span className="rounded-full border border-line bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/60">
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
                <CartesianGrid stroke="#e3d9c2" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  ticks={yearTicks}
                  tickFormatter={(value: string) => value.slice(0, 4)}
                  tick={{ fill: "#5c6657", fontSize: 11 }}
                  axisLine={{ stroke: "#ded2b8" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tick={{ fill: "#5c6657", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid #ded2b8",
                    fontSize: 12,
                    background: "#faf6ec",
                  }}
                  labelFormatter={(value) => String(value)}
                  formatter={(value) => [String(value), "NDVI"]}
                />
                <ReferenceLine
                  y={0.3}
                  stroke="#a24a2a"
                  strokeDasharray="4 3"
                  label={{ value: "0.3 stress", position: "insideTopRight", fill: "#a24a2a", fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="ndvi"
                  stroke="#1e4030"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink/50">
            <span>Source: NASA GIBS / MODIS Terra</span>
            <span>
              {data?.composite_days ?? 16}-day composites
              {data?.site ? ` · ${data.site}` : ""} · one value per composite
            </span>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-sm bg-sand px-3 py-6 text-center text-sm text-ink/60">
          NDVI trend unavailable for this location — tile overlay active.
        </p>
      )}
    </section>
  );
}
