import { useCallback, useEffect, useMemo, useState } from 'react'
import { type CalcInputs, type InputValue, useInputsStore } from '../store/inputsStore'
import { type ResultSummary, useResults } from '../store/resultsStore'
import { useHistory } from '../store/historyStore'

/**
 * Inputs for one calculator card, persisted in the inputs store (SI units) so they survive tab
 * switches and reloads and can be saved as presets or shared.
 */
export function useCalcInputs<T extends CalcInputs>(calcId: string, defaults: T) {
  const stored = useInputsStore((s) => s.values[calcId])
  const setInput = useInputsStore((s) => s.setInput)
  // Defaults are captured once; callers pass a fresh literal on every render.
  const [initial] = useState(defaults)
  const inputs = useMemo(() => ({ ...initial, ...stored }) as T, [initial, stored])
  const set = useCallback(
    <K extends keyof T & string>(key: K, value: T[K]) => setInput(calcId, key, value as InputValue),
    [calcId, setInput],
  )
  return [inputs, set] as const
}

export const HISTORY_DEBOUNCE_MS = 1500

/**
 * Publishes a card's latest valid result (for share links) and, once inputs have been stable
 * for a moment, records it in the session history.
 */
export function usePublishResult(calcId: string, summary: ResultSummary | null) {
  const publish = useResults((s) => s.publish)
  const addHistory = useHistory((s) => s.add)
  const key = summary ? `${summary.title}|${summary.inputs}|${summary.output}` : ''

  useEffect(() => {
    publish(calcId, summary)
    if (!summary) return
    const timer = setTimeout(
      () =>
        addHistory({
          calcId,
          calculator: summary.title,
          inputs: summary.inputs,
          output: summary.output,
        }),
      HISTORY_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
    // `key` captures every field of `summary`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcId, key, publish, addHistory])
}
