import type { ReactNode } from 'react'
import {
  planDelayTowers,
  type ActiveMode,
  type Check as CheckState,
  GROUND_STACK_NOTE,
  mountedHeight,
  type Mounting,
  type PaConfig,
  type SpeakerType,
  type VenueType,
} from '../../../calculators/coverage'
import {
  fmtDb,
  fmtDbSigned,
  fmtDistance,
  fmtMs,
  formatNumber,
  PRECISION,
} from '../../../calculators/format'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import { toast } from '../../../store/toastStore'
import { Button } from '../../ui/Button'
import { CalcCard } from '../CalcCard'
import { speakerFill, type Speaker } from '../../../data/speakers'
import { NumberField, Segmented, TemperatureField } from '../fields'
import { SpeakerSelect } from '../SpeakerPicker'
import { MountingFields } from './MountingFields'
import {
  CalcError,
  Check,
  ConstantBadge,
  Note,
  Output,
  ResultTable,
  Verdict,
  Warnings,
} from '../outputs'

const fmtSigned = (x: number) => `${x >= 0 ? '+' : ''}${formatNumber(x, 2)}`
import { useTemperature } from './shared'

const STAGES = [
  { title: 'Venue setup', blurb: 'Describe the audience area and where the main PA is.' },
  {
    title: 'Main coverage check',
    blurb: 'See how evenly the mains cover the audience on their own.',
  },
  {
    title: 'Tower placement',
    blurb: 'Where the delay tower goes, and the delay time to set on it.',
  },
  { title: 'Delay speaker', blurb: 'Check the speaker you plan to put on the tower.' },
  { title: 'Number of towers', blurb: 'How many towers it takes to cover the full width.' },
  { title: 'Summary', blurb: 'Everything you need for the show file or advance.' },
] as const

const OVERLAPS = [
  { value: '0', label: 'None (0%)' },
  { value: '0.1', label: 'Standard (10%)' },
  { value: '0.2', label: 'Wide (20%)' },
] as const
type Overlap = (typeof OVERLAPS)[number]['value']

/** One step of the planner: inputs on the left, that step's results on the right. */
function Stage({
  number,
  inputs,
  results,
}: {
  number: number
  inputs?: ReactNode
  results: ReactNode
}) {
  const stage = STAGES[number - 1]
  return (
    <section
      aria-labelledby={`delay-stage-${number}`}
      className="rounded-2xl border border-divider"
    >
      <header className="border-b border-divider px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-ink">
          Step {number} of 6
        </p>
        <h3 id={`delay-stage-${number}`} className="mt-1 font-serif text-xl font-semibold text-fg">
          {stage.title}
        </h3>
        <p className="mt-1 font-serif text-[15px] text-fg-2">{stage.blurb}</p>
      </header>
      <div className={inputs ? 'grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : ''}>
        {inputs && (
          <div className="grid grid-cols-1 content-start gap-4 border-b border-divider px-5 py-5 sm:grid-cols-2 lg:grid-cols-1 lg:border-b-0 lg:border-r">
            {inputs}
          </div>
        )}
        <div
          className="grid min-w-0 grid-cols-2 content-start gap-3 bg-canvas/40 px-5 py-5"
          aria-live="polite"
        >
          {results}
        </div>
      </div>
    </section>
  )
}

const checkFrom = (ok: boolean): CheckState => (ok ? 'pass' : 'fail')

export function DelayTowerPlannerCard() {
  const id = 'coverage.delayPlanner'
  const [inp, set] = useCalcInputs(id, {
    stage: 1 as number,
    venue: 'outdoor' as VenueType,
    pa: 'stereo' as PaConfig,
    humidity: 50 as number | null,
    speakerType: 'passive' as SpeakerType,
    activeMode: 'maxSpl' as ActiveMode,
    mainMaxSpl: 136 as number | null,
    depth: 60 as number | null,
    width: 40 as number | null,
    mainHeight: 8 as number | null,
    mainMount: 'flown' as Mounting,
    mainStage: 1.2 as number | null,
    mainStack: 2 as number | null,
    mainBehind: 2 as number | null,
    earHeight: 1.2 as number | null,
    mainSensitivity: 100 as number | null,
    mainPower: 2000 as number | null,
    mainCoverage: 90 as number | null,
    targetVariance: 6 as number | null,
    haas: 10 as number | null,
    delayH: 90 as number | null,
    delayV: 40 as number | null,
    delayHeight: 5 as number | null,
    delaySensitivity: 98 as number | null,
    delayPower: 1000 as number | null,
    delayMode: 'sensitivity' as ActiveMode,
    delayMaxSpl: 130 as number | null,
    mainSpeaker: null as string | null,
    delaySpeaker: null as string | null,
    overlap: '0.1' as Overlap,
  })
  const { temperatureC, temperatureText } = useTemperature()
  const { show, label } = useUnits()
  const dist = (m: number) => fmtDistance(show('distance', m))
  const rough = (m: number) => formatNumber(show('distance', m), 1)
  const u = label('distance')
  const stage = Math.min(Math.max(inp.stage, 1), 6)

  const pickMain = (sp: Speaker) => {
    const f = speakerFill(sp)
    set('mainSpeaker', sp.id)
    set('speakerType', f.type)
    if (f.type === 'active') set('activeMode', f.mode)
    if (f.maxSpl !== null) set('mainMaxSpl', f.maxSpl)
    if (f.sensitivity !== null) set('mainSensitivity', f.sensitivity)
    if (f.powerW !== null) set('mainPower', f.powerW)
    if (f.hCoverage !== null) set('mainCoverage', f.hCoverage)
  }
  const pickDelay = (sp: Speaker) => {
    const f = speakerFill(sp)
    set('delaySpeaker', sp.id)
    set('delayMode', f.mode)
    if (f.maxSpl !== null) set('delayMaxSpl', f.maxSpl)
    if (f.sensitivity !== null) set('delaySensitivity', f.sensitivity)
    if (f.powerW !== null) set('delayPower', f.powerW)
    if (f.hCoverage !== null) set('delayH', f.hCoverage)
    if (f.vCoverage !== null) set('delayV', f.vCoverage)
  }

  const plan = planDelayTowers({
    venue: inp.venue,
    pa: inp.pa,
    humidityPercent: inp.humidity,
    speakerType: inp.speakerType,
    activeMode: inp.activeMode,
    mainMaxSpl: inp.mainMaxSpl,
    depthM: inp.depth,
    widthM: inp.width,
    mainHeightM: mountedHeight(inp.mainMount, inp.mainHeight, inp.mainStage, inp.mainStack),
    mainBehindM: inp.mainBehind,
    earHeightM: inp.earHeight,
    temperatureC,
    mainSensitivity: inp.mainSensitivity,
    mainPowerW: inp.mainPower,
    mainCoverageDeg: inp.mainCoverage,
    targetVarianceDb: inp.targetVariance,
    haasMs: inp.haas,
    delayCoverageHDeg: inp.delayH,
    delayCoverageVDeg: inp.delayV,
    delayHeightM: inp.delayHeight,
    delaySensitivity: inp.delaySensitivity,
    delayPowerW: inp.delayPower,
    delayMode: inp.delayMode,
    delayMaxSpl: inp.delayMaxSpl,
    overlap: Number(inp.overlap),
  })

  const p = plan.ok ? plan.value : null
  const mains = p?.mains.ok ? p.mains.value : null
  const place = p?.placement.ok ? p.placement.value : null
  const spk = p?.speaker.ok ? p.speaker.value : null
  const towers = p?.towers.ok ? p.towers.value : null

  const summaryRows: [string, string][] =
    mains && place
      ? place.needed && spk && towers
        ? [
            ['Main PA', inp.mainMount === 'ground' ? 'Ground-stacked' : 'Flown'],
            ['Delay tower position', `${dist(place.fromFront)} ${u} from front row`],
            ['Delay setting', `${fmtMs(place.delaySettingMs)} ms`],
            ['Number of towers', String(towers.towers)],
            ['Tower spacing', `${dist(towers.spacing)} ${u}`],
            ['Speaker aim', `${formatNumber(spk.aimAngle, 1)}° down`],
            ['SPL at front row (mains)', `${fmtDb(mains.splFront)} dB`],
            ['SPL at back row (delay)', `${fmtDb(spk.splBack)} dB`],
            ['Front-to-back variance', `${fmtDb(Math.abs(mains.splFront - spk.splBack))} dB`],
          ]
        : [
            ['Delay tower', 'Not needed — mains cover the full venue'],
            ['SPL at front row (mains)', `${fmtDb(mains.splFront)} dB`],
            ['SPL at back row (mains)', `${fmtDb(mains.splBack)} dB`],
            ['Front-to-back variance', `${fmtDb(mains.variance)} dB`],
          ]
      : []

  usePublishResult(
    id,
    place
      ? {
          title: 'Delay Tower Planner',
          inputs: `${rough(inp.depth ?? 0)} × ${rough(inp.width ?? 0)} ${u} audience @ ${temperatureText}`,
          output: place.needed
            ? `tower ${rough(place.fromFront)} ${u} from front, ${fmtMs(place.delaySettingMs)} ms`
            : 'no delay tower needed',
        }
      : null,
  )

  const copySummary = async () => {
    const text = [
      'SONA — Delay tower plan',
      `Audience ${rough(inp.depth ?? 0)} ${u} deep × ${rough(inp.width ?? 0)} ${u} wide, ${inp.venue}, ${temperatureText}`,
      ...summaryRows.map(([k, val]) => `${k}: ${val}`),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Summary copied', 'success')
    } catch {
      toast('Copy failed — select the table and copy it manually', 'error')
    }
  }

  const go = (n: number) => set('stage', Math.min(Math.max(n, 1), 6))

  const venueInputs = (
    <>
      <Segmented
        label="Venue"
        value={inp.venue}
        onChange={(x) => set('venue', x)}
        options={[
          { value: 'indoor', label: 'Indoor' },
          { value: 'outdoor', label: 'Outdoor' },
        ]}
      />
      <Segmented
        label="PA configuration"
        value={inp.pa}
        onChange={(x) => set('pa', x)}
        options={[
          { value: 'mono', label: 'Mono (single hang)' },
          { value: 'stereo', label: 'Stereo (L + R)' },
        ]}
        hint={
          inp.pa === 'stereo' ? 'Left and right hangs; figures are per side.' : 'One central hang.'
        }
      />
      <NumberField
        label="Audience depth"
        kind="distance"
        value={inp.depth}
        onChange={(x) => set('depth', x)}
        hint="Front row to back row."
      />
      <NumberField
        label="Audience width"
        kind="distance"
        value={inp.width}
        onChange={(x) => set('width', x)}
        hint="At the widest point."
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
        label="Mains behind the front row"
        kind="distance"
        value={inp.mainBehind}
        onChange={(x) => set('mainBehind', x)}
        hint="Horizontal distance. 0 = at the front edge."
      />
      <NumberField
        label="Audience ear height"
        kind="distance"
        value={inp.earHeight}
        onChange={(x) => set('earHeight', x)}
        hint="About 1.2 m seated, 1.7 m standing."
      />
      <TemperatureField />
      <NumberField
        label="Relative humidity"
        unit="%"
        value={inp.humidity}
        onChange={(x) => set('humidity', x)}
        hint="Humid air carries sound slightly faster. 50% if you don’t know."
      />
    </>
  )

  let body: ReactNode
  if (!plan.ok) {
    body = <Stage number={1} inputs={venueInputs} results={<CalcError message={plan.error} />} />
  } else if (stage === 1) {
    body = (
      <Stage
        number={1}
        inputs={venueInputs}
        results={
          <>
            {inp.mainMount === 'ground' && <Note>{GROUND_STACK_NOTE}</Note>}
            <div className="col-span-2 flex flex-wrap items-center gap-2">
              <ConstantBadge
                label={`Speed of sound at ${temperatureText}, ${formatNumber(inp.humidity, 0)}% RH`}
                value={formatNumber(show('speed', plan.value.venue.speed), PRECISION.speed)}
                unit={label('speed')}
              />
              <span className="text-xs text-fg-2">
                {`${fmtSigned(show('speed', plan.value.venue.speed - plan.value.venue.drySpeed))} ${label('speed')} vs dry air`}
              </span>
            </div>
            <Output
              label="Distance from mains to back row"
              value={dist(plan.value.venue.totalThrow)}
              unit={u}
              wide
              help="Straight-line distance sound travels to the last row."
            />
            <Output
              label="Level lost by the back row"
              value={fmtDb(plan.value.venue.splLossBack)}
              unit="dB"
              wide
              help="Compared with 1 m from the speaker (inverse square law)."
            />
            <details className="group col-span-2 rounded-xl bg-const px-4 py-1 text-const-fg">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
                <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
                  ›
                </span>
                Humidity and high frequencies
              </summary>
              <p className="pb-3 text-[13px] leading-relaxed">
                Humidity also affects high-frequency absorption over distance (ISO 9613-1). At low
                humidity (under 20%) and long throws (over 30 m), HF content can lose 3–6 dB more
                than LF. This planner calculates broadband SPL only — use a room acoustics tool for
                frequency-dependent absorption.
              </p>
            </details>
            <Verdict>
              Sound from the mains travels {rough(plan.value.venue.totalThrow)} {u} to the back row
              and is about {formatNumber(plan.value.venue.splLossBack, 0)} dB quieter there than 1 m
              from the speaker.
            </Verdict>
          </>
        }
      />
    )
  } else if (stage === 2) {
    body = (
      <Stage
        number={2}
        inputs={
          <>
            <SpeakerSelect
              label="Pick your main speaker"
              speakerId={inp.mainSpeaker}
              onSelect={pickMain}
              onClear={() => set('mainSpeaker', null)}
              initialCategory="line_array"
            />
            <Segmented
              label="Speaker type"
              value={inp.speakerType}
              onChange={(x) => set('speakerType', x)}
              options={[
                { value: 'passive', label: 'Passive' },
                { value: 'active', label: 'Active (powered)' },
              ]}
              hint={
                inp.speakerType === 'passive'
                  ? 'Driven by a separate amplifier.'
                  : 'Amplifier built in (d&b, L-Acoustics, Meyer and similar).'
              }
            />
            {inp.speakerType === 'active' && (
              <Segmented
                label="What does your spec sheet give?"
                value={inp.activeMode}
                onChange={(x) => set('activeMode', x)}
                options={[
                  { value: 'maxSpl', label: 'Max SPL at 1 m' },
                  { value: 'sensitivity', label: 'Sensitivity + power' },
                ]}
              />
            )}
            {inp.speakerType === 'active' && inp.activeMode === 'maxSpl' ? (
              <NumberField
                label="Max SPL at 1 m"
                unit="dB"
                value={inp.mainMaxSpl}
                onChange={(x) => set('mainMaxSpl', x)}
                hint="Straight from the manufacturer’s spec sheet."
              />
            ) : (
              <>
                <NumberField
                  label="Main speaker sensitivity"
                  unit="dB/W/m"
                  value={inp.mainSensitivity}
                  onChange={(x) => set('mainSensitivity', x)}
                  hint="From the spec sheet. Typically 95–105 dB."
                />
                <NumberField
                  label={
                    inp.speakerType === 'active' ? 'Rated power' : 'Amplifier power to the mains'
                  }
                  unit="W"
                  value={inp.mainPower}
                  onChange={(x) => set('mainPower', x)}
                  hint={
                    inp.speakerType === 'active'
                      ? 'Built-in amplifier power. Use the peak or program figure, not RMS.'
                      : 'Per side, from the external amplifier.'
                  }
                />
              </>
            )}
            <NumberField
              label="Main speaker horizontal coverage"
              unit="°"
              value={inp.mainCoverage}
              onChange={(x) => set('mainCoverage', x)}
              hint="From the spec sheet, e.g. 90° or 110°."
            />
          </>
        }
        results={
          plan.value.mains.ok && mains ? (
            <>
              {inp.mainMount === 'ground' && <Note>{GROUND_STACK_NOTE}</Note>}
              {inp.speakerType === 'active' && (
                <Note>
                  Active speakers combine amplifier and speaker in one unit. Enter the max SPL from
                  your spec sheet, or calculate it from sensitivity + rated power.
                </Note>
              )}
              <Output
                label="Max level at 1 m"
                value={fmtDb(mains.spl1m)}
                unit="dB SPL"
                secondary
                wide
                help="What the mains can produce 1 m away."
              />
              <Output label="Level at the front row" value={fmtDb(mains.splFront)} unit="dB SPL" />
              <Output label="Level at the back row" value={fmtDb(mains.splBack)} unit="dB SPL" />
              <Output
                label="Front-to-back difference"
                value={fmtDb(mains.variance)}
                unit="dB"
                wide
                help="Aim for 6 dB or less, so the back row isn’t much quieter than the front."
              />
              <Check state={mains.varianceCheck}>
                {mains.varianceCheck === 'pass'
                  ? 'Even coverage — within 6 dB front to back.'
                  : mains.varianceCheck === 'warn'
                    ? 'The back row is noticeably quieter (more than 6 dB).'
                    : 'The back row is much quieter (more than 10 dB).'}
              </Check>
              <Check state={checkFrom(mains.coversWidth)}>
                {mains.coversWidth
                  ? `The mains cover ${rough(mains.widthAtBack)} ${u} at the back — wide enough for the ${rough(inp.width ?? 0)} ${u} audience.`
                  : `The mains only cover ${rough(mains.widthAtBack)} ${u} at the back — narrower than the ${rough(inp.width ?? 0)} ${u} audience.`}
              </Check>
              {inp.pa === 'stereo' && (
                <p className="col-span-2 -mt-1 text-xs text-fg-2">
                  This is coverage per side. Combined, the left and right hangs cover the full
                  width.
                </p>
              )}
              <p className="col-span-2 font-serif text-[15px] italic leading-relaxed text-fg-2">
                If the difference is more than 6 dB or the mains don’t cover the full width, a delay
                tower is recommended.
              </p>
            </>
          ) : (
            <CalcError message={plan.value.mains.ok ? '' : plan.value.mains.error} />
          )
        }
      />
    )
  } else if (stage === 3) {
    body = (
      <Stage
        number={3}
        inputs={
          <>
            <NumberField
              label="Allowed front-to-back difference"
              unit="dB"
              value={inp.targetVariance}
              onChange={(x) => set('targetVariance', x)}
              hint="Most engineers aim for 6 dB or less."
            />
            <NumberField
              label="Haas offset"
              unit="ms"
              value={inp.haas}
              onChange={(x) => set('haas', x)}
              hint="Extra delay so the mains arrive first and the sound still seems to come from the stage. 10 ms is typical."
            />
          </>
        }
        results={
          plan.value.placement.ok && place ? (
            place.needed ? (
              <>
                <Output
                  label="Set the delay tower to"
                  value={fmtMs(place.delaySettingMs)}
                  unit="ms"
                  wide
                  help={`${fmtMs(place.propagationMs)} ms travel time from the mains + ${fmtMs(inp.haas ?? 0)} ms Haas offset.`}
                />
                <Verdict>
                  Place the delay tower{' '}
                  <strong>
                    {rough(place.fromFront)} {u}
                  </strong>{' '}
                  from the front row ({rough(place.fromBack)} {u} from the back).
                </Verdict>
                <Output
                  label="Mains → tower"
                  value={dist(place.mainToTower)}
                  unit={u}
                  secondary
                  help="Distance sound travels from the mains to the tower."
                />
                <Output
                  label="Recommended range"
                  value={`${rough(place.rangeMin)}–${rough(place.rangeMax)}`}
                  unit={`${u} from front`}
                  secondary
                  help="Half to three-quarters of the way back."
                />
                {place.idealFromFront < place.rangeMin && place.idealFromFront >= 0 && (
                  <p className="col-span-2 text-xs leading-snug text-fg-2">
                    The mains use up the allowed difference after {rough(place.idealFromFront)} {u};
                    the tower is kept at least halfway back so it covers the rear of the audience.
                  </p>
                )}
                <Warnings warnings={plan.value.placement.warnings} />
              </>
            ) : (
              <>
                <Check state="pass">Mains cover the full venue — no delay tower needed.</Check>
                <Verdict>
                  The back row is within {fmtDb(inp.targetVariance ?? 0)} dB of the front row using
                  the mains alone.
                </Verdict>
              </>
            )
          ) : (
            <CalcError message={plan.value.placement.ok ? '' : plan.value.placement.error} />
          )
        }
      />
    )
  } else if (stage === 4) {
    body = (
      <Stage
        number={4}
        inputs={
          <>
            <SpeakerSelect
              label="Pick the delay speaker"
              speakerId={inp.delaySpeaker}
              onSelect={pickDelay}
              onClear={() => set('delaySpeaker', null)}
              initialCategory="point_source"
            />
            <NumberField
              label="Delay speaker horizontal coverage"
              unit="°"
              value={inp.delayH}
              onChange={(x) => set('delayH', x)}
              hint="From the spec sheet, e.g. 90° or 110°."
            />
            <NumberField
              label="Delay speaker vertical coverage"
              unit="°"
              value={inp.delayV}
              onChange={(x) => set('delayV', x)}
              hint="From the spec sheet, e.g. 40° or 60°."
            />
            <NumberField
              label="Delay speaker height"
              kind="distance"
              value={inp.delayHeight}
              onChange={(x) => set('delayHeight', x)}
              hint="Height above the floor where it will be mounted on the tower."
            />
            <Segmented
              label="What does your spec sheet give?"
              value={inp.delayMode}
              onChange={(x) => set('delayMode', x)}
              options={[
                { value: 'sensitivity', label: 'Sensitivity + power' },
                { value: 'maxSpl', label: 'Max SPL at 1 m' },
              ]}
            />
            {inp.delayMode === 'maxSpl' ? (
              <NumberField
                label="Delay speaker max SPL at 1 m"
                unit="dB"
                value={inp.delayMaxSpl}
                onChange={(x) => set('delayMaxSpl', x)}
                hint="Straight from the spec sheet — usual for active speakers."
              />
            ) : (
              <>
                <NumberField
                  label="Delay speaker sensitivity"
                  unit="dB/W/m"
                  value={inp.delaySensitivity}
                  onChange={(x) => set('delaySensitivity', x)}
                />
                <NumberField
                  label="Amplifier power to the delay"
                  unit="W"
                  value={inp.delayPower}
                  onChange={(x) => set('delayPower', x)}
                />
              </>
            )}
          </>
        }
        results={
          plan.value.speaker.ok && spk && mains ? (
            <>
              <Output
                label="Tilt the speaker down"
                value={formatNumber(spk.aimAngle, 1)}
                unit="°"
                wide
                help="From horizontal, so it aims at the back row."
              />
              <Output
                label="Delay level at back row"
                value={fmtDb(spk.splBack)}
                unit="dB SPL"
                help={`Mains at the front row: ${fmtDb(mains.splFront)} dB SPL.`}
              />
              <Output
                label="Coverage width at back row"
                value={dist(spk.widthAtBack)}
                unit={u}
                help="Width one delay speaker covers."
              />
              <Check state={spk.matchCheck}>
                {spk.matchCheck === 'pass'
                  ? `Good match — the back row hears the delay within 3 dB of the mains at the front (${fmtDbSigned(spk.matchDb)} dB).`
                  : spk.matchCheck === 'warn'
                    ? `Delay may overpower mains (${fmtDbSigned(spk.matchDb)} dB) — reduce amplifier power or sensitivity.`
                    : `The delay is too quiet at the back row (${fmtDbSigned(spk.matchDb)} dB) — use more power or a more sensitive speaker.`}
              </Check>
              {spk.verticalCheck && (
                <Check state={spk.verticalCheck}>
                  {spk.verticalCheck === 'pass'
                    ? 'Vertical coverage reaches the audience under the tower.'
                    : 'Speaker may not cover the audience under the tower — consider wider vertical dispersion.'}
                </Check>
              )}
            </>
          ) : (
            <CalcError message={plan.value.speaker.ok ? '' : plan.value.speaker.error} />
          )
        }
      />
    )
  } else if (stage === 5) {
    body = (
      <Stage
        number={5}
        inputs={
          <>
            <NumberField
              label="Delay speaker horizontal coverage"
              unit="°"
              value={inp.delayH}
              onChange={(x) => set('delayH', x)}
              hint="Carried over from step 4 — change it here to compare speakers."
            />
            <Segmented
              label="Overlap between towers"
              value={inp.overlap}
              onChange={(x) => set('overlap', x)}
              options={OVERLAPS.map((o) => ({ value: o.value, label: o.label }))}
              hint="Some overlap avoids gaps between towers."
            />
          </>
        }
        results={
          plan.value.towers.ok && towers ? (
            <>
              <Output
                label="Towers needed"
                value={String(towers.towers)}
                wide
                help={`Each covers about ${rough(towers.effectiveWidth)} ${u} after overlap.`}
              />
              <Verdict>
                {towers.towers === 1 ? (
                  'A single centre delay is sufficient.'
                ) : (
                  <>
                    <strong>{towers.towers} towers</strong> spaced{' '}
                    <strong>
                      {rough(towers.spacing)} {u}
                    </strong>{' '}
                    apart.
                  </>
                )}
              </Verdict>
              <Warnings warnings={plan.value.towers.warnings} />
            </>
          ) : (
            <CalcError message={plan.value.towers.ok ? '' : plan.value.towers.error} />
          )
        }
      />
    )
  } else {
    body = (
      <Stage
        number={6}
        results={
          summaryRows.length ? (
            <>
              <ResultTable
                caption="Delay tower plan"
                headers={['Parameter', 'Value']}
                rows={summaryRows}
              />
              <div className="col-span-2">
                <Button onClick={() => void copySummary()}>Copy summary</Button>
              </div>
            </>
          ) : (
            <CalcError message="Complete steps 1–3 to see the summary." />
          )
        }
      />
    )
  }

  return (
    <CalcCard
      layout="stacked"
      title="Delay Tower Planner"
      info={{
        what: 'A step-by-step guide to whether you need delay towers, where to put them, what delay to set, and how many you need.',
        when: 'Large outdoor shows and long rooms where the back of the audience is much further from the PA than the front.',
        formula: [
          'Speed of sound (humid air) = 331.45 × √((1 + T/273.15) × (1 + 0.3132 × water-vapour fraction))',
          'Throw = √((depth + mains behind)² + (mains height − ear height)²); loss = 20·log₁₀(throw)',
          'SPL at 1 m = sensitivity + 10·log₁₀(power), or the spec-sheet max SPL for active speakers; SPL at d = SPL₁ₘ − 20·log₁₀(d)',
          'Coverage width = 2 × distance × tan(angle ÷ 2)',
          'Tower goes where the mains are the allowed difference below the front row, kept within 50–75% of the depth',
          'Delay setting = (mains → tower distance ÷ speed of sound) × 1000 + Haas offset',
          'Aim = atan((tower height − ear height) ÷ tower-to-back distance)',
          'Towers = ⌈audience width ÷ (coverage width × (1 − overlap))⌉',
        ].join('\n'),
      }}
    >
      <nav aria-label="Planner steps">
        <ol className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {STAGES.map((s, i) => {
            const n = i + 1
            const current = n === stage
            return (
              <li key={s.title} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => go(n)}
                  aria-label={`Step ${n}: ${s.title}${n < stage ? ' (done)' : ''}`}
                  aria-current={current ? 'step' : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-3 pr-4 text-[13px] font-medium transition ${
                    current
                      ? 'border-transparent bg-accent text-accent-fg'
                      : n < stage
                        ? 'border-line text-fg hover:border-fg-muted'
                        : 'border-line text-fg-2 hover:border-fg-muted hover:text-fg'
                  }`}
                >
                  <span
                    className={`font-num flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      current ? 'bg-accent-fg/20' : 'bg-input'
                    }`}
                  >
                    {n < stage ? '✓' : n}
                  </span>
                  {s.title}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <div key={stage}>{body}</div>
      <div className="flex justify-between gap-3">
        <Button variant="ghost" disabled={stage === 1} onClick={() => go(stage - 1)}>
          ← Back
        </Button>
        {stage < 6 && <Button onClick={() => go(stage + 1)}>Next: {STAGES[stage].title} →</Button>}
      </div>
    </CalcCard>
  )
}
