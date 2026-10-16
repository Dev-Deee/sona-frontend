import { type CalcResult, fail, firstError, ok, requireNonNegative, requirePositive } from './types'

export interface InputChannel {
  id: string
  channel: number
  source: string
  type: 'mic' | 'line'
  micType: string
  stand: string
  phantom: boolean
  notes: string
}

export const INPUT_LIST_HEADERS = [
  'Channel',
  'Source',
  'Mic/Line',
  'Mic type',
  'Stand',
  '48V',
  'Notes',
]

function csvCell(value: string | number | boolean): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** RFC 4180 CSV with channels renumbered in list order. */
export function inputListToCsv(rows: InputChannel[]): string {
  const lines = [INPUT_LIST_HEADERS.map(csvCell).join(',')]
  rows.forEach((row, index) => {
    lines.push(
      [
        index + 1,
        row.source,
        row.type === 'mic' ? 'Mic' : 'Line',
        row.micType,
        row.stand,
        row.phantom ? 'Yes' : 'No',
        row.notes,
      ]
        .map(csvCell)
        .join(','),
    )
  })
  return lines.join('\r\n') + '\r\n'
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items
  const copy = items.slice()
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export type SafetyFactor = 10 | 7
export const HOIST_CAPACITIES_KG = [500, 1000, 2000] as const

export interface RiggingLoad {
  loadPerPoint: number
  /** Load × safety factor — the minimum breaking strength rigging hardware needs. */
  requiredStrength: number
  exceedsHoist: boolean
}

/** load/point = (W / n) / cos(bridle angle). Weights in kg. */
export function riggingLoad(input: {
  weightKg: number | null | undefined
  points: number | null | undefined
  bridleAngleDeg: number | null | undefined
  safetyFactor: SafetyFactor
  hoistCapacityKg: number
}): CalcResult<RiggingLoad> {
  const err = firstError(
    requireNonNegative(input.weightKg, 'array weight'),
    requirePositive(input.points, 'rigging points'),
    requireNonNegative(input.bridleAngleDeg, 'bridle angle'),
  )
  if (err) return fail(err)
  const points = input.points as number
  if (!Number.isInteger(points)) return fail('Rigging points must be a whole number')
  const angle = input.bridleAngleDeg as number
  if (angle >= 90) return fail('Bridle angle must be less than 90° from vertical')
  const loadPerPoint = (input.weightKg as number) / points / Math.cos((angle * Math.PI) / 180)
  const warnings: string[] = []
  if (angle > 60) warnings.push('Bridle legs beyond 60° from vertical multiply tension sharply')
  const exceedsHoist = loadPerPoint > input.hoistCapacityKg
  if (exceedsHoist)
    warnings.push(`Load per point exceeds the ${input.hoistCapacityKg} kg hoist rating`)
  return ok(
    { loadPerPoint, requiredStrength: loadPerPoint * input.safetyFactor, exceedsHoist },
    warnings,
  )
}
