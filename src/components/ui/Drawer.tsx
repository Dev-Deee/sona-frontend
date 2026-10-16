import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { Icon } from './icons'
import { springSheet } from './motion'

/**
 * Slide-out panel from the right (full-width sheet on phones). It enters and leaves along the
 * same path, and can be closed mid-animation.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springSheet}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-[0_0_80px_-20px_rgb(0_0_0/0.8)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springSheet}
          >
            <header className="flex items-center justify-between border-b border-divider px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <h2 id={titleId} className="font-serif text-xl font-semibold tracking-tight text-fg">
                {title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="press inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-2 hover:bg-input hover:text-fg"
              >
                <Icon.Close />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
