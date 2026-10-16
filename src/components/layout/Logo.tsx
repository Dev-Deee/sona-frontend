/** `markOnly` drops the wordmark where space is tight (phone top bar). */
export function Logo({
  compact = false,
  markOnly = false,
}: {
  compact?: boolean
  markOnly?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill="var(--teal-950)" />
        <circle cx="24.3" cy="32" r="4.5" fill="var(--amber-400)" />
        <g fill="none" stroke="var(--teal-300)" strokeWidth="3.5" strokeLinecap="round">
          <path d="M31.5 24.8a10.2 10.2 0 0 1 0 14.4" />
          <path d="M37.6 18.7a18.8 18.8 0 0 1 0 26.6" />
          <path d="M43.7 12.6a27.4 27.4 0 0 1 0 38.8" />
        </g>
      </svg>
      {!markOnly && (
        <span
          className={`font-semibold tracking-[0.25em] text-fg ${compact ? 'text-sm' : 'text-base'}`}
        >
          SONA
        </span>
      )}
    </div>
  )
}
