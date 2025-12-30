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

// Get qualitative density label
function getDensityLabel(value: number): string {
  if (value >= 0.7) return "High";
  if (value >= 0.3) return "Medium";
  return "Low";
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

    // Step 1: Compute raw densities for each range on the grid
    const rawDensities: number[][] = [];
    const grid: number[] = [];
    
    for (let i = 0; i < GRID_POINTS; i++) {
      const x = globalMin + (i * (globalMax - globalMin)) / (GRID_POINTS - 1);
      grid.push(x);
    }

    for (let j = 0; j < ranges.length; j++) {
      const densities: number[] = [];
      for (let i = 0; i < GRID_POINTS; i++) {
        densities.push(computeDensity(grid[i], ranges[j]));
      }
      rawDensities.push(densities);
    }

    // Step 2: Normalize EACH range independently so max = 1
    const normalizedDensities: number[][] = rawDensities.map((densities) => {
      const maxVal = Math.max(...densities, 0.001);
      return densities.map((d) => d / maxVal);
    });

    // Step 3: Build chart data
    const data: Record<string, number>[] = [];
    for (let i = 0; i < GRID_POINTS; i++) {
      const point: Record<string, number> = { x: grid[i] };
      for (let j = 0; j < ranges.length; j++) {
        point[`range${j}`] = normalizedDensities[j][i];
      }
      data.push(point);
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
            label={{ 
              value: 'Relative Shape', 
              angle: -90, 
              position: 'insideLeft', 
              fontSize: 9,
              fill: 'hsl(var(--muted-foreground))',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "11px",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-popover border border-border rounded-md p-2 shadow-md text-xs">
                  <p className="font-medium mb-1">
                    {type === "fdv" ? `$${Number(label).toFixed(1)}M` : `${Number(label).toFixed(2)}%`}
                  </p>
                  {payload.map((entry, idx) => {
                    const rangeIndex = parseInt(String(entry.dataKey).replace("range", ""));
                    const range = ranges[rangeIndex];
                    if (!range) return null;
                    const value = Number(entry.value) || 0;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>R{rangeIndex + 1} ({DISTRIBUTION_LABELS[range.distributionType]}):</span>
                        <span className="font-medium">{getDensityLabel(value)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
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
