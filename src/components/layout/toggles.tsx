import { useSettings, type ThemeMode } from '../../store/settingsStore'
import { Icon } from '../ui/icons'

const THEME_LABEL: Record<ThemeMode, string> = { dark: 'Dark', dim: 'Dim', bright: 'Bright' }
const THEME_ICON = { dark: Icon.Moon, dim: Icon.Dim, bright: Icon.Sun }

/** Cycles Dark → Dim → Bright. */
export function ThemeToggle() {
  const theme = useSettings((s) => s.theme)
  const cycle = useSettings((s) => s.cycleTheme)
  const ThemeIcon = THEME_ICON[theme]
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Brightness: ${THEME_LABEL[theme]}. Switch brightness mode`}
      title={`Brightness: ${THEME_LABEL[theme]}`}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-fg-2 transition hover:bg-input hover:text-fg"
    >
      <ThemeIcon size={20} />
      <span className="hidden text-xs lg:inline">{THEME_LABEL[theme]}</span>
    </button>
  )
}

/** Metric / Imperial switch. `compact` renders a single m/ft button for the mobile topbar. */
export function UnitToggle({ compact = false }: { compact?: boolean }) {
  const system = useSettings((s) => s.unitSystem)
  const setSystem = useSettings((s) => s.setUnitSystem)
  const toggle = useSettings((s) => s.toggleUnitSystem)
  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={`Units: ${system}. Switch to ${system === 'metric' ? 'imperial' : 'metric'}`}
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-md px-2 font-num text-xs text-accent-ink hover:bg-input"
      >
        {system === 'metric' ? 'm' : 'ft'}
      </button>
    )
  }
  return (
    <div
      role="radiogroup"
      aria-label="Unit system"
      className="flex rounded-md border border-line bg-input p-0.5"
    >
      {(['metric', 'imperial'] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={system === s}
          onClick={() => setSystem(s)}
          className={`min-h-10 flex-1 rounded px-2 text-xs font-medium capitalize transition ${
            system === s ? 'bg-accent text-accent-fg' : 'text-fg-2 hover:text-fg'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
