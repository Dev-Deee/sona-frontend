import { speedOfSoundHumid, speedOrFail } from './acoustics'
import {
  type CalcResult,
  fail,
  firstError,
  ok,
  requireNonNegative,
  requireNumber,
  requirePositive,
} from './types'

const DEG = Math.PI / 180

/** SPL₂ = SPL₁ − 20·log₁₀(d₂ / d₁) */
export function inverseSquare(
  refSpl: number | null | undefined,
  refDistance: number | null | undefined,
  targetDistance: number | null | undefined,
): CalcResult<{ spl: number; change: number }> {
  const err = firstError(
    requireNumber(refSpl, 'reference SPL'),
    requirePositive(refDistance, 'reference distance'),
    requirePositive(targetDistance, 'target distance'),
  )
  if (err) return fail(err)
  const change = -20 * Math.log10((targetDistance as number) / (refDistance as number))
  return ok({ spl: (refSpl as number) + change, change })
}

export interface AspectRatios {
  /** Forward aspect ratio: coverage length ÷ width, 1 / sin(θ/2). */
  far: number
  /** Lateral aspect ratio: coverage width ÷ distance, 2·tan(θ/2). */
  lar: number
  /** On-axis distance from the speaker to the listener. */
  directDistance: number
  /** Coverage width (−6 dB edges) at the listener distance. */
  coverageWidth: number
  /** Down-tilt needed to aim at the listener, degrees below horizontal. */
  aimAngle: number
}

/** FAR / LAR for a single speaker (McCarthy). Coverage angle must be in (0°, 180°). */
export function aspectRatios(
  heightM: number | null | undefined,
  throwM: number | null | undefined,
  coverageDeg: number | null | undefined,
): CalcResult<AspectRatios> {
  const err = firstError(
    requireNonNegative(heightM, 'height'),
    requirePositive(throwM, 'throw distance'),
    requirePositive(coverageDeg, 'coverage angle'),
  )
  if (err) return fail(err)
  const theta = coverageDeg as number
  if (theta >= 180) return fail('Coverage angle must be less than 180°')
  const half = (theta / 2) * DEG
  const h = heightM as number
  const t = throwM as number
  const directDistance = Math.hypot(h, t)
  const lar = 2 * Math.tan(half)
  return ok({
    far: 1 / Math.sin(half),
    lar,
    directDistance,
    coverageWidth: lar * directDistance,
    aimAngle: Math.atan2(h, t) / DEG,
  })
}

/** angle = 2·atan(width / (2·distance)) */
export function requiredCoverageAngle(
  widthM: number | null | undefined,
  distanceM: number | null | undefined,
): CalcResult<number> {
  const err = firstError(
    requirePositive(widthM, 'audience width'),
    requirePositive(distanceM, 'throw distance'),
  )
  if (err) return fail(err)
  return ok(2 * Math.atan((widthM as number) / (2 * (distanceM as number))) * (180 / Math.PI))
}

export interface AsymmetricCoverage {
  /** Down-tilt to the far edge (aim of the upper section), degrees below horizontal. */
  upperSplay: number
  /** Down-tilt to the near edge (aim of the lower section), degrees below horizontal. */
  lowerSplay: number
  /** Vertical angle the array must cover. */
  totalCoverage: number
  nearDirect: number
  farDirect: number
  /** Level difference between far and near seats, 20·log₁₀(far/near). */
  rangeRatioDb: number
  description: string
}

/**
 * Coupled point source covering an audience from a near edge to a far edge (horizontal
 * distances from the array) with the array `heightM` above ear level.
 */
export function asymmetricCoverage(
  nearM: number | null | undefined,
  farM: number | null | undefined,
  heightM: number | null | undefined,
): CalcResult<AsymmetricCoverage> {
  const err = firstError(
    requirePositive(nearM, 'near edge distance'),
    requirePositive(farM, 'far edge distance'),
    requireNonNegative(heightM, 'array height'),
  )
  if (err) return fail(err)
  const near = nearM as number
  const far = farM as number
  const h = heightM as number
  if (far <= near) return fail('Far edge must be further than the near edge')
  const upper = Math.atan2(h, far) / DEG
  const lower = Math.atan2(h, near) / DEG
  const nearDirect = Math.hypot(h, near)
  const farDirect = Math.hypot(h, far)
  const rangeRatioDb = 20 * Math.log10(farDirect / nearDirect)
  let description: string
  if (rangeRatioDb < 3) {
    description = 'Near-symmetric: a single aim point with uniform splays will cover this evenly.'
  } else if (rangeRatioDb < 9) {
    description = `Moderately asymmetric: tighten splays toward the top and taper the lower boxes by about ${rangeRatioDb.toFixed(1)} dB.`
  } else {
    description = `Strongly asymmetric: use tight upper splays aimed at the far seats, wider lower splays, and ~${rangeRatioDb.toFixed(1)} dB of level taper (or a separate downfill).`
  }
  return ok({
    upperSplay: upper,
    lowerSplay: lower,
    totalCoverage: lower - upper,
    nearDirect,
    farDirect,
    rangeRatioDb,
    description,
  })
}

export interface DelayCheck {
  mainPath: number
  mainMs: number
  delayPath: number
  delayMs: number
  differenceMs: number
  /** Level advantage of the delay speaker over the mains at the listener (inverse square only). */
  levelDifferenceDb: number
  beneficial: boolean
  recommendation: string
}

export const DELAY_THRESHOLD_MS = 20

export function needDelays(input: {
  mainHeight: number | null | undefined
  delayHeight: number | null | undefined
  mainDistance: number | null | undefined
  delayDistance: number | null | undefined
  earHeight: number | null | undefined
  temperatureC: number | null | undefined
}): CalcResult<DelayCheck> {
  const err = firstError(
    requireNonNegative(input.mainHeight, 'main speaker height'),
    requireNonNegative(input.delayHeight, 'delay speaker height'),
    requirePositive(input.mainDistance, 'main speaker distance'),
    requirePositive(input.delayDistance, 'delay speaker distance'),
    requireNonNegative(input.earHeight, 'ear height'),
  )
  if (err) return fail(err)
  const s = speedOrFail(input.temperatureC)
  if ('error' in s) return fail(s.error)
  const ear = input.earHeight as number
  const mainPath = Math.hypot((input.mainHeight as number) - ear, input.mainDistance as number)
  const delayPath = Math.hypot((input.delayHeight as number) - ear, input.delayDistance as number)
  const mainMs = (mainPath / s.c) * 1000
  const delayMs = (delayPath / s.c) * 1000
  const differenceMs = mainMs - delayMs
  const beneficial = differenceMs > DELAY_THRESHOLD_MS
  const recommendation = beneficial
    ? `Delay beneficial: set the delay speaker to ≈${differenceMs.toFixed(1)} ms (plus a few ms of precedence offset to keep the image on the mains).`
    : differenceMs > 0
      ? `Not needed: the mains arrive only ${differenceMs.toFixed(1)} ms later (threshold ${DELAY_THRESHOLD_MS} ms).`
      : 'Not needed: the mains arrive first at this position.'
  return ok(
    {
      mainPath,
      mainMs,
      delayPath,
      delayMs,
      differenceMs,
      levelDifferenceDb: 20 * Math.log10(mainPath / delayPath),
      beneficial,
      recommendation,
    },
    s.warnings,
  )
}

// ─── Delay Tower Planner ─────────────────────────────────────────────────────────────────────────

export type VenueType = 'indoor' | 'outdoor'
export type PaConfig = 'mono' | 'stereo'
export type SpeakerType = 'passive' | 'active'
/** Active speakers: enter the spec-sheet max SPL, or sensitivity + built-in amp power. */
export type ActiveMode = 'maxSpl' | 'sensitivity'
export type Check = 'pass' | 'warn' | 'fail'

export interface DelayPlanInput {
  venue: VenueType
  pa: PaConfig
  /** Relative humidity, % (affects the speed of sound). */
  humidityPercent: number | null | undefined
  /** Front row to back row. */
  depthM: number | null | undefined
  widthM: number | null | undefined
  mainHeightM: number | null | undefined
  /** Horizontal distance of the mains behind the front row (0 = at the front edge). */
  mainBehindM: number | null | undefined
  earHeightM: number | null | undefined
  temperatureC: number | null | undefined
  // Stage 2
  speakerType: SpeakerType
  activeMode: ActiveMode
  /** Active, max-SPL mode: spec-sheet max SPL at 1 m. */
  mainMaxSpl: number | null | undefined
  mainSensitivity: number | null | undefined
  mainPowerW: number | null | undefined
  mainCoverageDeg: number | null | undefined
  // Stage 3
  targetVarianceDb: number | null | undefined
  haasMs: number | null | undefined
  // Stage 4
  delayCoverageHDeg: number | null | undefined
  delayCoverageVDeg: number | null | undefined
  delayHeightM: number | null | undefined
  delaySensitivity: number | null | undefined
  delayPowerW: number | null | undefined
  // Stage 5
  overlap: number
}

export interface VenueStage {
  speed: number
  /** Speed of sound in dry air at the same temperature. */
  drySpeed: number
  horizontalThrow: number
  verticalDrop: number
  totalThrow: number
  splLossBack: number
}

export interface MainsStage {
  spl1m: number
  frontDistance: number
  splFront: number
  splBack: number
  variance: number
  varianceCheck: Check
  widthAtBack: number
  coversWidth: boolean
  towerRecommended: boolean
}

export interface PlacementStage {
  /** False when the mains alone stay within the target variance. */
  needed: boolean
  /** Where the mains have dropped by the target variance, from the front row (unclamped). */
  idealFromFront: number
  /** Recommended position, clamped to 50–75% of the audience depth. */
  fromFront: number
  fromBack: number
  rangeMin: number
  rangeMax: number
  mainToTower: number
  propagationMs: number
  delaySettingMs: number
}

export interface SpeakerStage {
  throwToBack: number
  totalThrow: number
  widthAtBack: number
  spl1m: number
  splBack: number
  /** Delay SPL at the back row minus mains SPL at the front row. */
  matchDb: number
  matchCheck: Check
  aimAngle: number
  verticalCheck: Check | null
}

export interface TowersStage {
  effectiveWidth: number
  towers: number
  spacing: number
}

export interface DelayPlan {
  venue: VenueStage
  mains: CalcResult<MainsStage>
  placement: CalcResult<PlacementStage>
  speaker: CalcResult<SpeakerStage>
  towers: CalcResult<TowersStage>
}

const deg = (rad: number) => (rad * 180) / Math.PI
const rad = (d: number) => (d * Math.PI) / 180
const MIN_DISTANCE = 1 // inverse-square figures are referenced to 1 m

/**
 * Six-stage delay tower design. Each later stage depends on the earlier ones; a stage that
 * can't be computed returns its own error so earlier results still show.
 */
export function planDelayTowers(input: DelayPlanInput): CalcResult<DelayPlan> {
  const err = firstError(
    requirePositive(input.depthM, 'audience depth'),
    requirePositive(input.widthM, 'audience width'),
    requireNonNegative(input.mainHeightM, 'main speaker height'),
    requireNonNegative(input.mainBehindM, 'mains distance behind the front row'),
    requireNonNegative(input.earHeightM, 'ear height'),
  )
  if (err) return fail(err)
  const humid = speedOfSoundHumid(input.temperatureC, input.humidityPercent)
  if (!humid.ok) return fail(humid.error)
  const c = humid.value.speed
  const depth = input.depthM as number
  const width = input.widthM as number
  const behind = input.mainBehindM as number
  const ear = input.earHeightM as number
  const drop = (input.mainHeightM as number) - ear
  const horizontalThrow = depth + behind
  const totalThrow = Math.hypot(horizontalThrow, drop)
  const venue: VenueStage = {
    speed: c,
    drySpeed: humid.value.drySpeed,
    horizontalThrow,
    verticalDrop: drop,
    totalThrow,
    splLossBack: 20 * Math.log10(Math.max(totalThrow, MIN_DISTANCE)),
  }

  // Stage 2 — mains
  const directSpl = input.speakerType === 'active' && input.activeMode === 'maxSpl'
  const mainsErr = firstError(
    ...(directSpl
      ? [requireNumber(input.mainMaxSpl, 'max SPL at 1 m')]
      : [
          requireNumber(input.mainSensitivity, 'main speaker sensitivity'),
          requirePositive(
            input.mainPowerW,
            input.speakerType === 'active' ? 'rated power' : 'amplifier power to the mains',
          ),
        ]),
    requirePositive(input.mainCoverageDeg, 'main speaker coverage'),
  )
  let mains: CalcResult<MainsStage>
  if (mainsErr) mains = fail(mainsErr)
  else if ((input.mainCoverageDeg as number) >= 180)
    mains = fail('Coverage angle must be less than 180°')
  else {
    const spl1m = directSpl
      ? (input.mainMaxSpl as number)
      : (input.mainSensitivity as number) + 10 * Math.log10(input.mainPowerW as number)
    const frontDistance = Math.hypot(behind, drop)
    const splFront = spl1m - 20 * Math.log10(Math.max(frontDistance, MIN_DISTANCE))
    const splBack = spl1m - venue.splLossBack
    const variance = splFront - splBack
    const widthAtBack = 2 * horizontalThrow * Math.tan(rad(input.mainCoverageDeg as number) / 2)
    const coversWidth = widthAtBack >= width
    mains = ok({
      spl1m,
      frontDistance,
      splFront,
      splBack,
      variance,
      varianceCheck: variance > 10 ? 'fail' : variance > 6 ? 'warn' : 'pass',
      widthAtBack,
      coversWidth,
      towerRecommended: variance > 6 || !coversWidth,
    })
  }

  // Stage 3 — placement
  let placement: CalcResult<PlacementStage>
  const placeErr = firstError(
    requireNonNegative(input.targetVarianceDb, 'target variance'),
    requireNonNegative(input.haasMs, 'Haas offset'),
  )
  if (!mains.ok) placement = fail('Complete the main coverage check first')
  else if (placeErr) placement = fail(placeErr)
  else {
    // The mains have used up the allowed variance where they are `target` dB below the front row.
    const acoustic =
      Math.max(mains.value.frontDistance, MIN_DISTANCE) *
      10 ** ((input.targetVarianceDb as number) / 20)
    const fromMains = Math.sqrt(Math.max(acoustic ** 2 - drop ** 2, 0))
    const ideal = fromMains - behind
    const rangeMin = depth * 0.5
    const rangeMax = depth * 0.75
    const needed = ideal < depth
    const warnings: string[] = []
    if (needed && ideal < 0)
      warnings.push('Mains drop off before the front row — tower placed at half the depth')
    const fromFront = Math.min(Math.max(ideal, rangeMin), rangeMax)
    const mainToTower = Math.hypot(fromFront + behind, drop)
    const propagationMs = (mainToTower / c) * 1000
    placement = ok(
      {
        needed,
        idealFromFront: ideal,
        fromFront,
        fromBack: depth - fromFront,
        rangeMin,
        rangeMax,
        mainToTower,
        propagationMs,
        delaySettingMs: propagationMs + (input.haasMs as number),
      },
      warnings,
    )
  }

  // Stage 4 — delay speaker
  let speaker: CalcResult<SpeakerStage>
  const spkErr = firstError(
    requirePositive(input.delayCoverageHDeg, 'delay speaker horizontal coverage'),
    requirePositive(input.delayCoverageVDeg, 'delay speaker vertical coverage'),
    requireNonNegative(input.delayHeightM, 'delay speaker height'),
    requireNumber(input.delaySensitivity, 'delay speaker sensitivity'),
    requirePositive(input.delayPowerW, 'amplifier power to the delay'),
  )
  if (!placement.ok) speaker = fail(placement.error)
  else if (!placement.value.needed)
    speaker = fail('Mains cover the full venue — no delay tower needed')
  else if (spkErr) speaker = fail(spkErr)
  else if ((input.delayCoverageHDeg as number) >= 180)
    speaker = fail('Coverage angle must be less than 180°')
  else {
    const throwToBack = depth - placement.value.fromFront
    const vDrop = (input.delayHeightM as number) - ear
    const totalDelayThrow = Math.hypot(throwToBack, vDrop)
    const spl1m = (input.delaySensitivity as number) + 10 * Math.log10(input.delayPowerW as number)
    const splBack = spl1m - 20 * Math.log10(Math.max(totalDelayThrow, MIN_DISTANCE))
    const matchDb = splBack - (mains as { value: MainsStage }).value.splFront
    const aimAngle = deg(Math.atan2(vDrop, throwToBack))
    const warnings: string[] = []
    if (matchDb > 3)
      warnings.push('Delay may overpower mains — reduce amplifier power or sensitivity')
    let verticalCheck: Check | null = null
    if (input.venue === 'indoor') {
      verticalCheck = (input.delayCoverageVDeg as number) >= aimAngle + 5 ? 'pass' : 'warn'
      if (verticalCheck === 'warn')
        warnings.push(
          'Speaker may not cover the audience under the tower — consider wider vertical dispersion',
        )
    }
    speaker = ok(
      {
        throwToBack,
        totalThrow: totalDelayThrow,
        widthAtBack: 2 * throwToBack * Math.tan(rad(input.delayCoverageHDeg as number) / 2),
        spl1m,
        splBack,
        matchDb,
        matchCheck: Math.abs(matchDb) <= 3 ? 'pass' : matchDb > 3 ? 'warn' : 'fail',
        aimAngle,
        verticalCheck,
      },
      warnings,
    )
  }

  // Stage 5 — number of towers
  let towers: CalcResult<TowersStage>
  if (!speaker.ok) towers = fail(speaker.error)
  else {
    const effectiveWidth = speaker.value.widthAtBack * (1 - input.overlap)
    const count = effectiveWidth > 0 ? Math.ceil(width / effectiveWidth - 1e-9) : 0
    if (count <= 0) towers = fail('Invalid input — check the delay speaker coverage')
    else {
      const warnings =
        count > 4
          ? ['Consider a speaker with wider horizontal coverage or a distributed system']
          : []
      towers = ok({ effectiveWidth, towers: count, spacing: width / count }, warnings)
    }
  }

  return ok({ venue, mains, placement, speaker, towers })
}
