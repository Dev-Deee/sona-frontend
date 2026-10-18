import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DelayTowerPlannerCard } from '../components/calculator/cards/delayTower'
import { RiggingLoadCard } from '../components/calculator/cards/showTools'
import {
  filterSpeakers,
  findSpeaker,
  getSplAt1m,
  type Speaker,
  speakerFill,
  SPEAKERS,
} from '../data/speakers'
import { useInputsStore } from '../store/inputsStore'
import { useSettings } from '../store/settingsStore'

const base: Speaker = {
  id: 'test',
  manufacturer: 'Test',
  model: 'T1',
  type: 'passive',
  category: 'point_source',
  maxSplAt1m: null,
  sensitivity: 100,
  ratedPowerW: 1000,
  hCoverage: 90,
  vCoverage: 40,
  freqResponse: null,
  weightKg: 20,
  notes: null,
  sourceUrl: null,
  verified: false,
}

beforeEach(() => {
  useInputsStore.setState({ values: {} })
  useSettings.setState({ unitSystem: 'metric', temperatureC: 20, temperatureManual: false })
})

describe('speaker library data', () => {
  it('has unique ids and sane values', () => {
    expect(new Set(SPEAKERS.map((s) => s.id)).size).toBe(SPEAKERS.length)
    for (const s of SPEAKERS) {
      expect(s.manufacturer && s.model).toBeTruthy()
      if (s.maxSplAt1m !== null) expect(s.maxSplAt1m).toBeGreaterThan(90)
      if (s.sensitivity !== null) expect(s.sensitivity).toBeGreaterThan(80)
      if (s.hCoverage !== null) expect(s.hCoverage).toBeLessThanOrEqual(360)
      if (s.weightKg !== null) expect(s.weightKg).toBeGreaterThan(0)
      if (s.sourceUrl !== null) expect(s.sourceUrl).toMatch(/^https:\/\//)
    }
  })

  it('takes max SPL from the sheet, else sensitivity + 10·log(power)', () => {
    expect(getSplAt1m(base)).toBe(130)
    expect(getSplAt1m({ ...base, maxSplAt1m: 141 })).toBe(141)
    expect(getSplAt1m({ ...base, sensitivity: null })).toBeNull()
  })

  it('searches brand and model loosely and filters by category and type', () => {
    expect(filterSpeakers(SPEAKERS, 'db j8').map((s) => s.id)).toContain('dbaudio-j8')
    expect(filterSpeakers(SPEAKERS, 'L-ACOUSTICS k2').map((s) => s.id)).toContain('lacoustics-k2')
    expect(filterSpeakers(SPEAKERS, 'nothing-like-this')).toEqual([])
    const subs = filterSpeakers(SPEAKERS, '', 'sub')
    expect(subs.length).toBeGreaterThan(0)
    expect(subs.every((s) => s.category === 'subwoofer')).toBe(true)
    const fills = filterSpeakers(SPEAKERS, '', 'fill')
    expect(
      fills.every((s) => ['front_fill', 'delay_fill', 'column_array'].includes(s.category)),
    ).toBe(true)
    expect(filterSpeakers(SPEAKERS, '', 'all', 'active').every((s) => s.type === 'active')).toBe(
      true,
    )
  })

  it('fills from max SPL for active speakers and from sensitivity for passive ones', () => {
    expect(speakerFill(base).mode).toBe('sensitivity')
    expect(speakerFill({ ...base, type: 'active', maxSplAt1m: 135 }).mode).toBe('maxSpl')
    expect(speakerFill({ ...base, maxSplAt1m: 135, sensitivity: null }).mode).toBe('maxSpl')
    expect(findSpeaker(null)).toBeUndefined()
  })
})

describe('speaker picker', () => {
  it('fills the planner’s main speaker from the library and can be cleared', async () => {
    const user = userEvent.setup()
    render(<DelayTowerPlannerCard />)
    const region = screen.getByRole('region', { name: 'Delay Tower Planner' })
    await user.click(within(region).getByRole('button', { name: 'Step 2: Main coverage check' }))
    await user.click(within(region).getByRole('button', { name: 'Pick your main speaker' }))

    const dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    // Opens on line arrays for the mains.
    expect(within(dialog).getByRole('button', { name: 'Line array' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.type(within(dialog).getByLabelText('Search speakers'), 'lyon')
    await user.click(within(dialog).getByRole('button', { name: /Meyer Sound LYON/ }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Speaker library' })).not.toBeInTheDocument(),
    )

    // Meyer LYON is self-powered with a published max SPL.
    expect(within(region).getByRole('radio', { name: 'Active (powered)' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(region).getByLabelText('Max SPL at 1 m')).toHaveValue('142')
    expect(within(region).getByLabelText('Main speaker horizontal coverage')).toHaveValue('110')
    expect(region.textContent).not.toMatch(/NaN|Infinity|undefined/)

    // Values stay editable, and the chip clears the selection.
    const spl = within(region).getByLabelText('Max SPL at 1 m')
    await user.clear(spl)
    await user.type(spl, '140')
    expect(useInputsStore.getState().values['coverage.delayPlanner'].mainMaxSpl).toBe(140)
    await user.click(within(region).getByRole('button', { name: /Meyer Sound LYON selected/ }))
    expect(within(region).getByRole('button', { name: 'Pick your main speaker' })).toBeVisible()
  })

  it('uses the delay speaker’s max SPL when the sheet has no sensitivity', async () => {
    const user = userEvent.setup()
    render(<DelayTowerPlannerCard />)
    const region = screen.getByRole('region', { name: 'Delay Tower Planner' })
    await user.click(within(region).getByRole('button', { name: 'Step 4: Delay speaker' }))
    await user.click(within(region).getByRole('button', { name: 'Pick the delay speaker' }))
    const dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.click(
      within(within(dialog).getByRole('group', { name: 'Category' })).getByRole('button', {
        name: 'All',
      }),
    )
    await user.type(within(dialog).getByLabelText('Search speakers'), 'qsc k12.2')
    await user.click(within(dialog).getAllByRole('button', { name: /QSC K12\.2/ })[0])
    expect(within(region).getByLabelText('Delay speaker max SPL at 1 m')).toBeInTheDocument()
    expect(region.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('closes with “Enter manually instead” and shows a hint when nothing matches', async () => {
    const user = userEvent.setup()
    render(<RiggingLoadCard />)
    await user.click(screen.getByRole('button', { name: 'Pick the box you’re hanging' }))
    const dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'zzzz')
    expect(dialog).toHaveTextContent('No speakers match')
    await user.click(within(dialog).getByRole('button', { name: 'Enter manually instead' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Speaker library' })).not.toBeInTheDocument(),
    )
  })

  it('works out the hang weight from the box count', async () => {
    const user = userEvent.setup()
    render(<RiggingLoadCard />)
    await user.click(screen.getByRole('button', { name: 'Pick the box you’re hanging' }))
    const dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'd&b j8')
    await user.click(within(dialog).getByRole('button', { name: /d&b audiotechnik J8/ }))
    // 12 × 24.2 kg
    expect(screen.getByLabelText('Array weight')).toHaveValue('290.4')
    const boxes = screen.getByLabelText('Boxes in the hang')
    await user.clear(boxes)
    await user.type(boxes, '8')
    expect(screen.getByLabelText('Array weight')).toHaveValue('193.6')
  })
})
