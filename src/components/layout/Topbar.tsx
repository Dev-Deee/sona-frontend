import { useAuth } from '../../store/authStore'
import { tabMeta, type TabId } from '../../tabs/registry'
import { IconButton } from '../ui/Button'
import { Icon } from '../ui/icons'
import { Logo } from './Logo'
import { ThemeToggle } from './toggles'

export type Panel = 'history' | 'presets' | 'account' | 'share' | 'search' | null

/**
 * Translucent top bar: where you are (group / page) on the left, actions on the right. Presets
 * and share appear only for calculators that have inputs.
 */
export function Topbar({
  active,
  calcLabel,
  onOpen,
  onOpenNav,
}: {
  active: TabId | 'home'
  /** Label of the calculator on screen, or null when it has no inputs (home, reference). */
  calcLabel: string | null
  onOpen: (panel: Exclude<Panel, null>) => void
  /** Phones: open the page list from the left. */
  onOpenNav: () => void
}) {
  const meta = active === 'home' ? null : tabMeta(active)
  const user = useAuth((s) => s.user)
  const actions = (
    <div className="flex items-center">
      <span className="md:hidden">
        <IconButton label="Search calculators" onClick={() => onOpen('search')}>
          <Icon.Search />
        </IconButton>
      </span>
      {calcLabel && (
        <>
          <IconButton label={`Presets for ${calcLabel}`} onClick={() => onOpen('presets')}>
            <Icon.Bookmark />
          </IconButton>
          <IconButton label={`Share ${calcLabel}`} onClick={() => onOpen('share')}>
            <Icon.Share />
          </IconButton>
        </>
      )}
      <IconButton label="Calculation history" onClick={() => onOpen('history')}>
        <Icon.History />
      </IconButton>
      <span className="hidden md:inline-flex">
        <ThemeToggle />
      </span>
      <IconButton
        label={user ? `Account (${user.email})` : 'Sign in'}
        onClick={() => onOpen('account')}
        active={!!user}
      >
        <Icon.User />
      </IconButton>
    </div>
  )

  return (
    <header className="sticky top-0 z-20 border-b border-divider/70 bg-canvas/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
      <div className="flex h-14 items-center justify-between px-2 md:hidden">
        <div className="flex items-center">
          <IconButton label="Open navigation" onClick={onOpenNav}>
            <Icon.Menu />
          </IconButton>
          <a href="#/" className="pl-1" aria-label="Sona home">
            <Logo compact markOnly />
          </a>
        </div>
        {actions}
      </div>
      <div
        className={`items-center justify-between px-4 pb-3 md:flex md:h-[72px] md:px-8 md:pb-0 ${meta ? 'flex' : 'hidden'}`}
      >
        {meta ? (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
              {meta.group}
            </p>
            <h1 className="truncate font-serif text-[22px] font-semibold leading-tight tracking-[-0.01em] text-fg md:text-[26px]">
              {meta.label}
            </h1>
          </div>
        ) : (
          <span />
        )}
        <div className="hidden md:block">{actions}</div>
      </div>
    </header>
  )
}
