export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  // Round off floating-point noise (0.1 + 0.2 style) before checking
  // for a whole number, not just Number.isInteger on the raw value.
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/** Cleans a raw backend decimal string ("400.0", "30.00") down to its
 * minimal representation ("400", "30") without forcing it to a whole
 * number - a genuine "2.5" stays "2.5" (see design discussion: "only
 * do decimal points if the value isn't zero"). Backend Numeric columns
 * have no scale constraint, so whatever precision a value happened to
 * be stored with comes back exactly as-is; this is for values bound
 * directly into a text input or displayed as text, not values already
 * flowing through parseFloat/parseDecimal into actual number math. */
export function cleanDecimalString(value: string | null | undefined): string {
  if (value == null) return "";
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return formatQuantity(n);
}

export function formatGrams(value: number): string {
  return String(Math.ceil(value));
}

export function parseDecimal(value: string | null | undefined): number {
  if (value == null) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}