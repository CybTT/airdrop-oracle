import { SimpleSimulationParams, ValidationError } from "@/lib/simple-monte-carlo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface SimpleInputFormProps {
  params: SimpleSimulationParams;
  errors: ValidationError[];
  onParamChange: (key: keyof SimpleSimulationParams, value: number) => void;
}

function FieldError({ errors, field }: { errors: ValidationError[]; field: string }) {
  const error = errors.find(e => e.field === field);
  if (!error) return null;
  return (
    <div className="flex items-center gap-1 text-destructive text-xs mt-1">
      <AlertCircle className="h-3 w-3" />
      <span>{error.message}</span>
    </div>
  );
}

export function SimpleInputForm({ params, errors, onParamChange }: SimpleInputFormProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Simulation Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* NFT Supply */}
        <div className="space-y-1.5">
          <Label htmlFor="nftSupply" className="text-sm font-medium">
            NFT Supply
          </Label>
          <Input
            id="nftSupply"
            type="number"
            value={params.nftSupply}
            onChange={(e) => onParamChange('nftSupply', parseInt(e.target.value) || 0)}
            className="font-mono"
            placeholder="8888"
          />
          <FieldError errors={errors} field="nftSupply" />
        </div>

        {/* FDV Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fdvMinM" className="text-sm font-medium">
              FDV Min (M)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="fdvMinM"
                type="number"
                value={params.fdvMinM}
                onChange={(e) => onParamChange('fdvMinM', parseFloat(e.target.value) || 0)}
                className="pl-7 font-mono"
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">M</span>
            </div>
            <p className="text-xs text-muted-foreground">= ${(params.fdvMinM * 1_000_000).toLocaleString()}</p>
            <FieldError errors={errors} field="fdvMinM" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fdvMaxM" className="text-sm font-medium">
              FDV Max (M)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="fdvMaxM"
                type="number"
                value={params.fdvMaxM}
                onChange={(e) => onParamChange('fdvMaxM', parseFloat(e.target.value) || 0)}
                className="pl-7 font-mono"
                placeholder="200"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">M</span>
            </div>
            <p className="text-xs text-muted-foreground">= ${(params.fdvMaxM * 1_000_000).toLocaleString()}</p>
            <FieldError errors={errors} field="fdvMaxM" />
          </div>
        </div>

        {/* Drop% Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dropMinPct" className="text-sm font-medium">
              Drop% Min
            </Label>
            <div className="relative">
              <Input
                id="dropMinPct"
                type="number"
                step="0.1"
                value={params.dropMinPct}
                onChange={(e) => onParamChange('dropMinPct', parseFloat(e.target.value) || 0)}
                className="pr-8 font-mono"
                placeholder="5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <FieldError errors={errors} field="dropMinPct" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dropMaxPct" className="text-sm font-medium">
              Drop% Max
            </Label>
            <div className="relative">
              <Input
                id="dropMaxPct"
                type="number"
                step="0.1"
                value={params.dropMaxPct}
                onChange={(e) => onParamChange('dropMaxPct', parseFloat(e.target.value) || 0)}
                className="pr-8 font-mono"
                placeholder="50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <FieldError errors={errors} field="dropMaxPct" />
          </div>
        </div>
        
        {/* Drop% Distribution Info */}
        <p className="text-xs text-muted-foreground px-1">
          Probabilities shaped within your range: bottom ~33% has rising likelihood, middle ~33% peaks then declines, top ~33% is increasingly rare.
        </p>

        {/* Simulations */}
        <div className="space-y-1.5">
          <Label htmlFor="numSimulations" className="text-sm font-medium">
            Number of Simulations
          </Label>
          <Input
            id="numSimulations"
            type="number"
            step="10000"
            value={params.numSimulations}
            onChange={(e) => onParamChange('numSimulations', parseInt(e.target.value) || 0)}
            className="font-mono"
            placeholder="200000"
          />
          <p className="text-xs text-muted-foreground">
            {params.numSimulations.toLocaleString()} simulations
          </p>
          <FieldError errors={errors} field="numSimulations" />
        </div>
      </CardContent>
    </Card>
  );
}