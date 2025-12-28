import { useState, useCallback } from "react";
import runItImage from "@/assets/run_it.png";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, AlertTriangle, Loader2 } from "lucide-react";
import { SimpleSimulationParams, SimpleSimulationResults, ValidationError, DEFAULT_PARAMS, validateParams, runSimpleSimulation } from "@/lib/simple-monte-carlo";
import { SimpleInputForm } from "./SimpleInputForm";
import { SimpleResults } from "./SimpleResults";
import { SimpleThresholds } from "./SimpleThresholds";
import { SimpleHistogram } from "./SimpleHistogram";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
const DEFAULT_THRESHOLDS = [60, 120, 300];
export function SimpleMonteCarloSimulator() {
  const [params, setParams] = useState<SimpleSimulationParams>(DEFAULT_PARAMS);
  const [thresholds, setThresholds] = useState<number[]>(DEFAULT_THRESHOLDS);
  const [results, setResults] = useState<SimpleSimulationResults | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const handleParamChange = useCallback((key: keyof SimpleSimulationParams, value: number) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear errors for this field
    setErrors(prev => prev.filter(e => e.field !== key));
  }, []);
  const handleRunSimulation = useCallback(() => {
    // Validate
    const validationErrors = validateParams(params);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setIsRunning(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const newResults = runSimpleSimulation(params, thresholds);
      setResults(newResults);
      setIsRunning(false);
    }, 10);
  }, [params, thresholds]);
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">NFT Airdrop Estimator</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monte Carlo simulation to estimate your per-NFT airdrop value
            </p>
          </div>
          <a href="https://x.com/cybttx" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-sm font-medium text-foreground">@cybttx</span>
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Warning Banner */}
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Results depend on your assumptions. This is a probability estimate, not financial advice.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Inputs */}
          <div className="lg:col-span-4 space-y-4">
            <SimpleInputForm params={params} errors={errors} onParamChange={handleParamChange} />

            {/* Run Button */}
            <Button onClick={handleRunSimulation} disabled={isRunning} size="lg" className="w-full">
              {isRunning ? <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running...
                </> : <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Simulation
                </>}
            </Button>

            {/* Advanced Options (collapsed) */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    How It Works
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="font-medium">Airdrop % Distribution</p>
                      <p className="text-xs text-muted-foreground italic mb-2">Your Min–Max range is divided into 3 zones. The simulator shapes probabilities inside your chosen range.</p>
                      <p className="text-xs text-muted-foreground">• Range A: First 11% of your range. 50% total probability weight, probability increases within this zone. 

Values closer to the top of this band are more likely.<strong>Range A:</strong> First ~11% of your range (50% weight, probability increases within this zone — higher % → higher chance)
                      </p>
                      <p className="text-xs text-muted-foreground">• Range B: From 11% to 44% of your range. 40% total probability weight, short flat plateau early,  then probability gradually decreases toward the upper end.<strong>Range B:</strong> From ~11% to ~44% of your range (40% weight, short flat plateau early, then declining — higher % → lower chance)
                      </p>
                      <p className="text-xs text-muted-foreground">• Range C: From 44% to 100% of your range. 10% total probability weight.  This is the high-end zone. Values closer to your maximum are increasingly rare<strong>Range C:</strong> From ~44% to 100% of your range (10% weight, probability drops rapidly toward maximum)
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Higher airdrop percentages remain possible, but become significantly less likely as they approach your upper limit.
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="font-medium">FDV Distribution</p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>High probability zone:</strong> First $30M above min (75% weight, uniform)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Declining zone:</strong> Above that up to $200M (24% weight, probability decreases as FDV increases)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Rare tail:</strong> $200M–$300M (1% weight, if max ≥ $200M)
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Formula:</strong>
                        <br />
                        <code className="text-xs font-mono">
                          value_per_nft = (FDV × Drop%) / NFT_Supply
                        </code>
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-8 space-y-4">
            {results ? <>
                <SimpleResults results={results} />
                <div className="grid md:grid-cols-2 gap-4">
                  <SimpleHistogram histogram={results.histogram} median={results.stats.median} />
                  <SimpleThresholds thresholds={thresholds} thresholdProbs={results.thresholdProbs} onThresholdsChange={setThresholds} />
                </div>
              </> : <div className="h-96 flex items-center justify-center rounded-lg border bg-card">
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold text-foreground">Ready to Run</p>
                  <img src={runItImage} alt="Run It" className="max-h-64 object-contain mx-auto" />
                </div>
              </div>}
          </div>
        </div>
      </main>
    </div>;
}