import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DelayTowerPlannerCard } from '../components/calculator/cards/delayTower'
import { RiggingLoadCard } from '../components/calculator/cards/showTools'
import { CombFilterCard } from '../components/calculator/cards/arrays'
import { CriticalDistanceCard } from '../components/calculator/cards/acoustics'
import {
  AspectRatioCard,
  AsymmetricCoverageCard,
  CoverageAngleCard,
  InverseSquareCard,
  NeedDelaysCard,
} from '../components/calculator/cards/coverage'
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
  impedanceOhm: 8,
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

  it('compares the actual main and delay speakers in “Need delays?”', async () => {
    const user = userEvent.setup()
    render(<NeedDelaysCard />)
    await user.click(screen.getByRole('button', { name: 'Pick the main speaker' }))
    let dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'lyon')
    await user.click(within(dialog).getByRole('button', { name: /Meyer Sound LYON/ }))
    expect(screen.getByLabelText('Main max SPL at 1 m')).toHaveValue('142')
    expect(screen.getByText('Mains max at the listener')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Pick the delay speaker' }))
    dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'qsc k12.2')
    await user.click(within(dialog).getAllByRole('button', { name: /QSC K12\.2/ })[0])
    expect(screen.getByLabelText('Delay max SPL at 1 m')).toHaveValue('132')
    expect(screen.getByText(/difference between the two speakers/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('fills level over distance and coverage shape from a speaker', async () => {
    const user = userEvent.setup()
    render(
      <>
        <InverseSquareCard />
        <AspectRatioCard />
      </>,
    )
    const [inverse, far] = screen.getAllByRole('button', {
      name: 'Choose from the speaker library',
    })
    await user.click(inverse)
    let dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'd&b j8')
    await user.click(within(dialog).getByRole('button', { name: /d&b audiotechnik J8/ }))
    expect(screen.getByLabelText('Reference SPL')).toHaveValue('141')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(far)
    dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'd&b j8')
    await user.click(within(dialog).getByRole('button', { name: /d&b audiotechnik J8/ }))
    expect(screen.getByLabelText('Coverage angle')).toHaveValue('100')
  })

  it('compares two picked speakers for comb filtering', async () => {
    const user = userEvent.setup()
    render(<CombFilterCard />)
    // Default: two identical speakers 4 m apart, seat 10 m out and 3 m towards B.
    expect(screen.getByText('Strong comb filtering')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pick speaker A' }))
    let dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'lyon')
    await user.click(within(dialog).getByRole('button', { name: /Meyer Sound LYON/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Pick speaker B' }))
    dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'qsc k12.2')
    await user.click(within(dialog).getAllByRole('button', { name: /QSC K12\.2/ })[0])
    // B is 10 dB quieter on paper, which softens the notches.
    expect(screen.getByText('Noticeable')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/)
    await user.click(screen.getByRole('radio', { name: 'A reflection / two paths' }))
    expect(screen.getByLabelText('Direct path')).toBeInTheDocument()
  })

  it('checks a speaker’s pattern against the angle needed', async () => {
    const user = userEvent.setup()
    render(<CoverageAngleCard />)
    // 20 m wide at 12 m needs 79.6°.
    await user.click(screen.getByRole('button', { name: 'Check a speaker' }))
    const dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'qsc k12.2')
    await user.click(within(dialog).getAllByRole('button', { name: /QSC K12\.2/ })[0])
    expect(document.querySelector('[data-check="fail"]')).toHaveTextContent(/75° horizontal/)
  })

  it('explains that line arrays have no fixed vertical coverage', async () => {
    const user = userEvent.setup()
    render(<AsymmetricCoverageCard />)
    await user.click(screen.getByRole('button', { name: 'Check a speaker' }))
    const dialog = await screen.findByRole('dialog', { name: 'Speaker library' })
    await user.type(within(dialog).getByLabelText('Search speakers'), 'd&b j8')
    await user.click(within(dialog).getByRole('button', { name: /d&b audiotechnik J8/ }))
    expect(document.querySelector('[data-check="warn"]')).toHaveTextContent(/splay/)
  })

  it('stretches critical distance by the speaker’s directivity', async () => {
    const user = userEvent.setup()
    render(<CriticalDistanceCard />)
    await user.click(screen.getByText('Your speaker’s directivity'))
    await user.type(screen.getByLabelText('Horizontal coverage'), '90')
    await user.type(screen.getByLabelText('Vertical coverage'), '60')
    expect(screen.getByText('Critical distance with your speaker')).toBeInTheDocument()
    expect(screen.getByText(/Q ≈ 8\.7/)).toBeInTheDocument()
  })
})
