import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localJSON } from './storage'
import type { CalcSnapshot } from '../features/snapshot'

export interface LocalPreset {
  uuid: string
  name: string
  calculatorTab: string
  /** The calculator this preset restores. */
  calcId: string
  inputs: CalcSnapshot
  createdAt: string
}

interface PresetsState {
  presets: LocalPreset[]
  add: (preset: Omit<LocalPreset, 'uuid' | 'createdAt'>) => LocalPreset
  remove: (uuid: string) => void
}

/** Presets saved while logged out live in localStorage. */
export const useLocalPresets = create<PresetsState>()(
  persist(
    (set) => ({
      presets: [],
      add: (preset) => {
        const created: LocalPreset = {
          ...preset,
          uuid: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ presets: [created, ...s.presets] }))
        return created
      },
      remove: (uuid) => set((s) => ({ presets: s.presets.filter((p) => p.uuid !== uuid) })),
    }),
    { name: 'sona_presets', storage: localJSON },
  ),
)
