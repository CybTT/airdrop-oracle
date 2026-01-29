import { forwardRef } from "react";
import { SimpleSimulationResults, SimpleSimulationParams, HistogramBin } from "@/lib/simple-monte-carlo";
import { AdvancedSimulationParams } from "@/lib/advanced-monte-carlo";
import { formatCurrency, formatDuration, formatProbability } from "@/lib/format";

interface ShareCardProps {
  results: SimpleSimulationResults;
  params: SimpleSimulationParams | AdvancedSimulationParams;
  thresholds: number[];
}

// Type guard to check if params is SimpleSimulationParams (Classic mode)
function isClassicParams(params: SimpleSimulationParams | AdvancedSimulationParams): params is SimpleSimulationParams {
  return 'fdvMinM' in params && 'dropMinPct' in params;
}

// Mini histogram component for the share card - uses inline styles for consistent export
function ShareHistogram({ histogram, median }: { histogram: HistogramBin[]; median: number }) {
  const maxCount = Math.max(...histogram.map(bin => bin.count));
  
  return (
    <div style={{
      width: '100%',
      height: '192px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '2px',
      position: 'relative'
    }}>
      {histogram.map((bin, index) => {
        const height = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
        const binMid = (bin.binStart + bin.binEnd) / 2;
        const isMedianBin = binMid >= median * 0.9 && binMid <= median * 1.1;
        
        // Use design tokens so export matches the live UI theme exactly.
        const goldColor = 'hsl(var(--primary))';
        const redColor = 'hsl(var(--destructive))';
        
        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${height}%`,
              backgroundColor: isMedianBin ? redColor : goldColor,
              minHeight: bin.count > 0 ? '2px' : '0',
              borderRadius: '2px 2px 0 0',
               boxShadow: isMedianBin
                 ? '0 0 8px hsl(var(--destructive) / 0.55)'
                 : '0 0 6px hsl(var(--primary) / 0.35)'
            }}
          />
        );
      })}
    </div>
  );
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ results, params, thresholds }, ref) => {
    const { stats, histogram, thresholdProbs, worstCase, bestCase, executionTimeMs } = results;

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

    // Get histogram X-axis labels
    const xLabels = histogram.filter((_, i) => i % 8 === 0).map(bin => formatCurrency(bin.binStart, 0));

    // Drive the exported image from the same theme tokens as the live site.
    const colors = {
      background: 'hsl(var(--background))',
      cardBg: 'hsl(var(--card))',
      cardBgDark: 'hsl(var(--accent))',
      gold: 'hsl(var(--primary))',
      goldGlow: 'hsl(var(--primary) / 0.35)',
      white: 'hsl(var(--foreground))',
      textMuted: 'hsl(var(--muted-foreground))',
      textDim: 'hsl(var(--muted-foreground) / 0.7)',
      border: 'hsl(var(--border))',
      borderLight: 'hsl(var(--border) / 0.8)',
      red: 'hsl(var(--destructive))',
    };

    return (
      <div
        ref={ref}
        style={{
          width: '1200px',
          backgroundColor: colors.background,
          color: colors.white,
          padding: '32px',
          fontFamily: 'var(--font-sans)',
          borderRadius: '16px',
          // Subtle outer glow for depth
          boxShadow: `0 0 60px hsl(0 0% 0% / 0.8), 0 0 30px ${colors.goldGlow}`
        }}
      >
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: colors.gold,
            margin: 0,
            letterSpacing: '-0.02em',
            textShadow: `0 0 20px ${colors.goldGlow}`
          }}>
            Sorry for your loss. The answer is 0.
          </h1>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'flex', gap: '24px' }}>
          
          {/* Left Column - Stats */}
          <div style={{ 
            flex: '0 0 380px', 
            backgroundColor: colors.cardBg, 
            borderRadius: '12px', 
            padding: '24px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 4px 20px hsl(0 0% 0% / 0.35)'
          }}>
            {/* Main Value */}
            <div style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '8px' }}>
                Estimated Airdrop Value per NFT
              </p>
              <div style={{ 
                fontSize: '56px', 
                fontWeight: 'bold', 
                color: colors.gold,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
                textShadow: `0 0 30px ${colors.goldGlow}`
              }}>
                {formatCurrency(stats.median, 0)}
              </div>
              <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>Median (P50)</p>
            </div>

            {/* P10 / P90 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              padding: '20px 0', 
              borderBottom: `1px solid ${colors.border}` 
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>P10 (Low End)</p>
                <div style={{ fontSize: '24px', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: colors.white }}>
                  {formatCurrency(stats.p10, 0)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>P90 (High End)</p>
                <div style={{ fontSize: '24px', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: colors.white }}>
                  {formatCurrency(stats.p90, 0)}
                </div>
              </div>
            </div>

            {/* P5 / P95 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              padding: '20px 0', 
              borderBottom: `1px solid ${colors.border}` 
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>P5 (Rare Downside)</p>
                <div style={{ fontSize: '18px', fontWeight: '500', color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(stats.p5, 0)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>P95 (Rare Upside)</p>
                <div style={{ fontSize: '18px', fontWeight: '500', color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(stats.p95, 0)}
                </div>
              </div>
            </div>

            {/* Worst / Best Case Anchors */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              padding: '20px 0', 
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.cardBgDark,
              margin: '0 -24px',
              paddingLeft: '24px',
              paddingRight: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Worst-Case Anchor</p>
                <div style={{ fontSize: '18px', fontWeight: '500', fontVariantNumeric: 'tabular-nums', color: colors.white }}>
                  {formatCurrency(worstCase, 2)}
                </div>
                <p style={{ fontSize: '11px', color: colors.textDim, marginTop: '2px' }}>FDV Min × Drop Min</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Best-Case Anchor</p>
                <div style={{ fontSize: '18px', fontWeight: '500', fontVariantNumeric: 'tabular-nums', color: colors.white }}>
                  {formatCurrency(bestCase, 2)}
                </div>
                <p style={{ fontSize: '11px', color: colors.textDim, marginTop: '2px' }}>FDV Max × Drop Max</p>
              </div>
            </div>

            {/* Mean & Compute Time */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingTop: '16px',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ color: colors.textMuted }}>Mean: </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '500', color: colors.white }}>{formatCurrency(stats.mean, 2)}</span>
              </div>
              <div style={{ color: colors.textDim, fontSize: '12px' }}>
                Computed in {formatDuration(executionTimeMs)}
              </div>
            </div>
          </div>

          {/* Right Column - Chart & Thresholds */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Distribution Chart */}
            <div style={{ 
              backgroundColor: colors.cardBg, 
              borderRadius: '12px', 
              padding: '20px',
              border: `1px solid ${colors.border}`,
              flex: 1,
              boxShadow: '0 4px 20px hsl(0 0% 0% / 0.35)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px' 
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: colors.white }}>Value Distribution</h3>
                <span style={{ 
                  fontSize: '12px', 
                  color: colors.textMuted, 
                  padding: '4px 8px', 
                  backgroundColor: colors.cardBgDark, 
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`
                }}>
                  Linear X
                </span>
              </div>
              
              {/* Y-axis labels and chart */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  fontSize: '10px', 
                  color: colors.textDim,
                  paddingBottom: '20px',
                  width: '32px',
                  textAlign: 'right'
                }}>
                  <span>{Math.max(...histogram.map(b => b.count)) >= 1000 
                    ? `${(Math.max(...histogram.map(b => b.count)) / 1000).toFixed(0)}k` 
                    : Math.max(...histogram.map(b => b.count))}</span>
                  <span>{Math.max(...histogram.map(b => b.count)) >= 2000 
                    ? `${(Math.max(...histogram.map(b => b.count)) / 2000).toFixed(0)}k` 
                    : Math.round(Math.max(...histogram.map(b => b.count)) / 2)}</span>
                  <span>0</span>
                </div>
                <div style={{ flex: 1 }}>
                  <ShareHistogram histogram={histogram} median={stats.median} />
                  {/* X-axis labels */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginTop: '8px', 
                    fontSize: '10px', 
                    color: colors.textDim 
                  }}>
                    {xLabels.slice(0, 5).map((label, i) => (
                      <span key={i}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '24px', 
                marginTop: '12px', 
                fontSize: '12px', 
                color: colors.textMuted 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: colors.gold, 
                    borderRadius: '50%',
                    boxShadow: `0 0 6px ${colors.goldGlow}`
                  }} />
                  <span>Distribution</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '2px', borderTop: `2px dashed ${colors.red}` }} />
                  <span>Median</span>
                </div>
              </div>
            </div>

            {/* Probability Thresholds */}
            {thresholds.length > 0 && (
              <div style={{ 
                backgroundColor: colors.cardBg, 
                borderRadius: '12px', 
                padding: '20px',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 4px 20px hsl(0 0% 0% / 0.35)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '12px' 
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: colors.white }}>Probability Thresholds</h3>
                </div>
                <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '16px' }}>
                  Chance that your airdrop is worth at least...
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {thresholds.slice(0, 3).map((threshold) => {
                    const prob = thresholdProbs[threshold] ?? 0;
                    const percentage = prob * 100;
                    
                    return (
                      <div key={threshold}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: colors.textMuted, fontSize: '14px' }}>≥ $</span>
                            <span style={{ 
                              backgroundColor: colors.cardBgDark, 
                              padding: '4px 12px', 
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontVariantNumeric: 'tabular-nums',
                              border: `1px solid ${colors.border}`,
                              color: colors.white
                            }}>
                              {threshold}
                            </span>
                          </div>
                          <span style={{ 
                            fontWeight: '600', 
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '14px',
                            color: colors.white
                          }}>
                            {formatProbability(prob)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ 
                          height: '4px', 
                          backgroundColor: colors.border, 
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${percentage}%`,
                            backgroundColor: colors.gold,
                            borderRadius: '2px',
                            boxShadow: `0 0 8px ${colors.goldGlow}`
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '16px', 
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: colors.textDim
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Supply: {inputs.supply}</span>
            <span>FDV: {inputs.fdvRange}</span>
            <span>Drop%: {inputs.dropRange}</span>
            <span>{inputs.simulations} simulations</span>
          </div>
          <span style={{ color: colors.gold, fontWeight: '500' }}>airdrop-oracle</span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
