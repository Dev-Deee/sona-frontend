import { useEffect, useState } from 'react'
import { DEFAULT_TAB, isTabId, type TabId } from '../tabs/registry'

/** `calc` is the calculator slug within the tab, e.g. #/acoustics/rt60. */
export type Route =
  { kind: 'home' } | { kind: 'tab'; tab: TabId; calc?: string } | { kind: 'share'; token: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [first, second] = path.split('/')
  if (first === 'share' && second) return { kind: 'share', token: decodeURIComponent(second) }
  if (!first) return { kind: 'home' }
  if (!isTabId(first)) return { kind: 'tab', tab: DEFAULT_TAB }
  return second
    ? { kind: 'tab', tab: first, calc: decodeURIComponent(second) }
    : { kind: 'tab', tab: first }
}

export function goHome() {
  if (window.location.hash !== '#/') window.location.hash = '/'
}

export function navigate(tab: TabId, calc?: string) {
  const target = calc ? `#/${tab}/${calc}` : `#/${tab}`
  if (window.location.hash !== target) window.location.hash = target.slice(1)
}

/** Minimal hash router: works offline and from any static host without rewrite rules. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
