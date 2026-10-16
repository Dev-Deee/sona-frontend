import {
  criticalDistance,
  frequencyToWavelength,
  itdg,
  roomModes,
  rt60,
  speedOfSound,
  type Rt60Method,
} from '../../../calculators/acoustics'
import { fmtDistance, fmtHz, fmtMs, formatNumber, PRECISION } from '../../../calculators/format'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import { CalcCard, Inputs, Outputs } from '../CalcCard'
import { NumberField, Segmented, TemperatureField } from '../fields'
import {
  CalcError,
  ConstantBadge,
  Output,
  Rating,
  ResultTable,
  Verdict,
  Warnings,
} from '../outputs'
import { RATING_TONES, useQ, useTemperature, v } from './shared'

const RT60_ADVICE: Record<string, string> = {
  Excellent: 'A controlled room: speech will be clear and amplified music tight.',
  Good: 'Fine for speech and most amplified music.',
  Moderate:
    'Speech starts to blur. Keep speakers directional, aim them at the audience and away from walls.',
  Poor: 'Speech will be hard to follow. Use directional speakers close to listeners, and treat the room if you can.',
  'Very Poor':
    'A very live room: intelligibility will suffer badly. Use many small, close speakers (distributed system) and add absorption.',
}

/** Resonances shared by two or more room dimensions (within 5 %), which stack into strong booms. */
function coincidentModes(m: { length: number[]; width: number[]; height: number[] }): number[] {
  const dims = [m.length, m.width, m.height]
  const hits: number[] = []
  dims.forEach((a, i) =>
    dims.slice(i + 1).forEach((b) =>
      a.forEach((fa) =>
        b.forEach((fb) => {
          if (
            Math.abs(fa - fb) / Math.max(fa, fb) <= 0.05 &&
            !hits.some((h) => Math.abs(h - fa) / fa <= 0.05)
          )
            hits.push(fa)
        }),
      ),
    ),
  )
  return hits.sort((x, y) => x - y).slice(0, 4)
}

export function WavelengthCard() {
  const id = 'acoustics.wavelength'
  const [inp, set] = useCalcInputs(id, { frequency: 80 as number | null })
  const { temperatureC, temperatureText } = useTemperature()
  const { show, label } = useUnits()
  const r = frequencyToWavelength(inp.frequency, temperatureC)
  const d = (m: number) => fmtDistance(show('distance', m))
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Frequency → Wavelength',
          inputs: `${v(inp.frequency, 'Hz')} @ ${temperatureText}`,
          output: `λ ${d(r.value.wavelength)} ${label('distance')}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Frequency → Wavelength"
      info={{
        what: 'Converts a frequency into its wavelength, fractions of a wavelength, period and the number of samples per cycle.',
        when: 'Sizing sub spacing, judging where a reflection will comb, or setting delays in samples on a digital desk.',
        formula:
          'c = 331.3 × √(1 + T/273.15)\nλ = c / f\nperiod = 1000 / f (ms)\nsamples = period × fs / 1000',
      }}
    >
      <Inputs>
        <NumberField
          label="Frequency"
          hint="The pitch you’re interested in, in hertz. Bass ≈ 40–200 Hz, vocals ≈ 200 Hz–4 kHz."
          unit="Hz"
          value={inp.frequency}
          onChange={(x) => set('frequency', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <>
          <div className="flex flex-wrap gap-2">
            <ConstantBadge
              label={`Speed of sound at ${temperatureText}`}
              value={formatNumber(show('speed', r.value.speed), PRECISION.speed)}
              unit={label('speed')}
            />
          </div>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Wavelength (one full cycle)"
              help="How long one cycle of this frequency is in the air."
              value={d(r.value.wavelength)}
              unit={label('distance')}
              wide
            />
            <Verdict>
              At {formatNumber(inp.frequency, 0)} Hz, one cycle of sound is {d(r.value.wavelength)}{' '}
              {label('distance')} long and lasts {formatNumber(r.value.periodMs, 2)} ms.
            </Verdict>
            <Output
              label="Half wavelength"
              value={d(r.value.halfWavelength)}
              unit={label('distance')}
              secondary
              help="If a second speaker or a reflection arrives this much further away, this frequency cancels."
            />
            <Output
              label="Quarter wavelength"
              value={d(r.value.quarterWavelength)}
              unit={label('distance')}
              secondary
              help="A speaker this far from a wall or floor gets a dip at this frequency."
            />
            <Output
              label="Time for one cycle (period)"
              value={fmtMs(r.value.periodMs)}
              unit="ms"
              secondary
              wide
              help="Shifting one signal by this much brings it back in phase."
            />
            <ResultTable
              caption="One cycle in samples"
              headers={['Sample rate', 'One cycle = samples']}
              rows={r.value.samples.map((s) => [
                `${formatNumber(s.sampleRate / 1000, 1)} kHz`,
                formatNumber(s.samples, PRECISION.samples),
              ])}
            />
            <p className="col-span-2 -mt-1 text-xs text-fg-2">
              For desks and processors that set delay in samples rather than milliseconds.
            </p>
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function SpeedOfSoundCard() {
  const id = 'acoustics.speed'
  const { temperatureC, temperatureText } = useTemperature()
  const r = speedOfSound(temperatureC)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Speed of Sound',
          inputs: temperatureText,
          output: `${formatNumber(r.value.metersPerSecond, 2)} m/s`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Speed of Sound"
      info={{
        what: 'Speed of sound in air at the current temperature, and how long sound takes to travel one metre or foot.',
        when: 'Any time-alignment job: the ms-per-metre figure turns a tape-measure distance straight into a delay time.',
        formula: 'c = 331.3 × √(1 + T/273.15) m/s\nms/m = 1000 / c',
      }}
    >
      <Inputs>
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Speed of sound"
              value={formatNumber(r.value.metersPerSecond, 2)}
              unit="m/s"
              wide
              help={`${formatNumber(r.value.feetPerSecond, 1)} ft/s`}
            />
            <Verdict>
              At {temperatureText}, sound needs {formatNumber(r.value.msPerMeter, 2)} ms to travel
              one metre ({formatNumber(r.value.msPerFoot, 2)} ms per foot). Multiply a distance by
              this to get the delay time for a speaker that far away.
            </Verdict>
            <Output
              label="Delay per metre"
              value={fmtMs(r.value.msPerMeter)}
              unit="ms"
              secondary
              help="Delay to add for each metre of distance."
            />
            <Output
              label="Delay per foot"
              value={fmtMs(r.value.msPerFoot)}
              unit="ms"
              secondary
              help="Delay to add for each foot of distance."
            />
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function Rt60Card() {
  const id = 'acoustics.rt60'
  const [inp, set] = useCalcInputs(id, {
    volume: 5000 as number | null,
    absorption: 800 as number | null,
    surface: 2000 as number | null,
    method: 'sabine' as Rt60Method,
  })
  const q = useQ()
  const r = rt60(inp.volume, inp.absorption, inp.method, inp.surface)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'RT60 Estimator',
          inputs: `V ${q('volume', inp.volume, 0)}, A ${q('area', inp.absorption, 0)} (${inp.method})`,
          output: `${formatNumber(r.value.rt60, 2)} s — ${r.value.rating}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="RT60 Estimator"
      info={{
        what: 'Estimates reverberation time from room volume and total absorption (sabins).',
        when: 'Early in a design, or when judging how hard a room will be for speech. Use Eyring for rooms with lots of absorption (ā > 0.2).',
        formula:
          'Sabine: RT60 = 0.161 × V / A\nEyring: RT60 = 0.161 × V / (−S × ln(1 − ā)), ā = A / S',
      }}
    >
      <Inputs>
        <NumberField
          label="Room volume"
          hint="Length × width × height of the room."
          kind="volume"
          value={inp.volume}
          onChange={(x) => set('volume', x)}
        />
        <NumberField
          label="Absorption area A"
          hint="Total sabins: each surface’s area × its absorption coefficient, added up."
          kind="area"
          value={inp.absorption}
          onChange={(x) => set('absorption', x)}
        />
        <Segmented
          label="Method"
          hint="Sabine suits most rooms; Eyring is more accurate for very dead (absorptive) rooms."
          value={inp.method}
          onChange={(m) => set('method', m)}
          options={[
            { value: 'sabine', label: 'Sabine' },
            { value: 'eyring', label: 'Eyring' },
          ]}
        />
        {inp.method === 'eyring' && (
          <NumberField
            label="Total surface area S"
            hint="Floor + ceiling + all walls."
            kind="area"
            value={inp.surface}
            onChange={(x) => set('surface', x)}
          />
        )}
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Reverb time (RT60)"
            help="How many seconds a sound takes to die away after it stops."
            value={formatNumber(r.value.rt60, 2)}
            unit="s"
            wide={r.value.averageAbsorption === undefined}
          />
          {r.value.averageAbsorption !== undefined && (
            <Output
              label="Average absorption"
              value={formatNumber(r.value.averageAbsorption, 3)}
              secondary
              help="0 = every surface reflects, 1 = every surface absorbs."
            />
          )}
          <Rating
            label="Speech intelligibility"
            value={r.value.rating}
            tone={RATING_TONES[r.value.rating]}
          />
          <Verdict>{RT60_ADVICE[r.value.rating]}</Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function CriticalDistanceCard({
  calcId = 'acoustics.criticalDistance',
}: {
  calcId?: string
}) {
  const [inp, set] = useCalcInputs(calcId, {
    volume: 5000 as number | null,
    rt60: 1.8 as number | null,
  })
  const q = useQ()
  const { show, label } = useUnits()
  const r = criticalDistance(inp.volume, inp.rt60)
  usePublishResult(
    calcId,
    r.ok
      ? {
          title: 'Critical Distance',
          inputs: `V ${q('volume', inp.volume, 0)}, RT60 ${v(inp.rt60, 's', 2)}`,
          output: `Dc ${fmtDistance(show('distance', r.value))} ${label('distance')}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Critical Distance"
      info={{
        what: 'Distance from an omnidirectional source at which direct and reverberant sound are equal in level.',
        when: 'Placing mics and speakers: beyond Dc, the room dominates and intelligibility drops. Directional speakers extend it by √Q.',
        formula: 'Dc = 0.057 × √(V / RT60)   (V in m³, Dc in m)',
      }}
    >
      <Inputs>
        <NumberField
          label="Room volume"
          hint="Length × width × height of the room."
          kind="volume"
          value={inp.volume}
          onChange={(x) => set('volume', x)}
        />
        <NumberField
          label="RT60"
          hint="Reverb time: seconds for sound to fade by 60 dB. Measure it, or use the RT60 calculator."
          unit="s"
          value={inp.rt60}
          onChange={(x) => set('rt60', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Critical distance"
            help="The distance where the speaker’s direct sound and the room’s reverb are equally loud."
            value={fmtDistance(show('distance', r.value))}
            unit={label('distance')}
            wide
          />
          <Verdict>
            Listeners closer than {fmtDistance(show('distance', r.value))} {label('distance')}{' '}
            mostly hear the speaker; further away the room takes over and speech gets muddy.
            Directional speakers push this distance further out, so aim them at the audience and
            away from walls.
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function RoomModesCard() {
  const id = 'acoustics.roomModes'
  const [inp, set] = useCalcInputs(id, {
    length: 12 as number | null,
    width: 8 as number | null,
    height: 4 as number | null,
  })
  const q = useQ()
  const { temperatureC, temperatureText } = useTemperature()
  const r = roomModes(inp.length, inp.width, inp.height, temperatureC)
  const stacked = r.ok ? coincidentModes(r.value) : []
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Room Modes',
          inputs: `${q('distance', inp.length)} × ${q('distance', inp.width)} × ${q('distance', inp.height)} @ ${temperatureText}`,
          output: `First modes ${fmtHz(r.value.length[0])} / ${fmtHz(r.value.width[0])} / ${fmtHz(r.value.height[0])} Hz`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Room Modes"
      info={{
        what: 'First five axial (standing-wave) modes along each room dimension.',
        when: 'Diagnosing boomy low end in small rooms and choosing sub/listening positions away from mode peaks and nulls.',
        formula: 'f = (c / 2) × (p / L),  p = 1 … 5',
      }}
    >
      <Inputs>
        <NumberField
          label="Length"
          hint="Longest wall-to-wall distance."
          kind="distance"
          value={inp.length}
          onChange={(x) => set('length', x)}
        />
        <NumberField
          label="Width"
          hint="Side-wall to side-wall distance."
          kind="distance"
          value={inp.width}
          onChange={(x) => set('width', x)}
        />
        <NumberField
          label="Height"
          hint="Floor to ceiling."
          kind="distance"
          value={inp.height}
          onChange={(x) => set('height', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Verdict>
            The room resonates at{' '}
            {fmtHz(Math.min(r.value.length[0], r.value.width[0], r.value.height[0]))} Hz and the
            frequencies below. Bass notes near these will boom in some seats and vanish in others.
            {stacked.length > 0 &&
              ` Watch ${stacked.map((f) => `${fmtHz(f)} Hz`).join(', ')} — more than one dimension resonates there, so expect a strong boom.`}
          </Verdict>
          <ResultTable
            caption="Room resonances (axial modes) in Hz"
            headers={[
              'Resonance',
              'Along length (Hz)',
              'Along width (Hz)',
              'Floor to ceiling (Hz)',
            ]}
            rows={r.value.length.map((_, i) => [
              `${['1st', '2nd', '3rd', '4th', '5th'][i]}`,
              fmtHz(r.value.length[i]),
              fmtHz(r.value.width[i]),
              fmtHz(r.value.height[i]),
            ])}
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function ItdgCard() {
  const id = 'acoustics.itdg'
  const [inp, set] = useCalcInputs(id, { distance: 6 as number | null })
  const q = useQ()
  const { temperatureC, temperatureText } = useTemperature()
  const r = itdg(inp.distance, temperatureC)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'ITDG',
          inputs: `${q('distance', inp.distance)} @ ${temperatureText}`,
          output: `${fmtMs(r.value)} ms`,
        }
      : null,
  )
  return (
    <CalcCard
      title="ITDG (Initial Time Delay Gap)"
      info={{
        what: 'Time between the direct sound and the first reflection, given the extra distance the reflection travels.',
        when: 'Judging perceived intimacy of a room, or whether a reflection will be heard as an echo (> ~50 ms) rather than as tone.',
        formula: 'ITDG = (distance / c) × 1000  (ms)',
      }}
    >
      <Inputs>
        <NumberField
          label="Distance to first reflection"
          hint="How much further the first reflection travels than the direct sound."
          kind="distance"
          value={inp.distance}
          onChange={(x) => set('distance', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Gap before the first reflection"
              help="Time between the direct sound and the first reflection arriving."
              value={fmtMs(r.value)}
              unit="ms"
              wide
            />
            <Verdict>
              {r.value < 20
                ? 'Under 20 ms the reflection blends with the direct sound — it adds body but can colour the tone.'
                : r.value < 50
                  ? '20–50 ms adds a sense of space without being heard as a separate echo.'
                  : 'Over 50 ms the reflection is heard as a separate echo — treat or avoid that surface.'}
            </Verdict>
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
