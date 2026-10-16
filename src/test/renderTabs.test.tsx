import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { CALCULATORS } from '../tabs/calculators'
import { TAB_IDS } from '../tabs/registry'
import { TabView } from '../tabs/TabView'
import { useNav } from '../store/navStore'
import { parseHash } from '../hooks/useHashRoute'

const ALL = TAB_IDS.flatMap((tab) =>
  CALCULATORS[tab].map((c) => [tab, c.slug, c.component] as const),
)

describe('every calculator renders with default values', () => {
  it('registers 49 calculators across 10 pages', () => {
    expect(ALL).toHaveLength(49)
  })

  it.each(ALL.map(([tab, slug, Component]) => [`${tab}/${slug}`, Component] as const))(
    '%s',
    (_, Component) => {
      const { container } = render(<Component />)
      expect(container.querySelectorAll(':scope > section')).toHaveLength(1)
      expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/)
      // Defaults are valid, so nothing shows an error.
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    },
  )
})

describe('TabView', () => {
  beforeEach(() => {
    useNav.setState({ lastCalc: {} })
    window.location.hash = '#/acoustics'
  })

  const renderRoute = () => {
    const route = parseHash(window.location.hash)
    if (route.kind !== 'tab') throw new Error('expected tab route')
    return <TabView tab={route.tab} calc={route.calc} />
  }

  it('shows one calculator per tab and switches via the tab strip', async () => {
    const user = userEvent.setup()
    const { rerender } = render(renderRoute())
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(CALCULATORS.acoustics.map((c) => c.label))
    expect(screen.getByRole('tab', { name: 'Wavelength' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('region')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: 'Reverb time' }))
    expect(window.location.hash).toBe('#/acoustics/rt60')
    rerender(renderRoute())
    expect(screen.getByRole('tabpanel')).toHaveTextContent('How long does this room ring?')
    expect(useNav.getState().lastCalc.acoustics).toBe('rt60')
  })

  it('supports arrow-key navigation between calculator tabs', async () => {
    const user = userEvent.setup()
    render(renderRoute())
    act(() => screen.getByRole('tab', { name: 'Wavelength' }).focus())
    await user.keyboard('{ArrowLeft}')
    expect(window.location.hash).toBe('#/acoustics/itdg')
  })

  it('returns to the last calculator used on a page', () => {
    useNav.setState({ lastCalc: { coverage: 'delays' } })
    render(<TabView tab="coverage" />)
    expect(screen.getByRole('tab', { name: 'Need delays?' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('falls back to the first calculator for unknown slugs', () => {
    render(<TabView tab="arrays" calc="nope" />)
    expect(screen.getByRole('tab', { name: 'Comb filtering' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
