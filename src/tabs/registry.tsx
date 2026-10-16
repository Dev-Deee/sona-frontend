import type { ReactNode } from 'react'
import { Icon } from '../components/ui/icons'

export const TAB_IDS = [
  'acoustics',
  'coverage',
  'arrays',
  'gain-signal',
  'intelligibility',
  'timing-sync',
  'rf-wireless',
  'power-electrical',
  'show-tools',
  'reference',
] as const

export type TabId = (typeof TAB_IDS)[number]

export const DEFAULT_TAB: TabId = 'acoustics'

export const isTabId = (value: unknown): value is TabId => TAB_IDS.includes(value as TabId)

export type NavGroup = 'Sound' | 'System' | 'Show' | 'Learn'

export interface TabMeta {
  id: TabId
  /** Plain-language page name. */
  label: string
  /** Bottom-bar label on phones. */
  short: string
  subtitle: string
  group: NavGroup
  icon: (props: { size?: number }) => ReactNode
}

/** Pages in navigation order, grouped by the job they help with. */
export const TABS: TabMeta[] = [
  {
    id: 'acoustics',
    label: 'Sound & Rooms',
    short: 'Sound',
    subtitle: 'How sound behaves in air and in a room',
    group: 'Sound',
    icon: Icon.Wave,
  },
  {
    id: 'intelligibility',
    label: 'Speech & Feedback',
    short: 'Speech',
    subtitle: 'Will people understand every word — and can you get loud enough?',
    group: 'Sound',
    icon: Icon.Speech,
  },
  {
    id: 'timing-sync',
    label: 'Timing & Sync',
    short: 'Timing',
    subtitle: 'Delays, phase, tempo and video sync',
    group: 'Sound',
    icon: Icon.Clock,
  },
  {
    id: 'coverage',
    label: 'Coverage & Delays',
    short: 'Coverage',
    subtitle: 'Getting even sound to every seat',
    group: 'System',
    icon: Icon.Cone,
  },
  {
    id: 'arrays',
    label: 'Arrays & Subs',
    short: 'Arrays',
    subtitle: 'Line arrays, sub placement and spacing',
    group: 'System',
    icon: Icon.Array,
  },
  {
    id: 'gain-signal',
    label: 'Levels & Gain',
    short: 'Levels',
    subtitle: 'Decibels, gain structure and cables',
    group: 'System',
    icon: Icon.Gain,
  },
  {
    id: 'power-electrical',
    label: 'Power & Safety',
    short: 'Power',
    subtitle: 'Amps, mains circuits, speaker loads and hearing safety',
    group: 'Show',
    icon: Icon.Bolt,
  },
  {
    id: 'rf-wireless',
    label: 'Wireless',
    short: 'Wireless',
    subtitle: 'Range and frequency clashes for mics and IEMs',
    group: 'Show',
    icon: Icon.Antenna,
  },
  {
    id: 'show-tools',
    label: 'Show Prep',
    short: 'Prep',
    subtitle: 'Input lists and rigging loads',
    group: 'Show',
    icon: Icon.Clipboard,
  },
  {
    id: 'reference',
    label: 'Reference',
    short: 'Ref',
    subtitle: 'Formulas, constants and tables',
    group: 'Learn',
    icon: Icon.Book,
  },
]

export const NAV_GROUPS: NavGroup[] = ['Sound', 'System', 'Show', 'Learn']

export const tabMeta = (id: TabId) => TABS.find((t) => t.id === id) as TabMeta

/** Tabs in the mobile bottom bar; the rest live under "More". */
export const MOBILE_PRIMARY_TABS: TabId[] = ['acoustics', 'coverage', 'arrays', 'gain-signal']
