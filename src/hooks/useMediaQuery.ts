import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true),
    () => true,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
