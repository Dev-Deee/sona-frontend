import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localJSON } from './storage'

interface NavState {
  /** Last calculator opened on each tab, so returning to a tab lands where you left off. */
  lastCalc: Record<string, string>
  remember: (tab: string, calc: string) => void
}

export const useNav = create<NavState>()(
  persist(
    (set) => ({
      lastCalc: {},
      remember: (tab, calc) =>
        set((s) => (s.lastCalc[tab] === calc ? s : { lastCalc: { ...s.lastCalc, [tab]: calc } })),
    }),
    { name: 'sona_calc_tabs', storage: localJSON },
  ),
)
