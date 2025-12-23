import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { formatProbability } from "@/lib/format";

interface ThresholdAnalysisProps {
  thresholds: number[];
  thresholdProbs: Record<number, number>;
  onThresholdsChange: (thresholds: number[]) => void;
}

export function ThresholdAnalysis({ 
  thresholds, 
  thresholdProbs, 
  onThresholdsChange 
}: ThresholdAnalysisProps) {
  const addThreshold = () => {
    const newThreshold = Math.max(...thresholds, 0) + 100;
    onThresholdsChange([...thresholds, newThreshold].sort((a, b) => a - b));
  };

  const removeThreshold = (index: number) => {
    onThresholdsChange(thresholds.filter((_, i) => i !== index));
  };

  const updateThreshold = (index: number, value: number) => {
    const updated = [...thresholds];
    updated[index] = value;
    onThresholdsChange(updated.sort((a, b) => a - b));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Threshold Probabilities</CardTitle>
          <Button variant="ghost" size="sm" onClick={addThreshold}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Probability that per-NFT value ≥ threshold
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {thresholds.map((threshold, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">≥ $</span>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => updateThreshold(index, parseFloat(e.target.value) || 0)}
              className="w-24 h-8 font-mono text-sm"
            />
            <div className="flex-1 h-8 bg-muted/30 rounded flex items-center justify-end px-3">
              <span className="font-mono text-sm font-medium">
                {thresholdProbs[threshold] !== undefined 
                  ? formatProbability(thresholdProbs[threshold])
                  : '—'}
              </span>
            </div>
            {thresholds.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeThreshold(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        
        {/* Visual probability bars */}
        <div className="mt-4 space-y-2">
          {thresholds.map((threshold, index) => {
            const prob = thresholdProbs[threshold] ?? 0;
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>${threshold}</span>
                  <span>{formatProbability(prob)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
