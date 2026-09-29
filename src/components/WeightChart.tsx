import { useMemo, useState } from "react";
import type { WeightHistoryEntry } from "@/api/types";
import { parseDecimal } from "@/lib/format";

interface WeightChartProps {
  entries: WeightHistoryEntry[];
}

const WIDTH = 640;
const HEIGHT = 260;
// Asymmetric padding - the left side needs room for the Y-axis value
// labels, the bottom needs room for the X-axis date labels, neither
// of which existed in the original bare-bones version of this chart.
const PADDING = { top: 16, right: 16, bottom: 36, left: 48 };
const Y_TICK_COUNT = 4;
const X_TICK_COUNT = 4;

type RangeKey = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "1w", label: "1W", days: 7 },
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 182 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

function niceStep(rawStep: number): number {
  // Rounds a raw tick spacing up to a "nice" round number (1/2/5 x a
  // power of ten) - the same trick most charting libraries use so the
  // Y-axis reads "70, 72.5, 75" rather than "70, 72.3, 74.6".
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

/** Weight-history chart: a time-range filter, hover tooltips per
 * point, and labeled axes with gridlines - all missing from the
 * original bare polyline version (see design discussion). Still a
 * plain hand-rolled SVG, not a charting library - the added
 * interactivity is straightforward enough (a filter, a hover state, a
 * few computed tick positions) not to need one. */
export function WeightChart({ entries }: WeightChartProps) {
  const [range, setRange] = useState<RangeKey>("3m");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filteredPoints = useMemo(() => {
    const sorted = [...entries]
      .map((e) => ({ time: new Date(e.recorded_at).getTime(), kg: parseDecimal(e.weight_kg) }))
      .sort((a, b) => a.time - b.time);

    const selectedRange = RANGE_OPTIONS.find((r) => r.key === range);
    if (!selectedRange?.days) return sorted;
    const cutoff = Date.now() - selectedRange.days * 24 * 60 * 60 * 1000;
    return sorted.filter((p) => p.time >= cutoff);
  }, [entries, range]);

  if (entries.length === 0) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No synced weight readings yet</div>;
  }

  const chartInnerWidth = WIDTH - PADDING.left - PADDING.right;
  const chartInnerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const rangeChips = (
    <div className="flex gap-1 mb-2">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setRange(opt.key)}
          className={`px-2 py-0.5 rounded-full text-xs ${
            range === opt.key
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (filteredPoints.length === 0) {
    return (
      <div>
        {rangeChips}
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No readings in this range</div>
      </div>
    );
  }

  const minTime = filteredPoints[0].time;
  const maxTime = filteredPoints[filteredPoints.length - 1].time;
  const rawMinKg = Math.min(...filteredPoints.map((p) => p.kg));
  const rawMaxKg = Math.max(...filteredPoints.map((p) => p.kg));
  const timeRange = maxTime - minTime || 1;

  // Y-axis ticks: a "nice" step size, then the axis bounds snap
  // outward to whole multiples of it - this is what makes the labels
  // read as round numbers instead of the raw min/max of whatever
  // readings happened to come in.
  const rawKgRange = rawMaxKg - rawMinKg || 1;
  const kgStep = niceStep(rawKgRange / Y_TICK_COUNT);
  const kgAxisMin = Math.floor(rawMinKg / kgStep) * kgStep;
  const kgAxisMax = Math.ceil(rawMaxKg / kgStep) * kgStep;
  const kgAxisRange = kgAxisMax - kgAxisMin || kgStep;

  function x(time: number) {
    return PADDING.left + ((time - minTime) / timeRange) * chartInnerWidth;
  }
  function y(kg: number) {
    return PADDING.top + (1 - (kg - kgAxisMin) / kgAxisRange) * chartInnerHeight;
  }

  const yTicks: number[] = [];
  for (let v = kgAxisMin; v <= kgAxisMax + 1e-9; v += kgStep) yTicks.push(v);

  const xTickCount = Math.min(X_TICK_COUNT, filteredPoints.length);
  const xTicks: number[] = Array.from({ length: xTickCount }, (_, i) =>
    xTickCount === 1 ? minTime : minTime + (timeRange * i) / (xTickCount - 1),
  );

  const polylinePoints = filteredPoints.map((p) => `${x(p.time)},${y(p.kg)}`).join(" ");
  const hovered = hoveredIndex != null ? filteredPoints[hoveredIndex] : null;

  return (
    <div>
      {rangeChips}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto select-none">
        {/* Y-axis gridlines + labels */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="currentColor"
              className="text-gray-100 dark:text-gray-700"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              className="fill-gray-400 dark:fill-gray-500"
            >
              {tick % 1 === 0 ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}
        {/* Y-axis title */}
        <text
          x={12}
          y={HEIGHT / 2}
          textAnchor="middle"
          fontSize={10}
          className="fill-gray-400 dark:fill-gray-500"
          transform={`rotate(-90, 12, ${HEIGHT / 2})`}
        >
          Weight (kg)
        </text>

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={i}
            x={x(tick)}
            y={HEIGHT - PADDING.bottom + 16}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize={10}
            className="fill-gray-400 dark:fill-gray-500"
          >
            {new Date(tick).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        ))}
        {/* X-axis title */}
        <text
          x={PADDING.left + chartInnerWidth / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          fontSize={10}
          className="fill-gray-400 dark:fill-gray-500"
        >
          Date
        </text>

        {/* Hover guideline */}
        {hovered && (
          <line
            x1={x(hovered.time)}
            x2={x(hovered.time)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            stroke="currentColor"
            className="text-gray-300 dark:text-gray-600"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#7EC8E3"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Visible point markers, plus a larger invisible hit target
            per point layered on top - the visible dot alone is too
            small a hover/tap target on its own. */}
        {filteredPoints.map((p, i) => (
          <g key={i}>
            <circle cx={x(p.time)} cy={y(p.kg)} r={hoveredIndex === i ? 4 : 2.5} fill="#7EC8E3" />
            <circle
              cx={x(p.time)}
              cy={y(p.kg)}
              r={10}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex((current) => (current === i ? null : current))}
              style={{ cursor: "pointer" }}
            />
          </g>
        ))}

        {/* Tooltip - an SVG group positioned in chart coordinates, so
            it scales with the viewBox rather than needing separate
            pixel-space math to line up with an HTML overlay. */}
        {hovered && (
          <g transform={`translate(${Math.min(Math.max(x(hovered.time), PADDING.left + 40), WIDTH - PADDING.right - 40)}, ${Math.max(y(hovered.kg) - 34, PADDING.top)})`}>
            <rect x={-38} y={-20} width={76} height={32} rx={4} className="fill-gray-800 dark:fill-gray-100" opacity={0.9} />
            <text x={0} y={-8} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-white dark:fill-gray-900">
              {hovered.kg.toFixed(1)} kg
            </text>
            <text x={0} y={4} textAnchor="middle" fontSize={9} className="fill-gray-200 dark:fill-gray-600">
              {new Date(hovered.time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}