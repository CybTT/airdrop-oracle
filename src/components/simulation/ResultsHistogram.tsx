import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { HistogramBin } from "@/lib/monte-carlo";
import { formatCurrency } from "@/lib/format";

interface ResultsHistogramProps {
  histogram: HistogramBin[];
  mean: number;
  median: number;
}

export function ResultsHistogram({ histogram, mean, median }: ResultsHistogramProps) {
  const chartData = histogram.map((bin, i) => ({
    name: formatCurrency(bin.binStart, 0),
    value: bin.count,
    binMid: (bin.binStart + bin.binEnd) / 2
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Per-NFT Value Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => index % 5 === 0 ? value : ''}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
                labelFormatter={(label) => `Value: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))" 
                radius={[2, 2, 0, 0]}
              />
              <ReferenceLine 
                x={chartData.findIndex(d => d.binMid >= mean) || 0} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="3 3"
                label={{ value: 'Mean', fontSize: 10, fill: 'hsl(var(--destructive))' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>Distribution</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-destructive" style={{ borderStyle: 'dashed' }} />
            <span>Mean</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
