import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useSettings } from '../../store/settingsStore'
import { NAV_GROUPS, VISIBLE_TABS, type TabId } from '../../tabs/registry'
import { Icon } from '../ui/icons'
import { spring, springFast } from '../ui/motion'
import { Logo } from './Logo'
import { UnitToggle } from './toggles'

const SIDEBAR_WIDTH = { expanded: 232, collapsed: 72 }

/** Labels fade out as the rail narrows and back in as it widens. */
function Label({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          className="truncate whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { ...springFast, delay: 0.06 } }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function NavLink({
  href,
  active,
  icon,
  label,
  collapsed,
}: {
  href: string
  active: boolean
  icon: ReactNode
  label: string
  collapsed: boolean
}) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={`press relative flex min-h-10 items-center rounded-lg text-[13px] font-medium transition-colors ${
        collapsed ? 'justify-center px-0' : 'px-2.5'
      } ${active ? 'text-accent-fg' : 'text-fg-2 hover:bg-input hover:text-fg'}`}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
          transition={springFast}
          aria-hidden="true"
        />
      )}
      <span className="relative flex min-w-0 items-center gap-2.5">
        <span className="shrink-0">{icon}</span>
        <Label show={!collapsed}>{label}</Label>
      </span>
    </a>
  )
}

/**
 * Desktop navigation. The ☰ button (or Ctrl/⌘ + B) collapses it to an icon rail; the choice is
 * remembered between visits.
 */
export function Sidebar({
  active,
  onOpenSearch,
}: {
  active: TabId | 'home'
  onOpenSearch: () => void
}) {
  const collapsed = useSettings((s) => s.sidebarCollapsed)
  const toggle = useSettings((s) => s.toggleSidebar)

  return (
    <motion.aside
      id="sidebar"
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded }}
      transition={spring}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-divider bg-surface/70 backdrop-blur-xl md:flex"
    >
      <div
        className={`flex h-[72px] shrink-0 items-center gap-2 ${collapsed ? 'justify-center px-3' : 'px-3'}`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="sidebar"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={`${collapsed ? 'Expand' : 'Collapse'} navigation (Ctrl+B)`}
          className="press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-fg-2 hover:bg-input hover:text-fg"
        >
          <Icon.Menu size={20} />
        </button>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.a
              href="#/"
              aria-label="Sona home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { ...springFast, delay: 0.06 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
            >
              <Logo />
            </motion.a>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search calculators"
          title={collapsed ? 'Search (Ctrl+K)' : undefined}
          className={`press flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-input text-[13px] text-fg-muted transition-colors hover:border-fg-muted hover:text-fg-2 ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <Icon.Search size={16} />
          <Label show={!collapsed}>Search</Label>
          {!collapsed && (
            <kbd className="ml-auto rounded border border-line px-1 text-[10px]">Ctrl K</kbd>
          )}
        </button>
      </div>

      <nav aria-label="Pages" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        <LayoutGroup id="sidebar">
          <NavLink
            href="#/"
            active={active === 'home'}
            icon={<Icon.Home size={18} />}
            label="All calculators"
            collapsed={collapsed}
          />
          {NAV_GROUPS.map((group) => (
            <div key={group} className="mt-5">
              {collapsed ? (
                <div className="mx-2 mb-2 border-t border-divider" aria-hidden="true" />
              ) : (
                <p className="mb-1.5 whitespace-nowrap px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
                  {group}
                </p>
              )}
              <ul className="flex flex-col gap-0.5" aria-label={collapsed ? group : undefined}>
                {VISIBLE_TABS.filter((t) => t.group === group).map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <li key={tab.id}>
                      <NavLink
                        href={`#/${tab.id}`}
                        active={tab.id === active}
                        icon={<TabIcon size={18} />}
                        label={tab.label}
                        collapsed={collapsed}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </LayoutGroup>
      </nav>

      <div
        className={`shrink-0 border-t border-divider p-3 ${collapsed ? 'flex justify-center' : ''}`}
      >
        {collapsed ? <UnitToggle compact /> : <UnitToggle />}
      </div>
    </motion.aside>
  )
}
