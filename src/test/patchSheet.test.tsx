import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatchSheetCard } from '../components/calculator/cards/patchSheet'
import { useInputsStore } from '../store/inputsStore'

beforeEach(() => {
  useInputsStore.setState({ values: {} })
})

const names = (region: HTMLElement) =>
  within(region)
    .getAllByLabelText('Name')
    .map((i) => (i as HTMLInputElement).value)

describe('PatchSheetCard', () => {
  it('reorders, removes and bulk-adds stereo rows', async () => {
    const user = userEvent.setup()
    render(<PatchSheetCard />)
    const list = screen.getByRole('list', { name: 'Inputs' })
    expect(names(list).slice(0, 3)).toEqual(['Kick In', 'Snare Top', 'OH'])
    await user.click(screen.getByRole('button', { name: 'Move Ch 1 down' }))
    expect(names(list).slice(0, 2)).toEqual(['Snare Top', 'Kick In'])
    // OH is stereo, so it shows as channels 3–4.
    expect(screen.getByRole('button', { name: 'Remove Ch 3–4' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Ch 3–4' }))
    expect(names(list)).not.toContain('OH')

    const count = screen.getByLabelText('How many inputs')
    await user.clear(count)
    await user.type(count, '4')
    await user.click(screen.getByRole('radio', { name: 'Stereo pairs' }))
    const before = names(list).length
    await user.click(screen.getByRole('button', { name: /^Add$/ }))
    expect(names(screen.getByRole('list', { name: 'Inputs' }))).toHaveLength(before + 4)
    expect(screen.getByText(/Total:/).textContent).toMatch(/Total: \d+ inputs/)
  })

  it('switches sections, colours a row, and loads a template after confirming', async () => {
    const user = userEvent.setup()
    render(<PatchSheetCard />)
    await user.click(screen.getByRole('tab', { name: /DCAs/ }))
    expect(names(screen.getByRole('list', { name: 'DCAs' }))).toEqual(['Drums', 'Band', 'Vox'])
    await user.selectOptions(screen.getAllByLabelText('Colour')[0], 'blue')
    expect(screen.getByText('DCA 1')).toHaveStyle({ background: '#3E63DD' })

    await user.selectOptions(screen.getByLabelText('Start from a template'), 'worship')
    await user.click(screen.getByRole('button', { name: 'Load' }))
    expect(screen.getByRole('alert')).toHaveTextContent('replaces the whole sheet')
    await user.click(screen.getByRole('button', { name: 'Replace' }))
    await user.click(screen.getByRole('tab', { name: /Inputs/ }))
    expect(screen.getByText(/Total:/).textContent).toBe('Total: 42 inputs')
    expect(screen.getByRole('tab', { name: /P16/ })).toBeInTheDocument()
  })

  it('copies the sheet as text', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<PatchSheetCard />)
    await user.type(screen.getByLabelText('Show or event'), 'Friday gig')
    await user.click(screen.getByRole('button', { name: /Copy as text/ }))
    expect(writeText).toHaveBeenCalledOnce()
    const text = writeText.mock.calls[0][0] as string
    expect(text).toMatch(/^\*FRIDAY GIG\*/)
    expect(text).toContain('Kick In - 1')
    expect(text).toContain('OH L - 3\nOH R - 4')
  })
})
