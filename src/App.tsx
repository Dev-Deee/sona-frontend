import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { CommandPalette } from './components/layout/CommandPalette'
import { MobileNav } from './components/layout/MobileNav'
import { OfflineBanner } from './components/layout/OfflineBanner'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar, type Panel } from './components/layout/Topbar'
import { Toasts } from './components/ui/Toasts'
import { HistoryDrawer } from './features/HistoryDrawer'
import { PresetsDrawer } from './features/PresetsDrawer'
import { useSharedLink } from './features/useSharedLink'
import { useHashRoute } from './hooks/useHashRoute'
import { useTemperatureAutoFetch } from './hooks/useTemperatureAutoFetch'
import { useNav } from './store/navStore'
import { useSettings } from './store/settingsStore'
import { resolveCalc } from './tabs/calculators'
import { Home } from './tabs/Home'
import { DEFAULT_TAB } from './tabs/registry'
import { TabView } from './tabs/TabView'

// Auth forms (zod, react-hook-form) load on demand; calculators never wait on them.
const AccountDrawer = lazy(() =>
  import('./features/AccountDrawer').then((m) => ({ default: m.AccountDrawer })),
)
const ShareDrawer = lazy(() =>
  import('./features/ShareDrawer').then((m) => ({ default: m.ShareDrawer })),
)

export default function App() {
  const route = useHashRoute()
  const isHome = route.kind !== 'tab'
  const tab = route.kind === 'tab' ? route.tab : DEFAULT_TAB
  const lastCalc = useNav((s) => s.lastCalc[tab])
  // The calculator on screen: presets and share links act on it alone.
  const active = resolveCalc(tab, route.kind === 'tab' ? route.calc : undefined, lastCalc)
  const [panel, setPanel] = useState<Panel>(null)
  // Lazy drawers stay mounted once opened so they can animate out, not just vanish.
  const [opened, setOpened] = useState<Set<Panel>>(() => new Set())
  const open = (p: Exclude<Panel, null>) => {
    setOpened((s) => (s.has(p) ? s : new Set(s).add(p)))
    setPanel(p)
  }
  const close = () => setPanel(null)
  // Phone page list: opened by ☰ (from the left) or More (from the right).
  const [nav, setNav] = useState<{ open: boolean; side: 'left' | 'right' }>({
    open: false,
    side: 'left',
  })
  const toggleSidebar = useSettings((s) => s.toggleSidebar)
  useTemperatureAutoFetch()
  useSharedLink(route)

  // A new page or calculator starts at the top, not wherever the last one was scrolled to.
  const routeKey = route.kind === 'tab' ? `${route.tab}/${route.calc ?? ''}` : route.kind
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [routeKey])

  // Ctrl/⌘ + K opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPanel((p) => (p === 'search' ? null : 'search'))
      }
      // Ctrl/⌘ + B collapses or expands the desktop sidebar.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar])

  const calcLabel = !isHome && active.calcId ? active.label : null

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-bg flex min-h-dvh text-fg">
        <Sidebar active={isHome ? 'home' : tab} onOpenSearch={() => open('search')} />
        <div className="flex min-w-0 flex-1 flex-col">
          <OfflineBanner />
          <Topbar
            active={isHome ? 'home' : tab}
            calcLabel={calcLabel}
            onOpen={open}
            onOpenNav={() => setNav({ open: true, side: 'left' })}
          />
          <main className="flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-16 md:pt-8">
            {isHome ? (
              <Home onOpenSearch={() => open('search')} />
            ) : (
              <div className="mx-auto w-full max-w-6xl" key={tab}>
                <TabView tab={tab} calc={route.kind === 'tab' ? route.calc : undefined} />
              </div>
            )}
          </main>
        </div>
        <MobileNav
          active={isHome ? 'home' : tab}
          navOpen={nav.open}
          navSide={nav.side}
          onOpenNav={(side) => setNav({ open: true, side })}
          onCloseNav={() => setNav((n) => ({ ...n, open: false }))}
        />
        <CommandPalette open={panel === 'search'} onClose={close} />
        <HistoryDrawer open={panel === 'history'} onClose={close} />
        {calcLabel && (
          <PresetsDrawer open={panel === 'presets'} onClose={close} tab={tab} calc={active} />
        )}
        <Suspense fallback={null}>
          {opened.has('share') && calcLabel && (
            <ShareDrawer open={panel === 'share'} onClose={close} tab={tab} calc={active} />
          )}
          {opened.has('account') && <AccountDrawer open={panel === 'account'} onClose={close} />}
        </Suspense>
        <Toasts />
      </div>
    </MotionConfig>
  )
}
