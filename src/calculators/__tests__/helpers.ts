import { expect } from 'vitest'
import type { CalcResult } from '../types'

export function value<T>(result: CalcResult<T>): T {
  if (!result.ok) throw new Error(`Expected ok result, got error: ${result.error}`)
  return result.value
}

export function error<T>(result: CalcResult<T>): string {
  if (result.ok) throw new Error('Expected an error result')
  return result.error
}

/** Recursively asserts no NaN/Infinity anywhere in a result value. */
export function expectAllFinite(v: unknown): void {
  if (typeof v === 'number') {
    expect(Number.isFinite(v), `non-finite number ${v}`).toBe(true)
  } else if (Array.isArray(v)) {
    v.forEach(expectAllFinite)
  } else if (v && typeof v === 'object') {
    Object.values(v).forEach((x) => (x === null ? undefined : expectAllFinite(x)))
  }
}
