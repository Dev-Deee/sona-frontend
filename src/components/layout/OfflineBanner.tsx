import { useOnline } from '../../hooks/useOnline'
import { Icon } from '../ui/icons'

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-const px-4 py-1.5 text-xs text-const-fg"
    >
      <Icon.Offline size={14} />
      You’re offline — every calculator still works. Sync and sharing resume when you reconnect.
    </div>
  )
}
