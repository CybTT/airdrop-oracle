import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParameterInput } from "./ParameterInput";

interface DropDistributionPanelProps {
  dropMin: number;
  dropMode: number;
  dropMax: number;
  dropTailMin: number;
  dropTailMax: number;
  dropTailProb: number;
  onParamChange: (key: string, value: number) => void;
}

const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;
const parsePercent = (v: string) => parseFloat(v.replace('%', '')) / 100;

export function DropDistributionPanel({
  dropMin,
  dropMode,
  dropMax,
  dropTailMin,
  dropTailMax,
  dropTailProb,
  onParamChange
}: DropDistributionPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Drop Percentage Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">
          Triangular (main) + Uniform (tail) mixture
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-accent/50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-accent-foreground">Main Range (Triangular)</h4>
          <p className="text-xs text-muted-foreground">
            Probability: {((1 - dropTailProb) * 100).toFixed(0)}%
          </p>
          <ParameterInput
            label="Min Drop"
            value={dropMin}
            onChange={(v) => onParamChange('dropMin', v)}
            min={0.001}
            max={0.2}
            step={0.001}
            format={formatPercent}
            parse={parsePercent}
          />
          <ParameterInput
            label="Mode (Peak)"
            value={dropMode}
            onChange={(v) => onParamChange('dropMode', v)}
            min={0.001}
            max={0.2}
            step={0.001}
            format={formatPercent}
            parse={parsePercent}
          />
          <ParameterInput
            label="Max Drop"
            value={dropMax}
            onChange={(v) => onParamChange('dropMax', v)}
            min={0.001}
            max={0.2}
            step={0.001}
            format={formatPercent}
            parse={parsePercent}
          />
        </div>

        <div className="p-3 bg-muted/30 rounded-lg space-y-3">
          <h4 className="text-sm font-medium">Tail Range (Uniform)</h4>
          <ParameterInput
            label="Tail Probability"
            value={dropTailProb}
            onChange={(v) => onParamChange('dropTailProb', v)}
            min={0}
            max={0.5}
            step={0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            parse={(v) => parseFloat(v.replace('%', '')) / 100}
          />
          <ParameterInput
            label="Tail Min"
            value={dropTailMin}
            onChange={(v) => onParamChange('dropTailMin', v)}
            min={0.001}
            max={0.3}
            step={0.001}
            format={formatPercent}
            parse={parsePercent}
          />
          <ParameterInput
            label="Tail Max"
            value={dropTailMax}
            onChange={(v) => onParamChange('dropTailMax', v)}
            min={0.001}
            max={0.3}
            step={0.001}
            format={formatPercent}
            parse={parsePercent}
          />
        </div>
      </CardContent>
    </Card>
  );
}
