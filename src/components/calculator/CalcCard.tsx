import { Children, isValidElement, type ReactNode, useId } from 'react'
import { useCalcMeta } from './calcMeta'

export interface CalcInfo {
  /** What the calculator does — shown under the title. */
  what: string
  /** When an engineer would reach for it. */
  when: string
  /** The maths, shown in the "How it's calculated" disclosure. */
  formula: string
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2">
      {children}
    </h3>
  )
}

/**
 * A calculator, laid out as: title and plain-language description; inputs beside results; the
 * formula tucked into a disclosure. `<Inputs>` / `<InputGroup>` children go in the inputs column
 * and everything else in the results column. `stacked` puts everything in one column for
 * input-heavy tools such as the input list.
 */
export function CalcCard({
  title,
  info,
  children,
  layout = 'split',
}: {
  title: string
  info: CalcInfo
  children: ReactNode
  layout?: 'split' | 'stacked'
}) {
  const headingId = useId()
  const inputs: ReactNode[] = []
  const results: ReactNode[] = []
  Children.forEach(children, (child) => {
    const isInput = isValidElement(child) && (child.type as { slot?: string }).slot === 'inputs'
    ;(isInput ? inputs : results).push(child)
  })

  const meta = useCalcMeta()
  const name = meta?.label ?? title

  return (
    <section
      aria-labelledby={headingId}
      className="card overflow-hidden rounded-[22px] border border-line bg-surface"
    >
      <header className="border-b border-divider px-5 pb-6 pt-6 md:px-9 md:pt-8">
        {meta && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2">
            {meta.page}
            <span aria-hidden="true" className="text-fg-muted">
              /
            </span>
            <span className="rounded-full border border-line px-2 py-0.5 tracking-[0.08em] normal-case text-fg-2">
              {meta.tech}
            </span>
          </p>
        )}
        <h2
          id={headingId}
          className="font-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.015em] text-fg md:text-[34px]"
        >
          {name}
        </h2>
        {meta && (
          <p className="mt-2 font-serif text-lg italic leading-snug text-fg-2 md:text-xl">
            {meta.question}
          </p>
        )}
        <div className="mt-5 grid max-w-3xl gap-2 text-[14px] leading-relaxed text-fg-2">
          <p>{info.what}</p>
          <p>
            <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-ink">
              Use it when
            </span>
            {info.when}
          </p>
        </div>
      </header>

      {layout === 'split' ? (
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-5 border-b border-divider px-5 py-7 md:px-9 lg:border-r lg:border-b-0">
            <SectionLabel>Inputs</SectionLabel>
            <div className="-mt-4 flex flex-col gap-5">{inputs}</div>
          </div>
          <div
            className="flex min-w-0 flex-col gap-4 bg-canvas/40 px-5 py-6 md:px-8"
            aria-live="polite"
          >
            <SectionLabel>Results</SectionLabel>
            <div className="-mt-4 flex min-w-0 flex-col gap-4">{results}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-5 py-7 md:px-9">
          {inputs}
          {results}
        </div>
      )}

      <details className="group border-t border-divider px-5 py-4 md:px-9">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          How it’s calculated
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-const px-4 py-3 font-serif text-[15px] leading-relaxed text-const-fg">
          {info.formula}
        </pre>
      </details>
    </section>
  )
}

/** Grid of input fields (inputs column). */
export function Inputs({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">{children}</div>
}

Inputs.slot = 'inputs' as const

/** Free-form input content such as list editors (inputs column). */
export function InputGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}
InputGroup.slot = 'inputs' as const

/**
 * Inputs most people can skip, collapsed by default so newcomers only see the essentials.
 * Opens automatically when any of its values is set (`active`).
 */
export function Optional({
  title,
  active = false,
  children,
}: {
  title: string
  active?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={active || undefined}
      className="group rounded-xl border border-dashed border-line"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[13px] font-medium text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
        <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        {title}
        <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
          Optional
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-1">
        {children}
      </div>
    </details>
  )
}
Optional.slot = 'inputs' as const

/** Grid of results (results column). */
export function Outputs({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}
