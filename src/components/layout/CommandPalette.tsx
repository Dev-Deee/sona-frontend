import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { navigate } from '../../hooks/useHashRoute'
import { ALL_CALCULATORS, searchCalculators } from '../../tabs/search'
import { Icon } from '../ui/icons'
import { springFast } from '../ui/motion'

/**
 * Quick search across every calculator (Ctrl/⌘ + K). Arrow keys move, Enter opens.
 * With an empty query it lists everything, so it doubles as a full index.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const results = useMemo(
    () =>
      query.trim()
        ? searchCalculators(query, 30)
        : ALL_CALCULATORS.map((x) => ({ ...x, score: 0 })),
    [query],
  )
  const selected = Math.min(index, Math.max(results.length - 1, 0))

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const close = () => {
    setQuery('')
    setIndex(0)
    onClose()
  }

  const go = (i: number) => {
    const hit = results[i]
    if (!hit) return
    navigate(hit.tab.id, hit.calc.slug)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((selected + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((selected - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(selected)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${selected}`)?.scrollIntoView({ block: 'nearest' })
  }, [selected, listId])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springFast}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search calculators"
            className="relative flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={springFast}
          >
            <div className="flex items-center gap-3 border-b border-divider px-4">
              <Icon.Search size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setIndex(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="What do you need to work out?"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results.length ? `${listId}-${selected}` : undefined}
                className="h-14 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-muted focus-visible:outline-none"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-fg-muted">
                Esc
              </kbd>
            </div>
            <ul id={listId} role="listbox" aria-label="Calculators" className="overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-fg-2">
                  No calculator matches “{query}”.
                </li>
              )}
              {results.map(({ tab, calc }, i) => (
                <li
                  key={`${tab.id}/${calc.slug}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === selected}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => go(i)}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl px-3 py-2.5 ${
                    i === selected ? 'bg-input' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-fg">{calc.label}</span>
                    <span className="block truncate text-[12px] text-fg-2">{calc.question}</span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-[11px] text-fg-muted">{tab.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
