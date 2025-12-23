import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParameterInput } from "./ParameterInput";
import { formatCurrency } from "@/lib/format";

interface FDVDistributionPanelProps {
  fdvMinA: number;
  fdvMaxA: number;
  fdvProbA: number;
  fdvMinB: number;
  fdvMaxB: number;
  onParamChange: (key: string, value: number) => void;
}

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[$,]/g, '').toLowerCase();
  if (cleaned.endsWith('b')) {
    return parseFloat(cleaned) * 1_000_000_000;
  }
  if (cleaned.endsWith('m')) {
    return parseFloat(cleaned) * 1_000_000;
  }
  if (cleaned.endsWith('k')) {
    return parseFloat(cleaned) * 1_000;
  }
  return parseFloat(cleaned) || 0;
};

export function FDVDistributionPanel({
  fdvMinA,
  fdvMaxA,
  fdvProbA,
  fdvMinB,
  fdvMaxB,
  onParamChange
}: FDVDistributionPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">FDV Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">
          Mixture of two log-uniform ranges
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-accent/50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-accent-foreground">Range A (Main)</h4>
          <ParameterInput
            label="Min FDV"
            value={fdvMinA}
            onChange={(v) => onParamChange('fdvMinA', v)}
            min={1_000_000}
            max={10_000_000_000}
            step={1_000_000}
            format={formatCurrency}
            parse={parseCurrency}
            showSlider={false}
          />
          <ParameterInput
            label="Max FDV"
            value={fdvMaxA}
            onChange={(v) => onParamChange('fdvMaxA', v)}
            min={1_000_000}
            max={10_000_000_000}
            step={1_000_000}
            format={formatCurrency}
            parse={parseCurrency}
            showSlider={false}
          />
          <ParameterInput
            label="Probability"
            value={fdvProbA}
            onChange={(v) => onParamChange('fdvProbA', v)}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            parse={(v) => parseFloat(v.replace('%', '')) / 100}
          />
        </div>

        <div className="p-3 bg-muted/30 rounded-lg space-y-3">
          <h4 className="text-sm font-medium">Range B (Tail)</h4>
          <p className="text-xs text-muted-foreground">
            Probability: {((1 - fdvProbA) * 100).toFixed(0)}%
          </p>
          <ParameterInput
            label="Min FDV"
            value={fdvMinB}
            onChange={(v) => onParamChange('fdvMinB', v)}
            min={1_000_000}
            max={10_000_000_000}
            step={1_000_000}
            format={formatCurrency}
            parse={parseCurrency}
            showSlider={false}
          />
          <ParameterInput
            label="Max FDV"
            value={fdvMaxB}
            onChange={(v) => onParamChange('fdvMaxB', v)}
            min={1_000_000}
            max={10_000_000_000}
            step={1_000_000}
            format={formatCurrency}
            parse={parseCurrency}
            showSlider={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
