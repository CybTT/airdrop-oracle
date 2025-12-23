import { Button } from "@/components/ui/button";
import { PRESETS } from "@/lib/monte-carlo";

interface PresetButtonsProps {
  activePreset: string | null;
  onSelectPreset: (presetKey: string) => void;
}

export function PresetButtons({ activePreset, onSelectPreset }: PresetButtonsProps) {
  return (
    <div className="flex gap-2">
      {Object.entries(PRESETS).map(([key, preset]) => (
        <Button
          key={key}
          variant={activePreset === key ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectPreset(key)}
          className="flex-1"
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}
