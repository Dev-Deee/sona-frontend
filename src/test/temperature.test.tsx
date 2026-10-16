import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentTemperature, useTemperatureAutoFetch } from '../hooks/useTemperatureAutoFetch'
import { useSettings } from '../store/settingsStore'
import { useToasts } from '../store/toastStore'

const geolocation = {
  getCurrentPosition: vi.fn((success: PositionCallback) =>
    success({ coords: { latitude: 6.5244, longitude: 3.3792 } } as GeolocationPosition),
  ),
}

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation })
  useSettings.setState({ temperatureC: 20, temperatureManual: false })
  useToasts.setState({ toasts: [] })
})

afterEach(() => {
  vi.unstubAllGlobals()
  geolocation.getCurrentPosition.mockClear()
})

describe('temperature auto-fetch', () => {
  it('pre-fills the temperature from Open-Meteo and shows a toast', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current_weather: { temperature: 29.4 } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useTemperatureAutoFetch())
    await waitFor(() => expect(useSettings.getState().temperatureC).toBe(29.4))
    expect(fetchMock.mock.calls[0][0]).toContain(
      'latitude=6.524&longitude=3.379&current_weather=true',
    )
    expect(useToasts.getState().toasts[0].message).toBe('Temperature auto-set from your location')
  })

  it('does nothing once the user has typed a temperature', () => {
    useSettings.setState({ temperatureManual: true })
    renderHook(() => useTemperatureAutoFetch())
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('only runs once per session', () => {
    sessionStorage.setItem('sona_temp_fetched', '1')
    renderHook(() => useTemperatureAutoFetch())
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('ignores bad responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchCurrentTemperature(0, 0)).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    expect(await fetchCurrentTemperature(0, 0)).toBeNull()
  })
})
