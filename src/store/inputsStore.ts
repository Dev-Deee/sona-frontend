import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localJSON } from './storage'

export type InputValue =
  number | string | boolean | null | InputValue[] | { [key: string]: InputValue }
export type CalcInputs = Record<string, InputValue>

interface InputsState {
  /** Calculator id (e.g. "acoustics.wavelength") → its inputs, stored in SI units. */
  values: Record<string, CalcInputs>
  setInput: (calcId: string, key: string, value: InputValue) => void
  setInputs: (calcId: string, inputs: CalcInputs) => void
  /** Snapshot of every calculator belonging to a tab. */
  snapshotTab: (tab: string) => Record<string, CalcInputs>
  /**
   * Replaces a tab's inputs with the snapshot. Calculators on that tab that are missing from the
   * snapshot were at their defaults when it was taken, so they are reset to defaults too.
   */
  loadSnapshot: (snapshot: Record<string, CalcInputs>, tab?: string) => void
  reset: (calcId: string) => void
}

export const useInputsStore = create<InputsState>()(
  persist(
    (set, get) => ({
      values: {},
      setInput: (calcId, key, value) =>
        set((s) => ({ values: { ...s.values, [calcId]: { ...s.values[calcId], [key]: value } } })),
      setInputs: (calcId, inputs) => set((s) => ({ values: { ...s.values, [calcId]: inputs } })),
      snapshotTab: (tab) =>
        Object.fromEntries(Object.entries(get().values).filter(([id]) => id.startsWith(`${tab}.`))),
      loadSnapshot: (snapshot, tab) =>
        set((s) => {
          const values = tab
            ? Object.fromEntries(
                Object.entries(s.values).filter(([id]) => !id.startsWith(`${tab}.`)),
              )
            : { ...s.values }
          for (const [id, inputs] of Object.entries(snapshot)) {
            if (inputs && typeof inputs === 'object' && !Array.isArray(inputs)) values[id] = inputs
          }
          return { values }
        }),
      reset: (calcId) =>
        set((s) => {
          const values = { ...s.values }
          delete values[calcId]
          return { values }
        }),
    }),
    { name: 'sona_inputs', storage: localJSON, version: 1 },
  ),
)
