import { darkenColor } from "@/lib/colors";

interface MacroBarProps {
  label: string;
  eaten: number;
  goal: number;
  color: string;
  unit?: string;
  compact?: boolean;
}

export function MacroBar({ label, eaten, goal, color, unit = "g", compact = false }: MacroBarProps) {
  const fraction = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = eaten - goal;
  const overflowFraction = goal > 0 && over > 0 ? Math.min(over / goal, 1) : 0;
  const barHeight = compact ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      <div className={`flex items-baseline justify-between ${compact ? "text-xs" : "text-sm"}`}>
        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {eaten}
          {unit} / {goal}
          {unit}
        </span>
      </div>
      <div
        className={`relative w-full ${barHeight} rounded-full mt-1 overflow-hidden`}
        style={{ backgroundColor: `${color}38` }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${fraction * 100}%`, backgroundColor: color }}
        />
        {overflowFraction > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${overflowFraction * 100}%`, backgroundColor: darkenColor(color) }}
          />
        )}
      </div>
      {!compact && over > 0 && (
        <div className="text-xs mt-0.5" style={{ color }}>
          +{over}
          {unit} over
        </div>
      )}
    </div>
  );
}