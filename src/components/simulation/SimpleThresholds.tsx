import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { formatProbability } from "@/lib/format";

interface SimpleThresholdsProps {
  thresholds: number[];
  thresholdProbs: Record<number, number>;
  onThresholdsChange: (thresholds: number[]) => void;
}

export function SimpleThresholds({ 
  thresholds, 
  thresholdProbs, 
  onThresholdsChange 
}: SimpleThresholdsProps) {
  const addThreshold = () => {
    const newThreshold = Math.max(...thresholds, 0) + 100;
    onThresholdsChange([...thresholds, newThreshold].sort((a, b) => a - b));
  };

  const removeThreshold = (index: number) => {
    if (thresholds.length <= 1) return;
    onThresholdsChange(thresholds.filter((_, i) => i !== index));
  };

  const updateThreshold = (index: number, value: number) => {
    const updated = [...thresholds];
    updated[index] = value;
    onThresholdsChange(updated.sort((a, b) => a - b));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Probability Thresholds</CardTitle>
          <Button variant="ghost" size="sm" onClick={addThreshold} className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Chance that your airdrop is worth at least...
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {thresholds.map((threshold, index) => {
          const prob = thresholdProbs[threshold] ?? 0;
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-8">≥ $</span>
                <Input
                  type="number"
                  value={threshold}
                  onChange={(e) => updateThreshold(index, parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 font-mono text-sm"
                />
                <div className="flex-1 text-right font-mono text-sm font-semibold">
                  {formatProbability(prob)}
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
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${prob * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
