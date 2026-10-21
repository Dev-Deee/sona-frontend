import { describe, expect, it } from 'vitest'
import {
  channelCount,
  colorHex,
  expandRows,
  newRow,
  normaliseSheet,
  rowNumbers,
  sectionTable,
  sheetTables,
  sheetToText,
  tableToCsv,
  TEMPLATES,
  textOn,
  type PatchSheet,
} from '../patchSheet'

const worship = () =>
  (TEMPLATES.find((t) => t.id === 'worship') as (typeof TEMPLATES)[number]).make()

describe('patch sheet numbering', () => {
  it('gives stereo rows two consecutive numbers', () => {
    const rows = [
      newRow({ name: 'Kick' }),
      newRow({ name: 'OH', stereo: true }),
      newRow({ name: 'Bass' }),
    ]
    expect(rowNumbers(rows)).toEqual([1, 2, 4])
    expect(channelCount(rows)).toBe(4)
    expect(expandRows(rows).map((r) => `${r.name} ${r.n}`)).toEqual([
      'Kick 1',
      'OH L 2',
      'OH R 3',
      'Bass 4',
    ])
  })

  it('reproduces the 42-input worship patch', () => {
    const sheet = worship()
    expect(channelCount(sheet.sections.inputs)).toBe(42)
    const inputs = expandRows(sheet.sections.inputs)
    expect(inputs.find((r) => r.name === 'Track L')?.n).toBe(11)
    expect(inputs.find((r) => r.name === 'Lead Mic 1')?.n).toBe(29)
    expect(inputs.find((r) => r.name === 'Stage TB')?.n).toBe(40)
    expect(sheet.sections.dcas).toHaveLength(11)
  })
})

describe('patch sheet text export', () => {
  it('matches the familiar shared format', () => {
    const sheet = { ...worship(), title: 'Sunday service' }
    const text = sheetToText(sheet)
    expect(text).toMatch(/^\*SUNDAY SERVICE\*\n/)
    expect(text).toContain('*INPUTS*\nKick In - 1\nKick Out - 2')
    expect(text).toContain('Track L - 11\nTrack R - 12')
    expect(text).toContain('Crowd L - 35 - no main (only USB)')
    expect(text).toContain('Drums TB - 37 - to Bus 9')
    expect(text).toContain('Foh TB - Local 8')
    expect(text).toContain('*Total: 42 inputs*')
    expect(text).toContain('*DCAS*\n1 - Drums')
    expect(text).toContain('8 - Musicians TB - Main 2')
    expect(text).toContain('9 - Percs L\n10 - Percs R')
    // Spare buses and outputs keep their numbers.
    expect(text).toContain('\n4 -\n')
    expect(text).toContain('13 - FOH Outfill L - Matrix 3')
    expect(text).toContain('17 - Projection L - Matrix 5 - Local 1')
    // Personal mix: named rows only, numbers kept (Sax is on 11).
    expect(text).toContain('*P16*\nKick - 1')
    expect(text).toContain('Sax - 11')
  })
})

describe('patch sheet tables', () => {
  it('splits stereo rows and carries colours', () => {
    const sheet = worship()
    const t = sectionTable(sheet, 'inputs')
    expect(t.rows).toHaveLength(42)
    expect(t.headers.slice(0, 2)).toEqual(['Ch', 'Name'])
    expect(t.rows[0][1]).toBe('Kick In')
    expect(t.colors[0]).toBe(colorHex('red'))
    expect(sheetTables(sheet).map((x) => x.title)).toEqual([
      'Inputs',
      'DCAs',
      'Mix buses',
      'Outputs',
      'P16',
    ])
  })

  it('quotes CSV cells that need it', () => {
    const sheet: PatchSheet = {
      title: '',
      personalLabel: '',
      sections: {
        inputs: [newRow({ name: 'Vox, "lead"', notes: 'line1\nline2' })],
        dcas: [],
        buses: [],
        outputs: [],
        personal: [],
      },
    }
    const csv = tableToCsv(sectionTable(sheet, 'inputs'))
    expect(csv).toContain('"Vox, ""lead"""')
    expect(csv).toContain('"line1\nline2"')
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(sheetTables({ ...sheet, sections: { ...sheet.sections, inputs: [] } })).toEqual([])
  })

  it('picks readable text on each colour', () => {
    expect(textOn('#FFC53D')).toBe('#000000')
    expect(textOn('#3E63DD')).toBe('#FFFFFF')
    expect(colorHex(undefined)).toBeNull()
  })

  it('normalises saved sheets and ignores junk', () => {
    const fallback = worship()
    expect(normaliseSheet(null, fallback)).toBe(fallback)
    const partial = normaliseSheet({ title: 'X', sections: { inputs: [] } }, fallback)
    expect(partial.title).toBe('X')
    expect(partial.sections.inputs).toEqual([])
    expect(partial.sections.dcas).toEqual([])
    expect(partial.personalLabel).toBe('Personal mix')
  })
})
