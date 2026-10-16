import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { useHistory } from '../store/historyStore'
import { useInputsStore } from '../store/inputsStore'
import { useSettings } from '../store/settingsStore'

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

beforeEach(() => {
  window.location.hash = '#/acoustics'
  useInputsStore.setState({ values: {} })
  useSettings.setState({
    unitSystem: 'metric',
    temperatureC: 20,
    temperatureManual: false,
    theme: 'dark',
  })
  useHistory.setState({ entries: [] })
})

afterEach(() => {
  setOnline(true)
  vi.useRealTimers()
})

describe('App', () => {
  it('renders the shell with navigation and the home screen', () => {
    window.location.hash = ''
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you need to work out?' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Reverb time/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('navigation', { name: 'Pages' }).length).toBeGreaterThan(0)
  })

  it('navigates between tabs via the hash', async () => {
    render(<App />)
    await act(async () => {
      window.location.hash = '#/rf-wireless'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Wireless' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Wireless range' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await act(async () => {
      window.location.hash = '#/rf-wireless/im3'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Do my wireless frequencies clash?')
  })

  it('toggling units updates every visible calculator at once', async () => {
    const user = userEvent.setup()
    render(<App />)
    const sidebarToggle = screen.getByRole('radiogroup', { name: 'Unit system' })
    await user.click(within(sidebarToggle).getByRole('radio', { name: 'imperial' }))
    expect(localStorage.getItem('sona_units')).toBe('imperial')
    const main = screen.getByRole('main')
    expect(main.textContent).toContain('ft')
    expect(main.textContent).not.toMatch(/NaN|Infinity/)
    // 80 Hz at 20 °C: λ = 4.290 m = 14.075 ft
    expect(
      within(main)
        .getAllByTestId('output-value')
        .map((o) => o.textContent),
    ).toContain('14.075ft')
  })

  it('cycles the brightness mode and persists it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [toggle] = screen.getAllByRole('button', { name: /Brightness: Dark/ })
    await user.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dim')
    expect(localStorage.getItem('sona_theme')).toBe('dim')
  })

  it('shows an offline banner while calculators keep working', async () => {
    render(<App />)
    act(() => setOnline(false))
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i)
    expect(screen.getAllByTestId('output-value').length).toBeGreaterThan(2)
    act(() => setOnline(true))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('records settled results in the history drawer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    const [historyButton] = screen.getAllByRole('button', { name: 'Calculation history' })
    await user.click(historyButton)
    const drawer = screen.getByRole('dialog', { name: 'Calculation history' })
    expect(within(drawer).getAllByRole('listitem').length).toBeGreaterThanOrEqual(1)
    expect(drawer).toHaveTextContent('Frequency → Wavelength')
  })

  it('saves and reloads a local preset when logged out', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [presetsButton] = screen.getAllByRole('button', { name: 'Presets for Wavelength' })
    useInputsStore.getState().setInput('acoustics.wavelength', 'frequency', 125)
    await user.click(presetsButton)
    const drawer = screen.getByRole('dialog', { name: 'Wavelength presets' })
    await user.type(within(drawer).getByLabelText('Preset name'), 'Club')
    await user.click(within(drawer).getByRole('button', { name: 'Save' }))
    const saved = JSON.parse(localStorage.getItem('sona_presets') ?? '{}').state.presets[0]
    expect(saved.name).toBe('Club')
    expect(saved.calcId).toBe('acoustics.wavelength')
    expect(saved.calculatorTab).toBe('acoustics')
    // Only the active calculator's inputs are stored, not the whole page.
    expect(saved.inputs).toMatchObject({
      calcId: 'acoustics.wavelength',
      inputs: { frequency: 125 },
    })

    useInputsStore.getState().setInput('acoustics.wavelength', 'frequency', 50)
    await user.click(within(drawer).getByRole('button', { name: /^Club/ }))
    expect(useInputsStore.getState().values['acoustics.wavelength'].frequency).toBe(125)
  })

  it('opens quick search with Ctrl+K and jumps to a calculator', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{Control>}k{/Control}')
    const dialog = await screen.findByRole('dialog', { name: 'Search calculators' })
    await user.type(within(dialog).getByRole('combobox'), 'feedback')
    await user.keyboard('{Enter}')
    expect(window.location.hash).toBe('#/intelligibility/feedback')
  })

  it('collapses and expands the sidebar, remembering the choice', async () => {
    const user = userEvent.setup()
    useSettings.setState({ sidebarCollapsed: false })
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Collapse navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(localStorage.getItem('sona_sidebar')).toBe('collapsed')
    // Collapsed links keep an accessible name.
    expect(screen.getByRole('link', { name: 'Coverage & Delays' })).toBeInTheDocument()
    await user.keyboard('{Control>}b{/Control}')
    expect(useSettings.getState().sidebarCollapsed).toBe(false)
    expect(localStorage.getItem('sona_sidebar')).toBe('expanded')
  })

  it('opens the page list from the hamburger on phones and hides Reference everywhere', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/'
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = await screen.findByRole('dialog', { name: 'All pages' })
    expect(within(drawer).getByRole('button', { name: /Wireless/ })).toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: /Reference/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reference' })).not.toBeInTheDocument()
  })
})
