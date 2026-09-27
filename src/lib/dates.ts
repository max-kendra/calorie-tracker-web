import { getFirstDayOfWeek } from "./locale";

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

/** Start of the week containing `date`, respecting the viewer's own
 * locale (see lib/locale.ts) instead of assuming Monday universally. */
export function startOfWeek(date: Date): Date {
  const firstDay = getFirstDayOfWeek();
  const day = date.getDay();
  const diff = (day - firstDay + 7) % 7;
  const result = new Date(date);
  result.setDate(date.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** The 7 dates for whichever week `date` falls in (locale-ordered
 * start day, see startOfWeek), as ISO strings. */
export function weekDates(date: Date): string[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(start, i)));
}

/** Locale-aware weekday abbreviation (e.g. "Mon", or whatever the
 * equivalent is in the viewer's own language) - previously a hardcoded
 * English-only array indexed by getDay(). */
export function weekdayLabel(iso: string): string {
  const date = fromIsoDate(iso);
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

export function shortDateLabel(iso: string): string {
  const date = fromIsoDate(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isToday(iso: string): boolean {
  return iso === toIsoDate(new Date());
}

/** ISO 8601 week number (weeks start Monday, week 1 is the week
 * containing the year's first Thursday - the standard, most widely
 * recognized "week number" definition, kept fixed regardless of the
 * viewer's own first-day-of-week preference above - that preference
 * affects which days GROUP into a week for display, not which
 * numbering scheme labels the resulting weeks). */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

/** "Sep 14 - Sep 20" (or "Sep 14 - 20" where the engine supports
 * formatRange, which intelligently collapses shared month/year parts)
 * - locale-formatted, not the raw ISO strings this used to show. Falls
 * back to two separately-formatted dates joined with a dash on engines
 * without formatRange support. */
export function formatWeekRangeLabel(startIso: string, endIso: string): string {
  const start = fromIsoDate(startIso);
  const end = fromIsoDate(endIso);
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const withRange = formatter as Intl.DateTimeFormat & { formatRange?: (a: Date, b: Date) => string };
  if (typeof withRange.formatRange === "function") {
    return withRange.formatRange(start, end);
  }
  return `${formatter.format(start)} \u2013 ${formatter.format(end)}`;
}
