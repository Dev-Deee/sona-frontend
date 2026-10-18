import { SPEAKER_DATA } from './speakerData'

export type SpeakerType = 'active' | 'passive'

export type SpeakerCategory =
  | 'line_array_element'
  | 'point_source'
  | 'subwoofer'
  | 'stage_monitor'
  | 'front_fill'
  | 'delay_fill'
  | 'column_array'

export interface Speaker {
  id: string
  manufacturer: string
  model: string
  type: SpeakerType
  category: SpeakerCategory
  /** Peak SPL at 1 m, dB. */
  maxSplAt1m: number | null
  /** dB SPL, 1 W / 1 m. */
  sensitivity: number | null
  /** Continuous (AES/RMS) power, W. */
  ratedPowerW: number | null
  hCoverage: number | null
  vCoverage: number | null
  freqResponse: string | null
  weightKg: number | null
  notes: string | null
  /** Official datasheet the values came from. */
  sourceUrl: string | null
  /** True once every value has been checked against `sourceUrl`. */
  verified: boolean
}

export const SPEAKERS: readonly Speaker[] = SPEAKER_DATA

/** Filter chips in the picker; `fill` covers front, delay and column fills. */
export type CategoryFilter = 'all' | 'line_array' | 'point_source' | 'sub' | 'monitor' | 'fill'

export const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'line_array', label: 'Line array' },
  { value: 'point_source', label: 'Point source' },
  { value: 'sub', label: 'Sub' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'fill', label: 'Fill' },
]

const CATEGORY_GROUP: Record<SpeakerCategory, Exclude<CategoryFilter, 'all'>> = {
  line_array_element: 'line_array',
  point_source: 'point_source',
  subwoofer: 'sub',
  stage_monitor: 'monitor',
  front_fill: 'fill',
  delay_fill: 'fill',
  column_array: 'fill',
}

export const CATEGORY_LABEL: Record<SpeakerCategory, string> = {
  line_array_element: 'Line array',
  point_source: 'Point source',
  subwoofer: 'Subwoofer',
  stage_monitor: 'Monitor',
  front_fill: 'Front fill',
  delay_fill: 'Delay / fill',
  column_array: 'Column',
}

/** Max SPL at 1 m from the spec sheet, or derived from sensitivity + power. */
export function getSplAt1m(s: Speaker): number | null {
  if (s.maxSplAt1m !== null) return s.maxSplAt1m
  if (s.sensitivity !== null && s.ratedPowerW !== null && s.ratedPowerW > 0)
    return s.sensitivity + 10 * Math.log10(s.ratedPowerW)
  return null
}

export const speakerName = (s: Speaker) => `${s.manufacturer} ${s.model}`

const norm = (x: string) =>
  x
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '')

/**
 * Speakers whose manufacturer + model contain every word of `query` (ignoring case, spaces and
 * punctuation, so "db j8", "d&b J 8" and "l-acoustics k2" all match).
 */
export function filterSpeakers(
  speakers: readonly Speaker[],
  query: string,
  category: CategoryFilter = 'all',
  type: SpeakerType | 'all' = 'all',
): Speaker[] {
  const words = query.split(/\s+/).map(norm).filter(Boolean)
  return speakers.filter((s) => {
    if (category !== 'all' && CATEGORY_GROUP[s.category] !== category) return false
    if (type !== 'all' && s.type !== type) return false
    const hay = norm(`${s.manufacturer} ${s.model}`)
    return words.every((w) => hay.includes(w))
  })
}

export const findSpeaker = (id: string | null | undefined) =>
  id ? SPEAKERS.find((s) => s.id === id) : undefined

/** What a calculator can fill from a library speaker. Missing values are left for the user. */
export interface SpeakerFill {
  type: SpeakerType
  /** Which spec to drive the level from: the sheet's max SPL, or sensitivity + power. */
  mode: 'maxSpl' | 'sensitivity'
  maxSpl: number | null
  sensitivity: number | null
  powerW: number | null
  hCoverage: number | null
  vCoverage: number | null
  weightKg: number | null
}

export function speakerFill(s: Speaker): SpeakerFill {
  const hasSens = s.sensitivity !== null && s.ratedPowerW !== null
  const mode = s.maxSplAt1m !== null && (s.type === 'active' || !hasSens) ? 'maxSpl' : 'sensitivity'
  return {
    type: s.type,
    mode,
    maxSpl: s.maxSplAt1m,
    sensitivity: s.sensitivity,
    powerW: s.ratedPowerW,
    hCoverage: s.hCoverage,
    vCoverage: s.vCoverage,
    weightKg: s.weightKg,
  }
}
