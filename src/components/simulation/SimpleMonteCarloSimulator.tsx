import { useState, useCallback } from "react";
import runItImage from "@/assets/run_it.png";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, AlertTriangle, Loader2 } from "lucide-react";
import { SimpleSimulationParams, SimpleSimulationResults, ValidationError, DEFAULT_PARAMS, validateParams, runSimpleSimulation } from "@/lib/simple-monte-carlo";
import { AdvancedSimulationParams, AdvancedValidationError, DEFAULT_ADVANCED_PARAMS, validateAdvancedParams, runAdvancedSimulation } from "@/lib/advanced-monte-carlo";
import { SimpleInputForm } from "./SimpleInputForm";
import { AdvancedInputForm } from "./AdvancedInputForm";
import { SimpleResults } from "./SimpleResults";
import { SimpleThresholds } from "./SimpleThresholds";
import { SimpleHistogram } from "./SimpleHistogram";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type SimulationMode = 'classic' | 'advanced';

const DEFAULT_THRESHOLDS = [60, 120, 300];

export function SimpleMonteCarloSimulator() {
  const [mode, setMode] = useState<SimulationMode>('classic');
  
  // Classic mode state
  const [classicParams, setClassicParams] = useState<SimpleSimulationParams>(DEFAULT_PARAMS);
  const [classicErrors, setClassicErrors] = useState<ValidationError[]>([]);
  
  // Advanced mode state
  const [advancedParams, setAdvancedParams] = useState<AdvancedSimulationParams>(DEFAULT_ADVANCED_PARAMS);
  const [advancedErrors, setAdvancedErrors] = useState<AdvancedValidationError[]>([]);
  
  // Shared state
  const [thresholds, setThresholds] = useState<number[]>(DEFAULT_THRESHOLDS);
  const [results, setResults] = useState<SimpleSimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleClassicParamChange = useCallback((key: keyof SimpleSimulationParams, value: number) => {
    setClassicParams(prev => ({ ...prev, [key]: value }));
    setClassicErrors(prev => prev.filter(e => e.field !== key));
  }, []);

  const handleAdvancedParamsChange = useCallback((params: AdvancedSimulationParams) => {
    setAdvancedParams(params);
    // Clear errors for updated fields
    setAdvancedErrors([]);
  }, []);

  const handleRunSimulation = useCallback(() => {
    if (mode === 'classic') {
      const validationErrors = validateParams(classicParams);
      if (validationErrors.length > 0) {
        setClassicErrors(validationErrors);
        return;
      }
      setClassicErrors([]);
      setIsRunning(true);
      setTimeout(() => {
        const newResults = runSimpleSimulation(classicParams, thresholds);
        setResults(newResults);
        setIsRunning(false);
      }, 10);
    } else {
      const validationErrors = validateAdvancedParams(advancedParams);
      if (validationErrors.length > 0) {
        setAdvancedErrors(validationErrors);
        return;
      }
      setAdvancedErrors([]);
      setIsRunning(true);
      setTimeout(() => {
        const newResults = runAdvancedSimulation(advancedParams, thresholds);
        setResults(newResults);
        setIsRunning(false);
      }, 10);
    }
  }, [mode, classicParams, advancedParams, thresholds]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as SimulationMode);
    // Clear results when switching modes
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tedism Probability Lab</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tedistic Monte Carlo simulation for per NFT airdrop outcomes
            </p>
          </div>
          <a
            href="https://x.com/cybttx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-sm font-medium text-foreground">@cybttx</span>
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Mode Selector */}
        <div className="flex justify-center mb-6">
          <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 min-w-[300px]">
              <TabsTrigger value="classic" className="text-sm">
                Classic
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-sm">
                Advanced
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Warning Banner */}
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Results depend on your assumptions. This is a probability estimate, not financial advice.
          </AlertDescription>
        </Alert>

        {mode === 'classic' ? (
          // Classic Mode Layout
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Panel - Inputs */}
            <div className="lg:col-span-4 space-y-4">
              <SimpleInputForm
                params={classicParams}
                errors={classicErrors}
                onParamChange={handleClassicParamChange}
              />

              {/* Run Button */}
              <Button onClick={handleRunSimulation} disabled={isRunning} size="lg" className="w-full">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Run Simulation
                  </>
                )}
              </Button>

              {/* How It Works (Classic) */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                    <span className="flex items-center gap-2">How It Works</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <p className="font-medium">Airdrop % Distribution</p>
                        <p className="text-xs text-muted-foreground italic mb-2">
                          Your Min–Max range is divided into 3 zones. The simulator shapes probabilities inside your chosen range.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          • <strong>Range A:</strong> First 11% of your range. 50% total probability weight, probability increases within this zone.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          • <strong>Range B:</strong> From 11% to 44% of your range. 40% total probability weight, short flat plateau early, then probability gradually decreases.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          • <strong>Range C:</strong> From 44% to 100% of your range. 10% total probability weight. Values closer to your maximum are increasingly rare.
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
                          <code className="text-xs font-mono">value_per_nft = (FDV × Drop%) / NFT_Supply</code>
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Right Panel - Results */}
            <div className="lg:col-span-8 space-y-4">
              {results ? (
                <>
                  <SimpleResults results={results} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <SimpleHistogram histogram={results.histogram} median={results.stats.median} />
                    <SimpleThresholds
                      thresholds={thresholds}
                      thresholdProbs={results.thresholdProbs}
                      onThresholdsChange={setThresholds}
                    />
                  </div>
                </>
              ) : (
                <div className="h-96 flex items-center justify-center rounded-lg border bg-card">
                  <div className="text-center space-y-4">
                    <p className="text-lg font-semibold text-foreground">Ready to Run</p>
                    <img src={runItImage} alt="Run It" className="max-h-64 object-contain mx-auto" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Advanced Mode Layout
          <div className="space-y-6">
            <AdvancedInputForm
              params={advancedParams}
              errors={advancedErrors}
              onParamsChange={handleAdvancedParamsChange}
            />

            {/* Run Button */}
            <Button onClick={handleRunSimulation} disabled={isRunning} size="lg" className="w-full max-w-md mx-auto flex">
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running {advancedParams.numSimulations.toLocaleString()} simulations...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Simulation
                </>
              )}
            </Button>

            {/* Results */}
            {results ? (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <SimpleResults results={results} />
                </div>
                <div className="lg:col-span-6 space-y-4">
                  <SimpleHistogram histogram={results.histogram} median={results.stats.median} />
                  <SimpleThresholds
                    thresholds={thresholds}
                    thresholdProbs={results.thresholdProbs}
                    onThresholdsChange={setThresholds}
                  />
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center rounded-lg border bg-card">
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold text-foreground">Ready to Run</p>
                  <p className="text-sm text-muted-foreground">Configure your custom ranges above and run the simulation</p>
                </div>
              </div>
            )}

            {/* How It Works (Advanced) */}
            <Accordion type="single" collapsible className="w-full max-w-2xl mx-auto">
              <AccordionItem value="advanced" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">How Advanced Mode Works</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="font-medium">Custom Range Stacking</p>
                      <p className="text-xs text-muted-foreground">
                        Define multiple ranges with different probability shapes. Each range contributes to the final distribution proportionally to its width.
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="font-medium">Distribution Types</p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Uniform:</strong> Equal probability across the range
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Linear Decreasing:</strong> Most likely near the minimum
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Linear Increasing:</strong> Most likely near the maximum
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Prediction-Centric:</strong> Concentrates around your expected outcome range
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Formula:</strong>
                        <br />
                        <code className="text-xs font-mono">value_per_nft = (FDV × Drop%) / NFT_Supply</code>
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </main>
    </div>
  );
}
