import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, AlertTriangle, Loader2 } from "lucide-react";
import { SimulationParams, SimulationResults, PRESETS, runSimulation } from "@/lib/monte-carlo";
import { FDVDistributionPanel } from "./FDVDistributionPanel";
import { DropDistributionPanel } from "./DropDistributionPanel";
import { SimulationSettings } from "./SimulationSettings";
import { PresetButtons } from "./PresetButtons";
import { ResultsHistogram } from "./ResultsHistogram";
import { StatisticsPanel } from "./StatisticsPanel";
import { ThresholdAnalysis } from "./ThresholdAnalysis";

const DEFAULT_THRESHOLDS = [60, 120, 300];

export function MonteCarloSimulator() {
  const [params, setParams] = useState<SimulationParams>({
    ...PRESETS.base.params,
    numSimulations: 200000,
    seed: 42
  });
  const [useDeterministicSeed, setUseDeterministicSeed] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('base');
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [thresholds, setThresholds] = useState<number[]>(DEFAULT_THRESHOLDS);
  const [isRunning, setIsRunning] = useState(false);

  const handleParamChange = useCallback((key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  const handlePresetSelect = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setParams(prev => ({
        ...prev,
        ...preset.params
      }));
      setActivePreset(presetKey);
    }
  }, []);

  const handleRunSimulation = useCallback(() => {
    setIsRunning(true);
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const simParams: SimulationParams = useDeterministicSeed 
        ? params 
        : { ...params, seed: undefined };
      
      const newResults = runSimulation(simParams, thresholds);
      setResults(newResults);
      setIsRunning(false);
    }, 10);
  }, [params, useDeterministicSeed, thresholds]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">NFT Airdrop Monte Carlo Simulator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estimate per-NFT airdrop value distributions using Monte Carlo simulation
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Warning Banner */}
        <Alert className="mb-6 border-accent bg-accent/20">
          <AlertTriangle className="h-4 w-4 text-accent-foreground" />
          <AlertDescription className="text-sm">
            <strong>Disclaimer:</strong> Results depend entirely on your input assumptions. 
            This tool provides probability estimates, not guarantees. Always verify assumptions 
            against real market data when making investment decisions.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Parameters */}
          <div className="lg:col-span-5 space-y-4">
            {/* Presets */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Quick Presets</h3>
              <PresetButtons 
                activePreset={activePreset} 
                onSelectPreset={handlePresetSelect} 
              />
            </div>

            {/* Simulation Settings */}
            <SimulationSettings
              nftSupply={params.nftSupply}
              numSimulations={params.numSimulations}
              useDeterministicSeed={useDeterministicSeed}
              seed={params.seed ?? 42}
              onParamChange={handleParamChange}
              onToggleSeed={setUseDeterministicSeed}
            />

            {/* FDV Distribution */}
            <FDVDistributionPanel
              fdvMinA={params.fdvMinA}
              fdvMaxA={params.fdvMaxA}
              fdvProbA={params.fdvProbA}
              fdvMinB={params.fdvMinB}
              fdvMaxB={params.fdvMaxB}
              onParamChange={handleParamChange}
            />

            {/* Drop Distribution */}
            <DropDistributionPanel
              dropMin={params.dropMin}
              dropMode={params.dropMode}
              dropMax={params.dropMax}
              dropTailMin={params.dropTailMin}
              dropTailMax={params.dropTailMax}
              dropTailProb={params.dropTailProb}
              onParamChange={handleParamChange}
            />

            {/* Run Button */}
            <Button 
              onClick={handleRunSimulation} 
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-7 space-y-4">
            {results ? (
              <>
                <ResultsHistogram 
                  histogram={results.histogram}
                  mean={results.stats.mean}
                  median={results.stats.median}
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <StatisticsPanel
                    stats={results.stats}
                    worstCase={results.worstCase}
                    bestCase={results.bestCase}
                    executionTimeMs={results.executionTimeMs}
                  />
                  <ThresholdAnalysis
                    thresholds={thresholds}
                    thresholdProbs={results.thresholdProbs}
                    onThresholdsChange={setThresholds}
                  />
                </div>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                <div className="text-center space-y-2">
                  <Play className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">No Results Yet</p>
                  <p className="text-sm text-muted-foreground/70">
                    Configure parameters and click "Run Simulation"
                  </p>
                </div>
              </div>
            )}

            {/* Formula Reference */}
            <div className="p-4 bg-card rounded-lg border text-sm">
              <h4 className="font-semibold mb-2">Core Model</h4>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                value_per_nft = (FDV × drop_percentage) / nft_supply
              </code>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p><strong>FDV:</strong> Log-uniform mixture of Range A (p={Math.round(params.fdvProbA * 100)}%) and Range B</p>
                <p><strong>Drop %:</strong> Triangular (main) + Uniform (tail, p={Math.round(params.dropTailProb * 100)}%) mixture</p>
                <p><strong>Simulations:</strong> {params.numSimulations.toLocaleString()} Monte Carlo samples</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
