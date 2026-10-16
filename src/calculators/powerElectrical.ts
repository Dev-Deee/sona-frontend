import {
  type CalcResult,
  fail,
  firstError,
  isNum,
  ok,
  requireNumber,
  requirePositive,
} from './types'

/** SPL = sensitivity + 10·log₁₀(P) − 20·log₁₀(d) */
export function ampPowerToSpl(
  powerW: number | null | undefined,
  sensitivity: number | null | undefined,
  distanceM: number | null | undefined,
): CalcResult<number> {
  const err = firstError(
    requirePositive(powerW, 'amplifier power'),
    requireNumber(sensitivity, 'sensitivity'),
    requirePositive(distanceM, 'distance'),
  )
  if (err) return fail(err)
  return ok(
    (sensitivity as number) +
      10 * Math.log10(powerW as number) -
      20 * Math.log10(distanceM as number),
  )
}

/** Inverse: P = 10^((SPL − sensitivity + 20·log₁₀(d)) / 10) */
export function splToAmpPower(
  targetSpl: number | null | undefined,
  sensitivity: number | null | undefined,
  distanceM: number | null | undefined,
): CalcResult<number> {
  const err = firstError(
    requireNumber(targetSpl, 'target SPL'),
    requireNumber(sensitivity, 'sensitivity'),
    requirePositive(distanceM, 'distance'),
  )
  if (err) return fail(err)
  const exponent =
    ((targetSpl as number) - (sensitivity as number) + 20 * Math.log10(distanceM as number)) / 10
  const power = 10 ** exponent
  if (!Number.isFinite(power)) return fail('Required power is too large to display')
  return ok(power)
}

export const CONTINUOUS_LOAD_FACTOR = 0.8

export interface CircuitLoad {
  totalWatts: number
  totalAmps: number
  /** Usable current per circuit under the 80% continuous-load rule. */
  usableAmpsPerCircuit: number
  circuitsRequired: number
  /** Share of the provisioned circuits' usable capacity in use. */
  utilisationPercent: number
  recommendation: string
}

/** Treats draws as resistive (PF = 1); real amplifiers may draw more current at peaks. */
export function circuitLoad(
  drawsW: (number | null | undefined)[],
  voltage: number | null | undefined,
  breakerAmps: number | null | undefined,
): CalcResult<CircuitLoad> {
  const err = firstError(
    requirePositive(voltage, 'mains voltage'),
    requirePositive(breakerAmps, 'breaker size'),
  )
  if (err) return fail(err)
  const draws = drawsW.filter(isNum)
  if (draws.some((d) => d < 0)) return fail('Power draws cannot be negative')
  const totalWatts = draws.reduce((a, b) => a + b, 0)
  const totalAmps = totalWatts / (voltage as number)
  const usable = (breakerAmps as number) * CONTINUOUS_LOAD_FACTOR
  const circuitsRequired = totalAmps === 0 ? 0 : Math.ceil(totalAmps / usable - 1e-9)
  const utilisationPercent =
    circuitsRequired === 0 ? 0 : (totalAmps / (circuitsRequired * usable)) * 100
  const recommendation =
    circuitsRequired === 0
      ? 'Add the power draw of each amplifier.'
      : utilisationPercent > 90
        ? `Provide ${circuitsRequired + 1} circuits — ${circuitsRequired} would run at ${utilisationPercent.toFixed(0)}% of their 80% rating with no spare headroom.`
        : `${circuitsRequired} × ${breakerAmps} A circuit${circuitsRequired > 1 ? 's' : ''} at ${utilisationPercent.toFixed(0)}% of the 80% continuous rating.`
  return ok({
    totalWatts,
    totalAmps,
    usableAmpsPerCircuit: usable,
    circuitsRequired,
    utilisationPercent,
    recommendation,
  })
}

export const CONSTANT_VOLTAGE_HEADROOM = 1.25

/** 70 V / 100 V line: Z = V² / P, amp = total × 1.25. */
export function constantVoltageLine(
  tapsW: (number | null | undefined)[],
  lineVoltage: number | null | undefined,
): CalcResult<{ totalWatts: number; impedance: number; ampWatts: number; speakers: number }> {
  const err = requirePositive(lineVoltage, 'line voltage')
  if (err) return fail(err)
  const taps = tapsW.filter(isNum)
  if (taps.length === 0) return fail('Add at least one speaker tap')
  if (taps.some((t) => t <= 0)) return fail('Tap wattages must be greater than 0')
  const totalWatts = taps.reduce((a, b) => a + b, 0)
  const v = lineVoltage as number
  return ok({
    totalWatts,
    impedance: (v * v) / totalWatts,
    ampWatts: totalWatts * CONSTANT_VOLTAGE_HEADROOM,
    speakers: taps.length,
  })
}

export type WiringMode = 'series' | 'parallel' | 'series-parallel'

export interface AmpCompatibility {
  ratedMinimum: number
  compatible: boolean
}

export const STANDARD_AMP_LOADS = [4, 8, 16] as const

/**
 * Series: ΣZ. Parallel: 1/Σ(1/Z). Series-parallel: consecutive groups of `perString` speakers
 * in series, with the strings in parallel.
 */
export function totalImpedance(
  impedances: (number | null | undefined)[],
  mode: WiringMode,
  perString = 2,
): CalcResult<{ total: number; compatibility: AmpCompatibility[] }> {
  const z = impedances.filter(isNum)
  if (z.length === 0) return fail('Add at least one speaker impedance')
  if (z.some((v) => v <= 0)) return fail('Impedances must be greater than 0 Ω')
  const series = (vals: number[]) => vals.reduce((a, b) => a + b, 0)
  const parallel = (vals: number[]) => 1 / vals.reduce((a, b) => a + 1 / b, 0)
  let total: number
  if (mode === 'series') total = series(z)
  else if (mode === 'parallel') total = parallel(z)
  else {
    if (!Number.isInteger(perString) || perString < 1)
      return fail('Speakers per string must be a whole number')
    if (z.length % perString !== 0)
      return fail(`${z.length} speakers cannot be split evenly into strings of ${perString}`)
    const strings: number[] = []
    for (let i = 0; i < z.length; i += perString) strings.push(series(z.slice(i, i + perString)))
    total = parallel(strings)
  }
  return ok({
    total,
    compatibility: STANDARD_AMP_LOADS.map((ratedMinimum) => ({
      ratedMinimum,
      compatible: total >= ratedMinimum - 1e-9,
    })),
  })
}

export type NoiseStandard = 'WHO' | 'OSHA' | 'NIOSH' | 'UK HSE'

export interface NoiseStandardSpec {
  /** Level allowed for the reference duration, dB(A). */
  limitDb: number
  referenceHours: number
  /** dB increase that halves the allowed time. */
  exchangeRateDb: number
  note: string
}

export const NOISE_STANDARDS: Record<NoiseStandard, NoiseStandardSpec> = {
  WHO: { limitDb: 80, referenceHours: 40, exchangeRateDb: 3, note: '80 dB for 40 hours a week' },
  OSHA: {
    limitDb: 90,
    referenceHours: 8,
    exchangeRateDb: 5,
    note: '90 dB for 8 hours (US workplace law)',
  },
  NIOSH: {
    limitDb: 85,
    referenceHours: 8,
    exchangeRateDb: 3,
    note: '85 dB for 8 hours (US recommendation)',
  },
  'UK HSE': {
    limitDb: 85,
    referenceHours: 8,
    exchangeRateDb: 3,
    note: '80 dB lower action level, 85 dB upper action level over 8 hours',
  },
}

export type DoseStatus = 'Safe' | 'Monitor' | 'Near limit' | 'Exceeded'

export function doseStatus(dosePercent: number): DoseStatus {
  if (dosePercent < 50) return 'Safe'
  if (dosePercent < 85) return 'Monitor'
  if (dosePercent <= 100) return 'Near limit'
  return 'Exceeded'
}

export interface NoiseDose {
  standard: NoiseStandard
  allowedHours: number
  dosePercent: number
  status: DoseStatus
  /** Hours left before reaching 100% (0 when already over). */
  remainingHours: number
  /** dB reduction needed to bring the dose to 100% (0 when within). */
  reductionDb: number
  /** At or below the standard's reference level and within the dose. */
  noRisk: boolean
}

export const PAIN_THRESHOLD_DB = 140

/** T_allowed = T_ref / 2^((L − L_ref) / exchange rate); dose = T_actual / T_allowed. */
export function noiseDose(
  levelDb: number | null | undefined,
  durationMinutes: number | null | undefined,
  standard: NoiseStandard,
): CalcResult<NoiseDose> {
  const err = firstError(
    requireNumber(levelDb, 'average level'),
    requirePositive(durationMinutes, 'exposure time'),
  )
  if (err) return fail(err)
  const spec = NOISE_STANDARDS[standard]
  const level = levelDb as number
  const hours = (durationMinutes as number) / 60
  const allowedHours = spec.referenceHours / 2 ** ((level - spec.limitDb) / spec.exchangeRateDb)
  const dosePercent = (hours / allowedHours) * 100
  const warnings = level > PAIN_THRESHOLD_DB ? ['Immediate danger — pain threshold exceeded'] : []
  return ok(
    {
      standard,
      allowedHours,
      dosePercent,
      status: doseStatus(dosePercent),
      remainingHours: Math.max(0, allowedHours - hours),
      reductionDb: dosePercent > 100 ? spec.exchangeRateDb * Math.log2(dosePercent / 100) : 0,
      noRisk: level <= spec.limitDb && dosePercent <= 100,
    },
    warnings,
  )
}

/** "2 h 15 min", "45 min", "> 1,000 h". */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours > 1000) return '> 1,000 h'
  const totalMinutes = Math.round(hours * 60)
  if (totalMinutes < 1) return '< 1 min'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`
}
