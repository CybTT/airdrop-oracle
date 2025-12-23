import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { HistogramBin } from "@/lib/simple-monte-carlo";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SimpleHistogramProps {
  histogram: HistogramBin[];
  median: number;
}

export function SimpleHistogram({ histogram, median }: SimpleHistogramProps) {
  const [useLogScale, setUseLogScale] = useState(true);

  const chartData = histogram.map((bin) => ({
    name: formatCurrency(bin.binStart, 0),
    value: bin.count,
    binMid: (bin.binStart + bin.binEnd) / 2,
    binStart: bin.binStart
  }));

  // Find bin index for median reference line
  const medianBinIndex = chartData.findIndex(d => d.binMid >= median);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Value Distribution</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setUseLogScale(!useLogScale)}
          className="h-7 text-xs"
        >
          {useLogScale ? 'Linear X' : 'Log X'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => index % 8 === 0 ? value : ''}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
              />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), 'Simulations']}
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
              {medianBinIndex >= 0 && (
                <ReferenceLine 
                  x={chartData[medianBinIndex]?.name} 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>Distribution</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-destructive" style={{ borderTop: '2px dashed' }} />
            <span>Median</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
