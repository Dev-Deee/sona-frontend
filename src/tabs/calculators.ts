import type { ComponentType } from 'react'
import {
  CriticalDistanceCard,
  ItdgCard,
  RoomModesCard,
  Rt60Card,
  SpeedOfSoundCard,
  WavelengthCard,
} from '../components/calculator/cards/acoustics'
import {
  AspectRatioCard,
  AsymmetricCoverageCard,
  CoverageAngleCard,
  InverseSquareCard,
  NeedDelaysCard,
} from '../components/calculator/cards/coverage'
import {
  BeamingCard,
  CombFilterCard,
  ConstantCurvatureCard,
  GradientSubCard,
  MaxSubSpacingCard,
  UncoupledSpacingCard,
} from '../components/calculator/cards/arrays'
import {
  AddSubtractDbCard,
  CableLossCard,
  DbToLinearCard,
  GainStructureCard,
  LinearToDbCard,
  SpeakerHeadroomCard,
  SummationCard,
} from '../components/calculator/cards/gainSignal'
import {
  AlconsCard,
  FeedbackHeadroomCard,
  StiCard,
} from '../components/calculator/cards/intelligibility'
import { DelayTowerPlannerCard } from '../components/calculator/cards/delayTower'
import {
  BpmCard,
  FrameSyncCard,
  PhaseDelayCard,
  TransmissionPathCard,
} from '../components/calculator/cards/timingSync'
import {
  FrequencyCoordinationCard,
  LinkBudgetCard,
} from '../components/calculator/cards/rfWireless'
import {
  AmpPowerSplCard,
  CircuitLoadCard,
  ConstantVoltageCard,
  ImpedanceCard,
  NoiseDoseCard,
} from '../components/calculator/cards/powerElectrical'
import { InputListCard, RiggingLoadCard } from '../components/calculator/cards/showTools'
import {
  CableGaugeReference,
  FormulasReference,
  ImpedanceReference,
  IntervalsReference,
  LevelsReference,
  SampleRatesReference,
  SpeedOfSoundReference,
} from './ReferenceTab'
import type { TabId } from './registry'
import { IntelligibilityCriticalDistance } from './TabPages'

export interface CalcEntry {
  /** URL segment: #/<tab>/<slug> */
  slug: string
  /** Plain-language name, used on its tab and in search. */
  label: string
  /** The technical term, shown as a small tag next to the name. */
  tech: string
  /** The question this calculator answers. */
  question: string
  /** Extra search terms. */
  keywords: string
  component: ComponentType
  /** Key of this calculator's inputs in the inputs store; absent for reference pages. */
  calcId?: string
}

/** Every page's calculators, in tab order. Each one gets its own tab. */
export const CALCULATORS: Record<TabId, CalcEntry[]> = {
  acoustics: [
    {
      slug: 'wavelength',
      label: 'Wavelength',
      tech: 'Frequency → λ',
      question: 'How long is one cycle of this frequency?',
      keywords: 'wavelength lambda period samples frequency',
      component: WavelengthCard,
      calcId: 'acoustics.wavelength',
    },
    {
      slug: 'speed-of-sound',
      label: 'Speed of sound',
      tech: 'c',
      question: 'How fast is sound travelling today?',
      keywords: 'speed of sound temperature ms per metre',
      component: SpeedOfSoundCard,
      calcId: 'acoustics.speed',
    },
    {
      slug: 'rt60',
      label: 'Reverb time',
      tech: 'RT60',
      question: 'How long does this room ring?',
      keywords: 'rt60 reverb reverberation sabine eyring absorption',
      component: Rt60Card,
      calcId: 'acoustics.rt60',
    },
    {
      slug: 'critical-distance',
      label: 'Critical distance',
      tech: 'Dc',
      question: 'Where does the room take over from the speaker?',
      keywords: 'critical distance direct reverberant',
      component: CriticalDistanceCard,
      calcId: 'acoustics.criticalDistance',
    },
    {
      slug: 'room-modes',
      label: 'Room resonances',
      tech: 'Room modes',
      question: 'Which bass notes will boom in this room?',
      keywords: 'room modes standing waves resonance bass',
      component: RoomModesCard,
      calcId: 'acoustics.roomModes',
    },
    {
      slug: 'itdg',
      label: 'First reflection',
      tech: 'ITDG',
      question: 'When does the first echo arrive?',
      keywords: 'itdg initial time delay gap reflection echo',
      component: ItdgCard,
      calcId: 'acoustics.itdg',
    },
  ],
  coverage: [
    {
      slug: 'inverse-square',
      label: 'Level over distance',
      tech: 'Inverse square law',
      question: 'How much quieter is it further back?',
      keywords: 'inverse square spl distance drop 6 db how loud quieter back row',
      component: InverseSquareCard,
      calcId: 'coverage.inverseSquare',
    },
    {
      slug: 'far-lar',
      label: 'Coverage shape',
      tech: 'FAR / LAR',
      question: 'How wide does this speaker cover at the listener?',
      keywords: 'far lar aspect ratio coverage width',
      component: AspectRatioCard,
      calcId: 'coverage.aspectRatio',
    },
    {
      slug: 'coverage-angle',
      label: 'Speaker angle',
      tech: 'Coverage angle',
      question: 'What coverage angle does this audience need?',
      keywords: 'coverage angle horizontal dispersion horn',
      component: CoverageAngleCard,
      calcId: 'coverage.angle',
    },
    {
      slug: 'asymmetric',
      label: 'Aim front & back',
      tech: 'Asymmetric coverage',
      question: 'How do I aim at both the front and back rows?',
      keywords: 'asymmetric point source splay aim downfill',
      component: AsymmetricCoverageCard,
      calcId: 'coverage.asymmetric',
    },
    {
      slug: 'delays',
      label: 'Need delays?',
      tech: 'Arrival time check',
      question: 'Do I need delay speakers here?',
      keywords: 'delay speaker time difference haas',
      component: NeedDelaysCard,
      calcId: 'coverage.delays',
    },
    {
      slug: 'delay-planner',
      label: 'Delay tower planner',
      tech: '6-step workflow',
      question: 'Where do delay towers go, and what delay do they need?',
      keywords: 'delay tower planner festival outdoor',
      component: DelayTowerPlannerCard,
      calcId: 'coverage.delayPlanner',
    },
  ],
  arrays: [
    {
      slug: 'comb-filter',
      label: 'Comb filtering',
      tech: 'Comb filter',
      question: 'Why does it sound hollow or phasey?',
      keywords: 'comb filter notch reflection two mics',
      component: CombFilterCard,
      calcId: 'arrays.comb',
    },
    {
      slug: 'line-array',
      label: 'Line array',
      tech: 'Constant curvature',
      question: 'What will my hang cover?',
      keywords: 'line array splay hang boxes throw',
      component: ConstantCurvatureCard,
      calcId: 'arrays.constantCurvature',
    },
    {
      slug: 'beaming',
      label: 'Beaming',
      tech: 'Beaming frequency',
      question: 'Above what frequency does a box start to narrow?',
      keywords: 'beaming box height directivity',
      component: BeamingCard,
      calcId: 'arrays.beaming',
    },
    {
      slug: 'cardioid-subs',
      label: 'Cardioid & end-fire subs',
      tech: 'Gradient / end-fire',
      question: 'How do I keep bass off the stage?',
      keywords: 'cardioid gradient end-fire subs delay polarity',
      component: GradientSubCard,
      calcId: 'arrays.gradient',
    },
    {
      slug: 'sub-spacing',
      label: 'Sub spacing',
      tech: 'Grating lobes',
      question: 'How far apart can subs stand in a row?',
      keywords: 'sub spacing grating lobe broadside',
      component: MaxSubSpacingCard,
      calcId: 'arrays.maxSpacing',
    },
    {
      slug: 'fill-spacing',
      label: 'Fill spacing',
      tech: 'Uncoupled spacing',
      question: 'How far apart can front fills or ceiling speakers go?',
      keywords: 'front fill ceiling speaker spacing',
      component: UncoupledSpacingCard,
      calcId: 'arrays.uncoupled',
    },
  ],
  'gain-signal': [
    {
      slug: 'db-to-linear',
      label: 'dB → ratio',
      tech: 'dB to linear',
      question: 'What does this many dB actually mean?',
      keywords: 'db linear ratio voltage power',
      component: DbToLinearCard,
      calcId: 'gain-signal.dbToLinear',
    },
    {
      slug: 'linear-to-db',
      label: 'Ratio → dB',
      tech: 'Linear to dB',
      question: 'How many dB is twice the voltage?',
      keywords: 'linear ratio to db',
      component: LinearToDbCard,
      calcId: 'gain-signal.linearToDb',
    },
    {
      slug: 'summation',
      label: 'Adding speakers',
      tech: 'Coherent summation',
      question: 'How much louder with more boxes?',
      keywords: 'summation identical sources +6 db',
      component: SummationCard,
      calcId: 'gain-signal.summation',
    },
    {
      slug: 'headroom',
      label: 'Amp vs speaker power',
      tech: 'Speaker headroom',
      question: 'Is this amp safe for my speaker?',
      keywords: 'amplifier power speaker rating rms program',
      component: SpeakerHeadroomCard,
      calcId: 'gain-signal.headroom',
    },
    {
      slug: 'gain-structure',
      label: 'Gain structure',
      tech: 'Signal chain',
      question: 'Where in the chain will my system clip?',
      keywords: 'gain structure headroom clip dbu preamp',
      component: GainStructureCard,
      calcId: 'gain-signal.gainStructure',
    },
    {
      slug: 'add-subtract-db',
      label: 'Add / subtract dB',
      tech: 'Incoherent summation',
      question: 'How do several levels combine?',
      keywords: 'add db subtract background noise combine',
      component: AddSubtractDbCard,
      calcId: 'gain-signal.addSubtract',
    },
    {
      slug: 'cable-loss',
      label: 'Speaker cable',
      tech: 'Cable loss',
      question: 'Is my speaker cable thick enough?',
      keywords: 'cable loss awg mm2 resistance gauge',
      component: CableLossCard,
      calcId: 'gain-signal.cableLoss',
    },
  ],
  intelligibility: [
    {
      slug: 'sti',
      label: 'Speech clarity',
      tech: 'STI',
      question: 'Will speech be understood?',
      keywords: 'sti speech transmission index intelligibility',
      component: StiCard,
      calcId: 'intelligibility.sti',
    },
    {
      slug: 'alcons',
      label: 'Consonant loss',
      tech: '%ALcons',
      question: 'How many consonants will listeners miss?',
      keywords: 'alcons articulation loss peutz',
      component: AlconsCard,
      calcId: 'intelligibility.alcons',
    },
    {
      slug: 'feedback',
      label: 'Gain before feedback',
      tech: 'PAG / NAG',
      question: 'Can I get enough level before feedback?',
      keywords: 'feedback pag nag gain open mics',
      component: FeedbackHeadroomCard,
      calcId: 'intelligibility.feedback',
    },
    {
      slug: 'critical-distance',
      label: 'Critical distance',
      tech: 'Dc',
      question: 'Where does the room take over from the speaker?',
      keywords: 'critical distance direct reverberant',
      component: IntelligibilityCriticalDistance,
      calcId: 'intelligibility.criticalDistance',
    },
  ],
  'timing-sync': [
    {
      slug: 'phase-delay',
      label: 'Phase → delay',
      tech: 'Phase delay',
      question: 'How many ms is this phase shift?',
      keywords: 'phase degrees delay alignment crossover',
      component: PhaseDelayCard,
      calcId: 'timing-sync.phaseDelay',
    },
    {
      slug: 'transmission',
      label: 'Delay → distance',
      tech: 'Transmission path',
      question: 'How far does sound travel in this time?',
      keywords: 'delay distance ms metres',
      component: TransmissionPathCard,
      calcId: 'timing-sync.transmission',
    },
    {
      slug: 'bpm',
      label: 'Tempo delays',
      tech: 'BPM → ms',
      question: 'What delay time fits this tempo?',
      keywords: 'bpm tempo delay echo note',
      component: BpmCard,
      calcId: 'timing-sync.bpm',
    },
    {
      slug: 'frame-sync',
      label: 'Video frames',
      tech: 'Frame sync',
      question: 'How long is a video frame in ms and samples?',
      keywords: 'video frame rate lip sync fps samples',
      component: FrameSyncCard,
      calcId: 'timing-sync.frames',
    },
  ],
  'rf-wireless': [
    {
      slug: 'link-budget',
      label: 'Wireless range',
      tech: 'Link budget',
      question: 'Will my wireless reach without dropouts?',
      keywords: 'rf link budget range antenna margin',
      component: LinkBudgetCard,
      calcId: 'rf-wireless.linkBudget',
    },
    {
      slug: 'im3',
      label: 'Frequency clashes',
      tech: 'IM3 coordination',
      question: 'Do my wireless frequencies clash?',
      keywords: 'intermodulation im3 frequency coordination',
      component: FrequencyCoordinationCard,
      calcId: 'rf-wireless.coordination',
    },
  ],
  'power-electrical': [
    {
      slug: 'amp-spl',
      label: 'Amp power & loudness',
      tech: 'Power ↔ SPL',
      question: 'How loud can this amp and speaker go?',
      keywords: 'amp power spl sensitivity watts',
      component: AmpPowerSplCard,
      calcId: 'power-electrical.ampSpl',
    },
    {
      slug: 'impedance',
      label: 'Speaker load',
      tech: 'Impedance',
      question: 'What load does my amplifier see?',
      keywords: 'impedance ohms series parallel load',
      component: ImpedanceCard,
      calcId: 'power-electrical.impedance',
    },
    {
      slug: 'circuit-load',
      label: 'Mains circuits',
      tech: 'Circuit load',
      question: 'How many power circuits do I need?',
      keywords: 'circuit current amps breaker mains',
      component: CircuitLoadCard,
      calcId: 'power-electrical.circuit',
    },
    {
      slug: 'constant-voltage',
      label: '70 V / 100 V systems',
      tech: 'Constant voltage',
      question: 'What amplifier does my 100 V line need?',
      keywords: '70v 100v constant voltage taps',
      component: ConstantVoltageCard,
      calcId: 'power-electrical.constantVoltage',
    },
    {
      slug: 'noise-dose',
      label: 'Hearing safety',
      tech: 'Noise dose',
      question: 'How long is this level safe for ears?',
      keywords: 'noise exposure dose hearing who osha niosh hse',
      component: NoiseDoseCard,
      calcId: 'power-electrical.noiseDose',
    },
  ],
  'show-tools': [
    {
      slug: 'input-list',
      label: 'Input list',
      tech: 'Channel list',
      question: 'Build and export an input list',
      keywords: 'input list channel patch csv',
      component: InputListCard,
      calcId: 'show-tools.inputList',
    },
    {
      slug: 'rigging',
      label: 'Rigging load',
      tech: 'Load per point',
      question: 'What does each rigging point carry?',
      keywords: 'rigging load hoist motor bridle weight',
      component: RiggingLoadCard,
      calcId: 'show-tools.rigging',
    },
  ],
  reference: [
    {
      slug: 'formulas',
      label: 'Formulas',
      tech: 'All formulas',
      question: 'Every formula Sona uses',
      keywords: 'formulas reference',
      component: FormulasReference,
    },
    {
      slug: 'speed-of-sound',
      label: 'Speed of sound table',
      tech: 'By temperature',
      question: 'Speed of sound at common temperatures',
      keywords: 'speed of sound table',
      component: SpeedOfSoundReference,
    },
    {
      slug: 'levels',
      label: 'Reference levels',
      tech: 'dBu · dBV · dBFS',
      question: 'What does 0 dB mean on each scale?',
      keywords: 'dbu dbv dbfs reference levels',
      component: LevelsReference,
    },
    {
      slug: 'impedances',
      label: 'Standard impedances',
      tech: 'Interfaces',
      question: 'Typical impedances across the signal chain',
      keywords: 'impedance mic line instrument',
      component: ImpedanceReference,
    },
    {
      slug: 'intervals',
      label: 'Frequency intervals',
      tech: 'Octaves',
      question: 'Octave, third-octave and semitone ratios',
      keywords: 'octave third octave semitone',
      component: IntervalsReference,
    },
    {
      slug: 'sample-rates',
      label: 'Sample rates',
      tech: 'Digital audio',
      question: 'Sample periods and Nyquist limits',
      keywords: 'sample rate nyquist',
      component: SampleRatesReference,
    },
    {
      slug: 'cable-gauge',
      label: 'Cable gauge',
      tech: 'AWG ↔ mm²',
      question: 'AWG sizes, cross-sections and resistance',
      keywords: 'awg mm2 cable gauge',
      component: CableGaugeReference,
    },
  ],
}

export function resolveCalc(tab: TabId, slug: string | undefined, fallback?: string): CalcEntry {
  const list = CALCULATORS[tab]
  return list.find((c) => c.slug === slug) ?? list.find((c) => c.slug === fallback) ?? list[0]
}

/** Finds a calculator by its inputs-store ID. */
export function findByCalcId(tab: TabId, calcId: string): CalcEntry | undefined {
  return CALCULATORS[tab].find((c) => c.calcId === calcId)
}
