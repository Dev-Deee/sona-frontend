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

export type DbType = 'voltage' | 'power' | 'spl'

const factor = (type: DbType) => (type === 'power' ? 10 : 20)

/** Voltage/SPL: 10^(dB/20); power: 10^(dB/10). */
export function dbToLinear(db: number | null | undefined, type: DbType): CalcResult<number> {
  const err = requireNumber(db, 'dB value')
  if (err) return fail(err)
  const value = 10 ** ((db as number) / factor(type))
  if (!Number.isFinite(value)) return fail('Result is too large to display')
  return ok(value)
}

export function linearToDb(linear: number | null | undefined, type: DbType): CalcResult<number> {
  const err = requirePositive(linear, 'linear ratio')
  if (err) return fail(err)
  return ok(factor(type) * Math.log10(linear as number))
}

/** n identical correlated sources: 20·log₁₀(n); uncorrelated sources sum as 10·log₁₀(n). */
export function signalSummation(
  sources: number | null | undefined,
): CalcResult<{ correlatedDb: number; uncorrelatedDb: number }> {
  const err = requirePositive(sources, 'number of sources')
  if (err) return fail(err)
  const n = sources as number
  if (!Number.isInteger(n) || n > 16)
    return fail('Number of sources must be a whole number from 1 to 16')
  return ok({ correlatedDb: 20 * Math.log10(n), uncorrelatedDb: 10 * Math.log10(n) })
}

export type HeadroomStatus = 'Safe' | 'Marginal' | 'Overpowered'

/**
 * Headroom of the speaker rating over the amplifier power (positive = speaker can take more
 * than the amp delivers). Safe: amp ≤ continuous; Marginal: amp ≤ program; else Overpowered.
 */
export function speakerHeadroom(
  ampW: number | null | undefined,
  continuousW: number | null | undefined,
  programW: number | null | undefined,
): CalcResult<{ vsContinuousDb: number; vsProgramDb: number; status: HeadroomStatus }> {
  const err = firstError(
    requirePositive(ampW, 'amplifier power'),
    requirePositive(continuousW, 'continuous rating'),
    requirePositive(programW, 'program rating'),
  )
  if (err) return fail(err)
  const amp = ampW as number
  const cont = continuousW as number
  const prog = programW as number
  if (prog < cont) return fail('Program rating is normally at least the continuous rating')
  const status: HeadroomStatus = amp <= cont ? 'Safe' : amp <= prog ? 'Marginal' : 'Overpowered'
  return ok({
    vsContinuousDb: 10 * Math.log10(cont / amp),
    vsProgramDb: 10 * Math.log10(prog / amp),
    status,
  })
}

export const CONSOLE_CLIP_DBU = 24
/** 0 dBV = +2.218 dBu */
export const DBV_TO_DBU = 20 * Math.log10(1 / 0.7746)

export type StageHealth = 'ok' | 'warning' | 'clip'

export interface GainStage {
  name: string
  inDbu: number
  outDbu: number
  /** dB below this stage's clip point. */
  headroomDb: number
  clipDbu: number
  health: StageHealth
}

export interface GainStructureInput {
  sourceLevel: number | null | undefined
  sourceUnit: 'dBu' | 'dBV'
  preampGain: number | null | undefined
  processingLoss: number | null | undefined
  faderLevel: number | null | undefined
  ampSensitivityDbu: number | null | undefined
  ampGainDb: number | null | undefined
  speakerSensitivity: number | null | undefined
  distanceM: number | null | undefined
  /** Speaker impedance, Ω (default 8). */
  impedance?: number | null
}

export interface GainStructure {
  stages: GainStage[]
  ampOutputVolts: number
  ampOutputWatts: number
  splAtListener: number
  ampClipping: boolean
}

export const stageHealth = (headroom: number): StageHealth =>
  headroom <= 0 ? 'clip' : headroom < 6 ? 'warning' : 'ok'

const dbuToVolts = (dbu: number) => 0.7746 * 10 ** (dbu / 20)

/**
 * Cascades a signal through source → preamp → processing → fader → amplifier → speaker.
 * Console stages clip at +24 dBu; the amplifier input clips at its input sensitivity.
 */
export function gainStructure(input: GainStructureInput): CalcResult<GainStructure> {
  const err = firstError(
    requireNumber(input.sourceLevel, 'source level'),
    requireNumber(input.preampGain, 'preamp gain'),
    requireNonNegative(input.processingLoss, 'processing loss'),
    requireNumber(input.faderLevel, 'fader level'),
    requireNumber(input.ampSensitivityDbu, 'amp sensitivity'),
    requireNumber(input.ampGainDb, 'amp gain'),
    requireNumber(input.speakerSensitivity, 'speaker sensitivity'),
    requirePositive(input.distanceM, 'distance'),
  )
  if (err) return fail(err)
  const impedance = isNum(input.impedance) && input.impedance > 0 ? input.impedance : 8
  const source = (input.sourceLevel as number) + (input.sourceUnit === 'dBV' ? DBV_TO_DBU : 0)

  const stages: GainStage[] = []
  const add = (name: string, inDbu: number, outDbu: number, clipDbu: number) => {
    const headroomDb = clipDbu - outDbu
    stages.push({ name, inDbu, outDbu, headroomDb, clipDbu, health: stageHealth(headroomDb) })
    return outDbu
  }
  let level = add('Preamp', source, source + (input.preampGain as number), CONSOLE_CLIP_DBU)
  level = add('Processing', level, level - (input.processingLoss as number), CONSOLE_CLIP_DBU)
  level = add('Fader / console out', level, level + (input.faderLevel as number), CONSOLE_CLIP_DBU)
  const sensitivity = input.ampSensitivityDbu as number
  // Headroom at the amp input is measured against its sensitivity (the input that drives it to full power).
  const ampIn = level
  const ampClipping = ampIn > sensitivity
  const drivenIn = Math.min(ampIn, sensitivity)
  const ampOutDbu = drivenIn + (input.ampGainDb as number)
  stages.push({
    name: 'Amplifier input',
    inDbu: ampIn,
    outDbu: ampOutDbu,
    headroomDb: sensitivity - ampIn,
    clipDbu: sensitivity,
    health: stageHealth(sensitivity - ampIn),
  })
  const volts = dbuToVolts(ampOutDbu)
  const watts = (volts * volts) / impedance
  const spl =
    (input.speakerSensitivity as number) +
    10 * Math.log10(watts) -
    20 * Math.log10(input.distanceM as number)
  const warnings = ampClipping
    ? ['Amplifier input is above its sensitivity — output is clipped']
    : []
  return ok(
    { stages, ampOutputVolts: volts, ampOutputWatts: watts, splAtListener: spl, ampClipping },
    warnings,
  )
}

/** Cross-sectional area (mm²) of an AWG gauge: 0.012668 × 92^((36 − AWG)/19.5). */
export const awgToMm2 = (awg: number) => 0.012668 * 92 ** ((36 - awg) / 19.5)

export const COPPER_RESISTIVITY = 0.0172 // Ω·mm²/m

export interface CableLoss {
  areaMm2: number
  resistance: number
  voltageDropPercent: number
  powerLossDb: number
  /** Damping factor contribution of the cable alone: Z / R. */
  dampingFactor: number | null
}

export function cableLoss(input: {
  gauge: number | null | undefined
  gaugeUnit: 'awg' | 'mm2'
  lengthM: number | null | undefined
  loadOhms: number | null | undefined
}): CalcResult<CableLoss> {
  const err = firstError(
    requireNumber(input.gauge, 'wire gauge'),
    requireNonNegative(input.lengthM, 'cable length'),
    requirePositive(input.loadOhms, 'load impedance'),
  )
  if (err) return fail(err)
  const gauge = input.gauge as number
  let area: number
  if (input.gaugeUnit === 'awg') {
    if (gauge < -3 || gauge > 40) return fail('AWG must be between 0000 (−3) and 40')
    area = awgToMm2(gauge)
  } else {
    if (gauge <= 0) return fail('Cross-section must be greater than 0')
    area = gauge
  }
  const length = input.lengthM as number
  const load = input.loadOhms as number
  const resistance = (COPPER_RESISTIVITY / area) * 2 * length
  const voltageLoss = resistance / (load + resistance)
  return ok({
    areaMm2: area,
    resistance,
    voltageDropPercent: voltageLoss * 100,
    powerLossDb: length === 0 ? 0 : 20 * Math.log10(1 - voltageLoss),
    dampingFactor: resistance > 0 ? load / resistance : null,
  })
}

export const MAX_DB_SOURCES = 8

export interface DbSum {
  total: number
  /** Each source's share of the total acoustic power, in %. */
  contributions: { level: number; percent: number }[]
}

/** Combine unrelated (incoherent) sources: L = 10·log₁₀(Σ 10^(Lₙ/10)). */
export function addDecibels(levels: (number | null | undefined)[]): CalcResult<DbSum> {
  const values = levels.filter(isNum)
  if (values.length === 0) return fail('Enter at least one level')
  if (values.length > MAX_DB_SOURCES) return fail(`At most ${MAX_DB_SOURCES} levels`)
  const powers = values.map((l) => 10 ** (l / 10))
  const sum = powers.reduce((a, b) => a + b, 0)
  if (!Number.isFinite(sum)) return fail('Levels are too large to combine')
  return ok({
    total: 10 * Math.log10(sum),
    contributions: values.map((level, i) => ({ level, percent: (powers[i] / sum) * 100 })),
  })
}

/** Remove background noise from a reading: L = 10·log₁₀(10^(measured/10) − 10^(background/10)). */
export function subtractBackground(
  measured: number | null | undefined,
  background: number | null | undefined,
): CalcResult<{ source: number; correction: number }> {
  const err = firstError(
    requireNumber(measured, 'measured level'),
    requireNumber(background, 'background level'),
  )
  if (err) return fail(err)
  const m = measured as number
  const b = background as number
  if (b >= m) return fail('Background too high to measure the source accurately')
  const source = 10 * Math.log10(10 ** (m / 10) - 10 ** (b / 10))
  const warnings =
    m - b < 3 ? ['Result unreliable — background noise is within 3 dB of the measurement'] : []
  return ok({ source, correction: source - m }, warnings)
}
