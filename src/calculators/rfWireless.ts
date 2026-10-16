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

export const SPEED_OF_LIGHT = 299_792_458

/** FSPL (dB) = 20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π/c), d in m, f in Hz. */
export function freeSpacePathLoss(
  frequencyMHz: number | null | undefined,
  distanceM: number | null | undefined,
): CalcResult<number> {
  const err = firstError(
    requirePositive(frequencyMHz, 'frequency'),
    requirePositive(distanceM, 'distance'),
  )
  if (err) return fail(err)
  const f = (frequencyMHz as number) * 1e6
  return ok(
    20 * Math.log10(distanceM as number) +
      20 * Math.log10(f) +
      20 * Math.log10((4 * Math.PI) / SPEED_OF_LIGHT),
  )
}

export type LinkStatus = 'Excellent' | 'Good' | 'Marginal' | 'No link'

export function linkStatus(margin: number): LinkStatus {
  if (margin < 0) return 'No link'
  if (margin < 10) return 'Marginal'
  if (margin <= 20) return 'Good'
  return 'Excellent'
}

export interface LinkBudgetInput {
  txPowerDbm: number | null | undefined
  txGainDbi: number | null | undefined
  txCableLossDb: number | null | undefined
  pathLossMode: 'auto' | 'manual'
  frequencyMHz?: number | null
  distanceM?: number | null
  manualPathLossDb?: number | null
  rxGainDbi: number | null | undefined
  rxCableLossDb: number | null | undefined
  multicouplerLossDb: number | null | undefined
  rxSensitivityDbm: number | null | undefined
}

export function linkBudget(
  input: LinkBudgetInput,
): CalcResult<{ pathLossDb: number; receivedDbm: number; marginDb: number; status: LinkStatus }> {
  const err = firstError(
    requireNumber(input.txPowerDbm, 'TX power'),
    requireNumber(input.txGainDbi, 'TX antenna gain'),
    requireNonNegative(input.txCableLossDb, 'TX cable loss'),
    requireNumber(input.rxGainDbi, 'RX antenna gain'),
    requireNonNegative(input.rxCableLossDb, 'RX cable loss'),
    requireNonNegative(input.multicouplerLossDb, 'multicoupler loss'),
    requireNumber(input.rxSensitivityDbm, 'receiver sensitivity'),
  )
  if (err) return fail(err)
  let pathLoss: number
  if (input.pathLossMode === 'auto') {
    const fspl = freeSpacePathLoss(input.frequencyMHz, input.distanceM)
    if (!fspl.ok) return fspl
    pathLoss = fspl.value
  } else {
    if (!isNum(input.manualPathLossDb)) return fail('Enter a value for path loss')
    if (input.manualPathLossDb < 0) return fail('Path loss cannot be negative')
    pathLoss = input.manualPathLossDb
  }
  const received =
    (input.txPowerDbm as number) +
    (input.txGainDbi as number) -
    (input.txCableLossDb as number) -
    pathLoss +
    (input.rxGainDbi as number) -
    (input.rxCableLossDb as number) -
    (input.multicouplerLossDb as number)
  const margin = received - (input.rxSensitivityDbm as number)
  return ok({
    pathLossDb: pathLoss,
    receivedDbm: received,
    marginDb: margin,
    status: linkStatus(margin),
  })
}

export const IM3_WINDOW_MHZ = 0.2
export const MAX_COORDINATED_FREQUENCIES = 8

export interface Im3Product {
  pair: [number, number]
  product: number
  conflict: boolean
  conflictsWith: number | null
}

/**
 * Third-order intermod products 2f₁−f₂ and 2f₂−f₁ for every pair, flagged when within
 * ±200 kHz of any entered frequency.
 */
export function thirdOrderIntermod(
  frequenciesMHz: (number | null | undefined)[],
): CalcResult<Im3Product[]> {
  const freqs = frequenciesMHz.filter(isNum)
  if (freqs.some((f) => f <= 0)) return fail('Frequencies must be greater than 0 MHz')
  if (freqs.length < 2) return fail('Enter at least two frequencies')
  if (freqs.length > MAX_COORDINATED_FREQUENCIES)
    return fail(`At most ${MAX_COORDINATED_FREQUENCIES} frequencies`)
  const products: Im3Product[] = []
  const EPS = 1e-9
  for (let i = 0; i < freqs.length; i++) {
    for (let j = i + 1; j < freqs.length; j++) {
      const f1 = freqs[i]
      const f2 = freqs[j]
      for (const product of [2 * f1 - f2, 2 * f2 - f1]) {
        const hit = freqs.find((f) => Math.abs(f - product) <= IM3_WINDOW_MHZ + EPS)
        products.push({
          pair: [f1, f2],
          product,
          conflict: hit !== undefined,
          conflictsWith: hit ?? null,
        })
      }
    }
  }
  const warnings = new Set(freqs).size !== freqs.length ? ['Duplicate frequencies entered'] : []
  return ok(products, warnings)
}
