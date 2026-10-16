import { goHome, navigate } from '../../hooks/useHashRoute'
import { MOBILE_PRIMARY_TABS, NAV_GROUPS, VISIBLE_TABS, type TabId } from '../../tabs/registry'
import { Drawer } from '../ui/Drawer'
import { Icon } from '../ui/icons'
import { ThemeToggle, UnitToggle } from './toggles'

function BarButton({
  label,
  active,
  onClick,
  icon,
  popup = false,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  popup?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active && !popup ? 'page' : undefined}
      aria-haspopup={popup ? 'dialog' : undefined}
      className={`press flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium tracking-tight ${
        active ? 'text-accent-ink' : 'text-fg-2'
      }`}
    >
      <span
        className={`rounded-full px-3 py-0.5 transition-colors ${active ? 'bg-accent text-accent-fg' : ''}`}
      >
        {icon}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  )
}

/**
 * Phone navigation: Home + four main pages + More. The full page list is a drawer that both the
 * More button (slides in from the right) and the ☰ button in the top bar (from the left) open.
 */
export function MobileNav({
  active,
  navOpen,
  navSide,
  onOpenNav,
  onCloseNav,
}: {
  active: TabId | 'home'
  navOpen: boolean
  navSide: 'left' | 'right'
  onOpenNav: (side: 'left' | 'right') => void
  onCloseNav: () => void
}) {
  const primary = VISIBLE_TABS.filter((t) => MOBILE_PRIMARY_TABS.includes(t.id))
  const moreActive = active !== 'home' && !MOBILE_PRIMARY_TABS.includes(active)

  return (
    <>
      <nav
        aria-label="Pages"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="grid grid-cols-6">
          <li>
            <BarButton
              label="Home"
              active={active === 'home'}
              onClick={goHome}
              icon={<Icon.Home size={20} />}
            />
          </li>
          {primary.map((tab) => {
            const TabIcon = tab.icon
            return (
              <li key={tab.id}>
                <BarButton
                  label={tab.short}
                  active={tab.id === active}
                  onClick={() => navigate(tab.id)}
                  icon={<TabIcon size={20} />}
                />
              </li>
            )
          })}
          <li>
            <BarButton
              label="More"
              active={moreActive}
              onClick={() => onOpenNav('right')}
              icon={<Icon.More size={20} />}
              popup
            />
          </li>
        </ul>
      </nav>
      <Drawer open={navOpen} side={navSide} title="All pages" onClose={onCloseNav}>
        {NAV_GROUPS.map((group) => (
          <section key={group} className="mb-5">
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
              {group}
            </h3>
            <ul className="flex flex-col gap-1">
              {VISIBLE_TABS.filter((t) => t.group === group).map((tab) => {
                const TabIcon = tab.icon
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(tab.id)
                        onCloseNav()
                      }}
                      className={`press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${
                        tab.id === active ? 'bg-accent text-accent-fg' : 'text-fg hover:bg-input'
                      }`}
                    >
                      <TabIcon size={20} />
                      <span>
                        {tab.label}
                        <span className="block text-[11px] opacity-75">{tab.subtitle}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="mb-2 text-xs text-fg-2">Units</p>
            <UnitToggle />
          </div>
          <div>
            <p className="mb-2 text-xs text-fg-2">Brightness</p>
            <ThemeToggle />
          </div>
        </div>
      </Drawer>
    </>
  )
}
