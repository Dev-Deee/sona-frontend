import {
  beamingFrequency,
  combFilter,
  constantCurvature,
  inlineSubArray,
  maxSubSpacing,
  uncoupledSpacing,
  type SubArrayMode,
} from '../../../calculators/arrays'
import {
  fmtDb,
  fmtDbSigned,
  fmtDistance,
  fmtHz,
  fmtMs,
  formatNumber,
} from '../../../calculators/format'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import { CalcCard, Inputs, Optional, Outputs } from '../CalcCard'
import { NumberField, Segmented, TemperatureField } from '../fields'
import { CalcError, Output, Rating, ResultTable, Verdict, type Tone } from '../outputs'
import { speedOfSound } from '../../../calculators/acoustics'
import { useQ, useTemperature, v } from './shared'

const fmtDeg = (x: number) => formatNumber(x, 1)
/** Caps very deep nulls for display: beyond 60 dB the model is meaningless anyway. */
const capDb = (x: number, signed = false) =>
  Math.abs(x) > 60 ? `${x < 0 ? '< −' : '> '}60` : signed ? fmtDbSigned(x) : fmtDb(x)

export function CombFilterCard() {
  const id = 'arrays.comb'
  const [inp, set] = useCalcInputs(id, {
    direct: 10 as number | null,
    reflected: 11.5 as number | null,
  })
  const q = useQ()
  const { temperatureC, temperatureText } = useTemperature()
  const { show, label } = useUnits()
  const r = combFilter(inp.direct, inp.reflected, temperatureC)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Comb Filter',
          inputs: `${q('distance', inp.direct)} vs ${q('distance', inp.reflected)} @ ${temperatureText}`,
          output: `first notch ${fmtHz(r.value.firstNotchHz)} Hz`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Comb Filter"
      info={{
        what: 'Frequency of the first cancellation (and spacing of the rest) when two copies of a signal arrive with a path difference.',
        when: 'Diagnosing a hollow sound from a floor/wall reflection, two mics on one source, or overlapping speakers.',
        formula: 'Δ = |reflected − direct|\nf_notch = c / (2Δ), spacing = c / Δ',
      }}
    >
      <Inputs>
        <NumberField
          label="Direct path"
          hint="Distance sound travels straight from the source to the listener (or mic)."
          kind="distance"
          value={inp.direct}
          onChange={(x) => set('direct', x)}
        />
        <NumberField
          label="Reflected / secondary path"
          hint="Distance via the reflection (floor, wall) or the second speaker/mic."
          kind="distance"
          value={inp.reflected}
          onChange={(x) => set('reflected', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="First cancelled frequency"
            help="The lowest frequency where the two arrivals cancel each other."
            value={fmtHz(r.value.firstNotchHz)}
            unit="Hz"
            wide
          />
          <Verdict>
            The second arrival travels {fmtDistance(show('distance', r.value.pathDifference))}{' '}
            {label('distance')} further ({fmtMs(r.value.timeOffsetMs)} ms later), so sound cancels
            at {fmtHz(r.value.firstNotchHz)} Hz and again every {fmtHz(r.value.notchSpacingHz)} Hz
            above it — a hollow, phasey sound. Make the two paths equal, or reduce the level of one,
            to remove it.
          </Verdict>
          <Output
            label="Gap between cancellations"
            value={fmtHz(r.value.notchSpacingHz)}
            unit="Hz"
            secondary
            help="The notches repeat at this interval up the spectrum."
          />
          <Output
            label="Time difference"
            value={fmtMs(r.value.timeOffsetMs)}
            unit="ms"
            secondary
            help="Delaying the earlier arrival by this lines the two up."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function ConstantCurvatureCard() {
  const id = 'arrays.constantCurvature'
  const [inp, set] = useCalcInputs(id, {
    boxes: 8 as number | null,
    splay: 5 as number | null,
    boxHeight: 0.35 as number | null,
    trimHeight: null as number | null,
    topTilt: null as number | null,
  })
  const q = useQ()
  const { show, label } = useUnits()
  const r = constantCurvature({
    boxes: inp.boxes,
    splayDeg: inp.splay,
    boxHeightM: inp.boxHeight,
    trimHeightM: inp.trimHeight,
    topTiltDeg: inp.topTilt,
  })
  const dist = (m: number | null) => (m === null ? '—' : fmtDistance(show('distance', m)))
  const unit = label('distance')
  const landing = inp.trimHeight !== null && inp.topTilt !== null
  // Sentences read better with rounded figures than with the 3-decimal result values.
  const roughly = (m: number | null) => (m === null ? '—' : formatNumber(show('distance', m), 1))
  const near = r.ok ? roughly(r.value.bottomThrow) : ''
  const far = r.ok ? roughly(r.value.topThrow) : ''
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Line Array',
          inputs: `${v(inp.boxes)} boxes × ${v(inp.splay, '°')}, box ${q('distance', inp.boxHeight, 3)}`,
          output: `≈${fmtDeg(r.value.verticalCoverage)}° coverage, ${dist(r.value.arcLength)} ${unit} long`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Line Array"
      info={{
        what: 'Shows how much vertical angle a hang covers when every box has the same splay, how long it is, and — optionally — which seats the top and bottom boxes point at.',
        when: 'Sanity-checking a hang before you open the manufacturer’s prediction software.',
        formula:
          'vertical coverage ≈ boxes × splay\narray length = boxes × box height\nangle of bottom box = top tilt + (boxes − 1) × splay\nlands at = height ÷ tan(angle)',
      }}
    >
      <Inputs>
        <NumberField
          label="Number of boxes"
          value={inp.boxes}
          onChange={(x) => set('boxes', x)}
          step={1}
          hint="How many cabinets in the hang."
        />
        <NumberField
          label="Splay between boxes"
          unit="°"
          value={inp.splay}
          onChange={(x) => set('splay', x)}
          hint="Angle between each pair of neighbouring boxes. Typically 1–10°."
        />
        <NumberField
          label="Box height"
          kind="distance"
          value={inp.boxHeight}
          onChange={(x) => set('boxHeight', x)}
          hint="Front height of one cabinet, from the spec sheet (about 0.35 m for a 12″ box)."
        />
      </Inputs>
      <Optional title="Where will it land on the audience?" active={landing}>
        <NumberField
          label="Array height above ears"
          kind="distance"
          value={inp.trimHeight}
          onChange={(x) => set('trimHeight', x)}
          hint="How high the top box is above listeners’ ears."
        />
        <NumberField
          label="Top box tilt"
          unit="° down"
          value={inp.topTilt}
          onChange={(x) => set('topTilt', x)}
          hint="How far the top box points down from level. 0 = straight out."
        />
      </Optional>
      {r.ok ? (
        <>
          <Outputs>
            <Output
              label="Vertical coverage"
              value={`≈ ${fmtDeg(r.value.verticalCoverage)}`}
              unit="°"
              wide
              help="Roughly how tall a slice of the room the array covers, top to bottom."
            />
            <Output
              label="Array length"
              value={dist(r.value.arcLength)}
              unit={unit}
              help="Height of the hang from the top of the first box to the bottom of the last."
            />
            <Output
              label="Curve radius"
              value={dist(r.value.radius)}
              unit={r.value.radius === null ? undefined : unit}
              secondary
              help="A tighter curve (smaller radius) spreads sound wider but throws less far."
            />
            {landing ? (
              <>
                <Output
                  label="Top box lands at"
                  value={r.value.topThrow === null ? 'Beyond' : dist(r.value.topThrow)}
                  unit={r.value.topThrow === null ? undefined : unit}
                  help="Distance to the furthest seats this array aims at."
                />
                <Output
                  label="Bottom box lands at"
                  value={dist(r.value.bottomThrow)}
                  unit={r.value.bottomThrow === null ? undefined : unit}
                  help="Distance to the nearest seats this array aims at."
                />
                <Verdict>
                  {r.value.topThrow === null
                    ? 'The top box points level or upward, so it fires over the audience into the back wall — add more down-tilt.'
                    : `The array aims at seats from about ${near} ${unit} to ${far} ${unit} away. If your last row is closer than ${far} ${unit}, add down-tilt; if your front rows are closer than ${near} ${unit}, add boxes or more splay at the bottom.`}
                </Verdict>
              </>
            ) : (
              <Verdict>
                Open <em>Where will it land on the audience?</em> and add the array height and tilt
                to see which seats it covers.
              </Verdict>
            )}
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function BeamingCard() {
  const id = 'arrays.beaming'
  const [inp, set] = useCalcInputs(id, { boxHeight: 0.35 as number | null })
  const q = useQ()
  const { temperatureC, temperatureText } = useTemperature()
  const r = beamingFrequency(inp.boxHeight, temperatureC)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Beaming Frequency',
          inputs: `${q('distance', inp.boxHeight, 3)} @ ${temperatureText}`,
          output: `${fmtHz(r.value)} Hz`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Beaming Frequency"
      info={{
        what: 'Frequency above which a single box of this height starts to narrow (beam) vertically.',
        when: 'Understanding why an array behaves as a line only above a certain frequency.',
        formula: 'f_beam = c / box height',
      }}
    >
      <Inputs>
        <NumberField
          label="Box height"
          hint="Front height of one cabinet, from the spec sheet."
          kind="distance"
          value={inp.boxHeight}
          onChange={(x) => set('boxHeight', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Box starts to narrow above"
            help="Above this frequency a single box gets narrower vertically."
            value={fmtHz(r.value)}
            unit="Hz"
            wide
          />
          <Verdict>
            Below {fmtHz(r.value)} Hz each box spreads sound widely, so only the whole array
            controls where it goes. Above it, each box beams on its own — that’s where splay angles
            start to matter most.
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

const SWEEP_HZ = [40, 50, 63, 80, 100, 125]

function rejectionTone(db: number): Tone {
  if (db >= 15) return 'good'
  if (db >= 6) return 'ok'
  return 'warn'
}

export function GradientSubCard() {
  const id = 'arrays.gradient'
  const [inp, set] = useCalcInputs(id, {
    mode: 'gradient' as SubArrayMode,
    subs: 3 as number | null,
    spacing: 1.2 as number | null,
    customDelay: null as number | null,
    frequency: 63 as number | null,
  })
  const q = useQ()
  const { temperatureC, temperatureText } = useTemperature()
  const gradient = inp.mode === 'gradient'
  const subs = gradient ? 2 : inp.subs
  const speed = speedOfSound(temperatureC)
  const autoDelay =
    speed.ok && inp.spacing !== null && inp.spacing > 0
      ? (inp.spacing / speed.value.metersPerSecond) * 1000
      : null
  const delay = inp.customDelay ?? autoDelay
  const at = (frequencyHz: number | null) =>
    inlineSubArray({
      subs,
      spacingM: inp.spacing,
      delayMs: delay,
      frequencyHz,
      mode: inp.mode,
      temperatureC,
    })
  const r = at(inp.frequency)
  const sweep = SWEEP_HZ.map((hz) => ({ hz, result: at(hz) }))
  usePublishResult(
    id,
    r.ok
      ? {
          title: gradient ? 'Cardioid Sub Pair' : 'End-fire Subs',
          inputs: `${v(subs)} subs, ${q('distance', inp.spacing)} apart @ ${temperatureText}`,
          output: `delay step ${fmtMs(delay ?? 0)} ms, ${capDb(r.value.frontToBackDb)} dB rear rejection`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Cardioid & End-fire Subs"
      info={{
        what: 'Works out the delay and polarity to set on each sub so the low end goes forward into the audience and much less goes back onto the stage.',
        when: 'The stage is drowning in sub, or you need to keep low end off a back wall or out of the neighbours.',
        formula:
          'delay step = spacing ÷ speed of sound\ncardioid pair: rear sub delayed by one step and polarity flipped\nend-fire: front sub delayed most, one step less per sub going back\nrear rejection = front level − rear level (dB)',
      }}
    >
      <Inputs>
        <Segmented
          label="Type of array"
          value={inp.mode}
          onChange={(m) => set('mode', m)}
          options={[
            { value: 'gradient', label: 'Cardioid pair' },
            { value: 'endfire', label: 'End-fire line' },
          ]}
          hint={
            gradient
              ? 'Two subs, one directly behind the other. The rear one is delayed and flipped.'
              : 'A row of subs one behind another, all facing forward.'
          }
        />
        {!gradient && (
          <NumberField
            label="Number of subs"
            value={inp.subs}
            onChange={(x) => set('subs', x)}
            step={1}
            hint="How many subs in the row, front to back (2–8)."
          />
        )}
        <NumberField
          label="Distance between subs"
          kind="distance"
          value={inp.spacing}
          onChange={(x) => set('spacing', x)}
          hint="Front face to front face of neighbouring subs. Typically 0.8–1.2 m."
        />
        <TemperatureField />
      </Inputs>
      <Optional title="Fine-tune" active={inp.customDelay !== null || inp.frequency !== 63}>
        <NumberField
          label="Your own delay step"
          unit="ms"
          value={inp.customDelay}
          onChange={(x) => set('customDelay', x)}
          hint={`Leave empty to use the ideal ${autoDelay === null ? '' : `${fmtMs(autoDelay)} ms `}(distance ÷ speed of sound).`}
        />
        <NumberField
          label="Check at frequency"
          unit="Hz"
          value={inp.frequency}
          onChange={(x) => set('frequency', x)}
          hint="The frequency you care most about. 63 Hz is a good default."
        />
      </Optional>
      {r.ok ? (
        <>
          <Outputs>
            <Output
              label={`Rear rejection at ${fmtHz(inp.frequency)} Hz`}
              value={capDb(r.value.frontToBackDb)}
              unit="dB"
              wide
              help="How much quieter it is behind the subs than in front. This is the ideal figure; in real rooms expect about 15–25 dB with these settings."
            />
            <Rating
              label="Result"
              value={
                r.value.frontToBackDb >= 15
                  ? 'Strong rejection'
                  : r.value.frontToBackDb >= 6
                    ? 'Some rejection'
                    : 'Little or no rejection'
              }
              tone={rejectionTone(r.value.frontToBackDb)}
            />
            <Verdict>
              {gradient
                ? `Put one sub directly behind the other, ${q('distance', inp.spacing)} apart. On the rear sub, set ${fmtMs(delay ?? 0)} ms of delay and flip its polarity. Leave the front sub as it is.`
                : `Line the ${v(subs)} subs up front to back, ${q('distance', inp.spacing)} apart. Delay the front sub the most and each sub behind it ${fmtMs(delay ?? 0)} ms less — see the table below. Keep every sub in normal polarity.`}
            </Verdict>
            <ResultTable
              caption="What to set on each sub"
              headers={['Sub (front → back)', 'Delay', 'Polarity']}
              rows={r.value.settings.map((sub) => [
                `Sub ${sub.position}${sub.position === 1 ? ' (front)' : sub.position === r.value.settings.length ? ' (rear)' : ''}`,
                `${fmtMs(sub.delayMs)} ms`,
                sub.inverted ? 'Flipped (−)' : 'Normal (+)',
              ])}
            />
            <ResultTable
              caption="Rear rejection across the sub range"
              headers={['Frequency', 'Rear rejection', 'Front vs one sub']}
              rows={sweep.map(({ hz, result }) =>
                result.ok
                  ? [
                      `${hz} Hz`,
                      `${capDb(result.value.frontToBackDb)} dB`,
                      `${capDb(result.value.frontGainDb, true)} dB`,
                    ]
                  : [`${hz} Hz`, '—', '—'],
              )}
            />
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function MaxSubSpacingCard() {
  const id = 'arrays.maxSpacing'
  const [inp, set] = useCalcInputs(id, { frequency: 100 as number | null })
  const { temperatureC, temperatureText } = useTemperature()
  const { show, label } = useUnits()
  const r = maxSubSpacing(inp.frequency, temperatureC)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Max Sub Spacing',
          inputs: `${v(inp.frequency, 'Hz')} @ ${temperatureText}`,
          output: `${fmtDistance(show('distance', r.value))} ${label('distance')}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Max Sub Spacing"
      info={{
        what: 'Largest centre-to-centre spacing for a row of subs before grating lobes (off-axis cancellations) appear.',
        when: 'Laying out a broadside sub line across a stage front.',
        formula: 'spacing ≤ c / (2 × f_max) = λ / 2',
      }}
    >
      <Inputs>
        <NumberField
          label="Highest sub frequency"
          hint="Your sub crossover point — the highest frequency the subs play."
          unit="Hz"
          value={inp.frequency}
          onChange={(x) => set('frequency', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Maximum distance between subs"
            help="Centre to centre, for subs standing side by side in a row."
            value={fmtDistance(show('distance', r.value))}
            unit={label('distance')}
            wide
          />
          <Verdict>
            Keep subs in a row no more than {fmtDistance(show('distance', r.value))}{' '}
            {label('distance')} apart, centre to centre. Wider gaps cause cancellations off to the
            sides at frequencies up to {fmtHz(inp.frequency)} Hz.
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function UncoupledSpacingCard() {
  const id = 'arrays.uncoupled'
  const [inp, set] = useCalcInputs(id, { angle: 90 as number | null, height: 1.5 as number | null })
  const q = useQ()
  const { show, label } = useUnits()
  const r = uncoupledSpacing(inp.angle, inp.height)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Front Fill / Uncoupled Spacing',
          inputs: `${v(inp.angle, '°')} at ${q('distance', inp.height)}`,
          output: `${fmtDistance(show('distance', r.value.spacing))} ${label('distance')}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Front Fill / Uncoupled Spacing"
      info={{
        what: 'Maximum spacing between identical speakers so their −6 dB edges meet at the listening plane.',
        when: 'Spacing front fills along a stage lip or ceiling speakers in a distributed system.',
        formula: 'spacing = 2 × h × tan(θ / 2)',
      }}
    >
      <Inputs>
        <NumberField
          label="Speaker coverage angle"
          hint="Each speaker’s rated coverage angle, from the spec sheet."
          unit="°"
          value={inp.angle}
          onChange={(x) => set('angle', x)}
        />
        <NumberField
          label="Distance to listeners’ ears"
          hint="Height above ears for ceiling speakers, or distance to the first row for front fills."
          kind="distance"
          value={inp.height}
          onChange={(x) => set('height', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Maximum distance between speakers"
            help="Centre to centre, along the stage lip or ceiling."
            value={fmtDistance(show('distance', r.value.spacing))}
            unit={label('distance')}
            wide
          />
          <Verdict>
            Space the speakers no more than {fmtDistance(show('distance', r.value.spacing))}{' '}
            {label('distance')} apart. Their coverage edges then meet at the listeners, so nobody
            falls in a gap. Closer spacing gives more overlap (smoother level, but some comb
            filtering).
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
