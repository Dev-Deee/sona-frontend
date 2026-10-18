import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import { formatNumber } from '../../calculators/format'
import {
  CATEGORY_FILTERS,
  CATEGORY_LABEL,
  type CategoryFilter,
  filterSpeakers,
  findSpeaker,
  getSplAt1m,
  type Speaker,
  type SpeakerType,
  SPEAKERS,
  speakerName,
} from '../../data/speakers'
import { Icon } from '../ui/icons'
import { springSheet } from '../ui/motion'

const TYPE_FILTERS: { value: SpeakerType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'passive', label: 'Passive' },
]

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`press min-h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors ${
        selected
          ? 'border-transparent bg-accent text-accent-fg'
          : 'border-line text-fg-2 hover:border-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

/** One-line spec summary shown under each result. */
function specLine(s: Speaker) {
  const spl = getSplAt1m(s)
  const parts = [
    s.type === 'active' ? 'Active' : 'Passive',
    CATEGORY_LABEL[s.category],
    spl !== null && `${formatNumber(spl, 0)} dB max`,
    s.hCoverage !== null && `${s.hCoverage}°${s.vCoverage !== null ? ` × ${s.vCoverage}°` : ''}`,
    s.weightKg !== null && `${formatNumber(s.weightKg, 1)} kg`,
  ]
  return parts.filter(Boolean).join(' · ')
}

/**
 * Searchable speaker library. Full-screen on phones, a centred dialog on larger screens.
 * Choosing a speaker hands it to `onSelect`; the calculator decides which fields to fill.
 */
export function SpeakerPickerModal({
  open,
  onClose,
  onSelect,
  initialCategory = 'all',
  initialType = 'all',
}: {
  open: boolean
  onClose: () => void
  onSelect: (speaker: Speaker) => void
  initialCategory?: CategoryFilter
  initialType?: SpeakerType | 'all'
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>(initialCategory)
  const [type, setType] = useState<SpeakerType | 'all'>(initialType)
  const deferred = useDeferredValue(query)
  const titleId = useId()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    searchRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(
    () =>
      filterSpeakers(SPEAKERS, deferred, category, type).sort((a, b) =>
        speakerName(a).localeCompare(speakerName(b)),
      ),
    [deferred, category, type],
  )

  // Portalled: calculator cards sit inside animated (transformed) parents, which would
  // otherwise trap a `fixed` overlay.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springSheet}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex h-full w-full flex-col bg-surface shadow-[0_0_80px_-20px_rgb(0_0_0/0.8)] md:h-[min(720px,85dvh)] md:max-w-2xl md:rounded-[20px] md:border md:border-line"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={springSheet}
          >
            <header className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div>
                <h2
                  id={titleId}
                  className="font-serif text-xl font-semibold tracking-tight text-fg"
                >
                  Speaker library
                </h2>
                <p className="text-[12px] text-fg-muted">
                  {SPEAKERS.length} speakers from published spec sheets
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="press inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-2 hover:bg-input hover:text-fg"
              >
                <Icon.Close />
              </button>
            </header>

            <div className="flex flex-col gap-3 border-b border-divider px-5 py-4">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-fg-muted">
                  <Icon.Search size={18} />
                </span>
                <label htmlFor={`${titleId}-q`} className="sr-only">
                  Search speakers
                </label>
                <input
                  ref={searchRef}
                  id={`${titleId}-q`}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Brand or model, e.g. “d&b J8” or “K2”"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-line bg-input pl-11 pr-3 text-base text-fg outline-none transition placeholder:text-fg-muted focus:border-accent-ink/70 focus:ring-2 focus:ring-accent"
                />
              </div>
              <div
                role="group"
                aria-label="Category"
                className="fade-edges -mx-5 flex gap-2 overflow-x-auto px-5"
              >
                {CATEGORY_FILTERS.map((c) => (
                  <Chip
                    key={c.value}
                    selected={category === c.value}
                    onClick={() => setCategory(c.value)}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
              <div role="group" aria-label="Type" className="flex gap-2">
                {TYPE_FILTERS.map((t) => (
                  <Chip key={t.value} selected={type === t.value} onClick={() => setType(t.value)}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2" aria-live="polite">
              {results.length === 0 ? (
                <p className="px-2 py-6 font-serif text-[15px] text-fg-2">
                  No speakers match. Try just the model name, clear a filter, or enter the specs by
                  hand.
                </p>
              ) : (
                <ul aria-label="Speakers" className="flex flex-col">
                  {results.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(s)}
                        className="press flex min-h-14 w-full flex-col items-start justify-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-input"
                      >
                        <span className="text-[15px] font-medium text-fg">
                          <span className="text-fg-2">{s.manufacturer}</span> {s.model}
                        </span>
                        <span className="text-[12px] leading-snug text-fg-muted">
                          {specLine(s)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-divider px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="press min-h-11 text-[14px] font-medium text-accent-ink underline-offset-4 hover:underline"
              >
                Enter manually instead
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/**
 * Library button for a calculator's inputs. Shows the chosen speaker as a chip ("d&b J8 — tap
 * to clear"); the fields it filled stay editable.
 */
export function SpeakerSelect({
  label = 'Choose from the speaker library',
  speakerId,
  onSelect,
  onClear,
  initialCategory,
  initialType,
}: {
  label?: string
  speakerId: string | null
  onSelect: (speaker: Speaker) => void
  onClear: () => void
  initialCategory?: CategoryFilter
  initialType?: SpeakerType | 'all'
}) {
  const [open, setOpen] = useState(false)
  // A fresh picker per opening, so search and filters start from this calculator's defaults.
  const [session, setSession] = useState(0)
  const speaker = findSpeaker(speakerId)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {speaker ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={`${speakerName(speaker)} selected — clear speaker`}
          className="press inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-accent-ink/40 bg-accent px-4 text-[14px] font-medium text-accent-fg"
        >
          {speakerName(speaker)}
          <span className="text-accent-fg/70">— tap to clear</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSession((n) => n + 1)
            setOpen(true)
          }}
          className="press inline-flex min-h-11 items-center gap-2 self-start whitespace-nowrap rounded-xl border border-dashed border-line px-4 text-[14px] font-medium text-fg-2 transition-colors hover:border-fg-muted hover:text-fg"
        >
          <Icon.Search size={16} />
          {label}
        </button>
      )}
      <span className="text-xs leading-snug text-fg-muted">
        {speaker
          ? 'Specs filled from the datasheet — you can still change any value.'
          : 'Or type the values from your spec sheet below.'}
      </span>
      <SpeakerPickerModal
        key={session}
        open={open}
        onClose={() => setOpen(false)}
        initialCategory={initialCategory}
        initialType={initialType}
        onSelect={(s) => {
          setOpen(false)
          onSelect(s)
        }}
      />
    </div>
  )
}
