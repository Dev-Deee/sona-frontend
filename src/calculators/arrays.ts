import { speedOrFail } from './acoustics'
import {
  type CalcResult,
  fail,
  firstError,
  isNum,
  ok,
  requireNonNegative,
  requireNumber,
  requirePositive,
} from './types'

const DEG = Math.PI / 180

export interface CombFilter {
  pathDifference: number
  timeOffsetMs: number
  /** First cancellation: c / (2·Δ). */
  firstNotchHz: number
  /** Spacing between successive notches: c / Δ. */
  notchSpacingHz: number
  /** Half-wavelength at the first notch (equal to the path difference). */
  halfWavelength: number
}

export function combFilter(
  directM: number | null | undefined,
  reflectedM: number | null | undefined,
  temperatureC: number | null | undefined,
): CalcResult<CombFilter> {
  const err = firstError(
    requirePositive(directM, 'direct path'),
    requirePositive(reflectedM, 'reflected path'),
  )
  if (err) return fail(err)
  const delta = Math.abs((reflectedM as number) - (directM as number))
  if (delta === 0) return fail('Paths are equal — no comb filtering')
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  const firstNotchHz = s.c / (2 * delta)
  return ok(
    {
      pathDifference: delta,
      timeOffsetMs: (delta / s.c) * 1000,
      firstNotchHz,
      notchSpacingHz: s.c / delta,
      halfWavelength: s.c / firstNotchHz / 2,
    },
    s.warnings,
  )
}

export interface ConstantCurvature {
  arcLength: number
  /** Angle between the top and bottom box axes: (N − 1)·splay. */
  includedAngle: number
  /** Approximate vertical coverage: N·splay. */
  verticalCoverage: number
  /** Radius of the arc formed by the box fronts (Infinity for a straight array → null). */
  radius: number | null
  topAimAngle: number | null
  bottomAimAngle: number | null
  /** Horizontal distance where each box axis meets ear level; null when aimed at/above horizon. */
  topThrow: number | null
  bottomThrow: number | null
}

export function constantCurvature(input: {
  boxes: number | null | undefined
  splayDeg: number | null | undefined
  boxHeightM: number | null | undefined
  trimHeightM?: number | null
  topTiltDeg?: number | null
}): CalcResult<ConstantCurvature> {
  const err = firstError(
    requirePositive(input.boxes, 'number of boxes'),
    requireNonNegative(input.splayDeg, 'splay angle'),
    requirePositive(input.boxHeightM, 'box height'),
  )
  if (err) return fail(err)
  const n = input.boxes as number
  if (!Number.isInteger(n)) return fail('Number of boxes must be a whole number')
  const splay = input.splayDeg as number
  const h = input.boxHeightM as number
  const includedAngle = (n - 1) * splay
  const radius = splay > 0 ? h / (2 * Math.sin((splay / 2) * DEG)) : null

  let topAimAngle: number | null = null
  let bottomAimAngle: number | null = null
  let topThrow: number | null = null
  let bottomThrow: number | null = null
  const warnings: string[] = []
  if (isNum(input.trimHeightM) && isNum(input.topTiltDeg)) {
    const trim = input.trimHeightM
    topAimAngle = input.topTiltDeg
    bottomAimAngle = topAimAngle + includedAngle
    const throwAt = (angle: number) =>
      angle > 0 && angle < 90 ? trim / Math.tan(angle * DEG) : null
    topThrow = throwAt(topAimAngle)
    bottomThrow = throwAt(bottomAimAngle)
    if (topThrow === null) warnings.push('Top box is aimed at or above the horizon')
  }
  return ok(
    {
      arcLength: n * h,
      includedAngle,
      verticalCoverage: n * splay,
      radius,
      topAimAngle,
      bottomAimAngle,
      topThrow,
      bottomThrow,
    },
    warnings,
  )
}

/** f_beam = c / box height */
export function beamingFrequency(
  boxHeightM: number | null | undefined,
  temperatureC: number | null | undefined,
): CalcResult<number> {
  const err = requirePositive(boxHeightM, 'box height')
  if (err) return fail(err)
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  return ok(s.c / (boxHeightM as number), s.warnings)
}

export type SubArrayMode = 'gradient' | 'endfire'

export interface SubSetting {
  /** 1 = front-most sub. */
  position: number
  delayMs: number
  inverted: boolean
}

/**
 * What to dial in on each sub, front to back.
 * - Gradient (cardioid) pair: the rear sub is delayed and polarity-inverted, so its output
 *   cancels the front sub's sound behind the array.
 * - End-fire: all subs in polarity; each sub is delayed by one step more than the sub behind it,
 *   so the wavefronts line up travelling forward.
 */
export function subArraySettings(mode: SubArrayMode, subs: number, delayMs: number): SubSetting[] {
  return Array.from({ length: subs }, (_, i) => ({
    position: i + 1,
    delayMs: mode === 'gradient' ? i * delayMs : (subs - 1 - i) * delayMs,
    inverted: mode === 'gradient' && i > 0,
  }))
}

export interface GradientArray {
  /** Front level relative to a single sub, dB. */
  frontGainDb: number
  /** Rear level relative to a single sub, dB. */
  rearGainDb: number
  /** How much quieter the rear is than the front (positive = rejection). */
  frontToBackDb: number
  /** Rear level relative to the full coherent sum of all subs (how deep the rear null is). */
  nullDepthDb: number
  /** Delay step that aligns the array: spacing / c. */
  idealDelayMs: number
  settings: SubSetting[]
}

const FLOOR = 1e-6

/**
 * Inline sub array along the front–back axis, subs `spacingM` apart (front face to front face).
 * Gradient arrays are a pair (2 subs); end-fire arrays take 2–8.
 */
export function inlineSubArray(input: {
  subs: number | null | undefined
  spacingM: number | null | undefined
  delayMs: number | null | undefined
  frequencyHz: number | null | undefined
  mode: SubArrayMode
  temperatureC: number | null | undefined
}): CalcResult<GradientArray> {
  const err = firstError(
    requirePositive(input.subs, 'number of subs'),
    requirePositive(input.spacingM, 'sub spacing'),
    requireNonNegative(input.delayMs, 'delay'),
    requirePositive(input.frequencyHz, 'frequency'),
  )
  if (err) return fail(err)
  const n = input.subs as number
  if (!Number.isInteger(n) || n < 2) return fail('Use at least 2 subs (whole number)')
  if (input.mode === 'gradient' && n !== 2)
    return fail('A gradient (cardioid) array is a pair of 2 subs — use End-fire for longer lines')
  if (input.mode === 'endfire' && n > 8)
    return fail('End-fire lines of more than 8 subs are impractical')
  const s = speedOrFail(input.temperatureC)
  if ('error' in s) return fail(s.error)
  const d = input.spacingM as number
  const w = 2 * Math.PI * (input.frequencyHz as number)
  const settings = subArraySettings(input.mode, n, input.delayMs as number)

  const sum = (direction: 1 | -1) => {
    let re = 0
    let im = 0
    settings.forEach((sub, i) => {
      // Toward the front, rear subs travel further; toward the rear, they travel less.
      const t = sub.delayMs / 1000 + (direction * i * d) / s.c
      const polarity = sub.inverted ? -1 : 1
      re += polarity * Math.cos(w * t)
      im -= polarity * Math.sin(w * t)
    })
    return Math.max(Math.hypot(re, im), FLOOR)
  }
  const front = sum(1)
  const rear = sum(-1)
  return ok(
    {
      frontGainDb: 20 * Math.log10(front),
      rearGainDb: 20 * Math.log10(rear),
      frontToBackDb: 20 * Math.log10(front / rear),
      nullDepthDb: 20 * Math.log10(rear / n),
      idealDelayMs: (d / s.c) * 1000,
      settings,
    },
    s.warnings,
  )
}

/** Max spacing to avoid grating lobes: c / (2·f). */
export function maxSubSpacing(
  frequencyHz: number | null | undefined,
  temperatureC: number | null | undefined,
): CalcResult<number> {
  const err = requirePositive(frequencyHz, 'frequency')
  if (err) return fail(err)
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  return ok(s.c / (2 * (frequencyHz as number)), s.warnings)
}

/**
 * Uncoupled spacing (front fills, ceiling speakers): the −6 dB edges of adjacent speakers meet
 * at the listening plane when spacing = 2·h·tan(θ/2).
 */
export function uncoupledSpacing(
  coverageDeg: number | null | undefined,
  heightM: number | null | undefined,
): CalcResult<{ spacing: number; coverageWidth: number }> {
  const err = firstError(
    requireNumber(coverageDeg, 'coverage angle'),
    requirePositive(heightM, 'height'),
  )
  if (err) return fail(err)
  const theta = coverageDeg as number
  if (theta <= 0 || theta >= 180) return fail('Coverage angle must be between 0° and 180°')
  const width = 2 * (heightM as number) * Math.tan((theta / 2) * DEG)
  return ok({ spacing: width, coverageWidth: width })
}
