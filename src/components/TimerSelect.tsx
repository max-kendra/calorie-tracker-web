import { timerOptions } from "@/lib/timer";

interface TimerSelectProps {
  /** Seconds, or null for no timer. */
  value: number | null;
  onChange: (seconds: number | null) => void;
  className?: string;
}

export function TimerSelect({ value, onChange, className = "" }: TimerSelectProps) {
  const options = timerOptions(value);
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      aria-label="Timer"
      className={`border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-sm ${className}`}
    >
      <option value="">No timer</option>
      {options.map((o) => (
        <option key={o.seconds} value={o.seconds}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
