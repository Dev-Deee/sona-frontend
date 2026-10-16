import { create } from 'zustand'

export interface ResultSummary {
  title: string
  inputs: string
  output: string
}

interface ResultsState {
  /** Latest valid result per calculator; feeds history and share links. */
  results: Record<string, ResultSummary>
  publish: (calcId: string, summary: ResultSummary | null) => void
}

export const useResults = create<ResultsState>((set) => ({
  results: {},
  publish: (calcId, summary) =>
    set((s) => {
      const current = s.results[calcId]
      if (!summary) {
        if (!current) return s
        const results = { ...s.results }
        delete results[calcId]
        return { results }
      }
      if (current && current.inputs === summary.inputs && current.output === summary.output)
        return s
      return { results: { ...s.results, [calcId]: summary } }
    }),
}))
