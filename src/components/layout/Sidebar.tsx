import { LayoutGroup, motion } from 'motion/react'
import { NAV_GROUPS, TABS, type TabId } from '../../tabs/registry'
import { Icon } from '../ui/icons'
import { springFast } from '../ui/motion'
import { Logo } from './Logo'
import { UnitToggle } from './toggles'

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`press relative flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
        active ? 'text-accent-fg' : 'text-fg-2 hover:bg-input hover:text-fg'
      }`}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
          transition={springFast}
          aria-hidden="true"
        />
      )}
      <span className="relative flex items-center gap-2.5">
        {icon}
        {children}
      </span>
    </a>
  )
}

/** Desktop navigation: Home, search, then pages grouped by job. */
export function Sidebar({
  active,
  onOpenSearch,
}: {
  active: TabId | 'home'
  onOpenSearch: () => void
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-divider bg-surface/70 backdrop-blur-xl md:flex">
      <div className="flex h-[72px] items-center px-5">
        <a href="#/" aria-label="Sona home">
          <Logo />
        </a>
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="press flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-input px-3 text-[13px] text-fg-muted transition-colors hover:border-fg-muted hover:text-fg-2"
        >
          <Icon.Search size={16} />
          Search
          <kbd className="ml-auto rounded border border-line px-1 text-[10px]">Ctrl K</kbd>
        </button>
      </div>
      <nav aria-label="Pages" className="flex-1 overflow-y-auto px-3 pb-4">
        <LayoutGroup id="sidebar">
          <NavLink href="#/" active={active === 'home'} icon={<Icon.Home size={18} />}>
            All calculators
          </NavLink>
          {NAV_GROUPS.map((group) => (
            <div key={group} className="mt-5">
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
                {group}
              </p>
              <ul className="flex flex-col gap-0.5">
                {TABS.filter((t) => t.group === group).map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <li key={tab.id}>
                      <NavLink
                        href={`#/${tab.id}`}
                        active={tab.id === active}
                        icon={<TabIcon size={18} />}
                      >
                        {tab.label}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </LayoutGroup>
      </nav>
      <div className="border-t border-divider p-3">
        <UnitToggle />
      </div>
    </aside>
  )
}
