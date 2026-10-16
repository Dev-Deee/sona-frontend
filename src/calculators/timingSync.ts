import { speedOrFail } from './acoustics'
import { type CalcResult, fail, firstError, ok, requireNumber, requirePositive } from './types'

/** delay (ms) = (phase / 360) × (1000 / f) */
export function phaseDelay(
  phaseDeg: number | null | undefined,
  frequencyHz: number | null | undefined,
): CalcResult<number> {
  const err = firstError(
    requireNumber(phaseDeg, 'phase'),
    requirePositive(frequencyHz, 'frequency'),
  )
  if (err) return fail(err)
  return ok(((phaseDeg as number) / 360) * (1000 / (frequencyHz as number)))
}

/** distance = delay (s) × c */
export function delayToDistance(
  delayMs: number | null | undefined,
  temperatureC: number | null | undefined,
): CalcResult<number> {
  const err = requireNumber(delayMs, 'delay')
  if (err) return fail(err)
  if ((delayMs as number) < 0) return fail('Delay cannot be negative')
  const s = speedOrFail(temperatureC)
  if ('error' in s) return fail(s.error)
  return ok(((delayMs as number) / 1000) * s.c, s.warnings)
}

export const NOTE_VALUES = [
  { name: 'Whole note', factor: 4 },
  { name: 'Half note', factor: 2 },
  { name: 'Quarter note', factor: 1 },
  { name: 'Dotted quarter', factor: 1.5 },
  { name: '8th note', factor: 0.5 },
  { name: 'Dotted 8th', factor: 0.75 },
  { name: '8th triplet', factor: 1 / 3 },
  { name: '16th note', factor: 0.25 },
  { name: 'Dotted 16th', factor: 0.375 },
] as const

export interface NoteDelay {
  name: string
  ms: number
  hz: number
}

/** quarter = 60000 / BPM; other values scale from the quarter note. */
export function bpmToDelay(bpm: number | null | undefined): CalcResult<NoteDelay[]> {
  const err = requirePositive(bpm, 'BPM')
  if (err) return fail(err)
  const quarter = 60000 / (bpm as number)
  return ok(
    NOTE_VALUES.map(({ name, factor }) => {
      const ms = quarter * factor
      return { name, ms, hz: 1000 / ms }
    }),
  )
}

/** Nominal frame rate label → exact rate (NTSC rates are n·1000/1001). */
export const FRAME_RATES: { label: string; fps: number }[] = [
  { label: '23.976', fps: 24000 / 1001 },
  { label: '24', fps: 24 },
  { label: '25', fps: 25 },
  { label: '29.97', fps: 30000 / 1001 },
  { label: '30', fps: 30 },
  { label: '48', fps: 48 },
  { label: '50', fps: 50 },
  { label: '59.94', fps: 60000 / 1001 },
  { label: '60', fps: 60 },
]

export const FRAME_SAMPLE_RATES = [44100, 48000, 88200, 96000, 192000] as const

export function frameSync(
  fps: number | null | undefined,
): CalcResult<{ frameMs: number; samples: { sampleRate: number; samples: number }[] }> {
  const err = requirePositive(fps, 'frame rate')
  if (err) return fail(err)
  const f = fps as number
  return ok({
    frameMs: 1000 / f,
    samples: FRAME_SAMPLE_RATES.map((sampleRate) => ({ sampleRate, samples: sampleRate / f })),
  })
}
