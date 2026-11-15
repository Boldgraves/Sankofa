import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { paletteFor, useTheme } from "../theme";

interface Props {
  score: number;
  size?: number;
}

export default function ScoreGauge({ score, size = 96 }: Props) {
  const palette = paletteFor(useTheme());

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <RadialBarChart
        width={size}
        height={size}
        data={[{ value: score }]}
        innerRadius="72%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 10]} tick={false} axisLine={false} />
        <RadialBar
          dataKey="value"
          cornerRadius={12}
          fill="#1a6ebd"
          background={{ fill: palette.gaugeTrack }}
          isAnimationActive={false}
        />
      </RadialBarChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl leading-none text-text-primary">
          {score.toFixed(1)}
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          / 10
        </span>
      </div>
    </div>
  );
}
