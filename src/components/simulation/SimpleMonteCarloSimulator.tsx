import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { 
  SimpleSimulationParams, 
  SimpleSimulationResults, 
  ValidationError,
  DEFAULT_PARAMS,
  validateParams,
  runSimpleSimulation 
} from "@/lib/simple-monte-carlo";
import { SimpleInputForm } from "./SimpleInputForm";
import { SimpleResults } from "./SimpleResults";
import { SimpleThresholds } from "./SimpleThresholds";
import { SimpleHistogram } from "./SimpleHistogram";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_THRESHOLDS = [60, 120, 300];

export function SimpleMonteCarloSimulator() {
  const [params, setParams] = useState<SimpleSimulationParams>(DEFAULT_PARAMS);
  const [thresholds, setThresholds] = useState<number[]>(DEFAULT_THRESHOLDS);
  const [results, setResults] = useState<SimpleSimulationResults | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleParamChange = useCallback((key: keyof SimpleSimulationParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">NFT Airdrop Estimator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monte Carlo simulation to estimate your per-NFT airdrop value
          </p>
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
            <SimpleInputForm
              params={params}
              errors={errors}
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
                  Running...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run Simulation
                </>
              )}
            </Button>

            {/* Advanced Options (collapsed) */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    Advanced Options
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <p className="font-medium">Distribution Details</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>FDV:</strong> Log-uniform between min and max values
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Drop%:</strong> Triangular distribution with mode at 20% of range (biased toward lower values)
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Formula:</strong>
                        <br />
                        <code className="text-xs font-mono">
                          value = (FDV × Drop%) / NFT_Supply
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
            {results ? (
              <>
                <SimpleResults results={results} />
                <div className="grid md:grid-cols-2 gap-4">
                  <SimpleHistogram 
                    histogram={results.histogram} 
                    median={results.stats.median} 
                  />
                  <SimpleThresholds
                    thresholds={thresholds}
                    thresholdProbs={results.thresholdProbs}
                    onThresholdsChange={setThresholds}
                  />
                </div>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Play className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-muted-foreground">Ready to Simulate</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Enter your assumptions and click "Run Simulation"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
