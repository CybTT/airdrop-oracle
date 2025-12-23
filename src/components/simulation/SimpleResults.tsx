import { SimpleSimulationResults } from "@/lib/simple-monte-carlo";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDuration } from "@/lib/format";

interface SimpleResultsProps {
  results: SimpleSimulationResults;
}

export function SimpleResults({ results }: SimpleResultsProps) {
  const { stats, worstCase, bestCase, executionTimeMs } = results;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Big Headline */}
        <div className="text-center pb-6 border-b">
          <p className="text-sm text-muted-foreground mb-2">Estimated Airdrop Value per NFT</p>
          <div className="text-5xl font-bold text-primary tabular-nums">
            {formatCurrency(stats.median, 0)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Median (P50)</p>
        </div>

        {/* Main Range */}
        <div className="grid grid-cols-2 gap-4 py-6 border-b">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">P10 (Low End)</p>
            <div className="text-2xl font-semibold tabular-nums">{formatCurrency(stats.p10, 0)}</div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">P90 (High End)</p>
            <div className="text-2xl font-semibold tabular-nums">{formatCurrency(stats.p90, 0)}</div>
          </div>
        </div>

        {/* Rare Outcomes */}
        <div className="grid grid-cols-2 gap-4 py-6 border-b">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">P5 (Rare Downside)</p>
            <div className="text-lg font-medium tabular-nums text-muted-foreground">{formatCurrency(stats.p5, 0)}</div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">P95 (Rare Upside)</p>
            <div className="text-lg font-medium tabular-nums text-muted-foreground">{formatCurrency(stats.p95, 0)}</div>
          </div>
        </div>

        {/* Anchors */}
        <div className="grid grid-cols-2 gap-4 py-6 border-b bg-muted/20 -mx-6 px-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Worst-Case Anchor</p>
            <div className="text-lg font-medium tabular-nums">{formatCurrency(worstCase, 2)}</div>
            <p className="text-xs text-muted-foreground">FDV Min × Drop Min</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Best-Case Anchor</p>
            <div className="text-lg font-medium tabular-nums">{formatCurrency(bestCase, 2)}</div>
            <p className="text-xs text-muted-foreground">FDV Max × Drop Max</p>
          </div>
        </div>

        {/* Mean (smaller) */}
        <div className="pt-4 flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Mean: </span>
            <span className="font-mono font-medium">{formatCurrency(stats.mean, 2)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Computed in {formatDuration(executionTimeMs)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
