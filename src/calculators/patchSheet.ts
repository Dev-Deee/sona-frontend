/**
 * Console patch sheet: inputs, DCAs, mix buses, outputs and personal-monitor channels, laid out
 * the way engineers share them before a show.
 */

/** Scribble-strip colours common to Yamaha, DiGiCo, Allen & Heath and Midas desks. */
export const CHANNEL_COLORS = [
  { value: '', label: 'No colour', hex: null },
  { value: 'red', label: 'Red', hex: '#E5484D' },
  { value: 'orange', label: 'Orange', hex: '#F76B15' },
  { value: 'yellow', label: 'Yellow', hex: '#FFC53D' },
  { value: 'green', label: 'Green', hex: '#30A46C' },
  { value: 'cyan', label: 'Cyan', hex: '#00A2C7' },
  { value: 'blue', label: 'Blue', hex: '#3E63DD' },
  { value: 'purple', label: 'Purple', hex: '#8E4EC6' },
  { value: 'pink', label: 'Pink', hex: '#D6409F' },
  { value: 'white', label: 'White', hex: '#EDEDED' },
] as const
export type ChannelColor = (typeof CHANNEL_COLORS)[number]['value']

export const colorHex = (c: ChannelColor | undefined): string | null =>
  CHANNEL_COLORS.find((x) => x.value === (c ?? ''))?.hex ?? null
export const colorLabel = (c: ChannelColor | undefined) =>
  c ? (CHANNEL_COLORS.find((x) => x.value === c)?.label ?? '') : ''

/** Black or white text, whichever reads better on `hex` (WCAG relative luminance). */
export function textOn(hex: string): '#000000' | '#FFFFFF' {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000000' : '#FFFFFF'
}

export interface PatchRow {
  id: string
  name: string
  /** Takes two consecutive numbers, exported as "<name> L" and "<name> R". */
  stereo?: boolean
  color?: ChannelColor
  /** Physical patch point when it isn't the channel number, e.g. "Local 8" or "Stage box 13". */
  port?: string
  type?: 'mic' | 'line'
  micType?: string
  stand?: string
  phantom?: boolean
  /** Inputs: routing, e.g. "to Bus 9" or "no main (USB only)". */
  routing?: string
  /** DCAs: which channels it controls. */
  members?: string
  /** Buses: what the bus feeds, e.g. "Main 2". */
  feeds?: string
  /** Outputs: what feeds the output, e.g. "Matrix 3". */
  source?: string
  notes?: string
}

export type SectionId = 'inputs' | 'dcas' | 'buses' | 'outputs' | 'personal'
type TextKey = 'port' | 'micType' | 'stand' | 'routing' | 'members' | 'feeds' | 'source' | 'notes'

export interface FieldDef {
  key: TextKey
  label: string
  placeholder?: string
}

export interface SectionDef {
  id: SectionId
  title: string
  /** Short label for the row badge ("Ch 3", "DCA 2"). */
  prefix: string
  noun: string
  stereo: boolean
  /** Inputs read "Kick In - 1"; the rest read "1 - Wedge 1". */
  nameFirst: boolean
  /** Shown beside the name on every row. */
  inline: FieldDef[]
  /** Behind "Details". */
  details: FieldDef[]
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'inputs',
    title: 'Inputs',
    prefix: 'Ch',
    noun: 'input',
    stereo: true,
    nameFirst: true,
    inline: [],
    details: [
      { key: 'port', label: 'Patch point', placeholder: 'e.g. Local 8, Stage box 1' },
      { key: 'micType', label: 'Mic / DI', placeholder: 'e.g. Beta 91A' },
      { key: 'stand', label: 'Stand', placeholder: 'e.g. Short boom' },
      { key: 'routing', label: 'Routing', placeholder: 'e.g. to Bus 9, USB only' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'dcas',
    title: 'DCAs',
    prefix: 'DCA',
    noun: 'DCA',
    stereo: false,
    nameFirst: false,
    inline: [],
    details: [
      { key: 'members', label: 'Channels', placeholder: 'e.g. Ch 1–10' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'buses',
    title: 'Mix buses',
    prefix: 'Bus',
    noun: 'bus',
    stereo: true,
    nameFirst: false,
    inline: [{ key: 'feeds', label: 'Feeds', placeholder: 'e.g. Main 2' }],
    details: [{ key: 'notes', label: 'Notes' }],
  },
  {
    id: 'outputs',
    title: 'Outputs',
    prefix: 'Out',
    noun: 'output',
    stereo: true,
    nameFirst: false,
    inline: [{ key: 'source', label: 'Source', placeholder: 'e.g. Matrix 3' }],
    details: [
      { key: 'port', label: 'Physical output', placeholder: 'e.g. Local 1, Stage box 13' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'personal',
    title: 'Personal mix',
    prefix: 'Ch',
    noun: 'channel',
    stereo: true,
    nameFirst: true,
    inline: [],
    details: [{ key: 'notes', label: 'Notes' }],
  },
]

export const sectionDef = (id: SectionId) => SECTIONS.find((s) => s.id === id) as SectionDef

export interface PatchSheet {
  title: string
  /** e.g. "P16" or "IEM mixer" — heads the personal-mix section. */
  personalLabel: string
  sections: Record<SectionId, PatchRow[]>
}

/** Most rows a section may hold: enough for the largest live consoles. */
export const MAX_ROWS = 144

let seq = 0
export const newRow = (patch: Partial<PatchRow> = {}): PatchRow => ({
  id: `r${Date.now().toString(36)}${(seq++).toString(36)}`,
  name: '',
  ...patch,
})

/** First number of each row; a stereo row takes two. */
export function rowNumbers(rows: Pick<PatchRow, 'stereo'>[]): number[] {
  let next = 1
  return rows.map((r) => {
    const n = next
    next += r.stereo ? 2 : 1
    return n
  })
}

export const rowLabel = (n: number, stereo?: boolean) => (stereo ? `${n}–${n + 1}` : String(n))

/** Channels used, counting a stereo row as two. */
export const channelCount = (rows: PatchRow[]) =>
  rows.reduce((sum, r) => sum + (r.stereo ? 2 : 1), 0)

/** Rows with a stereo pair split into its L and R channels. */
export function expandRows(rows: PatchRow[]): { n: number; row: PatchRow; name: string }[] {
  const nums = rowNumbers(rows)
  return rows.flatMap((row, i) =>
    row.stereo
      ? [
          { n: nums[i], row, name: row.name ? `${row.name} L` : '' },
          { n: nums[i] + 1, row, name: row.name ? `${row.name} R` : '' },
        ]
      : [{ n: nums[i], row, name: row.name }],
  )
}

export interface ListTable {
  title: string
  headers: string[]
  rows: string[][]
  /** Colour (hex) of each body row, or null. */
  colors: (string | null)[]
}

const COLUMNS: Record<SectionId, { header: string; get: (r: PatchRow) => string }[]> = {
  inputs: [
    { header: 'Patch', get: (r) => r.port ?? '' },
    { header: 'Mic/Line', get: (r) => (r.type === 'line' ? 'Line' : 'Mic') },
    { header: 'Mic / DI', get: (r) => r.micType ?? '' },
    { header: 'Stand', get: (r) => r.stand ?? '' },
    { header: '48V', get: (r) => (r.phantom ? 'Yes' : 'No') },
    { header: 'Routing', get: (r) => r.routing ?? '' },
  ],
  dcas: [{ header: 'Channels', get: (r) => r.members ?? '' }],
  buses: [{ header: 'Feeds', get: (r) => r.feeds ?? '' }],
  outputs: [
    { header: 'Source', get: (r) => r.source ?? '' },
    { header: 'Physical out', get: (r) => r.port ?? '' },
  ],
  personal: [],
}

/** A section as a flat table, stereo rows split into L and R. */
export function sectionTable(sheet: PatchSheet, id: SectionId): ListTable {
  const def = sectionDef(id)
  const cols = COLUMNS[id]
  const rows = expandRows(sheet.sections[id])
  return {
    title: id === 'personal' && sheet.personalLabel ? sheet.personalLabel : def.title,
    headers: [
      def.prefix === 'Ch' ? 'Ch' : def.prefix,
      'Name',
      ...cols.map((c) => c.header),
      'Colour',
      'Notes',
    ],
    rows: rows.map(({ n, row, name }) => [
      String(n),
      name,
      ...cols.map((c) => c.get(row)),
      colorLabel(row.color),
      row.notes ?? '',
    ]),
    colors: rows.map(({ row }) => colorHex(row.color)),
  }
}

/** Every section that has at least one named row. */
export const sheetTables = (sheet: PatchSheet) =>
  SECTIONS.filter((s) => sheet.sections[s.id].some((r) => r.name.trim())).map((s) =>
    sectionTable(sheet, s.id),
  )

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** RFC 4180 CSV of one table. */
export const tableToCsv = (t: ListTable) =>
  [t.headers, ...t.rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'

/**
 * The sheet as plain text for WhatsApp, email or a notes app, in the familiar shape:
 *
 *     *INPUTS*
 *     Kick In - 1
 *     Crowd L - 35 - no main (only USB)
 *     Foh TB - Local 8
 *
 *     *OUTPUTS*
 *     13 - FOH Outfill L - Matrix 3
 */
export function sheetToText(sheet: PatchSheet): string {
  const out: string[] = []
  if (sheet.title.trim()) out.push(`*${sheet.title.trim().toUpperCase()}*`, '')
  for (const def of SECTIONS) {
    const rows = sheet.sections[def.id]
    if (!rows.some((r) => r.name.trim())) continue
    const title = def.id === 'personal' && sheet.personalLabel ? sheet.personalLabel : def.title
    out.push(`*${title.toUpperCase()}*`)
    for (const { n, row, name } of expandRows(rows)) {
      if (!name && def.nameFirst) continue
      const where = def.id === 'inputs' && row.port ? row.port : String(n)
      const extra = [row.routing, row.feeds, row.source, row.members].filter(Boolean)
      if (def.id === 'outputs' && row.port) extra.push(row.port)
      const tail = extra.length ? ` - ${extra.join(' - ')}` : ''
      out.push(def.nameFirst ? `${name} - ${where}${tail}` : `${n} - ${name}${tail}`.trimEnd())
    }
    if (def.id === 'inputs') out.push('', `*Total: ${channelCount(rows)} inputs*`)
    out.push('')
  }
  return out.join('\n').trim() + '\n'
}

/** Accepts a saved sheet, an older flat input list, or nothing. */
export function normaliseSheet(value: unknown, fallback: PatchSheet): PatchSheet {
  if (value && typeof value === 'object' && 'sections' in value) {
    const v = value as PatchSheet
    return {
      title: v.title ?? '',
      personalLabel: v.personalLabel ?? 'Personal mix',
      sections: { ...fallback.sections, ...emptySections(), ...v.sections },
    }
  }
  return fallback
}

export const emptySections = (): Record<SectionId, PatchRow[]> => ({
  inputs: [],
  dcas: [],
  buses: [],
  outputs: [],
  personal: [],
})

const named = (names: (string | [string, Partial<PatchRow>])[]) =>
  names.map((n) => (typeof n === 'string' ? newRow({ name: n }) : newRow({ name: n[0], ...n[1] })))

const stereo = { stereo: true } as const
const line = { type: 'line' } as const

export const TEMPLATES: { id: string; label: string; make: () => PatchSheet }[] = [
  {
    id: 'blank',
    label: 'Blank',
    make: () => ({ title: '', personalLabel: 'Personal mix', sections: emptySections() }),
  },
  {
    id: 'band',
    label: 'Small band',
    make: () => ({
      title: '',
      personalLabel: 'IEM',
      sections: {
        inputs: named([
          ['Kick In', { micType: 'Beta 91A', color: 'red' }],
          ['Snare Top', { micType: 'SM57', stand: 'Short boom', color: 'red' }],
          ['OH', { ...stereo, color: 'red', phantom: true }],
          ['Bass', { ...line, micType: 'DI', color: 'orange' }],
          ['Gtr', { micType: 'SM57', color: 'yellow' }],
          ['Keys', { ...stereo, ...line, color: 'green' }],
          ['Lead Vox', { micType: 'Beta 58A', stand: 'Tall boom', color: 'blue' }],
        ]),
        dcas: named(['Drums', 'Band', 'Vox']),
        buses: named(['Wedge 1', 'Wedge 2']),
        outputs: named([
          ['Wedge 1', { source: 'Bus 1' }],
          ['Wedge 2', { source: 'Bus 2' }],
          ['FOH', { ...stereo, source: 'Main LR' }],
        ]),
        personal: [],
      },
    }),
  },
  {
    id: 'worship',
    label: 'Worship band (42 inputs)',
    make: () => ({
      title: '',
      personalLabel: 'P16',
      sections: {
        inputs: named([
          ['Kick In', { color: 'red' }],
          ['Kick Out', { color: 'red' }],
          ['Snare Top', { color: 'red' }],
          ['Snare BTM', { color: 'red' }],
          ['HiHat', { color: 'red', phantom: true }],
          ['Tom 1', { color: 'red' }],
          ['Tom 2', { color: 'red' }],
          ['FLR Tom', { color: 'red' }],
          ['OH', { ...stereo, color: 'red', phantom: true }],
          ['Track', { ...stereo, ...line, color: 'purple' }],
          ['Keys 1', { ...stereo, ...line, color: 'green' }],
          ['Keys 2', { ...stereo, ...line, color: 'green' }],
          ['Gtr', { ...stereo, ...line, color: 'yellow' }],
          ['Bass', { ...line, color: 'orange' }],
          ['TD 1', { color: 'pink' }],
          ['TD 2', { color: 'pink' }],
          ['Omele', { color: 'pink' }],
          ['Sop 1', { color: 'cyan' }],
          ['Sop 2', { color: 'cyan' }],
          ['Ten 3', { color: 'cyan' }],
          ['Ten 4', { color: 'cyan' }],
          ['Alto 5', { color: 'cyan' }],
          ['Alto 6', { color: 'cyan' }],
          ['Lead Mic 1', { color: 'blue' }],
          ['Lead Mic 2', { color: 'blue' }],
          ['Pastor Mic', { color: 'white' }],
          ['PL Mic', { color: 'white' }],
          ['Spdx', { ...stereo, ...line, color: 'pink' }],
          ['Crowd', { ...stereo, routing: 'no main (only USB)' }],
          ['Drums TB', { routing: 'to Bus 9' }],
          ['Bass TB', { routing: 'to Bus 9' }],
          ['Keys TB', { routing: 'to Bus 8' }],
          ['Stage TB', { routing: 'to Bus 8' }],
          ['Foh TB', { port: 'Local 8' }],
          ['Projection', { ...line, port: 'Local 1' }],
        ]),
        dcas: named([
          'Drums',
          'Tracks',
          'Bass',
          'Keys',
          'Gtr',
          'Bgvs',
          'Lead mic',
          'Pastor',
          'Perc',
          'Band',
          'All Voices',
        ]),
        buses: named([
          'Wedge 1',
          'Wedge 2',
          'Stage Sub',
          'Drums Parr',
          'Bgv Parr',
          'Lead Parr',
          'Perc Parr',
          ['Musicians TB', { feeds: 'Main 2' }],
          ['Percs', stereo],
          ['Toms', stereo],
          ['BGV', stereo],
          '',
          '',
        ]),
        outputs: named([
          'Wedge 1',
          'Wedge 2',
          'Stage Sub',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'FOH Sub',
          ['FOH Outfill L', { source: 'Matrix 3' }],
          ['FOH Outfill R', { source: 'Matrix 4' }],
          ['FOH L', { source: 'Matrix 1' }],
          ['FOH R', { source: 'Matrix 2' }],
          ['Projection L', { source: 'Matrix 5', port: 'Local 1' }],
          ['Projection R', { source: 'Matrix 6', port: 'Local 2' }],
        ]),
        personal: named([
          'Kick',
          'Snr',
          'Toms',
          'Tracks',
          'Keys 1',
          'Keys 2',
          'Bass',
          'Gtr',
          '',
          '',
          'Sax',
          'Percs',
          'Bgv',
          'LV 1',
          'Lead',
          'TB',
        ]),
      },
    }),
  },
]
