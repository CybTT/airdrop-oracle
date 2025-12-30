import { useMemo } from "react";
import { CustomRange, DistributionType } from "@/lib/advanced-monte-carlo";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface DistributionPreviewChartProps {
  ranges: CustomRange[];
  type: "fdv" | "drop";
}

const GRID_POINTS = 300;
const RANGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DISTRIBUTION_LABELS: Record<DistributionType, string> = {
  uniform: "Uniform",
  linearDecreasing: "Lin↓",
  linearIncreasing: "Lin↑",
  predictionCentric: "Bell",
};

// Compute density for a single range at a given x
function computeDensity(
  x: number,
  range: CustomRange
): number {
  const { min, max, distributionType, expectedMin, expectedMax } = range;

  // Outside range = 0
  if (x < min || x > max) return 0;

  const width = max - min;
  if (width <= 0) return 0;

  switch (distributionType) {
    case "uniform":
      // Constant density
      return 1 / width;

    case "linearIncreasing":
      // PDF ∝ (x - min), normalized: 2*(x-min) / width^2
      return (2 * (x - min)) / (width * width);

    case "linearDecreasing":
      // PDF ∝ (max - x), normalized: 2*(max-x) / width^2
      return (2 * (max - x)) / (width * width);

    case "predictionCentric": {
      // Truncated normal
      const expMin = expectedMin ?? min;
      const expMax = expectedMax ?? max;
      const mean = (expMin + expMax) / 2;
      // std chosen so ~70% mass lies within expected range
      const halfRange = (expMax - expMin) / 2;
      const std = halfRange > 0 ? halfRange / 1.1 : width / 4;
      
      // Gaussian PDF (unnormalized for display)
      const z = (x - mean) / std;
      return Math.exp(-0.5 * z * z);
    }

    default:
      return 0;
  }
}

// Compute normalized weights from user-defined weights
function computeWeights(ranges: CustomRange[]): number[] {
  const weights = ranges.map((r) => Math.max(0, r.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return ranges.map(() => 1 / ranges.length);
  return weights.map((w) => w / total);
}

export function DistributionPreviewChart({
  ranges,
  type,
}: DistributionPreviewChartProps) {
  const chartData = useMemo(() => {
    if (ranges.length === 0) return [];

    // Determine global domain
    const allMins = ranges.map((r) => r.min);
    const allMaxs = ranges.map((r) => r.max);
    const globalMin = Math.min(...allMins);
    const globalMax = Math.max(...allMaxs);

    if (globalMax <= globalMin) return [];

    // Compute weights
    const weights = computeWeights(ranges);

    // Create grid
    const data: Record<string, number>[] = [];
    
    for (let i = 0; i < GRID_POINTS; i++) {
      const x = globalMin + (i * (globalMax - globalMin)) / (GRID_POINTS - 1);
      const point: Record<string, number> = { x };

      // Compute each range's weighted density
      for (let j = 0; j < ranges.length; j++) {
        const density = computeDensity(x, ranges[j]) * weights[j];
        point[`range${j}`] = density;
      }

      data.push(point);
    }

    // Find max value for normalization (across all ranges)
    let maxValue = 0.001;
    for (const point of data) {
      for (let j = 0; j < ranges.length; j++) {
        maxValue = Math.max(maxValue, point[`range${j}`]);
      }
    }

    // Normalize all values so max = 1
    for (const point of data) {
      for (let j = 0; j < ranges.length; j++) {
        point[`range${j}`] = point[`range${j}`] / maxValue;
      }
    }

    return data;
  }, [ranges]);

  if (ranges.length === 0 || chartData.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
        Add ranges to see distribution preview
      </div>
    );
  }

  const xAxisLabel = type === "fdv" ? "FDV ($M)" : "Drop (%)";

  // Get range boundaries for reference lines
  const boundaries = ranges.flatMap((r, i) => [
    { x: r.min, rangeIndex: i, type: "min" as const },
    { x: r.max, rangeIndex: i, type: "max" as const },
  ]);

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => (type === "fdv" ? `$${v}M` : `${v}%`)}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            hide
            domain={[0, 1.1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "11px",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }}
            formatter={(value: number, name: string) => {
              const idx = parseInt(name.replace("range", ""));
              return [(value * 100).toFixed(1) + "%", `Range ${idx + 1}`];
            }}
            labelFormatter={(label) =>
              type === "fdv" ? `$${Number(label).toFixed(1)}M` : `${Number(label).toFixed(1)}%`
            }
          />
          <Legend
            verticalAlign="top"
            height={24}
            iconSize={8}
            wrapperStyle={{ fontSize: "10px" }}
            formatter={(value: string) => {
              const idx = parseInt(value.replace("range", ""));
              const range = ranges[idx];
              if (!range) return value;
              return `R${idx + 1} (${DISTRIBUTION_LABELS[range.distributionType]})`;
            }}
          />
          
          {/* Range boundary markers */}
          {boundaries.map((b, i) => (
            <ReferenceLine
              key={`boundary-${i}`}
              x={b.x}
              stroke={RANGE_COLORS[b.rangeIndex % RANGE_COLORS.length]}
              strokeDasharray="2 2"
              strokeOpacity={0.3}
            />
          ))}

          {/* Individual range lines */}
          {ranges.map((_, i) => (
            <Line
              key={`range${i}`}
              type="monotone"
              dataKey={`range${i}`}
              stroke={RANGE_COLORS[i % RANGE_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
