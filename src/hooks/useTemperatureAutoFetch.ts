import { useEffect } from 'react'
import { useSettings } from '../store/settingsStore'
import { toast } from '../store/toastStore'

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const SESSION_FLAG = 'sona_temp_fetched'

export async function fetchCurrentTemperature(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  const url = `${OPEN_METEO_URL}?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}&current_weather=true`
  const response = await fetch(url)
  if (!response.ok) return null
  const body = (await response.json()) as { current_weather?: { temperature?: unknown } }
  const t = body.current_weather?.temperature
  return typeof t === 'number' && Number.isFinite(t) ? t : null
}

/**
 * Once per session, if online and the user allows geolocation, pre-fill the shared ambient
 * temperature from Open-Meteo. Skipped once the user has typed a temperature themselves.
 */
export function useTemperatureAutoFetch() {
  useEffect(() => {
    let cancelled = false
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return
      sessionStorage.setItem(SESSION_FLAG, '1')
    } catch {
      /* no session storage: still try once */
    }
    if (!navigator.onLine || !('geolocation' in navigator)) return
    if (useSettings.getState().temperatureManual) return

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const t = await fetchCurrentTemperature(coords.latitude, coords.longitude)
          if (cancelled || t === null || useSettings.getState().temperatureManual) return
          useSettings.getState().setTemperature(t, 'auto')
          toast('Temperature auto-set from your location', 'success')
        } catch {
          /* offline or blocked: keep the current temperature */
        }
      },
      () => {
        /* permission denied: keep the current temperature */
      },
      { maximumAge: 30 * 60 * 1000, timeout: 10000 },
    )
    return () => {
      cancelled = true
    }
  }, [])
}
