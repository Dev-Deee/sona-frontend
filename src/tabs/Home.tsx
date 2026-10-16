import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Icon } from '../components/ui/icons'
import { spring } from '../components/ui/motion'
import { useHistory } from '../store/historyStore'
import { CALCULATORS, findByCalcId } from './calculators'
import { NAV_GROUPS, VISIBLE_TABS, type TabId } from './registry'
import { ALL_CALCULATORS, calcHref, searchCalculators } from './search'

const GROUP_BLURB: Record<string, string> = {
  Sound: 'How sound behaves — in air, in rooms, and for speech.',
  System: 'Designing and aiming the PA.',
  Show: 'Power, wireless and show-day prep.',
  Learn: 'Formulas, constants and tables.',
}

/** Recently used calculators, newest first, from this session's history. */
function useRecent() {
  const entries = useHistory((s) => s.entries)
  return useMemo(() => {
    const seen = new Set<string>()
    const out: { tab: TabId; slug: string; label: string; question: string }[] = []
    for (const e of entries) {
      if (seen.has(e.calcId)) continue
      seen.add(e.calcId)
      const tab = e.calcId.split('.')[0] as TabId
      const calc = CALCULATORS[tab] ? findByCalcId(tab, e.calcId) : undefined
      if (calc) out.push({ tab, slug: calc.slug, label: calc.label, question: calc.question })
      if (out.length === 4) break
    }
    return out
  }, [entries])
}

export function Home({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [query, setQuery] = useState('')
  const hits = searchCalculators(query, 20)
  const recent = useRecent()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 pb-8">
      <motion.section
        {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: spring }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-ink">
          Built for engineers behind the show
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-[40px] font-semibold leading-[1.02] tracking-[-0.025em] text-fg md:text-[60px]">
          What do you need to work out?
        </h1>
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-fg-2 md:text-xl">
          {ALL_CALCULATORS.length} calculators for live, installed and worship sound. Search for
          what you’re trying to answer, or browse by task below. Everything works offline.
        </p>
        <div className="relative mt-8 max-w-2xl">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-fg-muted">
            <Icon.Search size={20} />
          </span>
          <label htmlFor="home-search" className="sr-only">
            Search calculators
          </label>
          <input
            id="home-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “delay”, “subs”, “feedback” or “how loud”"
            autoComplete="off"
            className="h-14 w-full rounded-2xl border border-line bg-input pl-12 pr-24 text-base text-fg shadow-[0_10px_40px_-20px_rgb(0_0_0/0.6)] outline-none transition placeholder:text-fg-muted focus:border-accent-ink/60 focus:ring-4 focus:ring-accent/60"
          />
          <button
            type="button"
            onClick={onOpenSearch}
            className="absolute inset-y-0 right-3 my-auto hidden h-8 items-center rounded-md border border-line px-2 text-[11px] font-medium text-fg-muted md:inline-flex"
            aria-label="Open quick search"
          >
            Ctrl K
          </button>
        </div>
      </motion.section>

      {query.trim() ? (
        <section aria-label="Search results">
          {hits.length === 0 ? (
            <p className="font-serif text-lg text-fg-2">
              No calculator matches “{query}”. Try a simpler word, like “delay” or “dB”.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {hits.map(({ tab, calc }, i) => (
                <motion.li
                  key={`${tab.id}/${calc.slug}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: Math.min(i, 8) * 0.025 }}
                >
                  <CalcLink
                    tab={tab.id}
                    slug={calc.slug}
                    label={calc.label}
                    tech={calc.tech}
                    question={calc.question}
                    page={tab.label}
                  />
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {recent.length > 0 && (
            <section aria-labelledby="home-recent">
              <h2
                id="home-recent"
                className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-2"
              >
                Pick up where you left off
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recent.map((r) => (
                  <li key={`${r.tab}/${r.slug}`}>
                    <a
                      href={calcHref(r.tab, r.slug)}
                      className="press block h-full rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-fg-muted"
                    >
                      <span className="block font-medium text-fg">{r.label}</span>
                      <span className="mt-1 block text-[13px] leading-snug text-fg-2">
                        {r.question}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {NAV_GROUPS.map((group, gi) => (
            <motion.section
              key={group}
              aria-labelledby={`home-group-${group}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.08 + gi * 0.06 }}
            >
              <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-divider pb-3">
                <h2
                  id={`home-group-${group}`}
                  className="font-serif text-2xl font-semibold tracking-tight text-fg md:text-[28px]"
                >
                  {group}
                </h2>
                <p className="hidden text-[13px] text-fg-2 sm:block">{GROUP_BLURB[group]}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {VISIBLE_TABS.filter((t) => t.group === group).map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <article
                      key={tab.id}
                      className="card flex flex-col rounded-[20px] border border-line bg-surface p-5"
                    >
                      <a href={`#/${tab.id}`} className="group mb-4 flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg">
                          <TabIcon size={20} />
                        </span>
                        <span>
                          <span className="block font-serif text-xl font-semibold tracking-tight text-fg group-hover:underline group-hover:decoration-accent-ink group-hover:underline-offset-4">
                            {tab.label}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-fg-2">
                            {tab.subtitle}
                          </span>
                        </span>
                      </a>
                      <ul className="-mx-2 flex flex-col">
                        {CALCULATORS[tab.id].map((calc) => (
                          <li key={calc.slug}>
                            <a
                              href={calcHref(tab.id, calc.slug)}
                              className="press flex min-h-11 flex-col justify-center rounded-lg px-2 py-1.5 transition-colors hover:bg-input"
                            >
                              <span className="text-[14px] font-medium text-fg">{calc.label}</span>
                              <span className="text-[12px] leading-snug text-fg-2">
                                {calc.question}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </article>
                  )
                })}
              </div>
            </motion.section>
          ))}
        </>
      )}
    </div>
  )
}

export function CalcLink({
  tab,
  slug,
  label,
  tech,
  question,
  page,
  active = false,
}: {
  tab: TabId
  slug: string
  label: string
  tech: string
  question: string
  page: string
  active?: boolean
}) {
  return (
    <a
      href={calcHref(tab, slug)}
      className={`press flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        active ? 'border-accent-ink/50 bg-input' : 'border-line bg-surface hover:border-fg-muted'
      }`}
    >
      <span className="min-w-0">
        <span className="block font-medium text-fg">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-fg-2">{question}</span>
      </span>
      <span className="shrink-0 text-right text-[11px] leading-tight text-fg-muted">
        {page}
        <span className="mt-1 block text-fg-2">{tech}</span>
      </span>
    </a>
  )
}
