import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { WavelengthCard } from '../components/calculator/cards/acoustics'
import { BpmCard } from '../components/calculator/cards/timingSync'
import { CableLossCard, SummationCard } from '../components/calculator/cards/gainSignal'
import { FrequencyCoordinationCard } from '../components/calculator/cards/rfWireless'
import { DelayTowerPlannerCard } from '../components/calculator/cards/delayTower'
import { NoiseDoseCard } from '../components/calculator/cards/powerElectrical'
import { AddSubtractDbCard } from '../components/calculator/cards/gainSignal'
import { useInputsStore } from '../store/inputsStore'
import { useSettings } from '../store/settingsStore'

const card = (title: string) => screen.getByRole('region', { name: title })
const outputs = (region: HTMLElement) =>
  within(region)
    .queryAllByTestId('output-value')
    .map((o) => o.textContent)

beforeEach(() => {
  useInputsStore.setState({ values: {} })
  useSettings.setState({ unitSystem: 'metric', temperatureC: 20, temperatureManual: false })
})

describe('calculator interactions', () => {
  it('updates the wavelength as the frequency changes', async () => {
    const user = userEvent.setup()
    render(<WavelengthCard />)
    const region = card('Frequency → Wavelength')
    const input = within(region).getByLabelText('Frequency')
    await user.clear(input)
    await user.type(input, '1000')
    expect(outputs(region)[0]).toBe('0.343m')
  })

  it('shows "invalid input" for 0 Hz instead of crashing', async () => {
    const user = userEvent.setup()
    render(<WavelengthCard />)
    const region = card('Frequency → Wavelength')
    const input = within(region).getByLabelText('Frequency')
    await user.clear(input)
    await user.type(input, '0')
    expect(within(region).getByRole('alert')).toHaveTextContent(/Invalid input.*greater than 0/)
    expect(region.textContent).not.toMatch(/NaN|Infinity/)
  })

  it('clamps and warns below absolute zero without NaN', async () => {
    const user = userEvent.setup()
    render(<WavelengthCard />)
    const region = card('Frequency → Wavelength')
    const temp = within(region).getByLabelText('Temperature')
    await user.clear(temp)
    await user.type(temp, '-300')
    expect(within(region).getByRole('alert')).toHaveTextContent(/absolute zero/)
    expect(region.textContent).not.toMatch(/NaN|Infinity/)
  })

  it('handles very large frequencies', async () => {
    const user = userEvent.setup()
    render(<WavelengthCard />)
    const region = card('Frequency → Wavelength')
    const input = within(region).getByLabelText('Frequency')
    await user.clear(input)
    await user.type(input, '100000')
    expect(outputs(region)[0]).toBe('0.003m')
  })

  it('BPM 0 is invalid', async () => {
    const user = userEvent.setup()
    render(<BpmCard />)
    const region = card('BPM → Delay')
    const input = within(region).getByLabelText('Tempo')
    await user.clear(input)
    await user.type(input, '0')
    expect(within(region).getByRole('alert')).toHaveTextContent(/Invalid input/)
  })

  it('zero-length cable shows zero loss and no NaN', async () => {
    const user = userEvent.setup()
    render(<CableLossCard />)
    const region = card('Cable Loss')
    const input = within(region).getByLabelText('Cable run length')
    await user.clear(input)
    await user.type(input, '0')
    expect(outputs(region)[0]).toBe('0.00dB')
    expect(region.textContent).not.toMatch(/NaN|Infinity/)
  })

  it('clearing every input gives a graceful message, never NaN', async () => {
    const user = userEvent.setup()
    render(<SummationCard />)
    const region = card('Signal Summation')
    await user.clear(within(region).getByRole('textbox'))
    expect(within(region).getByRole('alert')).toHaveTextContent(/Enter a value/)
    expect(region.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('updates every visible output when the unit system changes', async () => {
    render(<WavelengthCard />)
    const region = card('Frequency → Wavelength')
    expect(outputs(region)[0]).toBe('4.290m')
    act(() => useSettings.getState().setUnitSystem('imperial'))
    await waitFor(() => expect(outputs(region)[0]).toBe('14.075ft'))
    expect(within(region).getByLabelText('Temperature')).toHaveValue('68')
    act(() => useSettings.getState().setUnitSystem('metric'))
    await waitFor(() => expect(outputs(region)[0]).toBe('4.290m'))
  })

  it('flags IM3 conflicts and lets you add frequencies', async () => {
    const user = userEvent.setup()
    render(<FrequencyCoordinationCard />)
    const region = card('Frequency Coordination (IM3)')
    // Defaults 518.2 / 520.6 / 523.0 are evenly spaced: 2 × 520.6 − 518.2 = 523.0 collides.
    expect(within(region).getByText(/conflict/i, { selector: '[data-tone]' })).toHaveTextContent(
      /2 conflicts/,
    )
    await user.click(within(region).getByRole('button', { name: /Add frequency/ }))
    expect(within(region).getByLabelText('Channel 4')).toBeInTheDocument()
  })

  it('explains itself and reveals the formula on demand', async () => {
    const user = userEvent.setup()
    render(<WavelengthCard />)
    const region = card('Frequency → Wavelength')
    expect(region).toHaveTextContent(/Use it when/)
    const formula = within(region).getByText(/λ = c \/ f/)
    expect(formula).not.toBeVisible()
    await user.click(within(region).getByText('How it’s calculated'))
    expect(formula).toBeVisible()
  })

  it('delay tower planner steps through all six stages to a summary', async () => {
    const user = userEvent.setup()
    render(<DelayTowerPlannerCard />)
    const region = card('Delay Tower Planner')
    expect(within(region).getByText('Step 1 of 6')).toBeInTheDocument()
    for (const next of [
      'Main coverage check',
      'Tower placement',
      'Delay speaker',
      'Number of towers',
      'Summary',
    ]) {
      await user.click(within(region).getByRole('button', { name: new RegExp(`Next: ${next}`) }))
      expect(within(region).getByRole('heading', { name: next })).toBeInTheDocument()
      expect(region.textContent).not.toMatch(/NaN|Infinity|undefined/)
    }
    expect(within(region).getByRole('table')).toHaveTextContent('Delay setting')
    expect(within(region).getByRole('button', { name: 'Copy summary' })).toBeInTheDocument()
  })

  it('delay tower planner says when no tower is needed', async () => {
    const user = userEvent.setup()
    render(<DelayTowerPlannerCard />)
    const region = card('Delay Tower Planner')
    const depth = within(region).getByLabelText('Audience depth')
    await user.clear(depth)
    await user.type(depth, '6')
    await user.click(within(region).getByRole('button', { name: 'Step 3: Tower placement' }))
    expect(within(region).getByText(/no delay tower needed/)).toBeInTheDocument()
  })

  it('noise exposure compares all four standards', () => {
    render(<NoiseDoseCard />)
    const region = card('Noise Exposure / SPL Dose')
    const firstCells = within(region)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[0].textContent)
    expect(firstCells).toEqual(['WHO', 'OSHA', 'NIOSH', 'UK HSE'])
    expect(region).toHaveTextContent(/planning tool/)
  })

  it('add / subtract dB switches modes and flags an unreliable correction', async () => {
    const user = userEvent.setup()
    render(<AddSubtractDbCard />)
    const region = card('Add / Subtract dB')
    expect(outputs(region)[0]).toBe('93.01dB')
    await user.click(within(region).getByRole('radio', { name: 'Remove background' }))
    const bg = within(region).getByLabelText('Background noise')
    await user.clear(bg)
    await user.type(bg, '87')
    expect(within(region).getByLabelText('Warnings')).toHaveTextContent(/unreliable/)
  })
})
