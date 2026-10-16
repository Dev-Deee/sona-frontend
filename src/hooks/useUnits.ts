import { useCallback } from 'react'
import { type QuantityKind, toDisplay, unitLabel } from '../calculators/units'
import { useSettings } from '../store/settingsStore'

/** Current unit system plus helpers to render SI values in display units. */
export function useUnits() {
  const system = useSettings((s) => s.unitSystem)
  const show = useCallback(
    (kind: QuantityKind, si: number) => toDisplay(kind, si, system),
    [system],
  )
  const label = useCallback((kind: QuantityKind) => unitLabel(kind, system), [system])
  return { system, show, label }
}
