/**
 * Every calculator returns a CalcResult instead of throwing or leaking NaN/Infinity.
 * `warnings` carry non-fatal notes (e.g. a clamped temperature) the UI should surface.
 */
export type CalcResult<T> =
  { ok: true; value: T; warnings: string[] } | { ok: false; error: string }

export const ok = <T>(value: T, warnings: string[] = []): CalcResult<T> => ({
  ok: true,
  value,
  warnings,
})

export const fail = <T = never>(error: string): CalcResult<T> => ({ ok: false, error })

export const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/** Validation helpers return an error message, or null when the value is acceptable. */
export function requirePositive(value: number | null | undefined, label: string): string | null {
  if (!isNum(value)) return `Enter a value for ${label}`
  if (value <= 0) return `${label} must be greater than 0`
  return null
}

export function requireNonNegative(value: number | null | undefined, label: string): string | null {
  if (!isNum(value)) return `Enter a value for ${label}`
  if (value < 0) return `${label} cannot be negative`
  return null
}

export function requireNumber(value: number | null | undefined, label: string): string | null {
  return isNum(value) ? null : `Enter a value for ${label}`
}

/** First non-null error among the checks. */
export function firstError(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null
}
