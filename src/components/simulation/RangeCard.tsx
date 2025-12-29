import { useState } from "react";
import { CustomRange, DistributionType } from "@/lib/advanced-monte-carlo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2, AlertCircle } from "lucide-react";

interface RangeCardProps {
  range: CustomRange;
  index: number;
  type: 'fdv' | 'drop';
  onUpdate: (range: CustomRange) => void;
  onRemove: () => void;
  canRemove: boolean;
  error?: string;
}

const DISTRIBUTION_LABELS: Record<DistributionType, { label: string; description: string }> = {
  uniform: {
    label: "Uniform (Random)",
    description: "Equal probability across the range"
  },
  linearDecreasing: {
    label: "Linear Decreasing",
    description: "Most likely near minimum, decreases toward maximum"
  },
  linearIncreasing: {
    label: "Linear Increasing",
    description: "Most likely near maximum, decreases toward minimum"
  },
  predictionCentric: {
    label: "Prediction-Centric",
    description: "Concentrates around your expected outcome"
  }
};

export function RangeCard({ range, index, type, onUpdate, onRemove, canRemove, error }: RangeCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const isFDV = type === 'fdv';
  const unitLabel = isFDV ? "M" : "%";
  const prefixLabel = isFDV ? "$" : "";
  
  const handleMinChange = (value: string) => {
    onUpdate({ ...range, min: parseFloat(value) || 0 });
  };
  
  const handleMaxChange = (value: string) => {
    onUpdate({ ...range, max: parseFloat(value) || 0 });
  };
  
  const handleDistributionChange = (value: DistributionType) => {
    const updated: CustomRange = { ...range, distributionType: value };
    // Clear expected values when switching away from prediction-centric
    if (value !== 'predictionCentric') {
      delete updated.expectedMin;
      delete updated.expectedMax;
    } else {
      // Initialize with midpoint of range
      updated.expectedMin = range.min + (range.max - range.min) * 0.3;
      updated.expectedMax = range.min + (range.max - range.min) * 0.7;
    }
    onUpdate(updated);
  };
  
  const handleExpectedMinChange = (value: string) => {
    onUpdate({ ...range, expectedMin: parseFloat(value) || 0 });
  };
  
  const handleExpectedMaxChange = (value: string) => {
    onUpdate({ ...range, expectedMax: parseFloat(value) || 0 });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={error ? "border-destructive" : ""}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Range {index + 1}
              </span>
              <span className="text-sm font-mono">
                {prefixLabel}{range.min}{unitLabel} – {prefixLabel}{range.max}{unitLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {error && <AlertCircle className="h-4 w-4 text-destructive" />}
              {canRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Range Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min</Label>
                <div className="relative">
                  {isFDV && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  )}
                  <Input
                    type="number"
                    step={isFDV ? "1" : "0.1"}
                    value={range.min}
                    onChange={(e) => handleMinChange(e.target.value)}
                    className={`font-mono ${isFDV ? 'pl-7' : ''} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    {unitLabel}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max</Label>
                <div className="relative">
                  {isFDV && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  )}
                  <Input
                    type="number"
                    step={isFDV ? "1" : "0.1"}
                    value={range.max}
                    onChange={(e) => handleMaxChange(e.target.value)}
                    className={`font-mono ${isFDV ? 'pl-7' : ''} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    {unitLabel}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Distribution Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Distribution Shape</Label>
              <Select value={range.distributionType} onValueChange={handleDistributionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DISTRIBUTION_LABELS).map(([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col items-start">
                        <span>{label}</span>
                        <span className="text-xs text-muted-foreground">{description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Prediction-Centric Options */}
            {range.distributionType === 'predictionCentric' && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <p className="text-xs text-muted-foreground">
                  Define where outcomes should concentrate (70% of results will fall within this range)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expected Min</Label>
                    <div className="relative">
                      {isFDV && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      )}
                      <Input
                        type="number"
                        step={isFDV ? "1" : "0.1"}
                        value={range.expectedMin ?? ''}
                        onChange={(e) => handleExpectedMinChange(e.target.value)}
                        className={`font-mono ${isFDV ? 'pl-7' : ''} pr-8`}
                        placeholder={String(range.min)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                        {unitLabel}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expected Max</Label>
                    <div className="relative">
                      {isFDV && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      )}
                      <Input
                        type="number"
                        step={isFDV ? "1" : "0.1"}
                        value={range.expectedMax ?? ''}
                        onChange={(e) => handleExpectedMaxChange(e.target.value)}
                        className={`font-mono ${isFDV ? 'pl-7' : ''} pr-8`}
                        placeholder={String(range.max)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                        {unitLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
