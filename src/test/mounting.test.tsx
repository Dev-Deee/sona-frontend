import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { NeedDelaysCard } from '../components/calculator/cards/coverage'
import { DelayTowerPlannerCard } from '../components/calculator/cards/delayTower'
import { useInputsStore } from '../store/inputsStore'
import { useSettings } from '../store/settingsStore'

beforeEach(() => {
  useInputsStore.setState({ values: {} })
  useSettings.setState({ unitSystem: 'metric', temperatureC: 20, temperatureManual: false })
})

const ms = (region: HTMLElement) => within(region).getAllByTestId('output-value')[0].textContent

describe('ground-stacked vs flown mains', () => {
  it('Need delays? uses the middle of a ground stack and warns about crowd absorption', async () => {
    const user = userEvent.setup()
    render(<NeedDelaysCard />)
    const region = screen.getByRole('region', { name: 'Do I Need Delays?' })
    const flown = ms(region)
    expect(within(region).getByLabelText('Main speaker height')).toBeInTheDocument()
    await user.click(within(region).getByRole('radio', { name: 'Ground-stacked' }))
    expect(within(region).queryByLabelText('Main speaker height')).not.toBeInTheDocument()
    expect(within(region).getByLabelText('Stage or riser height')).toHaveValue('1.2')
    expect(within(region).getByLabelText('Stack height')).toHaveValue('2')
    // A 2.2 m acoustic centre is a shorter path than an 8 m flown array.
    expect(ms(region)).not.toBe(flown)
    expect(region).toHaveTextContent(/bodies absorb high frequencies/)
    expect(useInputsStore.getState().values['coverage.delays'].mainMount).toBe('ground')
  })

  it('Delay tower planner records the mounting in its summary', async () => {
    const user = userEvent.setup()
    render(<DelayTowerPlannerCard />)
    const region = screen.getByRole('region', { name: 'Delay Tower Planner' })
    await user.click(within(region).getByRole('radio', { name: 'Ground-stacked' }))
    expect(region).toHaveTextContent(/bodies absorb high frequencies/)
    await user.click(within(region).getByRole('button', { name: 'Step 6: Summary' }))
    expect(within(region).getByRole('table')).toHaveTextContent('Ground-stacked')
    expect(region.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })
})
