export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function formatGrams(value: number): string {
  return String(Math.ceil(value));
}

export function parseDecimal(value: string | null | undefined): number {
  if (value == null) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
