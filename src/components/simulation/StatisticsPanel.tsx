import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulationStats } from "@/lib/monte-carlo";
import { formatCurrency, formatDuration } from "@/lib/format";

interface StatisticsPanelProps {
  stats: SimulationStats;
  worstCase: number;
  bestCase: number;
  executionTimeMs: number;
}

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 px-2 rounded ${highlight ? 'bg-accent/50' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${highlight ? 'font-semibold text-accent-foreground' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function StatisticsPanel({ stats, worstCase, bestCase, executionTimeMs }: StatisticsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Key Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <StatRow label="Mean" value={formatCurrency(stats.mean, 2)} highlight />
        <StatRow label="Median (P50)" value={formatCurrency(stats.median, 2)} highlight />
        
        <div className="border-t my-2" />
        
        <StatRow label="P5 (5th Percentile)" value={formatCurrency(stats.p5, 2)} />
        <StatRow label="P10" value={formatCurrency(stats.p10, 2)} />
        <StatRow label="P25" value={formatCurrency(stats.p25, 2)} />
        <StatRow label="P75" value={formatCurrency(stats.p75, 2)} />
        <StatRow label="P90" value={formatCurrency(stats.p90, 2)} />
        <StatRow label="P95 (95th Percentile)" value={formatCurrency(stats.p95, 2)} />
        
        <div className="border-t my-2" />
        
        <StatRow label="Std. Deviation" value={formatCurrency(stats.stdDev, 2)} />
        <StatRow label="Min Observed" value={formatCurrency(stats.min, 2)} />
        <StatRow label="Max Observed" value={formatCurrency(stats.max, 2)} />
        
        <div className="border-t my-2" />
        
        <div className="p-2 bg-muted/30 rounded space-y-1">
          <StatRow label="Worst-Case Anchor" value={formatCurrency(worstCase, 2)} />
          <StatRow label="Best-Case Anchor" value={formatCurrency(bestCase, 2)} />
        </div>
        
        <div className="text-xs text-muted-foreground text-right pt-2">
          Computed in {formatDuration(executionTimeMs)}
        </div>
      </CardContent>
    </Card>
  );
}
