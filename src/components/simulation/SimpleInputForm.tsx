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

        {/* Drop% Info - Fixed Distribution */}
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-sm font-medium text-foreground mb-1">Drop% Distribution</p>
          <p className="text-xs text-muted-foreground">
            Fixed at 5%–50% using a realistic launch behavior model. Most airdrops cluster around conservative values (5-10%), with larger drops increasingly rare.
          </p>
        </div>

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