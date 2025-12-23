import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ParameterInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  parse?: (value: string) => number;
  showSlider?: boolean;
  unit?: string;
  description?: string;
}

export function ParameterInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => v.toString(),
  parse = (v) => parseFloat(v) || 0,
  showSlider = true,
  unit,
  description
}: ParameterInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parse(e.target.value);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          {label}
          {unit && <span className="ml-1 text-muted-foreground">({unit})</span>}
        </Label>
        <Input
          type="text"
          value={format(value)}
          onChange={handleInputChange}
          className="w-28 h-8 text-right font-mono text-sm"
        />
      </div>
      {showSlider && (
        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="py-1"
        />
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
