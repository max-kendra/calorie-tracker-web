import type { WeightHistoryEntry } from "@/api/types";
import { parseDecimal } from "@/lib/format";

interface WeightChartProps {
  entries: WeightHistoryEntry[];
}

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = 24;

/** Plain hand-rolled SVG line chart - a single line over time doesn't
 * need a charting library, just points scaled into the viewBox and a
 * <polyline>. */
export function WeightChart({ entries }: WeightChartProps) {
  if (entries.length === 0) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No synced weight readings yet</div>;
  }

  const points = entries.map((e) => ({
    time: new Date(e.recorded_at).getTime(),
    kg: parseDecimal(e.weight_kg),
  }));

  const minTime = Math.min(...points.map((p) => p.time));
  const maxTime = Math.max(...points.map((p) => p.time));
  const minKg = Math.min(...points.map((p) => p.kg));
  const maxKg = Math.max(...points.map((p) => p.kg));
  const timeRange = maxTime - minTime || 1;
  // A little vertical breathing room so the line never touches the
  // very top/bottom edge, even when every reading is nearly identical.
  const kgRange = maxKg - minKg || 1;
  const kgPad = kgRange * 0.1;

  function x(time: number) {
    return PADDING + ((time - minTime) / timeRange) * (WIDTH - PADDING * 2);
  }
  function y(kg: number) {
    return HEIGHT - PADDING - ((kg - (minKg - kgPad)) / (kgRange + kgPad * 2)) * (HEIGHT - PADDING * 2);
  }

  const polylinePoints = points.map((p) => `${x(p.time)},${y(p.kg)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#7EC8E3"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.time)} cy={y(p.kg)} r={2.5} fill="#7EC8E3" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
        <span>{new Date(minTime).toLocaleDateString()}</span>
        <span>
          {minKg.toFixed(1)}-{maxKg.toFixed(1)} kg
        </span>
        <span>{new Date(maxTime).toLocaleDateString()}</span>
      </div>
    </div>
  );
}