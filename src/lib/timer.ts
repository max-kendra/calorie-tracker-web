/** Timers are stored in seconds (backend + Android), but picked in
 * minutes. */

const PICKER_MINUTES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120, 150, 180,
];

export function formatTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0) parts.push(`${seconds} s`);
  return parts.length > 0 ? parts.join(" ") : "0 s";
}

export interface TimerOption {
  seconds: number;
  label: string;
}

/** Preset picker options, plus the current value if it isn't one of them
 * (e.g. an older step saved as 150s), so opening a step never silently
 * rounds its timer. */
export function timerOptions(current: number | null): TimerOption[] {
  const options = PICKER_MINUTES.map((m) => ({ seconds: m * 60, label: formatTimer(m * 60) }));
  if (current != null && current > 0 && !options.some((o) => o.seconds === current)) {
    options.push({ seconds: current, label: formatTimer(current) });
    options.sort((a, b) => a.seconds - b.seconds);
  }
  return options;
}
