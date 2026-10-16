import { create } from 'zustand'
import type { UnitSystem } from '../calculators/units'
import { readLocal, writeLocal } from './storage'

export type ThemeMode = 'dark' | 'dim' | 'bright'

export const THEME_KEY = 'sona_theme'
export const UNITS_KEY = 'sona_units'
export const TEMPERATURE_KEY = 'sona_temperature'
export const SIDEBAR_KEY = 'sona_sidebar'
export const DEFAULT_TEMPERATURE_C = 20

const THEMES: ThemeMode[] = ['dark', 'dim', 'bright']

function initialTheme(): ThemeMode {
  const saved = readLocal(THEME_KEY)
  return THEMES.includes(saved as ThemeMode) ? (saved as ThemeMode) : 'dark'
}

function initialUnits(): UnitSystem {
  return readLocal(UNITS_KEY) === 'imperial' ? 'imperial' : 'metric'
}

function initialTemperature(): { value: number; manual: boolean } {
  try {
    const parsed = JSON.parse(readLocal(TEMPERATURE_KEY) ?? 'null') as {
      c?: unknown
      manual?: unknown
    } | null
    if (parsed && typeof parsed.c === 'number' && Number.isFinite(parsed.c)) {
      return { value: parsed.c, manual: parsed.manual === true }
    }
  } catch {
    /* ignore corrupt value */
  }
  return { value: DEFAULT_TEMPERATURE_C, manual: false }
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', theme === 'bright' ? '#ffffff' : '#134e4a')
}

interface SettingsState {
  unitSystem: UnitSystem
  theme: ThemeMode
  /** Shared ambient temperature (°C) used by every temperature-dependent calculator. */
  temperatureC: number | null
  /** True once the user has typed a temperature; auto-fetch then leaves it alone. */
  temperatureManual: boolean
  setUnitSystem: (system: UnitSystem) => void
  toggleUnitSystem: () => void
  setTheme: (theme: ThemeMode) => void
  cycleTheme: () => void
  setTemperature: (celsius: number | null, source?: 'manual' | 'auto') => void
  /** Desktop sidebar collapsed to an icon rail. */
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const persistTemperature = (c: number | null, manual: boolean) => {
  if (c !== null) writeLocal(TEMPERATURE_KEY, JSON.stringify({ c, manual }))
}

const temp = initialTemperature()

export const useSettings = create<SettingsState>((set, get) => ({
  unitSystem: initialUnits(),
  theme: initialTheme(),
  temperatureC: temp.value,
  temperatureManual: temp.manual,
  sidebarCollapsed: readLocal(SIDEBAR_KEY) === 'collapsed',
  toggleSidebar: () => {
    const sidebarCollapsed = !get().sidebarCollapsed
    writeLocal(SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'expanded')
    set({ sidebarCollapsed })
  },
  setUnitSystem: (unitSystem) => {
    writeLocal(UNITS_KEY, unitSystem)
    set({ unitSystem })
  },
  toggleUnitSystem: () =>
    get().setUnitSystem(get().unitSystem === 'metric' ? 'imperial' : 'metric'),
  setTheme: (theme) => {
    writeLocal(THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
  cycleTheme: () => {
    const next = THEMES[(THEMES.indexOf(get().theme) + 1) % THEMES.length]
    get().setTheme(next)
  },
  setTemperature: (celsius, source = 'manual') => {
    const manual = source === 'manual' ? true : get().temperatureManual
    persistTemperature(celsius, manual)
    set({ temperatureC: celsius, temperatureManual: manual })
  },
}))
