import { fmtDb, fmtDbSigned, formatNumber } from '../../../calculators/format'
import {
  addDecibels,
  cableLoss,
  MAX_DB_SOURCES,
  subtractBackground,
  dbToLinear,
  gainStructure,
  linearToDb,
  signalSummation,
  speakerHeadroom,
  type DbType,
  type HeadroomStatus,
  type StageHealth,
} from '../../../calculators/gainSignal'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { CalcCard, InputGroup, Inputs, Optional, Outputs } from '../CalcCard'
import { NumberField, Segmented } from '../fields'
import { CalcError, Note, Output, Rating, ResultTable, Verdict, Warnings } from '../outputs'
import { NumberListEditor } from './ListEditor'
import { RATING_TONES, useQ, v } from './shared'

const DB_TYPES: { value: DbType; label: string }[] = [
  { value: 'voltage', label: 'Voltage' },
  { value: 'power', label: 'Power' },
  { value: 'spl', label: 'SPL' },
]

/** Linear ratios can span many orders of magnitude; switch to exponent notation at the extremes. */
const fmtRatio = (x: number) =>
  x !== 0 && (Math.abs(x) >= 1e6 || Math.abs(x) < 1e-3) ? x.toExponential(3) : formatNumber(x, 4)

const HEADROOM_ADVICE: Record<HeadroomStatus, string> = {
  Safe: 'Safe: the amplifier can’t exceed the speaker’s continuous rating.',
  Marginal:
    'Usable with care: the amp can exceed the continuous rating but stays within program. Use a limiter and watch long, loud passages.',
  Overpowered:
    'Risky: the amp can exceed even the program rating. Use a smaller amp or set a limiter below the speaker’s rating.',
}

export function DbToLinearCard() {
  const id = 'gain-signal.dbToLinear'
  const [inp, set] = useCalcInputs(id, { db: 6 as number | null, type: 'voltage' as DbType })
  const r = dbToLinear(inp.db, inp.type)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'dB → Linear',
          inputs: `${v(inp.db, 'dB')} (${inp.type})`,
          output: `×${fmtRatio(r.value)}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="dB → Linear"
      info={{
        what: 'Converts a level change in dB into a linear ratio.',
        when: 'Working out how many times more voltage or power a gain change represents.',
        formula: 'Voltage / SPL: ratio = 10^(dB / 20)\nPower: ratio = 10^(dB / 10)',
      }}
    >
      <Inputs>
        <NumberField
          label="Level"
          hint="A gain or level change in decibels, e.g. +6 or −3."
          unit="dB"
          value={inp.db}
          onChange={(x) => set('db', x)}
        />
        <Segmented
          label="Quantity"
          hint="Voltage and SPL use 20·log; power (watts) uses 10·log."
          value={inp.type}
          onChange={(t) => set('type', t)}
          options={DB_TYPES}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Multiply by"
            value={`× ${fmtRatio(r.value)}`}
            wide
            help="The linear ratio for this many decibels."
          />
          <Verdict>
            {`${fmtDbSigned(inp.db)} dB of ${{ voltage: 'voltage', power: 'power', spl: 'sound pressure' }[inp.type]} means multiplying it by ${fmtRatio(r.value)}`}
            {inp.db !== null && Math.abs(r.value - 2) < 0.02
              ? ' — about double.'
              : inp.db !== null && Math.abs(r.value - 0.5) < 0.01
                ? ' — about half.'
                : '.'}
          </Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function LinearToDbCard() {
  const id = 'gain-signal.linearToDb'
  const [inp, set] = useCalcInputs(id, { linear: 2 as number | null, type: 'voltage' as DbType })
  const r = linearToDb(inp.linear, inp.type)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Linear → dB',
          inputs: `×${v(inp.linear)} (${inp.type})`,
          output: `${fmtDbSigned(r.value)} dB`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Linear → dB"
      info={{
        what: 'Converts a linear ratio into decibels.',
        when: 'Turning “twice the voltage” or “ten times the power” into the dB figure.',
        formula: 'Voltage / SPL: dB = 20 × log₁₀(ratio)\nPower: dB = 10 × log₁₀(ratio)',
      }}
    >
      <Inputs>
        <NumberField
          label="Linear ratio"
          hint="How many times bigger, e.g. 2 = double."
          value={inp.linear}
          onChange={(x) => set('linear', x)}
        />
        <Segmented
          label="Quantity"
          hint="Voltage and SPL use 20·log; power (watts) uses 10·log."
          value={inp.type}
          onChange={(t) => set('type', t)}
          options={DB_TYPES}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output label="In decibels" value={fmtDbSigned(r.value)} unit="dB" wide />
          <Verdict>{`Multiplying the ${{ voltage: 'voltage', power: 'power', spl: 'sound pressure' }[inp.type]} by ${fmtRatio(inp.linear ?? 0)} is a change of ${fmtDbSigned(r.value)} dB.`}</Verdict>
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function SummationCard() {
  const id = 'gain-signal.summation'
  const [inp, set] = useCalcInputs(id, { sources: 2 as number | null })
  const r = signalSummation(inp.sources)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Signal Summation',
          inputs: `${v(inp.sources)} sources`,
          output: `${fmtDbSigned(r.value.correlatedDb)} dB`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Signal Summation"
      info={{
        what: 'Level increase from combining identical, in-phase (correlated) sources — and, for comparison, uncorrelated ones.',
        when: 'Predicting what adding more boxes or subs does to level.',
        formula: 'Correlated: +20 × log₁₀(n)\nUncorrelated: +10 × log₁₀(n)',
      }}
    >
      <Inputs>
        <NumberField
          label="Identical sources (1–16)"
          hint="Number of identical boxes playing the same signal, close together."
          value={inp.sources}
          onChange={(x) => set('sources', x)}
          step={1}
          min={1}
          max={16}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Level increase"
            help="When every source plays the same signal, in phase and close together."
            value={fmtDbSigned(r.value.correlatedDb)}
            unit="dB"
            wide
          />
          <Verdict>
            {inp.sources} identical speakers playing the same signal together are{' '}
            {fmtDb(r.value.correlatedDb)} dB louder than one. If they played unrelated signals (or
            were far apart), you’d only gain {fmtDb(r.value.uncorrelatedDb)} dB.
          </Verdict>
          <Output
            label="If the signals were unrelated"
            help="Uncorrelated sources add power, not pressure."
            value={fmtDbSigned(r.value.uncorrelatedDb)}
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

export function SpeakerHeadroomCard() {
  const id = 'gain-signal.headroom'
  const [inp, set] = useCalcInputs(id, {
    amp: 800 as number | null,
    continuous: 500 as number | null,
    program: 1000 as number | null,
  })
  const r = speakerHeadroom(inp.amp, inp.continuous, inp.program)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Passive Speaker Headroom',
          inputs: `amp ${v(inp.amp, 'W')}, ${v(inp.continuous, 'W')} cont / ${v(inp.program, 'W')} prog`,
          output: r.value.status,
        }
      : null,
  )
  return (
    <CalcCard
      title="Passive Speaker Headroom"
      info={{
        what: 'How the amplifier’s power compares with the speaker’s continuous and program ratings.',
        when: 'Matching amps to passive boxes. Negative headroom means the amp can exceed that rating — fine with care up to program, risky beyond it.',
        formula:
          'headroom = 10 × log₁₀(rating / amp power)\nSafe ≤ continuous < Marginal ≤ program < Overpowered',
      }}
    >
      <Inputs>
        <NumberField
          label="Amplifier power"
          hint="Amp output per channel at the speaker’s impedance."
          unit="W"
          value={inp.amp}
          onChange={(x) => set('amp', x)}
        />
        <NumberField
          label="Speaker continuous (RMS)"
          hint="The speaker’s continuous / AES power rating."
          unit="W"
          value={inp.continuous}
          onChange={(x) => set('continuous', x)}
        />
        <NumberField
          label="Speaker program"
          hint="The speaker’s program rating — usually 2× continuous."
          unit="W"
          value={inp.program}
          onChange={(x) => set('program', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Rating label="Status" value={r.value.status} tone={RATING_TONES[r.value.status]} />
          <Verdict>{HEADROOM_ADVICE[r.value.status]}</Verdict>
          <Output
            label="Speaker’s continuous rating vs amp"
            value={fmtDbSigned(r.value.vsContinuousDb)}
            unit="dB"
            help="Positive: the speaker can take more than the amp delivers."
          />
          <Output
            label="Speaker’s program rating vs amp"
            value={fmtDbSigned(r.value.vsProgramDb)}
            unit="dB"
            help="Negative: the amp can push past the speaker’s peak rating."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

const HEALTH_STYLES: Record<StageHealth, string> = {
  ok: 'border-line',
  warning: 'border-warn/60',
  clip: 'border-bad/70',
}
const HEALTH_TEXT: Record<StageHealth, string> = {
  ok: 'text-good',
  warning: 'text-warn',
  clip: 'text-bad',
}

export function GainStructureCard() {
  const id = 'gain-signal.gainStructure'
  const [inp, set] = useCalcInputs(id, {
    source: -50 as number | null,
    sourceUnit: 'dBu' as 'dBu' | 'dBV',
    preamp: 46 as number | null,
    processing: 0 as number | null,
    fader: 0 as number | null,
    ampSensitivity: 4 as number | null,
    ampGain: 32 as number | null,
    speakerSensitivity: 98 as number | null,
    impedance: 8 as number | null,
    distance: 15 as number | null,
  })
  const q = useQ()
  const r = gainStructure({
    sourceLevel: inp.source,
    sourceUnit: inp.sourceUnit,
    preampGain: inp.preamp,
    processingLoss: inp.processing,
    faderLevel: inp.fader,
    ampSensitivityDbu: inp.ampSensitivity,
    ampGainDb: inp.ampGain,
    speakerSensitivity: inp.speakerSensitivity,
    distanceM: inp.distance,
    impedance: inp.impedance,
  })
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Gain Structure',
          inputs: `${v(inp.source, inp.sourceUnit)} + ${v(inp.preamp, 'dB')} → amp ${v(inp.ampSensitivity, 'dBu')} sens, ${q('distance', inp.distance)}`,
          output: `${fmtDb(r.value.splAtListener)} dB SPL`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Gain Structure"
      info={{
        what: 'Follows a signal from source through preamp, processing and fader into the amplifier and speaker, showing level and headroom at each stage.',
        when: 'Finding where a system clips first, or why it is noisy (too little gain early, too much late).',
        formula:
          'out = in + gain − loss (dBu)\nheadroom = clip point − out (console clip +24 dBu; amp clips at its input sensitivity)\nP = V² / Z, SPL = sens + 10·log₁₀(P) − 20·log₁₀(d)',
      }}
    >
      <Inputs>
        <NumberField
          label="Source output"
          hint="Level coming out of the source (mic ≈ −50 dBu, line ≈ +4 dBu)."
          unit={inp.sourceUnit}
          value={inp.source}
          onChange={(x) => set('source', x)}
        />
        <Segmented
          label="Source unit"
          hint="dBu for pro gear; dBV for consumer gear."
          value={inp.sourceUnit}
          onChange={(u) => set('sourceUnit', u)}
          options={[
            { value: 'dBu', label: 'dBu' },
            { value: 'dBV', label: 'dBV' },
          ]}
        />
        <NumberField
          label="Preamp gain"
          hint="Gain set on the channel’s preamp."
          unit="dB"
          value={inp.preamp}
          onChange={(x) => set('preamp', x)}
        />
        <NumberField
          label="Amp input sensitivity"
          hint="Input level that drives the amp to full power, from its spec sheet."
          unit="dBu"
          value={inp.ampSensitivity}
          onChange={(x) => set('ampSensitivity', x)}
        />
        <NumberField
          label="Amp gain"
          hint="The amp’s voltage gain in dB, from its spec sheet."
          unit="dB"
          value={inp.ampGain}
          onChange={(x) => set('ampGain', x)}
        />
        <NumberField
          label="Speaker sensitivity"
          hint="SPL from 1 W at 1 m, from the speaker’s spec sheet."
          unit="dB/W/m"
          value={inp.speakerSensitivity}
          onChange={(x) => set('speakerSensitivity', x)}
        />
        <NumberField
          label="Distance from speaker"
          hint="Where the listener is."
          kind="distance"
          value={inp.distance}
          onChange={(x) => set('distance', x)}
        />
      </Inputs>
      <Optional
        title="Processing, fader and speaker impedance"
        active={inp.processing !== 0 || inp.fader !== 0 || inp.impedance !== 8}
      >
        <NumberField
          label="Insert / processing loss"
          hint="Level lost in EQ, inserts or processing (0 if none)."
          unit="dB"
          value={inp.processing}
          onChange={(x) => set('processing', x)}
        />
        <NumberField
          label="Fader level"
          hint="0 = fader at unity."
          unit="dB"
          value={inp.fader}
          onChange={(x) => set('fader', x)}
        />
        <NumberField
          label="Speaker impedance"
          hint="Nominal impedance — usually 4 or 8 Ω."
          unit="Ω"
          value={inp.impedance}
          onChange={(x) => set('impedance', x)}
        />
      </Optional>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Level at the listener"
              value={fmtDb(r.value.splAtListener)}
              unit="dB SPL"
              wide
              help="Loudness at the listener with this gain structure."
            />
            <Verdict>
              {(() => {
                const weakest = r.value.stages.reduce((a, b) =>
                  b.headroomDb < a.headroomDb ? b : a,
                )
                if (weakest.health === 'clip')
                  return `The ${weakest.name.toLowerCase()} stage is clipping (${fmtDb(weakest.headroomDb)} dB headroom). Turn it down and make up the level later in the chain.`
                if (weakest.health === 'warning')
                  return `The ${weakest.name.toLowerCase()} stage has only ${fmtDb(weakest.headroomDb)} dB of headroom — a loud peak will clip there first. Aim for at least 6 dB at every stage.`
                return `Every stage has at least 6 dB of headroom — a healthy gain structure. The tightest point is the ${weakest.name.toLowerCase()} stage (${fmtDb(weakest.headroomDb)} dB).`
              })()}
            </Verdict>
            <Output
              label="Amplifier output"
              value={formatNumber(r.value.ampOutputWatts, 1)}
              unit={`W (${formatNumber(r.value.ampOutputVolts, 1)} V)`}
              secondary
              wide
            />
          </Outputs>
          <ol
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
            aria-label="Signal chain"
          >
            {r.value.stages.map((s) => (
              <li
                key={s.name}
                className={`rounded-xl border bg-input px-4 py-3 ${HEALTH_STYLES[s.health]}`}
                data-health={s.health}
              >
                <div className="text-xs font-medium text-fg-2">{s.name}</div>
                <div className="font-num mt-1 whitespace-nowrap text-base font-semibold text-out-fg">
                  {fmtDb(s.inDbu)} → {fmtDb(s.outDbu)}{' '}
                  <span className="text-[11px] text-fg-2">dBu</span>
                </div>
                <div className={`font-num text-xs ${HEALTH_TEXT[s.health]}`}>
                  {s.health === 'clip' ? 'CLIP ' : ''}headroom {fmtDb(s.headroomDb)} dB
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function AddSubtractDbCard() {
  const id = 'gain-signal.addSubtract'
  const [inp, set] = useCalcInputs(id, {
    mode: 'add' as 'add' | 'subtract',
    levels: [90, 90] as (number | null)[],
    measured: 88 as number | null,
    background: 82 as number | null,
  })
  const adding = inp.mode === 'add'
  const sum = addDecibels(inp.levels)
  const diff = subtractBackground(inp.measured, inp.background)
  const r = adding ? sum : diff
  usePublishResult(
    id,
    adding
      ? sum.ok
        ? {
            title: 'Add dB',
            inputs: inp.levels.filter((l) => l !== null).join(' + ') + ' dB',
            output: `${fmtDb(sum.value.total)} dB`,
          }
        : null
      : diff.ok
        ? {
            title: 'Subtract background',
            inputs: `${v(inp.measured, 'dB')} measured, ${v(inp.background, 'dB')} background`,
            output: `${fmtDb(diff.value.source)} dB source`,
          }
        : null,
  )
  return (
    <CalcCard
      title="Add / Subtract dB"
      info={{
        what: 'Adds the levels of several unrelated sound sources, or removes background noise from a meter reading to find the true level of a source.',
        when: 'Predicting the level of several speakers or instruments together, or measuring a system in a noisy room.',
        formula:
          'Add: L = 10 × log₁₀(Σ 10^(Lₙ / 10))\nSubtract: L_source = 10 × log₁₀(10^(L_measured / 10) − 10^(L_background / 10))',
      }}
    >
      <Inputs>
        <Segmented
          label="What do you want to do?"
          value={inp.mode}
          onChange={(m) => set('mode', m)}
          options={[
            { value: 'add', label: 'Add sources' },
            { value: 'subtract', label: 'Remove background' },
          ]}
          hint={
            adding
              ? 'Combine sources playing different (unrelated) sounds.'
              : 'Find a source’s true level from a reading taken over background noise.'
          }
        />
        {!adding && (
          <>
            <NumberField
              label="Measured level"
              unit="dB"
              value={inp.measured}
              onChange={(x) => set('measured', x)}
              hint="Meter reading with the source playing."
            />
            <NumberField
              label="Background noise"
              unit="dB"
              value={inp.background}
              onChange={(x) => set('background', x)}
              hint="Meter reading with the source switched off."
            />
          </>
        )}
      </Inputs>
      {adding && (
        <InputGroup>
          <NumberListEditor
            itemLabel="Source"
            unit="dB"
            values={inp.levels}
            onChange={(x) => set('levels', x)}
            max={MAX_DB_SOURCES}
          />
        </InputGroup>
      )}
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          {adding && sum.ok ? (
            <Outputs>
              <Output
                label="Combined level"
                value={fmtDb(sum.value.total)}
                unit="dB"
                wide
                help="Total level of all the sources playing together."
              />
              <Verdict>
                {(() => {
                  const loudest = sum.value.contributions.reduce((a, b) =>
                    b.percent > a.percent ? b : a,
                  )
                  return sum.value.contributions.length === 1
                    ? 'Add more sources to see how they combine.'
                    : `Together these sources measure ${fmtDb(sum.value.total)} dB. The loudest (${fmtDb(loudest.level)} dB) supplies ${formatNumber(loudest.percent, 0)}% of the energy — turning the quieter ones down barely changes the total.`
                })()}
              </Verdict>
              <Note>
                Rule of thumb: two identical sources add 3 dB; ten identical sources add 10 dB.
              </Note>
              <ResultTable
                caption="Each source’s share of the total"
                headers={['Source', 'Level', 'Share of total power']}
                rows={sum.value.contributions.map((c, i) => [
                  `Source ${i + 1}`,
                  `${fmtDb(c.level)} dB`,
                  `${formatNumber(c.percent, 1)}%`,
                ])}
              />
            </Outputs>
          ) : diff.ok ? (
            <Outputs>
              <Output
                label="Source on its own"
                value={fmtDb(diff.value.source)}
                unit="dB"
                wide
                help="What the source would read with no background noise."
              />
              <Verdict>
                {`The background adds ${fmtDb(-diff.value.correction)} dB to your reading — the source alone is ${fmtDb(diff.value.source)} dB.`}
              </Verdict>
              <Note>
                Rule of thumb: when the source is 10 dB or more above the background, the background
                barely matters.
              </Note>
            </Outputs>
          ) : null}
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function CableLossCard() {
  const id = 'gain-signal.cableLoss'
  const [inp, set] = useCalcInputs(id, {
    gauge: 12 as number | null,
    gaugeUnit: 'awg' as 'awg' | 'mm2',
    length: 30 as number | null,
    load: 8 as number | null,
  })
  const q = useQ()
  const r = cableLoss({
    gauge: inp.gauge,
    gaugeUnit: inp.gaugeUnit,
    lengthM: inp.length,
    loadOhms: inp.load,
  })
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Cable Loss',
          inputs: `${inp.gaugeUnit === 'awg' ? `${v(inp.gauge)} AWG` : v(inp.gauge, 'mm²')}, ${q('distance', inp.length)}, ${v(inp.load, 'Ω')}`,
          output: `${fmtDb(r.value.powerLossDb)} dB`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Cable Loss"
      info={{
        what: 'Resistance, voltage drop and power loss of a speaker cable run (copper, out and back).',
        when: 'Choosing cable gauge for long runs or low-impedance loads. Aim for under 0.5 dB loss.',
        formula:
          'R = 0.0172 / mm² × 2 × length\nloss = R / (Z + R)\ndB = 20 × log₁₀(1 − loss)\nAWG → mm² = 0.012668 × 92^((36 − AWG)/19.5)',
      }}
    >
      <Inputs>
        <Segmented
          label="Gauge unit"
          hint="AWG is common in the US; mm² elsewhere."
          value={inp.gaugeUnit}
          onChange={(u) => set('gaugeUnit', u)}
          options={[
            { value: 'awg', label: 'AWG' },
            { value: 'mm2', label: 'mm²' },
          ]}
        />
        <NumberField
          label="Wire gauge"
          hint="Conductor size printed on the cable. Lower AWG = thicker wire."
          unit={inp.gaugeUnit === 'awg' ? 'AWG' : 'mm²'}
          value={inp.gauge}
          onChange={(x) => set('gauge', x)}
        />
        <NumberField
          label="Cable run length"
          hint="One-way length from amp to speaker."
          kind="distance"
          value={inp.length}
          onChange={(x) => set('length', x)}
        />
        <NumberField
          label="Load impedance"
          hint="The speaker load on the end of the cable."
          unit="Ω"
          value={inp.load}
          onChange={(x) => set('load', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          <Output
            label="Level lost in the cable"
            help="How much quieter the speaker is because of the cable."
            value={fmtDb(r.value.powerLossDb)}
            unit="dB"
            wide
          />
          <Verdict>
            {Math.abs(r.value.powerLossDb) < 0.5
              ? 'Fine — under 0.5 dB is lost in this cable.'
              : Math.abs(r.value.powerLossDb) < 1
                ? 'Acceptable, but a thicker cable would sound tighter and louder.'
                : 'Too much loss — use a thicker cable, a shorter run, or a higher-impedance load.'}
          </Verdict>
          <Output
            label="Voltage lost"
            value={formatNumber(r.value.voltageDropPercent, 2)}
            unit="%"
            secondary
            help="Share of the amp’s voltage lost before the speaker."
          />
          <Output
            label="Cable resistance (out and back)"
            value={formatNumber(r.value.resistance, 3)}
            unit="Ω"
            secondary
          />
          <Output
            label="Copper cross-section"
            value={formatNumber(r.value.areaMm2, 2)}
            unit="mm²"
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
