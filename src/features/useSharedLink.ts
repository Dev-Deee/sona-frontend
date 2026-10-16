import { useEffect, useRef } from 'react'
import { errorMessage } from '../api/client'
import { shareApi } from '../api/endpoints'
import { navigate, type Route } from '../hooks/useHashRoute'
import { toast } from '../store/toastStore'
import { findByCalcId } from '../tabs/calculators'
import { DEFAULT_TAB, isVisibleTab } from '../tabs/registry'
import { applySnapshot } from './snapshot'

/** Opens #/share/<token>: loads the shared inputs and jumps to their tab. */
export function useSharedLink(route: Route) {
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (route.kind !== 'share' || handled.current === route.token) return
    handled.current = route.token
    shareApi
      .get(route.token)
      .then((payload) => {
        const tab = isVisibleTab(payload.calculatorTab) ? payload.calculatorTab : DEFAULT_TAB
        const calcId = applySnapshot(payload.inputs)
        const entry = calcId ? findByCalcId(tab, calcId) : undefined
        navigate(tab, entry?.slug)
        toast('Loaded shared calculation', 'success')
      })
      .catch((e: unknown) => {
        toast(errorMessage(e), 'error')
        navigate(DEFAULT_TAB)
      })
  }, [route])
}
