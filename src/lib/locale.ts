const OVERRIDE_KEY = "meal-tracker-first-day-override";

/** null means "no override, use the locale-derived default below". */
export function getFirstDayOfWeekOverride(): number | null {
  const stored = localStorage.getItem(OVERRIDE_KEY);
  if (stored === null) return null;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setFirstDayOfWeekOverride(day: number | null): void {
  if (day === null) {
    localStorage.removeItem(OVERRIDE_KEY);
  } else {
    localStorage.setItem(OVERRIDE_KEY, String(day));
  }
}

/** An explicit override (set in Settings) always wins over the
 * locale-derived guess below - device-local, same as the dark mode
 * toggle, not synced to the backend, matching how Android keeps its
 * own Health Connect preferences per-device rather than account-wide. */
export function getFirstDayOfWeek(): number {
  const override = getFirstDayOfWeekOverride();
  if (override !== null) return override;

  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    };
    const weekInfo = locale.weekInfo ?? locale.getWeekInfo?.();
    if (weekInfo?.firstDay) {
      return weekInfo.firstDay % 7;
    }
  } catch {
    // Intl.Locale or weekInfo not supported here - fall through to the default.
  }
  return 1;
}