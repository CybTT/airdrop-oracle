import { forwardRef } from "react";
import { SimpleSimulationResults, SimpleSimulationParams } from "@/lib/simple-monte-carlo";
import { AdvancedSimulationParams } from "@/lib/advanced-monte-carlo";
import { formatCurrency, formatProbability } from "@/lib/format";

interface ShareCardProps {
  results: SimpleSimulationResults;
  params: SimpleSimulationParams | AdvancedSimulationParams;
  thresholds: number[];
}

// Type guard to check if params is SimpleSimulationParams (Classic mode)
function isClassicParams(params: SimpleSimulationParams | AdvancedSimulationParams): params is SimpleSimulationParams {
  return 'fdvMinM' in params && 'dropMinPct' in params;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ results, params, thresholds }, ref) => {
    const { stats, thresholdProbs } = results;

    // Format inputs based on mode
    const getInputsSummary = () => {
      if (isClassicParams(params)) {
        return {
          supply: params.nftSupply.toLocaleString(),
          fdvRange: `$${params.fdvMinM}M – $${params.fdvMaxM}M`,
          dropRange: `${params.dropMinPct}% – ${params.dropMaxPct}%`,
          simulations: params.numSimulations.toLocaleString()
        };
      } else {
        // Advanced mode - summarize ranges
        const fdvRanges = params.fdvRanges;
        const dropRanges = params.dropRanges;
        const fdvMin = Math.min(...fdvRanges.map(r => r.min));
        const fdvMax = Math.max(...fdvRanges.map(r => r.max));
        const dropMin = Math.min(...dropRanges.map(r => r.min));
        const dropMax = Math.max(...dropRanges.map(r => r.max));
        
        return {
          supply: params.nftSupply.toLocaleString(),
          fdvRange: `$${fdvMin}M – $${fdvMax}M`,
          dropRange: `${dropMin}% – ${dropMax}%`,
          simulations: params.numSimulations.toLocaleString()
        };
      }
    };

    const inputs = getInputsSummary();

    return (
      <div
        ref={ref}
        className="w-[1200px] bg-card text-card-foreground p-10 rounded-2xl border border-border shadow-lg"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sorry For Your Loss. 0 is the answer
          </h1>
        </div>

        {/* Main Value */}
        <div className="text-center mb-8 pb-8 border-b border-border">
          <p className="text-lg text-muted-foreground mb-2">Estimated Airdrop Value per NFT</p>
          <div className="text-7xl font-bold text-primary tabular-nums">
            {formatCurrency(stats.median, 0)}
          </div>
          <p className="text-lg text-muted-foreground mt-2">Median (P50)</p>
        </div>

        {/* Ranges */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="text-center p-6 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Range: P10 – P90</p>
            <div className="text-3xl font-semibold tabular-nums">
              {formatCurrency(stats.p10, 0)} – {formatCurrency(stats.p90, 0)}
            </div>
          </div>
          <div className="text-center p-6 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Rare: P5 – P95</p>
            <div className="text-3xl font-semibold tabular-nums">
              {formatCurrency(stats.p5, 0)} – {formatCurrency(stats.p95, 0)}
            </div>
          </div>
        </div>

        {/* Probabilities */}
        {thresholds.length > 0 && (
          <div className="mb-8 p-6 bg-muted/20 rounded-xl">
            <p className="text-sm text-muted-foreground mb-4 text-center">Probability Thresholds</p>
            <div className="flex justify-center gap-8">
              {thresholds.slice(0, 3).map((threshold) => {
                const prob = thresholdProbs[threshold] ?? 0;
                return (
                  <div key={threshold} className="text-center">
                    <div className="text-2xl font-bold tabular-nums">{formatProbability(prob)}</div>
                    <div className="text-sm text-muted-foreground">≥ ${threshold}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inputs Summary */}
        <div className="flex justify-center gap-6 text-sm text-muted-foreground mb-6">
          <span>Supply: {inputs.supply}</span>
          <span>•</span>
          <span>FDV: {inputs.fdvRange}</span>
          <span>•</span>
          <span>Drop%: {inputs.dropRange}</span>
          <span>•</span>
          <span>{inputs.simulations} simulations</span>
        </div>

        {/* Footer Watermark */}
        <div className="text-center pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground/60">airdrop-oracle</span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
