/**
 * Display formatting. These never return "NaN", "Infinity" or "undefined": non-finite input
 * renders as an em dash so a bad intermediate value can never leak into the UI.
 */
export const PRECISION = {
  distance: 3,
  wavelength: 3,
  dB: 2,
  hz: 0,
  ms: 3,
  samples: 2,
  percent: 2,
  ratio: 3,
  speed: 2,
  generic: 2,
} as const

export const INVALID = '—'

const formatters = new Map<number, Intl.NumberFormat>()

function formatter(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    formatters.set(decimals, f)
  }
  return f
}

export function formatNumber(value: number | null | undefined, decimals: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return INVALID
  const text = formatter(decimals).format(value)
  // Avoid "-0.00" for values that round to zero.
  return /^-0(\.0+)?$/.test(text) ? text.slice(1) : text
}

export const fmtDistance = (v: number | null | undefined) => formatNumber(v, PRECISION.distance)
export const fmtDb = (v: number | null | undefined) => formatNumber(v, PRECISION.dB)
export const fmtHz = (v: number | null | undefined) => formatNumber(v, PRECISION.hz)
export const fmtMs = (v: number | null | undefined) => formatNumber(v, PRECISION.ms)

/** Signed dB, e.g. "+3.01" / "-6.02". */
export function fmtDbSigned(v: number | null | undefined): string {
  const text = fmtDb(v)
  if (text === INVALID || text.startsWith('-') || Number(v) === 0) return text
  return `+${text}`
}

/**
 * Value for an editable input: rounds to at most `maxDecimals` and drops trailing zeros, so a
 * metric→imperial toggle shows "32.808" rather than "32.80839895013123".
 */
export function formatInputValue(value: number | null | undefined, maxDecimals = 3): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  const rounded = Number(value.toFixed(maxDecimals))
  return Object.is(rounded, -0) ? '0' : String(rounded)
}
