import { motion } from 'motion/react'
import { springFast } from '../ui/motion'
import type { ReactNode } from 'react'

/**
 * A computed value — amber, because it is the number the engineer actually needs. A full-width
 * primary output (`wide`, not `secondary`) is the calculator's headline figure.
 */
export function Output({
  label,
  value,
  unit,
  secondary = false,
  wide = false,
  help,
}: {
  label: string
  value: string
  unit?: string
  secondary?: boolean
  wide?: boolean
  /** One plain-language line on what the number means. */
  help?: ReactNode
}) {
  const hero = wide && !secondary
  return (
    <div
      className={`output min-w-0 rounded-2xl border border-out-fg/10 bg-out ${hero ? 'px-5 py-4' : 'px-4 py-3'} ${wide ? 'col-span-2' : ''}`}
    >
      <div className="text-xs font-medium leading-snug text-fg-2">{label}</div>
      <div
        className={`font-num mt-1 leading-tight ${
          hero
            ? 'text-4xl font-semibold text-out-fg md:text-5xl'
            : secondary
              ? 'text-lg font-medium text-out-2'
              : 'text-2xl font-semibold text-out-fg'
        }`}
        data-testid="output-value"
      >
        {/* Keyed on the value: each new result eases in, so changes are noticed without flicker. */}
        <motion.span
          key={value}
          className="inline-block"
          initial={{ opacity: 0.35, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFast}
        >
          {value}
        </motion.span>
        {unit && (
          <span className={`ml-1.5 font-medium text-fg-2 ${hero ? 'text-base' : 'text-xs'}`}>
            {unit}
          </span>
        )}
      </div>
      {help && <p className="mt-1.5 text-xs leading-snug text-fg-2">{help}</p>}
    </div>
  )
}

/** A fixed or derived constant (speed of sound, sample rate) — blue. */
export function ConstantBadge({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <span className="font-num inline-flex items-center gap-1.5 rounded-full bg-const px-3 py-1 text-xs text-const-fg">
      <span className="text-[11px] opacity-80">{label}</span>
      {value}
      {unit && <span className="opacity-80">{unit}</span>}
    </span>
  )
}

export function CalcError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-fg-2"
    >
      <span className="font-semibold text-warn">Invalid input — </span>
      {message}
    </p>
  )
}

export function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="space-y-1" aria-label="Warnings">
      {warnings.map((w) => (
        <li key={w} className="rounded-lg bg-out px-3 py-2 text-xs text-warn">
          ⚠ {w}
        </li>
      ))}
    </ul>
  )
}

export type Tone = 'good' | 'ok' | 'warn' | 'bad'

const TONE_CLASSES: Record<Tone, string> = {
  good: 'text-good border-good/40',
  ok: 'text-ok border-ok/40',
  warn: 'text-warn border-warn/40',
  bad: 'text-bad border-bad/40',
}

export function Rating({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div
      className={`col-span-2 flex items-center justify-between rounded-xl border px-4 py-3 ${TONE_CLASSES[tone]}`}
    >
      <span className="text-xs font-medium text-fg-2">{label}</span>
      <span className="flex items-center gap-2 text-sm font-semibold" data-tone={tone}>
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        {value}
      </span>
    </div>
  )
}

export function ResultTable({
  caption,
  headers,
  rows,
}: {
  caption?: string
  headers: ReactNode[]
  rows: ReactNode[][]
}) {
  return (
    <div className="col-span-2 overflow-x-auto rounded-xl border border-divider">
      <table className="w-full text-left text-[13px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-input text-xs text-fg-2">
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-num">
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-divider">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`px-4 py-2 ${c === 0 ? 'text-fg-2' : 'font-medium text-out-fg'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A plain-English summary of what the result means, in Lora — the sentence a newcomer reads first. */
export function Verdict({ children }: { children: ReactNode }) {
  return (
    <p className="col-span-2 rounded-xl border-l-2 border-accent-ink bg-input/60 px-4 py-3 font-serif text-[15px] leading-relaxed text-fg">
      {children}
    </p>
  )
}

/** A fixed rule of thumb or reference fact — blue, like other constants. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="col-span-2 rounded-xl bg-const px-4 py-3 text-[13px] leading-relaxed text-const-fg">
      {children}
    </p>
  )
}

/** A ✓ / ⚠ / ✗ line for pass/fail checks. */
export function Check({
  state,
  children,
}: {
  state: 'pass' | 'warn' | 'fail'
  children: ReactNode
}) {
  const tone = {
    pass: 'text-good border-good/40',
    warn: 'text-warn border-warn/40',
    fail: 'text-bad border-bad/40',
  }[state]
  const mark = { pass: '✓', warn: '⚠', fail: '✗' }[state]
  return (
    <div
      className={`col-span-2 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}
      data-check={state}
    >
      <span className="font-semibold" aria-hidden="true">
        {mark}
      </span>
      <span className="text-fg">{children}</span>
    </div>
  )
}
