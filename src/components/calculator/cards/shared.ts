import { formatNumber } from '../../../calculators/format'
import { toDisplay, unitLabel, type UnitSystem } from '../../../calculators/units'
import { useSettings } from '../../../store/settingsStore'
import type { Tone } from '../outputs'

/** Shared ambient temperature plus its display string for summaries. */
export function useTemperature() {
  const temperatureC = useSettings((s) => s.temperatureC)
  const system = useSettings((s) => s.unitSystem)
  return { temperatureC, temperatureText: tempText(temperatureC, system) }
}

export function tempText(c: number | null, system: UnitSystem): string {
  if (c === null) return '—'
  return `${formatNumber(toDisplay('temperature', c, system), 1)} ${unitLabel('temperature', system)}`
}

/** Text for a nullable input in history/share summaries. */
export const v = (value: number | null | undefined, unit = '', decimals = 3) =>
  value === null || value === undefined
    ? '—'
    : `${Number(value.toFixed(decimals))}${unit ? ` ${unit}` : ''}`

export const RATING_TONES: Record<string, Tone> = {
  Excellent: 'good',
  Good: 'ok',
  Moderate: 'warn',
  Fair: 'warn',
  Marginal: 'warn',
  Poor: 'bad',
  'Very Poor': 'bad',
  Bad: 'bad',
  'No link': 'bad',
  Safe: 'good',
  Overpowered: 'bad',
}

/** Unit-aware summary formatter: q('distance', 12) → "39.37 ft" in imperial. */
export function useQ() {
  const system = useSettings((s) => s.unitSystem)
  return (
    kind: 'distance' | 'volume' | 'area' | 'weight',
    si: number | null | undefined,
    decimals = 2,
  ) =>
    si === null || si === undefined
      ? '—'
      : `${formatNumber(toDisplay(kind, si, system), decimals)} ${unitLabel(kind, system)}`
}
