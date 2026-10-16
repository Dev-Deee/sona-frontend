import { useInputsStore, type CalcInputs } from '../store/inputsStore'
import { useResults } from '../store/resultsStore'
import { useSettings } from '../store/settingsStore'
import type { Json } from '../types/api'

/**
 * Saved state of ONE calculator: its inputs plus the shared temperature. Presets and share links
 * store this, so restoring one only touches that calculator.
 */
export interface CalcSnapshot {
  calcId: string
  inputs: CalcInputs
  temperatureC: number | null
}

export function captureCalc(calcId: string): CalcSnapshot {
  return {
    calcId,
    inputs: { ...(useInputsStore.getState().values[calcId] ?? {}) },
    temperatureC: useSettings.getState().temperatureC,
  }
}

/** The calculator's latest displayed result, keyed by calculator id. */
export function captureCalcOutputs(calcId: string): Json {
  const summary = useResults.getState().results[calcId]
  return summary ? { [calcId]: summary } : {}
}

const isObject = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x)

/** The calculator a saved snapshot belongs to, if it is a per-calculator snapshot. */
export function snapshotCalcId(raw: unknown): string | null {
  return isObject(raw) && typeof raw.calcId === 'string' ? raw.calcId : null
}

/**
 * Restores a snapshot and returns the calculator id it applied to, or null if unreadable.
 * The calculator's inputs are replaced wholesale, so values left at their defaults when it was
 * saved come back as defaults. Older whole-page snapshots (`{ calcs }`) are still accepted.
 */
export function applySnapshot(raw: unknown): string | null {
  if (!isObject(raw)) return null
  let applied: string | null = null
  if (typeof raw.calcId === 'string' && isObject(raw.inputs)) {
    useInputsStore.getState().setInputs(raw.calcId, raw.inputs as CalcInputs)
    applied = raw.calcId
  } else if (isObject(raw.calcs)) {
    const calcs = raw.calcs as Record<string, CalcInputs>
    useInputsStore.getState().loadSnapshot(calcs)
    applied = Object.keys(calcs)[0] ?? ''
  }
  if (
    applied !== null &&
    typeof raw.temperatureC === 'number' &&
    Number.isFinite(raw.temperatureC)
  ) {
    useSettings.getState().setTemperature(raw.temperatureC, 'manual')
  }
  return applied
}

export function shareUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/share/${encodeURIComponent(token)}`
}
