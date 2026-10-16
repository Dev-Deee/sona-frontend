import { CALCULATORS, type CalcEntry } from './calculators'
import { VISIBLE_TABS, type TabId, type TabMeta } from './registry'

export interface SearchHit {
  tab: TabMeta
  calc: CalcEntry
  score: number
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}%]+/gu, ' ')
    .trim()

/** Every calculator on a visible page, in navigation order. */
export const ALL_CALCULATORS: { tab: TabMeta; calc: CalcEntry }[] = VISIBLE_TABS.flatMap((tab) =>
  CALCULATORS[tab.id].map((calc) => ({ tab, calc })),
)

/**
 * Ranks calculators for a query. Every word must appear somewhere (name, technical term,
 * question, keywords or page); name matches rank highest, then prefix matches.
 */
export function searchCalculators(query: string, limit = 12): SearchHit[] {
  const words = normalise(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  const hits: SearchHit[] = []
  for (const { tab, calc } of ALL_CALCULATORS) {
    const name = normalise(calc.label)
    const tech = normalise(calc.tech)
    const haystack = `${name} ${tech} ${normalise(calc.question)} ${normalise(calc.keywords)} ${normalise(tab.label)}`
    let score = 0
    let all = true
    for (const w of words) {
      if (!haystack.includes(w)) {
        all = false
        break
      }
      if (name.startsWith(w)) score += 6
      else if (name.includes(w)) score += 4
      else if (tech.includes(w)) score += 3
      else score += 1
    }
    if (all) hits.push({ tab, calc, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

export const calcHref = (tab: TabId, slug: string) => `#/${tab}/${slug}`
