import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { formatInputValue } from '../../calculators/format'
import { fromDisplay, type QuantityKind, toDisplay, unitLabel } from '../../calculators/units'
import { useSettings } from '../../store/settingsStore'

const inputClass =
  'font-num h-12 w-full min-w-0 rounded-lg border border-line bg-input px-3.5 text-base font-medium text-fg outline-none transition placeholder:text-fg-muted hover:border-fg-muted/60 focus:border-accent-ink/70 focus:ring-2 focus:ring-accent'

function parse(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/**
 * Numeric input. With `kind`, the stored value is SI and the field shows/accepts the current
 * unit system's unit; toggling units re-renders the converted value without re-entry.
 */
export function NumberField({
  label,
  value,
  onChange,
  kind,
  unit,
  step = 'any',
  min,
  max,
  hint,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  kind?: QuantityKind
  unit?: string
  step?: number | 'any'
  min?: number
  max?: number
  hint?: ReactNode
}) {
  const system = useSettings((s) => s.unitSystem)
  const id = useId()
  const display = (si: number | null) =>
    si === null ? '' : formatInputValue(kind ? toDisplay(kind, si, system) : si, kind ? 3 : 6)
  const [text, setText] = useState(() => display(value))
  const lastEmitted = useRef<number | null>(value)
  const lastSystem = useRef(system)

  // Sync from outside (unit toggle, preset load, shared link) but not while the user's own
  // keystrokes are the source of the change.
  useEffect(() => {
    if (lastSystem.current !== system || value !== lastEmitted.current) {
      lastSystem.current = system
      lastEmitted.current = value
      setText(display(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, system])

  const unitText = kind ? unitLabel(kind, system) : unit
  const hintId = `${id}-hint`
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          type="text"
          autoComplete="off"
          value={text}
          step={step}
          min={min}
          max={max}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => {
            setText(e.target.value)
            const n = parse(e.target.value)
            const si = n === null ? null : kind ? fromDisplay(kind, n, system) : n
            lastEmitted.current = si
            onChange(si)
          }}
          className={`${inputClass} ${unitText ? 'pr-12' : ''}`}
        />
        {unitText && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-medium text-fg-muted"
          >
            {unitText}
          </span>
        )}
      </div>
      {hint && (
        <span id={hintId} className="text-xs leading-snug text-fg-muted">
          {hint}
        </span>
      )}
    </div>
  )
}

/** The shared ambient temperature. Editing it here updates every calculator. */
export function TemperatureField() {
  const temperatureC = useSettings((s) => s.temperatureC)
  const setTemperature = useSettings((s) => s.setTemperature)
  return (
    <NumberField
      label="Temperature"
      kind="temperature"
      value={temperatureC}
      onChange={(v) => setTemperature(v, 'manual')}
      hint="Air temperature at the venue. Shared by every calculator."
    />
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: ReactNode
}) {
  const labelId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] font-medium text-fg-2" id={labelId}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex rounded-lg border border-line bg-input p-1"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-10 flex-1 rounded-md px-2 text-[13px] font-medium transition ${
              value === o.value ? 'bg-accent text-accent-fg' : 'text-fg-2 hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <span className="text-xs leading-snug text-fg-muted">{hint}</span>}
    </div>
  )
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
        {label}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => {
          const match = options.find((o) => String(o.value) === e.target.value)
          if (match) onChange(match.value)
        }}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="text-xs leading-snug text-fg-muted">{hint}</span>}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass.replace('font-num ', '')}
      />
    </div>
  )
}
