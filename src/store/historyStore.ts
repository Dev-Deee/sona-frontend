import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sessionJSON } from './storage'

export const MAX_HISTORY = 50

export interface HistoryEntry {
  id: string
  timestamp: number
  calcId: string
  calculator: string
  inputs: string
  output: string
}

interface HistoryState {
  entries: HistoryEntry[]
  add: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void
  clear: () => void
}

/** Per-session calculation history: newest first, capped at 50. */
export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) =>
        set((s) => {
          const latestForCalc = s.entries.find((e) => e.calcId === entry.calcId)
          if (
            latestForCalc &&
            latestForCalc.inputs === entry.inputs &&
            latestForCalc.output === entry.output
          ) {
            return s
          }
          const next: HistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }
          return { entries: [next, ...s.entries].slice(0, MAX_HISTORY) }
        }),
      clear: () => set({ entries: [] }),
    }),
    { name: 'sona_history', storage: sessionJSON },
  ),
)
