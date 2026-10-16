import { useToasts } from '../../store/toastStore'

const TONES = {
  info: 'border-line text-fg',
  success: 'border-accent-ink text-accent-ink',
  error: 'border-bad text-bad',
}

export function Toasts() {
  const { toasts, dismiss } = useToasts()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto min-h-11 rounded-md border bg-surface px-4 py-2 text-sm shadow-lg ${TONES[t.tone]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
