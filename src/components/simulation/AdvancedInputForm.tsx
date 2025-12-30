import { AdvancedSimulationParams, AdvancedValidationError, CustomRange, generateRangeId, computeTotalWeight, hasValidWeights } from "@/lib/advanced-monte-carlo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, TrendingUp, Percent } from "lucide-react";
import { RangeCard } from "./RangeCard";
import { DistributionPreviewChart } from "./DistributionPreviewChart";
interface AdvancedInputFormProps {
  params: AdvancedSimulationParams;
  errors: AdvancedValidationError[];
  onParamsChange: (params: AdvancedSimulationParams) => void;
}

const MAX_RANGES = 5;

export function AdvancedInputForm({ params, errors, onParamsChange }: AdvancedInputFormProps) {
  const handleNftSupplyChange = (value: string) => {
    onParamsChange({ ...params, nftSupply: parseInt(value) || 0 });
  };
  
  const handleNumSimulationsChange = (value: string) => {
    onParamsChange({ ...params, numSimulations: parseInt(value) || 0 });
  };
  
  const handleAddFdvRange = () => {
    if (params.fdvRanges.length >= MAX_RANGES) return;
    const newRange: CustomRange = {
      id: generateRangeId(),
      min: 50,
      max: 150,
      distributionType: 'uniform',
      weight: 20
    };
    onParamsChange({ ...params, fdvRanges: [...params.fdvRanges, newRange] });
  };
  
  const handleUpdateFdvRange = (index: number, range: CustomRange) => {
    const updated = [...params.fdvRanges];
    updated[index] = range;
    onParamsChange({ ...params, fdvRanges: updated });
  };
  
  const handleRemoveFdvRange = (index: number) => {
    const updated = params.fdvRanges.filter((_, i) => i !== index);
    onParamsChange({ ...params, fdvRanges: updated });
  };
  
  const handleAddDropRange = () => {
    if (params.dropRanges.length >= MAX_RANGES) return;
    const newRange: CustomRange = {
      id: generateRangeId(),
      min: 10,
      max: 30,
      distributionType: 'uniform',
      weight: 20
    };
    onParamsChange({ ...params, dropRanges: [...params.dropRanges, newRange] });
  };
  
  const handleUpdateDropRange = (index: number, range: CustomRange) => {
    const updated = [...params.dropRanges];
    updated[index] = range;
    onParamsChange({ ...params, dropRanges: updated });
  };
  
  const handleRemoveDropRange = (index: number) => {
    const updated = params.dropRanges.filter((_, i) => i !== index);
    onParamsChange({ ...params, dropRanges: updated });
  };
  
  const getFieldError = (field: string) => errors.find(e => e.field === field && !e.rangeId)?.message;
  const getRangeError = (field: string, rangeId: string) => errors.find(e => e.field === field && e.rangeId === rangeId)?.message;
  
  // Compute total weights for display
  const fdvTotalWeight = computeTotalWeight(params.fdvRanges);
  const dropTotalWeight = computeTotalWeight(params.dropRanges);
  const fdvWeightsValid = hasValidWeights(params.fdvRanges);
  const dropWeightsValid = hasValidWeights(params.dropRanges);

  return (
    <div className="space-y-6">
      {/* Global Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Global Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nftSupply" className="text-sm font-medium">NFT Supply</Label>
              <Input
                id="nftSupply"
                type="number"
                value={params.nftSupply}
                onChange={(e) => handleNftSupplyChange(e.target.value)}
                className="font-mono"
                placeholder="8888"
              />
              {getFieldError('nftSupply') && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{getFieldError('nftSupply')}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numSimulations" className="text-sm font-medium">Simulations</Label>
              <Input
                id="numSimulations"
                type="number"
                step="10000"
                value={params.numSimulations}
                onChange={(e) => handleNumSimulationsChange(e.target.value)}
                className="font-mono"
                placeholder="200000"
              />
              {getFieldError('numSimulations') && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{getFieldError('numSimulations')}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side Distribution Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* FDV Distribution Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">FDV Distribution</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFdvRange}
                disabled={params.fdvRanges.length >= MAX_RANGES}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Range
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Define FDV ranges in millions (e.g., 20 = $20M)
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Distribution Preview Chart */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribution Preview</p>
              <DistributionPreviewChart ranges={params.fdvRanges} type="fdv" />
            </div>
            
            {params.fdvRanges.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                Add at least one FDV range to run simulation
              </div>
            ) : (
              params.fdvRanges.map((range, index) => (
                <RangeCard
                  key={range.id}
                  range={range}
                  index={index}
                  type="fdv"
                  onUpdate={(r) => handleUpdateFdvRange(index, r)}
                  onRemove={() => handleRemoveFdvRange(index)}
                  canRemove={params.fdvRanges.length > 1}
                  error={getRangeError('fdvRanges', range.id)}
                />
              ))
            )}
            {getFieldError('fdvRanges') && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{getFieldError('fdvRanges')}</span>
              </div>
            )}
            {!fdvWeightsValid && params.fdvRanges.length > 0 && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>At least one range must have a non-zero weight</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2">
              {params.fdvRanges.length}/{MAX_RANGES} ranges • Total Weight: {fdvTotalWeight.toFixed(1)}% (auto-normalized)
            </p>
          </CardContent>
        </Card>

        {/* Airdrop % Distribution Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Airdrop % Distribution</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddDropRange}
                disabled={params.dropRanges.length >= MAX_RANGES}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Range
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Define airdrop percentage ranges (0-100%)
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Distribution Preview Chart */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribution Preview</p>
              <DistributionPreviewChart ranges={params.dropRanges} type="drop" />
            </div>
            
            {params.dropRanges.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                Add at least one Airdrop % range to run simulation
              </div>
            ) : (
              params.dropRanges.map((range, index) => (
                <RangeCard
                  key={range.id}
                  range={range}
                  index={index}
                  type="drop"
                  onUpdate={(r) => handleUpdateDropRange(index, r)}
                  onRemove={() => handleRemoveDropRange(index)}
                  canRemove={params.dropRanges.length > 1}
                  error={getRangeError('dropRanges', range.id)}
                />
              ))
            )}
            {getFieldError('dropRanges') && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{getFieldError('dropRanges')}</span>
              </div>
            )}
            {!dropWeightsValid && params.dropRanges.length > 0 && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>At least one range must have a non-zero weight</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2">
              {params.dropRanges.length}/{MAX_RANGES} ranges • Total Weight: {dropTotalWeight.toFixed(1)}% (auto-normalized)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
