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

// Mini histogram component for the share card
function ShareHistogram({ histogram, median }: { histogram: HistogramBin[]; median: number }) {
  const maxCount = Math.max(...histogram.map(bin => bin.count));
  
  return (
    <div className="w-full h-48 flex items-end gap-[2px] relative">
      {histogram.map((bin, index) => {
        const height = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
        const binMid = (bin.binStart + bin.binEnd) / 2;
        const isMedianBin = binMid >= median * 0.9 && binMid <= median * 1.1;
        
        return (
          <div
            key={index}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${height}%`,
              backgroundColor: isMedianBin ? '#ef4444' : '#d4a84b',
              minHeight: bin.count > 0 ? '2px' : '0'
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

    return (
      <div
        ref={ref}
        style={{
          width: '1200px',
          backgroundColor: '#0a0a0b',
          color: '#ffffff',
          padding: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: '16px'
        }}
      >
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#d4a84b',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Sorry for your loss. The answer is 0.
          </h1>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'flex', gap: '24px' }}>
          
          {/* Left Column - Stats */}
          <div style={{ 
            flex: '0 0 380px', 
            backgroundColor: '#111113', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #222'
          }}>
            {/* Main Value */}
            <div style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                Estimated Airdrop Value per NFT
              </p>
              <div style={{ 
                fontSize: '56px', 
                fontWeight: 'bold', 
                color: '#d4a84b',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1
              }}>
                {formatCurrency(stats.median, 0)}
              </div>
              <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>Median (P50)</p>
            </div>

            {/* P10 / P90 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              padding: '20px 0', 
              borderBottom: '1px solid #333' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>P10 (Low End)</p>
                <div style={{ fontSize: '24px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(stats.p10, 0)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>P90 (High End)</p>
                <div style={{ fontSize: '24px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
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
              borderBottom: '1px solid #333' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>P5 (Rare Downside)</p>
                <div style={{ fontSize: '18px', fontWeight: '500', color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(stats.p5, 0)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>P95 (Rare Upside)</p>
                <div style={{ fontSize: '18px', fontWeight: '500', color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>
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
              borderBottom: '1px solid #333',
              backgroundColor: '#0d0d0f',
              margin: '0 -24px',
              paddingLeft: '24px',
              paddingRight: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Worst-Case Anchor</p>
                <div style={{ fontSize: '18px', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(worstCase, 2)}
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>FDV Min × Drop Min</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Best-Case Anchor</p>
                <div style={{ fontSize: '18px', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(bestCase, 2)}
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>FDV Max × Drop Max</p>
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
                <span style={{ color: '#888' }}>Mean: </span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{formatCurrency(stats.mean, 2)}</span>
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                Computed in {formatDuration(executionTimeMs)}
              </div>
            </div>
          </div>

          {/* Right Column - Chart & Thresholds */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Distribution Chart */}
            <div style={{ 
              backgroundColor: '#111113', 
              borderRadius: '12px', 
              padding: '20px',
              border: '1px solid #222',
              flex: 1
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px' 
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Value Distribution</h3>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#888', 
                  padding: '4px 8px', 
                  backgroundColor: '#1a1a1c', 
                  borderRadius: '4px',
                  border: '1px solid #333'
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
                  color: '#666',
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
                    color: '#666' 
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
                color: '#888' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#d4a84b', borderRadius: '50%' }} />
                  <span>Distribution</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '2px', borderTop: '2px dashed #ef4444' }} />
                  <span>Median</span>
                </div>
              </div>
            </div>

            {/* Probability Thresholds */}
            {thresholds.length > 0 && (
              <div style={{ 
                backgroundColor: '#111113', 
                borderRadius: '12px', 
                padding: '20px',
                border: '1px solid #222'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '12px' 
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Probability Thresholds</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
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
                            <span style={{ color: '#888', fontSize: '14px' }}>≥ $</span>
                            <span style={{ 
                              backgroundColor: '#1a1a1c', 
                              padding: '4px 12px', 
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontVariantNumeric: 'tabular-nums',
                              border: '1px solid #333'
                            }}>
                              {threshold}
                            </span>
                          </div>
                          <span style={{ 
                            fontWeight: '600', 
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '14px'
                          }}>
                            {formatProbability(prob)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ 
                          height: '4px', 
                          backgroundColor: '#222', 
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${percentage}%`,
                            backgroundColor: '#d4a84b',
                            borderRadius: '2px'
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
          borderTop: '1px solid #222',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Supply: {inputs.supply}</span>
            <span>FDV: {inputs.fdvRange}</span>
            <span>Drop%: {inputs.dropRange}</span>
            <span>{inputs.simulations} simulations</span>
          </div>
          <span style={{ color: '#555' }}>airdrop-oracle</span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
