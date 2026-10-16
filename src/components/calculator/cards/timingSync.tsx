import { fmtDistance, fmtHz, fmtMs, formatNumber } from '../../../calculators/format'
import {
  bpmToDelay,
  delayToDistance,
  FRAME_RATES,
  frameSync,
  phaseDelay,
} from '../../../calculators/timingSync'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import { CalcCard, Inputs, Outputs } from '../CalcCard'
import { NumberField, SelectField, TemperatureField } from '../fields'
import { CalcError, Output, ResultTable, Verdict, Warnings } from '../outputs'
import { useTemperature, v } from './shared'

export function PhaseDelayCard() {
  const id = 'timing-sync.phaseDelay'
  const [inp, set] = useCalcInputs(id, {
    phase: 90 as number | null,
    frequency: 100 as number | null,
  })
  const r = phaseDelay(inp.phase, inp.frequency)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Phase Delay',
          inputs: `${v(inp.phase, '°')} @ ${v(inp.frequency, 'Hz')}`,
          output: `${fmtMs(r.value)} ms`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Phase Delay"
      info={{
        what: 'Time offset equivalent to a phase shift at a given frequency.',
        when: 'Aligning a sub to tops at the crossover from a measured phase difference.',
        formula: 'delay = (phase / 360) × (1000 / f)  ms',
      }}
    >
      <Inputs>
        <NumberField
          label="Phase angle"
          hint="Phase difference between the two signals, from your analyser."
          unit="°"
          value={inp.phase}
          onChange={(x) => set('phase', x)}
        />
        <NumberField
          label="Frequency"
          hint="The frequency where you measured that phase difference."
          unit="Hz"
          value={inp.frequency}
          onChange={(x) => set('frequency', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Equivalent delay"
            help="The time shift that matches this phase difference at this frequency."
            value={fmtMs(r.value)}
            unit="ms"
            wide
          />
          <Verdict>
            {`A ${formatNumber(inp.phase, 0)}° shift at ${formatNumber(inp.frequency, 0)} Hz is ${fmtMs(Math.abs(r.value))} ms. Delay the signal that arrives first by this much to line the two up at that frequency.`}
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function TransmissionPathCard() {
  const id = 'timing-sync.transmission'
  const [inp, set] = useCalcInputs(id, { delay: 10 as number | null })
  const { temperatureC, temperatureText } = useTemperature()
  const { show, label } = useUnits()
  const r = delayToDistance(inp.delay, temperatureC)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Acoustic Transmission Path',
          inputs: `${v(inp.delay, 'ms')} @ ${temperatureText}`,
          output: `${fmtDistance(show('distance', r.value))} ${label('distance')}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Acoustic Transmission Path"
      info={{
        what: 'Distance sound travels in a given time.',
        when: 'Converting a delay you have dialled in (or measured) back into a physical distance.',
        formula: 'distance = (delay / 1000) × c',
      }}
    >
      <Inputs>
        <NumberField
          label="Delay"
          hint="A delay time in milliseconds."
          unit="ms"
          value={inp.delay}
          onChange={(x) => set('delay', x)}
        />
        <TemperatureField />
      </Inputs>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Sound travels"
              help="How far sound travels in that time."
              value={fmtDistance(show('distance', r.value))}
              unit={label('distance')}
              wide
            />
            <Verdict>
              {`In ${fmtMs(inp.delay)} ms, sound travels ${fmtDistance(show('distance', r.value))} ${label('distance')}. A delay of this much moves a speaker’s apparent position back by that distance.`}
            </Verdict>
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function BpmCard() {
  const id = 'timing-sync.bpm'
  const [inp, set] = useCalcInputs(id, { bpm: 120 as number | null })
  const r = bpmToDelay(inp.bpm)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'BPM → Delay',
          inputs: `${v(inp.bpm, 'BPM')}`,
          output: `¼ = ${fmtMs(r.value[2].ms)} ms`,
        }
      : null,
  )
  return (
    <CalcCard
      title="BPM → Delay"
      info={{
        what: 'Delay times for common note values at a tempo.',
        when: 'Setting tempo-synced delay effects when tap tempo isn’t available.',
        formula: 'quarter = 60000 / BPM ms; other notes scale from the quarter note',
      }}
    >
      <Inputs>
        <NumberField
          label="Tempo"
          hint="Song tempo in beats per minute."
          unit="BPM"
          value={inp.bpm}
          onChange={(x) => set('bpm', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Verdict>
            At {formatNumber(inp.bpm, 0)} BPM, one beat (a quarter note) lasts{' '}
            {fmtMs(r.value[2].ms)} ms. For a classic rhythmic echo try the dotted 8th:{' '}
            {fmtMs(r.value[5].ms)} ms.
          </Verdict>
          <ResultTable
            caption="Delay times by note value"
            headers={['Note', 'ms', 'Hz']}
            rows={r.value.map((n) => [n.name, fmtMs(n.ms), formatNumber(n.hz, 2)])}
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function FrameSyncCard() {
  const id = 'timing-sync.frames'
  const [inp, set] = useCalcInputs(id, { frameRate: '25' as string })
  const rate = FRAME_RATES.find((f) => f.label === inp.frameRate) ?? FRAME_RATES[2]
  const r = frameSync(rate.fps)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Video Frame Sync',
          inputs: `${rate.label} fps`,
          output: `${fmtMs(r.value.frameMs)} ms/frame`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Video Frame Sync"
      info={{
        what: 'Frame duration and audio samples per frame for broadcast and film frame rates.',
        when: 'Lip-sync and A/V alignment — converting a delay measured in frames into ms or samples.',
        formula:
          'frame = 1000 / fps ms; samples/frame = fs / fps\n(29.97 = 30000/1001, 23.976 = 24000/1001, 59.94 = 60000/1001)',
      }}
    >
      <Inputs>
        <SelectField
          label="Frame rate"
          hint="The video project’s frame rate."
          value={rate.label}
          onChange={(x) => set('frameRate', x)}
          options={FRAME_RATES.map((f) => ({ value: f.label, label: `${f.label} fps` }))}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="One frame lasts"
            help="How long one video frame is on screen."
            value={fmtMs(r.value.frameMs)}
            unit="ms"
            wide
          />
          <Verdict>
            At {rate.label} fps, each frame is {fmtMs(r.value.frameMs)} ms. If the picture is 2
            frames late, delay the audio by {fmtMs(r.value.frameMs * 2)} ms to keep lips in sync.
          </Verdict>
          <ResultTable
            caption="One frame in samples"
            headers={['Sample rate', 'One frame = samples']}
            rows={r.value.samples.map((s) => [
              `${fmtHz(s.sampleRate)} Hz`,
              formatNumber(s.samples, 3),
            ])}
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
