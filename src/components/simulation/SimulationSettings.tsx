import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParameterInput } from "./ParameterInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";

interface SimulationSettingsProps {
  nftSupply: number;
  numSimulations: number;
  useDeterministicSeed: boolean;
  seed: number;
  onParamChange: (key: string, value: number) => void;
  onToggleSeed: (checked: boolean) => void;
}

export function SimulationSettings({
  nftSupply,
  numSimulations,
  useDeterministicSeed,
  seed,
  onParamChange,
  onToggleSeed
}: SimulationSettingsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Simulation Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ParameterInput
          label="NFT Supply"
          value={nftSupply}
          onChange={(v) => onParamChange('nftSupply', v)}
          min={100}
          max={100000}
          step={1}
          format={formatNumber}
          parse={(v) => parseInt(v.replace(/,/g, ''), 10) || 0}
          showSlider={false}
        />
        
        <ParameterInput
          label="Simulations"
          value={numSimulations}
          onChange={(v) => onParamChange('numSimulations', v)}
          min={10000}
          max={1000000}
          step={10000}
          format={(v) => formatNumber(v)}
          parse={(v) => parseInt(v.replace(/,/g, ''), 10) || 0}
          description="More simulations = more accurate, but slower"
        />

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Deterministic Seed</Label>
            <p className="text-xs text-muted-foreground">
              Reproducible results
            </p>
          </div>
          <Switch
            checked={useDeterministicSeed}
            onCheckedChange={onToggleSeed}
          />
        </div>

        {useDeterministicSeed && (
          <div className="flex items-center gap-3">
            <Label className="text-sm">Seed:</Label>
            <Input
              type="number"
              value={seed}
              onChange={(e) => onParamChange('seed', parseInt(e.target.value) || 0)}
              className="w-32 h-8 font-mono text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
