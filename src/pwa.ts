import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the Workbox service worker (src/sw.ts). With `autoUpdate`, a new version activates
 * on the next load; the app shell is precached so every calculator works offline.
 */
export function registerServiceWorker(): boolean {
  if (!('serviceWorker' in navigator)) return false
  registerSW({ immediate: true })
  return true
}
