import { LayoutGroup, motion } from 'motion/react'
import { type KeyboardEvent, useEffect, useRef } from 'react'
import { CalcMetaContext } from '../components/calculator/calcMeta'
import { rise, springFast } from '../components/ui/motion'
import { navigate } from '../hooks/useHashRoute'
import { useNav } from '../store/navStore'
import { CALCULATORS, resolveCalc } from './calculators'
import { tabMeta, type TabId } from './registry'

/**
 * One page: a strip of calculator tabs and the active calculator beneath it. The active
 * calculator lives in the URL (#/tab/slug) so it can be bookmarked, and the last one used on each
 * page is remembered.
 */
export function TabView({ tab, calc }: { tab: TabId; calc?: string }) {
  const lastCalc = useNav((s) => s.lastCalc[tab])
  const remember = useNav((s) => s.remember)
  const entries = CALCULATORS[tab]
  const active = resolveCalc(tab, calc, lastCalc)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    remember(tab, active.slug)
    tabRefs.current[active.slug]?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  }, [tab, active.slug, remember])

  const select = (slug: string, focus = false) => {
    navigate(tab, slug)
    if (focus) tabRefs.current[slug]?.focus()
  }

  // WAI-ARIA tabs pattern: arrows move between tabs, Home/End jump to the ends.
  const onKeyDown = (e: KeyboardEvent) => {
    const i = entries.findIndex((c) => c.slug === active.slug)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: entries.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    select(entries[(next + entries.length) % entries.length].slug, true)
  }

  const Active = active.component
  return (
    <div className="flex flex-col gap-6">
      <LayoutGroup id={`calc-tabs-${tab}`}>
        <div
          role="tablist"
          aria-label="Calculators on this page"
          onKeyDown={onKeyDown}
          className="fade-edges -mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {entries.map((entry) => {
            const selected = entry.slug === active.slug
            return (
              <button
                key={entry.slug}
                ref={(el) => {
                  tabRefs.current[entry.slug] = el
                }}
                id={`calc-tab-${entry.slug}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls="calc-panel"
                tabIndex={selected ? 0 : -1}
                title={entry.question}
                onClick={() => select(entry.slug)}
                className={`press relative min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
                  selected ? 'text-accent-fg' : 'text-fg-2 hover:bg-input hover:text-fg'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="calc-tab-pill"
                    className="absolute inset-0 rounded-full bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
                    transition={springFast}
                    aria-hidden="true"
                  />
                )}
                <span className="relative">{entry.label}</span>
              </button>
            )
          })}
        </div>
      </LayoutGroup>
      <CalcMetaContext.Provider
        value={{
          label: active.label,
          tech: active.tech,
          question: active.question,
          page: tabMeta(tab).label,
        }}
      >
        <motion.div
          id="calc-panel"
          role="tabpanel"
          aria-labelledby={`calc-tab-${active.slug}`}
          key={`${tab}/${active.slug}`}
          {...rise}
        >
          <Active />
        </motion.div>
      </CalcMetaContext.Provider>
    </div>
  )
}
