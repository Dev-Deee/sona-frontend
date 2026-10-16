import {
  type CalcResult,
  fail,
  firstError,
  ok,
  requireNonNegative,
  requireNumber,
  requirePositive,
} from './types'

export type StiRating = 'Bad' | 'Poor' | 'Fair' | 'Good' | 'Excellent'

export function stiRating(sti: number): StiRating {
  if (sti < 0.3) return 'Bad'
  if (sti < 0.45) return 'Poor'
  if (sti < 0.6) return 'Fair'
  if (sti < 0.75) return 'Good'
  return 'Excellent'
}

/** Simplified estimate: STI ≈ (SNR/30 + 1) / (1 + RT60), clamped to [0, 1]. */
export function estimateSti(
  snrDb: number | null | undefined,
  rt60s: number | null | undefined,
): CalcResult<{ sti: number; rating: StiRating }> {
  const err = firstError(requireNumber(snrDb, 'SNR'), requireNumber(rt60s, 'RT60'))
  if (err) return fail(err)
  if ((rt60s as number) < 0) return fail('RT60 cannot be negative')
  const raw = ((snrDb as number) / 30 + 1) / (1 + (rt60s as number))
  const sti = Math.min(1, Math.max(0, raw))
  return ok({ sti, rating: stiRating(sti) })
}

export type AlconsRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Bad'

export function alconsRating(alcons: number): AlconsRating {
  if (alcons < 3) return 'Excellent'
  if (alcons < 7) return 'Good'
  if (alcons < 11) return 'Fair'
  if (alcons < 15) return 'Poor'
  return 'Bad'
}

/**
 * Peutz %ALcons from the direct-to-reverberant ratio:
 *   %ALcons ≈ 0.652 · N · (r/Dc)² · RT60, with (r/Dc)² = 10^(−D/R / 10)
 * where N is the number of sources contributing reverberant energy. Beyond ~3.16·Dc the
 * Peutz far-field limit of 9·RT60 applies.
 */
export function alcons(
  rt60s: number | null | undefined,
  directToReverberantDb: number | null | undefined,
  sources: number | null | undefined,
): CalcResult<{ alcons: number; rating: AlconsRating; estimatedSti: number }> {
  const err = firstError(
    requirePositive(rt60s, 'RT60'),
    requireNumber(directToReverberantDb, 'D/R ratio'),
    requirePositive(sources, 'number of sources'),
  )
  if (err) return fail(err)
  const t = rt60s as number
  const ratioSq = 10 ** (-(directToReverberantDb as number) / 10)
  const value = Math.min(0.652 * (sources as number) * ratioSq * t, 9 * t)
  // Farrel Becker conversion %ALcons → STI.
  const estimatedSti = Math.min(1, Math.max(0, -0.1845 * Math.log(value) + 0.9482))
  return ok({ alcons: value, rating: alconsRating(value), estimatedSti })
}

export type FeedbackStatus = 'Adequate' | 'Marginal' | 'Insufficient'

export interface FeedbackInput {
  /** Talker to microphone, Ds. */
  talkerToMic: number | null | undefined
  /** Loudspeaker to microphone, D1. */
  speakerToMic: number | null | undefined
  /** Loudspeaker to farthest listener, D2. */
  speakerToListener: number | null | undefined
  /** Talker to farthest listener without the PA, D0. */
  talkerToListener: number | null | undefined
  /** Number of open microphones. */
  openMics: number | null | undefined
  /** Equivalent acoustic distance: how close the listener should sound to the talker. */
  ead: number | null | undefined
  /** Feedback stability margin, dB (6 dB standard). */
  stabilityMargin: number | null | undefined
  /** A feedback suppressor buys back up to 6 dB. */
  suppressor: boolean
}

export const SUPPRESSOR_GAIN_DB = 6

/**
 * Davis & Davis / Peutz potential and needed acoustic gain.
 *   PAG = 20·log₁₀(D0·D1 / (Ds·D2)) − 10·log₁₀(NOM) − FSM (+ suppressor)
 *   NAG = 20·log₁₀(D0 / EAD)
 */
export function feedbackHeadroom(
  input: FeedbackInput,
): CalcResult<{ pag: number; nag: number; margin: number; status: FeedbackStatus }> {
  const err = firstError(
    requirePositive(input.talkerToMic, 'talker-to-mic distance'),
    requirePositive(input.speakerToMic, 'speaker-to-mic distance'),
    requirePositive(input.speakerToListener, 'speaker-to-listener distance'),
    requirePositive(input.talkerToListener, 'talker-to-listener distance'),
    requirePositive(input.openMics, 'number of open mics'),
    requirePositive(input.ead, 'listening distance'),
    requireNonNegative(input.stabilityMargin, 'stability margin'),
  )
  if (err) return fail(err)
  const nom = input.openMics as number
  if (!Number.isInteger(nom)) return fail('Number of open mics must be a whole number')
  const ds = input.talkerToMic as number
  const d1 = input.speakerToMic as number
  const d2 = input.speakerToListener as number
  const d0 = input.talkerToListener as number
  const pag =
    20 * Math.log10((d0 * d1) / (ds * d2)) -
    10 * Math.log10(nom) -
    (input.stabilityMargin as number) +
    (input.suppressor ? SUPPRESSOR_GAIN_DB : 0)
  const nag = 20 * Math.log10(d0 / (input.ead as number))
  const margin = pag - nag
  const status: FeedbackStatus =
    margin >= 6 ? 'Adequate' : margin >= 0 ? 'Marginal' : 'Insufficient'
  return ok({ pag, nag, margin, status })
}
