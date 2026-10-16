import { fmtDb, fmtDbSigned, formatNumber } from '../../../calculators/format'
import {
  alcons,
  estimateSti,
  feedbackHeadroom,
  type FeedbackStatus,
} from '../../../calculators/intelligibility'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { CalcCard, InputGroup, Inputs, Optional, Outputs } from '../CalcCard'
import { NumberField, Segmented } from '../fields'
import { CalcError, Output, Rating, Verdict } from '../outputs'
import { RATING_TONES, useQ, v } from './shared'

const STI_ADVICE: Record<string, string> = {
  Excellent: 'Speech will be understood easily, even complex material.',
  Good: 'Speech is clear for nearly everyone.',
  Fair: 'Most speech is understood, but listeners have to concentrate. Raise the signal over the noise or shorten the reverb.',
  Poor: 'Many words will be missed. Get speakers closer to listeners, lower the background noise, or treat the room.',
  Bad: 'Speech will not be understood. The system or the room needs rethinking.',
}

const ALCONS_ADVICE: Record<string, string> = {
  Excellent: 'Under 3% — speech will be crystal clear.',
  Good: 'Under 7% — clear speech for most listeners.',
  Fair: 'Acceptable for announcements, but not for detailed speech. More direct sound (closer or more directional speakers) helps.',
  Poor: 'Many consonants are lost. Move listeners into the direct field of a speaker, or cut the reverb.',
  Bad: 'Speech will be very hard to follow. Redesign the coverage or treat the room.',
}

export function StiCard() {
  const id = 'intelligibility.sti'
  const [inp, set] = useCalcInputs(id, { snr: 15 as number | null, rt60: 1.2 as number | null })
  const r = estimateSti(inp.snr, inp.rt60)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'STI Estimator',
          inputs: `SNR ${v(inp.snr, 'dB')}, RT60 ${v(inp.rt60, 's')}`,
          output: `STI ${formatNumber(r.value.sti, 2)} — ${r.value.rating}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="STI Estimator"
      info={{
        what: 'Rough Speech Transmission Index from signal-to-noise ratio and reverberation time.',
        when: 'Quick feasibility check for speech systems. Use a measured STI-PA for compliance work.',
        formula: 'STI ≈ (SNR / 30 + 1) / (1 + RT60), clamped to 0 – 1',
      }}
    >
      <Inputs>
        <NumberField
          label="Signal-to-noise ratio"
          hint="How much louder speech is than background noise."
          unit="dB"
          value={inp.snr}
          onChange={(x) => set('snr', x)}
        />
        <NumberField
          label="RT60"
          hint="Reverb time of the room in seconds."
          unit="s"
          value={inp.rt60}
          onChange={(x) => set('rt60', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Speech Transmission Index (STI)"
            help="From 0 (unintelligible) to 1 (perfect). 0.5 or more is acceptable for announcements."
            value={formatNumber(r.value.sti, 2)}
            wide
          />
          <Rating
            label="Speech clarity"
            value={r.value.rating}
            tone={RATING_TONES[r.value.rating]}
          />
          <Verdict>{STI_ADVICE[r.value.rating]}</Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function AlconsCard() {
  const id = 'intelligibility.alcons'
  const [inp, set] = useCalcInputs(id, {
    rt60: 1.8 as number | null,
    dr: -3 as number | null,
    sources: 1 as number | null,
  })
  const r = alcons(inp.rt60, inp.dr, inp.sources)
  usePublishResult(
    id,
    r.ok
      ? {
          title: '%ALcons',
          inputs: `RT60 ${v(inp.rt60, 's')}, D/R ${v(inp.dr, 'dB')}, N ${v(inp.sources)}`,
          output: `${formatNumber(r.value.alcons, 2)}% — ${r.value.rating}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="%ALcons"
      info={{
        what: 'Articulation loss of consonants (Peutz), from reverberation time and the direct-to-reverberant ratio at the listener.',
        when: 'Speech system design: under 10% is generally acceptable, under 5% is good.',
        formula:
          '%ALcons ≈ 0.652 × N × 10^(−D/R / 10) × RT60\n(capped at the far-field limit 9 × RT60)\nN = number of sources feeding the reverberant field',
      }}
    >
      <Inputs>
        <NumberField
          label="RT60"
          hint="Reverb time of the room in seconds."
          unit="s"
          value={inp.rt60}
          onChange={(x) => set('rt60', x)}
        />
        <NumberField
          label="Direct / reverberant ratio"
          hint="Direct sound vs room reverb at the listener. 0 dB = at critical distance."
          unit="dB"
          value={inp.dr}
          onChange={(x) => set('dr', x)}
        />
        <NumberField
          label="Number of sources (N)"
          hint="Speakers contributing to the room’s reverb (usually 1 for a single cluster)."
          value={inp.sources}
          onChange={(x) => set('sources', x)}
          step={1}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Consonants lost (%ALcons)"
            help="Share of consonant sounds listeners miss. Lower is better."
            value={formatNumber(r.value.alcons, 2)}
            unit="%"
            wide
          />
          <Rating
            label="Speech clarity"
            value={r.value.rating}
            tone={RATING_TONES[r.value.rating]}
          />
          <Verdict>{ALCONS_ADVICE[r.value.rating]}</Verdict>
          <Output
            label="Roughly equal to STI"
            value={formatNumber(r.value.estimatedSti, 2)}
            secondary
            wide
            help="The same result on the 0–1 STI scale."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

const FEEDBACK_ADVICE: Record<FeedbackStatus, string> = {
  Adequate:
    'The system has adequate headroom: it can deliver the gain the far listener needs without feeding back.',
  Marginal:
    'Marginal — the system can just reach the far listener, but there is a risk of feedback at high gain settings.',
  Insufficient:
    'Insufficient gain before feedback — the system cannot reach the far listener at the level they need without ringing.',
}

export function FeedbackHeadroomCard() {
  const id = 'intelligibility.feedback'
  const [inp, set] = useCalcInputs(id, {
    ds: 0.3 as number | null,
    d1: 6 as number | null,
    d2: 15 as number | null,
    d0: 20 as number | null,
    nom: 1 as number | null,
    ead: 1 as number | null,
    fsm: 6 as number | null,
    suppressor: 'off' as 'off' | 'on',
  })
  const q = useQ()
  const r = feedbackHeadroom({
    talkerToMic: inp.ds,
    speakerToMic: inp.d1,
    speakerToListener: inp.d2,
    talkerToListener: inp.d0,
    openMics: inp.nom,
    ead: inp.ead,
    stabilityMargin: inp.fsm,
    suppressor: inp.suppressor === 'on',
  })
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Feedback Headroom',
          inputs: `mic ${q('distance', inp.ds)}, ${v(inp.nom)} open mic(s)`,
          output: `margin ${fmtDbSigned(r.value.margin)} dB — ${r.value.status}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Feedback Headroom (PAG / NAG)"
      info={{
        what: 'Compares how much gain your system can deliver before feedback (PAG) with how much the farthest listener needs (NAG).',
        when: 'Designing speech systems with open microphones — churches, conferences, theatre — before you buy or hang anything.',
        formula:
          'PAG = 20·log₁₀(D0 × D1 / (Ds × D2)) − 10·log₁₀(NOM) − FSM (+6 dB with a feedback suppressor)\nNAG = 20·log₁₀(D0 / EAD)\nmargin = PAG − NAG',
      }}
    >
      <Inputs>
        <NumberField
          label="Talker → microphone (Ds)"
          kind="distance"
          value={inp.ds}
          onChange={(x) => set('ds', x)}
          hint="Mouth to mic. Handheld ≈ 0.05 m, lectern ≈ 0.3 m, choir mic ≈ 1 m."
        />
        <NumberField
          label="Speaker → microphone (D1)"
          kind="distance"
          value={inp.d1}
          onChange={(x) => set('d1', x)}
          hint="From the nearest PA speaker to the mic. Further is better."
        />
        <NumberField
          label="Speaker → farthest listener (D2)"
          kind="distance"
          value={inp.d2}
          onChange={(x) => set('d2', x)}
          hint="From the PA speaker to the last seat."
        />
        <NumberField
          label="Talker → farthest listener (D0)"
          kind="distance"
          value={inp.d0}
          onChange={(x) => set('d0', x)}
          hint="Straight from the person speaking to the last seat."
        />
        <NumberField
          label="Open microphones"
          value={inp.nom}
          onChange={(x) => set('nom', x)}
          step={1}
          hint="Mics live at the same time. Each doubling costs 3 dB."
        />
        <Segmented
          label="Feedback suppressor"
          value={inp.suppressor}
          onChange={(x) => set('suppressor', x)}
          options={[
            { value: 'off', label: 'None' },
            { value: 'on', label: 'In use (+6 dB)' },
          ]}
          hint="An automatic notch-filter feedback suppressor buys back up to 6 dB."
        />
      </Inputs>
      <Optional
        title="Listening distance and safety margin"
        active={inp.ead !== 1 || inp.fsm !== 6}
      >
        <NumberField
          label="Ideal listening distance (EAD)"
          kind="distance"
          value={inp.ead}
          onChange={(x) => set('ead', x)}
          hint="How close to the talker the far listener should sound. 1 m in a quiet room; 0.5 m if it’s noisy."
        />
        <NumberField
          label="Stability margin (FSM)"
          unit="dB"
          value={inp.fsm}
          onChange={(x) => set('fsm', x)}
          hint="Safety gap below the feedback point. 6 dB is standard; less risks ringing."
        />
      </Optional>
      <InputGroup>
        <details className="group rounded-xl border border-dashed border-line">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[13px] font-medium text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
              ›
            </span>
            What do these distances mean?
          </summary>
          <div className="space-y-3 px-4 pb-4 font-serif text-[14px] leading-relaxed text-fg-2">
            <pre className="overflow-x-auto rounded-lg bg-const px-3 py-2 font-num text-[12px] leading-snug text-const-fg">
              {`  TALKER ─Ds─ MIC ───D1─── SPEAKER
     │                          │
     └──────D0──────┐   ┌──D2───┘
                 FARTHEST LISTENER`}
            </pre>
            <p>
              <strong className="text-fg">Ds</strong> — mouth to microphone. Getting the mic closer
              is the cheapest gain you can buy: halving Ds adds 6 dB.
            </p>
            <p>
              <strong className="text-fg">D1</strong> — speaker to microphone. Keep speakers in
              front of, and far from, open mics.
            </p>
            <p>
              <strong className="text-fg">D2</strong> — speaker to the farthest listener. Speakers
              closer to the audience (or delay fills) shorten this.
            </p>
            <p>
              <strong className="text-fg">D0</strong> — the talker to that listener with no PA at
              all.
            </p>
          </div>
        </details>
      </InputGroup>
      {r.ok ? (
        <Outputs>
          <Output
            label="Gain available (PAG)"
            value={fmtDb(r.value.pag)}
            unit="dB"
            help="How much the system can amplify before feedback."
          />
          <Output
            label="Gain needed (NAG)"
            value={fmtDb(r.value.nag)}
            unit="dB"
            help="How much the farthest listener needs."
          />
          <Rating
            label="Gain before feedback"
            value={`${fmtDbSigned(r.value.margin)} dB — ${r.value.status}`}
            tone={
              r.value.status === 'Adequate'
                ? 'good'
                : r.value.status === 'Marginal'
                  ? 'warn'
                  : 'bad'
            }
          />
          <Verdict>
            {FEEDBACK_ADVICE[r.value.status]}
            {r.value.status !== 'Adequate' &&
              ' The quickest fixes: move the mic closer to the talker, keep speakers further from mics, mute unused mics, or bring speakers closer to the audience.'}
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
