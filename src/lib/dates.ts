/** ISO "YYYY-MM-DD", using LOCAL date parts (not toISOString, which is
 * UTC and can roll over to the wrong day depending on timezone offset
 * - the same class of bug the backend's own logged_at -> local date
 * resolution exists to avoid, see Log.date's own doc comment on the
 * backend). */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Monday-Sunday, matching the week boundary the Android app's own
 * weekly summary screen uses. Returns the Monday for whatever week
 * `date` falls in. */
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** The 7 dates (Mon-Sun) for whichever week `date` falls in, as ISO
 * strings. */
export function weekDates(date: Date): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(monday, i)));
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayLabel(iso: string): string {
  const date = fromIsoDate(iso);
  const day = date.getDay();
  return WEEKDAY_LABELS[day === 0 ? 6 : day - 1];
}

export function shortDateLabel(iso: string): string {
  const date = fromIsoDate(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isToday(iso: string): boolean {
  return iso === toIsoDate(new Date());
}

/** ISO 8601 week number (weeks start Monday, week 1 is the week
 * containing the year's first Thursday - the standard definition, same
 * one most calendar apps use). Takes any date within the week -
 * standard algorithm: shift to that week's Thursday (so the week
 * number is always attributed to the ISO year the Thursday falls in,
 * correctly handling the first/last week of a year straddling
 * Dec/Jan), then count weeks from that year's own week 1. */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday (0) -> 7, so Monday=1..Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}