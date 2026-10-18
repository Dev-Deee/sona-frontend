import { type CalcResult, fail, firstError, ok, requireNumber, requirePositive } from './types'
import { ABSOLUTE_ZERO_C } from './units'

export const STANDARD_SAMPLE_RATES = [44100, 48000, 88200, 96000] as const

export interface SpeedOfSound {
  /** Temperature actually used (after clamping), °C. */
  temperatureC: number
  metersPerSecond: number
  feetPerSecond: number
  /** Milliseconds for sound to travel one metre. */
  msPerMeter: number
  msPerFoot: number
}

/**
 * c = 331.3 × √(1 + T/273.15). Temperatures below absolute zero are clamped (with a warning)
 * rather than producing NaN.
 */
export function speedOfSound(temperatureC: number | null | undefined): CalcResult<SpeedOfSound> {
  const err = requireNumber(temperatureC, 'temperature')
  if (err) return fail(err)
  const warnings: string[] = []
  let t = temperatureC as number
  if (t < ABSOLUTE_ZERO_C) {
    warnings.push('Temperature below absolute zero (−273.15 °C) — clamped')
    t = ABSOLUTE_ZERO_C
  }
  const c = 331.3 * Math.sqrt(1 + t / 273.15)
  if (!(c > 0)) return fail('Speed of sound is zero at absolute zero')
  return ok(
    {
      temperatureC: t,
      metersPerSecond: c,
      feetPerSecond: c * 3.28084,
      msPerMeter: 1000 / c,
      msPerFoot: 1000 / (c * 3.28084),
    },
    warnings,
  )
}

/** Speed of sound in m/s for internal use, or an error result. */
export function speedOrFail(
  temperatureC: number | null | undefined,
): { c: number; warnings: string[] } | { error: string } {
  const r = speedOfSound(temperatureC)
  return r.ok ? { c: r.value.metersPerSecond, warnings: r.warnings } : { error: r.error }
}

export interface Wavelength {
  speed: number
  wavelength: number
  halfWavelength: number
  quarterWavelength: number
  periodMs: number
  samples: { sampleRate: number; samples: number }[]
}

export function frequencyToWavelength(
  frequencyHz: number | null | undefined,
  temperatureC: number | null | undefined,
): CalcResult<Wavelength> {
  const err = requirePositive(frequencyHz, 'frequency')
  if (err) return fail(err)
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  const f = frequencyHz as number
  const wavelength = s.c / f
  const periodMs = 1000 / f
  return ok(
    {
      speed: s.c,
      wavelength,
      halfWavelength: wavelength / 2,
      quarterWavelength: wavelength / 4,
      periodMs,
      samples: STANDARD_SAMPLE_RATES.map((sampleRate) => ({
        sampleRate,
        samples: periodMs * (sampleRate / 1000),
      })),
    },
    s.warnings,
  )
}

export type Rt60Method = 'sabine' | 'eyring'

export type IntelligibilityRating = 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Very Poor'

export function rt60Rating(rt60: number): IntelligibilityRating {
  if (rt60 < 1) return 'Excellent'
  if (rt60 < 1.5) return 'Good'
  if (rt60 < 2.5) return 'Moderate'
  if (rt60 < 3.5) return 'Poor'
  return 'Very Poor'
}

export interface Rt60 {
  rt60: number
  rating: IntelligibilityRating
  /** Average absorption coefficient ā (Eyring only). */
  averageAbsorption?: number
}

/**
 * Sabine: RT60 = 0.161·V / A
 * Eyring: RT60 = 0.161·V / (−S·ln(1 − ā)), ā = A / S
 * All inputs SI (m³, m²).
 */
export function rt60(
  volumeM3: number | null | undefined,
  absorptionM2: number | null | undefined,
  method: Rt60Method,
  surfaceAreaM2?: number | null,
): CalcResult<Rt60> {
  const err = firstError(
    requirePositive(volumeM3, 'room volume'),
    requirePositive(absorptionM2, 'absorption area'),
  )
  if (err) return fail(err)
  const V = volumeM3 as number
  const A = absorptionM2 as number
  if (method === 'sabine') {
    const t = (0.161 * V) / A
    return ok({ rt60: t, rating: rt60Rating(t) })
  }
  const sErr = requirePositive(surfaceAreaM2, 'total surface area')
  if (sErr) return fail(sErr)
  const S = surfaceAreaM2 as number
  const a = A / S
  if (a >= 1) return fail('Absorption area must be smaller than total surface area (ā < 1)')
  const t = (0.161 * V) / (-S * Math.log(1 - a))
  return ok({ rt60: t, rating: rt60Rating(t), averageAbsorption: a })
}

/** Dc = 0.057 × √(V / RT60), with V in m³ → Dc in m. */
export function criticalDistance(
  volumeM3: number | null | undefined,
  rt60s: number | null | undefined,
): CalcResult<number> {
  const err = firstError(requirePositive(volumeM3, 'room volume'), requirePositive(rt60s, 'RT60'))
  if (err) return fail(err)
  return ok(0.057 * Math.sqrt((volumeM3 as number) / (rt60s as number)))
}

/**
 * Directivity factor Q from a speaker's nominal coverage (Molloy):
 * Q = 180° / asin(sin(H/2)·sin(V/2)).
 */
export function directivityQ(
  hDeg: number | null | undefined,
  vDeg: number | null | undefined,
): CalcResult<number> {
  const err = firstError(
    requirePositive(hDeg, 'horizontal coverage'),
    requirePositive(vDeg, 'vertical coverage'),
  )
  if (err) return fail(err)
  if ((hDeg as number) > 180 || (vDeg as number) > 180)
    return fail('Coverage angles must be 180° or less')
  const rad = Math.PI / 180
  const a = Math.asin(
    Math.sin(((hDeg as number) * rad) / 2) * Math.sin(((vDeg as number) * rad) / 2),
  )
  return ok(180 / (a / rad))
}

export interface RoomModes {
  length: number[]
  width: number[]
  height: number[]
}

/** First five axial modes per dimension: f = (c/2)·(p/L), p = 1..5. */
export function roomModes(
  lengthM: number | null | undefined,
  widthM: number | null | undefined,
  heightM: number | null | undefined,
  temperatureC: number | null | undefined,
  count = 5,
): CalcResult<RoomModes> {
  const err = firstError(
    requirePositive(lengthM, 'length'),
    requirePositive(widthM, 'width'),
    requirePositive(heightM, 'height'),
  )
  if (err) return fail(err)
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  const modes = (dim: number) =>
    Array.from({ length: count }, (_, i) => (s.c / 2) * ((i + 1) / dim))
  return ok(
    {
      length: modes(lengthM as number),
      width: modes(widthM as number),
      height: modes(heightM as number),
    },
    s.warnings,
  )
}

/** ITDG (ms) = distance / c × 1000. */
export function itdg(
  distanceM: number | null | undefined,
  temperatureC: number | null | undefined,
): CalcResult<number> {
  const err = requirePositive(distanceM, 'reflection distance')
  if (err) return fail(err)
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  return ok(((distanceM as number) / s.c) * 1000, s.warnings)
}

export const STANDARD_PRESSURE_PA = 101325

export interface HumidSpeed {
  speed: number
  /** Same formula with 0% humidity, for comparison. */
  drySpeed: number
  /** Mole fraction of water vapour in the air. */
  vapourFraction: number
}

/**
 * Speed of sound in humid air (Cramer-style approximation, ±0.05 m/s for 0–30 °C).
 *   e_sv = exp(1.2378847e-5·K² − 1.9121316e-2·K + 33.93711047 − 6.3431645e3/K)   (Pa, K = °C + 273.15)
 *   f_w  = 1.00070 + 3.46e-8 · p
 *   x_w  = RH/100 · f_w · e_sv / p
 *   c    = 331.45 · √((1 + T/273.15) · (1 + 0.3132 · x_w))
 * The saturation-pressure formula (Davis 1992) takes Kelvin in every term.
 */
export function speedOfSoundHumid(
  temperatureC: number | null | undefined,
  humidityPercent: number | null | undefined,
): CalcResult<HumidSpeed> {
  const err = firstError(
    requireNumber(temperatureC, 'temperature'),
    requireNumber(humidityPercent, 'humidity'),
  )
  if (err) return fail(err)
  const t = temperatureC as number
  const rh = humidityPercent as number
  if (t <= ABSOLUTE_ZERO_C) return fail('Temperature must be above absolute zero (−273.15 °C)')
  if (rh < 0 || rh > 100) return fail('Humidity must be between 0 and 100%')
  const kelvin = t + 273.15
  const saturation = Math.exp(
    1.2378847e-5 * kelvin ** 2 - 1.9121316e-2 * kelvin + 33.93711047 - 6.3431645e3 / kelvin,
  )
  const enhancement = 1.0007 + 3.46e-8 * STANDARD_PRESSURE_PA
  const vapourFraction = ((rh / 100) * enhancement * saturation) / STANDARD_PRESSURE_PA
  const drySpeed = 331.45 * Math.sqrt(1 + t / 273.15)
  return ok({ speed: drySpeed * Math.sqrt(1 + 0.3132 * vapourFraction), drySpeed, vapourFraction })
}
