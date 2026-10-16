import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_HISTORY, useHistory } from '../store/historyStore'
import { useInputsStore } from '../store/inputsStore'
import { useResults } from '../store/resultsStore'
import { useSettings } from '../store/settingsStore'
import {
  applySnapshot,
  captureCalc,
  captureCalcOutputs,
  snapshotCalcId,
} from '../features/snapshot'
import { parseHash } from '../hooks/useHashRoute'
import { ALL_CALCULATORS, searchCalculators } from '../tabs/search'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }))

describe('history store', () => {
  it('is newest-first, capped at 50 and de-duplicated per calculator', () => {
    useHistory.setState({ entries: [] })
    for (let i = 0; i < 60; i++) {
      useHistory.getState().add({ calcId: 'c', calculator: 'C', inputs: `${i}`, output: 'x' })
    }
    const entries = useHistory.getState().entries
    expect(entries).toHaveLength(MAX_HISTORY)
    expect(entries[0].inputs).toBe('59')
    useHistory.getState().add({ calcId: 'c', calculator: 'C', inputs: '59', output: 'x' })
    expect(useHistory.getState().entries).toHaveLength(MAX_HISTORY)
    useHistory.getState().clear()
    expect(useHistory.getState().entries).toEqual([])
  })
})

describe('results store', () => {
  it('publishes and clears summaries', () => {
    const { publish } = useResults.getState()
    publish('a.b', { title: 't', inputs: 'i', output: 'o' })
    const first = useResults.getState().results
    publish('a.b', { title: 't', inputs: 'i', output: 'o' })
    expect(useResults.getState().results).toBe(first)
    publish('a.b', null)
    expect(useResults.getState().results['a.b']).toBeUndefined()
  })
})

describe('snapshots', () => {
  it('capture and restore a single calculator, leaving the others alone', () => {
    useInputsStore.setState({
      values: { 'arrays.comb': { direct: 3 }, 'arrays.beaming': { boxHeight: 0.4 } },
    })
    useSettings.setState({ temperatureC: 31 })
    const snap = captureCalc('arrays.comb')
    expect(snap).toEqual({ calcId: 'arrays.comb', inputs: { direct: 3 }, temperatureC: 31 })
    expect(snapshotCalcId(snap)).toBe('arrays.comb')

    useInputsStore.setState({
      values: { 'arrays.comb': { direct: 9, reflected: 12 }, 'arrays.beaming': { boxHeight: 0.6 } },
    })
    useSettings.setState({ temperatureC: 10 })
    expect(applySnapshot(snap)).toBe('arrays.comb')
    // Replaced wholesale (reflected falls back to its default); the other calculator is untouched.
    expect(useInputsStore.getState().values).toEqual({
      'arrays.comb': { direct: 3 },
      'arrays.beaming': { boxHeight: 0.6 },
    })
    expect(useSettings.getState().temperatureC).toBe(31)
  })

  it('still reads older whole-page snapshots and rejects junk', () => {
    expect(applySnapshot({ calcs: { 'coverage.angle': { width: 9 } }, temperatureC: 22 })).toBe(
      'coverage.angle',
    )
    expect(useInputsStore.getState().values['coverage.angle']).toEqual({ width: 9 })
    expect(applySnapshot(null)).toBeNull()
    expect(applySnapshot({ calcs: 5 })).toBeNull()
    expect(snapshotCalcId({ calcs: {} })).toBeNull()
  })

  it('captures only the calculator’s own output', () => {
    useResults.setState({
      results: {
        'arrays.comb': { title: 'Comb', inputs: 'a', output: 'b' },
        'arrays.beaming': { title: 'Beam', inputs: 'c', output: 'd' },
      },
    })
    expect(Object.keys(captureCalcOutputs('arrays.comb'))).toEqual(['arrays.comb'])
    expect(captureCalcOutputs('nope')).toEqual({})
  })
})

describe('settings', () => {
  it('persists units, theme and temperature under the documented keys', () => {
    useSettings.setState({ temperatureManual: false })
    useSettings.getState().setUnitSystem('imperial')
    expect(localStorage.getItem('sona_units')).toBe('imperial')
    useSettings.getState().setTheme('bright')
    expect(localStorage.getItem('sona_theme')).toBe('bright')
    expect(document.documentElement.dataset.theme).toBe('bright')
    useSettings.getState().setTemperature(25, 'auto')
    expect(useSettings.getState().temperatureManual).toBe(false)
    useSettings.getState().setTemperature(26)
    expect(useSettings.getState().temperatureManual).toBe(true)
    expect(JSON.parse(localStorage.getItem('sona_temperature') ?? '{}')).toEqual({
      c: 26,
      manual: true,
    })
  })
})

describe('routing', () => {
  it('parses tab and share hashes', () => {
    expect(parseHash('#/arrays')).toEqual({ kind: 'tab', tab: 'arrays' })
    expect(parseHash('#/nope')).toEqual({ kind: 'tab', tab: 'acoustics' })
    expect(parseHash('')).toEqual({ kind: 'home' })
    expect(parseHash('#/')).toEqual({ kind: 'home' })
    // Reference is hidden: its old links go Home.
    expect(parseHash('#/reference/formulas')).toEqual({ kind: 'home' })
    expect(parseHash('#/share/abc123')).toEqual({ kind: 'share', token: 'abc123' })
    expect(parseHash('#/acoustics/rt60')).toEqual({ kind: 'tab', tab: 'acoustics', calc: 'rt60' })
  })
})

describe('PWA', () => {
  const originalSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
  afterEach(() => {
    if (originalSW) Object.defineProperty(navigator, 'serviceWorker', originalSW)
    else delete (navigator as unknown as Record<string, unknown>).serviceWorker
  })

  it('registers the service worker immediately when supported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
    const { registerSW } = await import('virtual:pwa-register')
    const { registerServiceWorker } = await import('../pwa')
    expect(registerServiceWorker()).toBe(true)
    expect(registerSW).toHaveBeenCalledWith({ immediate: true })
  })

  it('skips registration when service workers are unavailable', async () => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker
    const { registerServiceWorker } = await import('../pwa')
    expect(registerServiceWorker()).toBe(false)
  })
})

describe('calculator search', () => {
  it('indexes every calculator', () => {
    expect(ALL_CALCULATORS).toHaveLength(42)
    expect(ALL_CALCULATORS.some((x) => x.tab.id === 'reference')).toBe(false)
    expect(searchCalculators('formulas')).toEqual([])
  })
  it('finds calculators by plain words, technical terms and questions', () => {
    expect(searchCalculators('reverb')[0].calc.slug).toBe('rt60')
    expect(searchCalculators('rt60')[0].calc.slug).toBe('rt60')
    expect(searchCalculators('bass off stage')[0].calc.slug).toBe('cardioid-subs')
    expect(searchCalculators('delay').map((h) => h.calc.slug)).toEqual(
      expect.arrayContaining(['delays', 'delay-planner', 'phase-delay']),
    )
    expect(searchCalculators('')).toEqual([])
    expect(searchCalculators('zzzz')).toEqual([])
  })
})
