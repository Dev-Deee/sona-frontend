import {
  aspectRatios,
  asymmetricCoverage,
  inverseSquare,
  GROUND_STACK_NOTE,
  mountedHeight,
  needDelays,
  requiredCoverageAngle,
  type Mounting,
} from '../../../calculators/coverage'
import { fmtDb, fmtDbSigned, fmtDistance, fmtMs, formatNumber } from '../../../calculators/format'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import { findSpeaker, getSplAt1m, type Speaker, speakerName } from '../../../data/speakers'
import { CalcCard, Inputs, Outputs } from '../CalcCard'
import { NumberField, TemperatureField } from '../fields'
import { SpeakerSelect } from '../SpeakerPicker'
import { MountingFields } from './MountingFields'
import { CalcError, Check, Note, Output, Rating, Verdict, Warnings } from '../outputs'
import { useQ, useTemperature, v } from './shared'

const fmtDeg = (x: number) => formatNumber(x, 1)

const STANDARD_PATTERNS = [40, 50, 60, 75, 90, 100, 110, 120, 140]
/** The smallest common horn pattern that covers the required angle. */
const nextStandard = (deg: number) => STANDARD_PATTERNS.find((p) => p >= deg - 0.5)

/** Does the chosen speaker's published pattern cover the angle the audience needs? */
function PatternCheck({
  speaker,
  axis,
  needed,
}: {
  speaker: Speaker
  axis: 'h' | 'v'
  needed: number
}) {
  const name = speakerName(speaker)
  const have = axis === 'h' ? speaker.hCoverage : speaker.vCoverage
  const plane = axis === 'h' ? 'horizontal' : 'vertical'
  if (have === null)
    return (
      <Check state="warn">
        {name} has no published {plane} coverage
        {axis === 'v' && speaker.category === 'line_array_element'
          ? ' — a line array’s vertical coverage comes from the splay angles between boxes.'
          : '.'}
      </Check>
    )
  if (have < needed - 0.5)
    return (
      <Check state="fail">
        {name} covers {have}° {plane} — {fmtDeg(needed - have)}° short of the {fmtDeg(needed)}°
        needed. Use a wider pattern or add a fill.
      </Check>
    )
  if (have > needed * 1.5)
    return (
      <Check state="warn">
        {name} covers {have}° {plane}, much wider than the {fmtDeg(needed)}° needed — expect spill
        onto walls or ceiling.
      </Check>
    )
  return (
    <Check state="pass">
      {name} covers {have}° {plane}, enough for the {fmtDeg(needed)}° needed.
    </Check>
  )
}

export function InverseSquareCard() {
  const id = 'coverage.inverseSquare'
  const [inp, set] = useCalcInputs(id, {
    refSpl: 110 as number | null,
    refDistance: 1 as number | null,
    targetDistance: 20 as number | null,
    speaker: null as string | null,
  })
  const q = useQ()
  const { show, label } = useUnits()
  const r = inverseSquare(inp.refSpl, inp.refDistance, inp.targetDistance)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Inverse Square Law',
          inputs: `${v(inp.refSpl, 'dB')} @ ${q('distance', inp.refDistance)} → ${q('distance', inp.targetDistance)}`,
          output: `${fmtDb(r.value.spl)} dB SPL`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Inverse Square Law"
      info={{
        what: 'SPL at a new distance from a point source in free field (−6 dB per doubling of distance).',
        when: 'Estimating level at the back of the room from a spec-sheet 1 m figure. Line arrays in their near field lose closer to 3 dB per doubling.',
        formula: 'SPL₂ = SPL₁ − 20 × log₁₀(d₂ / d₁)',
      }}
    >
      <Inputs>
        <SpeakerSelect
          speakerId={inp.speaker}
          onClear={() => set('speaker', null)}
          onSelect={(s) => {
            const spl = getSplAt1m(s)
            set('speaker', s.id)
            if (spl !== null) {
              set('refSpl', Math.round(spl * 10) / 10)
              set('refDistance', 1)
            }
          }}
        />
        <NumberField
          label="Reference SPL"
          hint="A level you know — e.g. a spec-sheet max SPL at 1 m, or a meter reading."
          unit="dB"
          value={inp.refSpl}
          onChange={(x) => set('refSpl', x)}
        />
        <NumberField
          label="Reference distance"
          hint="Where that level was measured (1 m for spec sheets)."
          kind="distance"
          value={inp.refDistance}
          onChange={(x) => set('refDistance', x)}
        />
        <NumberField
          label="Target distance"
          hint="Where you want to know the level — e.g. the mix position or back row."
          kind="distance"
          value={inp.targetDistance}
          onChange={(x) => set('targetDistance', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label={`Level at ${fmtDistance(show('distance', inp.targetDistance ?? 0))} ${label('distance')}`}
            value={fmtDb(r.value.spl)}
            unit="dB SPL"
            wide
          />
          <Verdict>
            {r.value.change <= 0
              ? `Moving from ${q('distance', inp.refDistance)} to ${q('distance', inp.targetDistance)}, the level drops by ${fmtDb(-r.value.change)} dB. Every doubling of distance costs about 6 dB.`
              : `Moving closer, from ${q('distance', inp.refDistance)} to ${q('distance', inp.targetDistance)}, the level rises by ${fmtDb(r.value.change)} dB.`}
          </Verdict>
          <Output
            label="Change in level"
            help="Negative means quieter at the target distance."
            value={fmtDbSigned(r.value.change)}
            unit="dB"
            secondary
            wide
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function AspectRatioCard() {
  const id = 'coverage.aspectRatio'
  const [inp, set] = useCalcInputs(id, {
    height: 4 as number | null,
    throwDistance: 15 as number | null,
    angle: 90 as number | null,
    speaker: null as string | null,
  })
  const q = useQ()
  const { show, label } = useUnits()
  const r = aspectRatios(inp.height, inp.throwDistance, inp.angle)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'FAR / LAR',
          inputs: `h ${q('distance', inp.height)}, throw ${q('distance', inp.throwDistance)}, ${v(inp.angle, '°')}`,
          output: `FAR ${formatNumber(r.value.far, 2)}, LAR ${formatNumber(r.value.lar, 2)}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="FAR / LAR"
      info={{
        what: 'Forward aspect ratio (coverage length ÷ width) and lateral aspect ratio (coverage width ÷ distance) of a speaker, plus the coverage width it delivers at the listener.',
        when: 'Choosing a speaker pattern for a seating area and checking it will reach the edges at the throw distance.',
        formula: 'FAR = 1 / sin(θ/2)\nLAR = 2 × tan(θ/2)\nwidth = LAR × √(h² + throw²)',
      }}
    >
      <Inputs>
        <NumberField
          label="Height above ears"
          hint="How high the speaker is above listeners’ ears."
          kind="distance"
          value={inp.height}
          onChange={(x) => set('height', x)}
        />
        <NumberField
          label="Throw distance"
          hint="Horizontal distance from the speaker to the listeners."
          kind="distance"
          value={inp.throwDistance}
          onChange={(x) => set('throwDistance', x)}
        />
        <SpeakerSelect
          speakerId={inp.speaker}
          onClear={() => set('speaker', null)}
          onSelect={(sp) => {
            set('speaker', sp.id)
            if (sp.hCoverage !== null) set('angle', sp.hCoverage)
          }}
        />
        <NumberField
          label="Coverage angle"
          hint="The speaker’s rated horizontal (or vertical) angle, from the spec sheet."
          unit="°"
          value={inp.angle}
          onChange={(x) => set('angle', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Coverage width at the listener"
            help="How wide the speaker covers at this distance, edge to edge (−6 dB points)."
            value={fmtDistance(show('distance', r.value.coverageWidth))}
            unit={label('distance')}
            wide
          />
          <Verdict>
            Aimed {fmtDeg(r.value.aimAngle)}° down at listeners{' '}
            {fmtDistance(show('distance', r.value.directDistance))} {label('distance')} away, this
            speaker covers a strip about {fmtDistance(show('distance', r.value.coverageWidth))}{' '}
            {label('distance')} wide.
          </Verdict>
          <Output
            label="Aim (tilt down)"
            value={fmtDeg(r.value.aimAngle)}
            unit="°"
            help="Point the speaker this far below level to hit the listeners."
          />
          <Output
            label="Distance to listeners"
            value={fmtDistance(show('distance', r.value.directDistance))}
            unit={label('distance')}
            help="Straight-line distance from the speaker."
          />
          <Output
            label="Forward aspect ratio (FAR)"
            value={formatNumber(r.value.far, 2)}
            secondary
            help="Shape of the coverage: length ÷ width. Higher = longer, narrower throw."
          />
          <Output
            label="Lateral aspect ratio (LAR)"
            value={formatNumber(r.value.lar, 2)}
            secondary
            help="Coverage width per metre of distance."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function CoverageAngleCard() {
  const id = 'coverage.angle'
  const [inp, set] = useCalcInputs(id, {
    width: 20 as number | null,
    distance: 12 as number | null,
    speaker: null as string | null,
  })
  const chosen = findSpeaker(inp.speaker)
  const q = useQ()
  const r = requiredCoverageAngle(inp.width, inp.distance)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Speaker Coverage Angle',
          inputs: `${q('distance', inp.width)} wide @ ${q('distance', inp.distance)}`,
          output: `${fmtDeg(r.value)}°`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Speaker Coverage Angle"
      info={{
        what: 'The horizontal coverage angle needed to span an audience width at a given throw.',
        when: 'Picking a horn pattern (e.g. 60° vs 90°) for a seating block.',
        formula: 'θ = 2 × atan(width / (2 × distance))',
      }}
    >
      <Inputs>
        <SpeakerSelect
          label="Check a speaker"
          speakerId={inp.speaker}
          onClear={() => set('speaker', null)}
          onSelect={(sp) => set('speaker', sp.id)}
        />
        <NumberField
          label="Audience width"
          hint="How wide the seating area is at the throw distance."
          kind="distance"
          value={inp.width}
          onChange={(x) => set('width', x)}
        />
        <NumberField
          label="Throw distance"
          hint="Horizontal distance from the speaker to the listeners."
          kind="distance"
          value={inp.distance}
          onChange={(x) => set('distance', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Coverage angle needed"
            help="The narrowest speaker pattern that still reaches both edges."
            value={fmtDeg(r.value)}
            unit="°"
            wide
          />
          <Verdict>
            Choose a speaker with at least {fmtDeg(r.value)}° of coverage
            {nextStandard(r.value)
              ? ` — the nearest common pattern is ${nextStandard(r.value)}°`
              : ''}
            . A narrower speaker leaves the edge seats short; a much wider one throws sound onto the
            side walls.
          </Verdict>
          {chosen && <PatternCheck speaker={chosen} axis="h" needed={r.value} />}
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function AsymmetricCoverageCard() {
  const id = 'coverage.asymmetric'
  const [inp, set] = useCalcInputs(id, {
    near: 4 as number | null,
    far: 35 as number | null,
    height: 7 as number | null,
    speaker: null as string | null,
  })
  const chosen = findSpeaker(inp.speaker)
  const q = useQ()
  const { show, label } = useUnits()
  const r = asymmetricCoverage(inp.near, inp.far, inp.height)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Asymmetric Coverage',
          inputs: `near ${q('distance', inp.near)}, far ${q('distance', inp.far)}, h ${q('distance', inp.height)}`,
          output: `upper ${fmtDeg(r.value.upperSplay)}°, lower ${fmtDeg(r.value.lowerSplay)}°`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Asymmetric Coverage (coupled point source)"
      info={{
        what: 'Aim angles for the top and bottom of a coupled point source covering a near-to-far audience, and the level taper needed between them.',
        when: 'Shaping a flown array or a point-source cluster over a raked or long floor.',
        formula:
          'upper = atan(h / far), lower = atan(h / near)\nrange ratio = 20 × log₁₀(far_direct / near_direct)',
      }}
    >
      <Inputs>
        <SpeakerSelect
          label="Check a speaker"
          speakerId={inp.speaker}
          onClear={() => set('speaker', null)}
          onSelect={(sp) => set('speaker', sp.id)}
        />
        <NumberField
          label="Near edge distance"
          hint="Horizontal distance from the array to the front row."
          kind="distance"
          value={inp.near}
          onChange={(x) => set('near', x)}
        />
        <NumberField
          label="Far edge distance"
          hint="Horizontal distance from the array to the back row."
          kind="distance"
          value={inp.far}
          onChange={(x) => set('far', x)}
        />
        <NumberField
          label="Array height above ears"
          hint="How high the array hangs above listeners’ ears."
          kind="distance"
          value={inp.height}
          onChange={(x) => set('height', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Top of array: aim down"
            value={fmtDeg(r.value.upperSplay)}
            unit="°"
            help="Points at the back row."
          />
          <Output
            label="Bottom of array: aim down"
            value={fmtDeg(r.value.lowerSplay)}
            unit="°"
            help="Points at the front row."
          />
          <Verdict>{r.value.description}</Verdict>
          {chosen && <PatternCheck speaker={chosen} axis="v" needed={r.value.totalCoverage} />}
          <Output
            label="Vertical angle to cover"
            value={fmtDeg(r.value.totalCoverage)}
            unit="°"
            secondary
            help="Total angle between front and back rows, seen from the array."
          />
          <Output
            label="Level difference, front vs back"
            value={fmtDb(r.value.rangeRatioDb)}
            unit="dB"
            secondary
            help="How much louder the front row is if both get the same output — taper the lower boxes by this."
          />
          <Output
            label="Distance to front row"
            value={fmtDistance(show('distance', r.value.nearDirect))}
            unit={label('distance')}
            secondary
          />
          <Output
            label="Distance to back row"
            value={fmtDistance(show('distance', r.value.farDirect))}
            unit={label('distance')}
            secondary
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function NeedDelaysCard() {
  const id = 'coverage.delays'
  const [inp, set] = useCalcInputs(id, {
    mainHeight: 8 as number | null,
    mainMount: 'flown' as Mounting,
    mainStage: 1.2 as number | null,
    mainStack: 2 as number | null,
    delayHeight: 4 as number | null,
    mainDistance: 45 as number | null,
    delayDistance: 6 as number | null,
    earHeight: 1.2 as number | null,
    mainSpeaker: null as string | null,
    delaySpeaker: null as string | null,
    mainSpl1m: null as number | null,
    delaySpl1m: null as number | null,
  })
  const q = useQ()
  const { temperatureC, temperatureText } = useTemperature()
  const { show, label } = useUnits()
  const r = needDelays({
    ...inp,
    mainHeight: mountedHeight(inp.mainMount, inp.mainHeight, inp.mainStage, inp.mainStack),
    temperatureC,
  })
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Do I Need Delays?',
          inputs: `main ${q('distance', inp.mainDistance)}, delay ${q('distance', inp.delayDistance)} @ ${temperatureText}`,
          output: `Δ ${fmtMs(r.value.differenceMs)} ms — ${r.value.beneficial ? 'delays recommended' : 'not needed'}`,
        }
      : null,
  )
  const dist = (m: number) => fmtDistance(show('distance', m))
  return (
    <CalcCard
      title="Do I Need Delays?"
      info={{
        what: 'Compares arrival times from the mains and a delay/fill speaker at a listener position.',
        when: 'Deciding whether a delay tower or under-balcony fill is worth it, and roughly what delay to set.',
        formula:
          'path = √((h_speaker − h_ear)² + d²)\nt = path / c × 1000\nbeneficial if t_main − t_delay > 20 ms',
      }}
    >
      <Inputs>
        <SpeakerSelect
          label="Pick the main speaker"
          speakerId={inp.mainSpeaker}
          initialCategory="line_array"
          onClear={() => {
            set('mainSpeaker', null)
            set('mainSpl1m', null)
          }}
          onSelect={(s) => {
            set('mainSpeaker', s.id)
            set('mainSpl1m', getSplAt1m(s))
          }}
        />
        <NumberField
          label="Main max SPL at 1 m"
          unit="dB"
          value={inp.mainSpl1m}
          onChange={(x) => set('mainSpl1m', x)}
          hint="Filled when you pick a speaker. Leave blank to assume both speakers are the same."
        />
        <MountingFields
          what="Main speaker"
          mounting={inp.mainMount}
          centre={inp.mainHeight}
          stage={inp.mainStage}
          stack={inp.mainStack}
          onMounting={(m) => set('mainMount', m)}
          onCentre={(x) => set('mainHeight', x)}
          onStage={(x) => set('mainStage', x)}
          onStack={(x) => set('mainStack', x)}
        />
        <NumberField
          label="Main → listener (horizontal)"
          hint="Floor distance from the mains to the listener you’re checking."
          kind="distance"
          value={inp.mainDistance}
          onChange={(x) => set('mainDistance', x)}
        />
        <SpeakerSelect
          label="Pick the delay speaker"
          speakerId={inp.delaySpeaker}
          initialCategory="point_source"
          onClear={() => {
            set('delaySpeaker', null)
            set('delaySpl1m', null)
          }}
          onSelect={(s) => {
            set('delaySpeaker', s.id)
            set('delaySpl1m', getSplAt1m(s))
          }}
        />
        <NumberField
          label="Delay max SPL at 1 m"
          unit="dB"
          value={inp.delaySpl1m}
          onChange={(x) => set('delaySpl1m', x)}
          hint="Filled when you pick a speaker."
        />
        <NumberField
          label="Delay speaker height"
          hint="Height of the delay/fill speaker above the floor."
          kind="distance"
          value={inp.delayHeight}
          onChange={(x) => set('delayHeight', x)}
        />
        <NumberField
          label="Delay → listener (horizontal)"
          hint="Floor distance from the delay speaker to the same listener."
          kind="distance"
          value={inp.delayDistance}
          onChange={(x) => set('delayDistance', x)}
        />
        <NumberField
          label="Audience ear height"
          hint="About 1.2 m seated, 1.7 m standing."
          kind="distance"
          value={inp.earHeight}
          onChange={(x) => set('earHeight', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Mains arrive later by"
              help="How much later the mains reach this listener than the delay speaker."
              value={fmtMs(r.value.differenceMs)}
              unit="ms"
              wide
            />
            <Rating
              label="Recommendation"
              value={r.value.beneficial ? 'Delay speaker beneficial' : 'Not needed'}
              tone={r.value.beneficial ? 'warn' : 'good'}
            />
            <Verdict>{r.value.recommendation}</Verdict>
            {inp.mainMount === 'ground' && <Note>{GROUND_STACK_NOTE}</Note>}
            <Output
              label="Mains → listener"
              value={dist(r.value.mainPath)}
              unit={`${label('distance')} · ${fmtMs(r.value.mainMs)} ms`}
              secondary
            />
            <Output
              label="Delay speaker → listener"
              value={dist(r.value.delayPath)}
              unit={`${label('distance')} · ${fmtMs(r.value.delayMs)} ms`}
              secondary
            />
            <Output
              label="Delay speaker is louder by"
              value={fmtDbSigned(r.value.levelDifferenceDb)}
              unit="dB"
              secondary
              wide
              help={
                inp.mainSpl1m !== null && inp.delaySpl1m !== null
                  ? 'Distance plus the difference between the two speakers’ max SPL.'
                  : 'Because it is closer to the listener (same speaker and power assumed).'
              }
            />
            {r.value.mainSplAtListener !== null && (
              <Output
                label="Mains max at the listener"
                value={fmtDb(r.value.mainSplAtListener)}
                unit="dB SPL"
                secondary
              />
            )}
            {r.value.delaySplAtListener !== null && (
              <Output
                label="Delay max at the listener"
                value={fmtDb(r.value.delaySplAtListener)}
                unit="dB SPL"
                secondary
              />
            )}
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
