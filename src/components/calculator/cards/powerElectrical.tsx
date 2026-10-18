import { fmtDb, formatNumber } from '../../../calculators/format'
import {
  ampPowerToSpl,
  circuitLoad,
  constantVoltageLine,
  splToAmpPower,
  formatHours,
  noiseDose,
  NOISE_STANDARDS,
  totalImpedance,
  type DoseStatus,
  type NoiseStandard,
  type WiringMode,
} from '../../../calculators/powerElectrical'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { CalcCard, InputGroup, Inputs, Outputs } from '../CalcCard'
import { NumberField, Segmented } from '../fields'
import { SpeakerSelect } from '../SpeakerPicker'
import {
  CalcError,
  ConstantBadge,
  Output,
  Rating,
  ResultTable,
  Verdict,
  Warnings,
} from '../outputs'
import { NumberListEditor } from './ListEditor'
import { useQ, v } from './shared'

export function AmpPowerSplCard() {
  const id = 'power-electrical.ampSpl'
  const [inp, set] = useCalcInputs(id, {
    mode: 'forward' as 'forward' | 'reverse',
    power: 1000 as number | null,
    targetSpl: 110 as number | null,
    sensitivity: 98 as number | null,
    distance: 20 as number | null,
    speaker: null as string | null,
  })
  const q = useQ()
  const forward = inp.mode === 'forward'
  const r = forward
    ? ampPowerToSpl(inp.power, inp.sensitivity, inp.distance)
    : splToAmpPower(inp.targetSpl, inp.sensitivity, inp.distance)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Amp Power ↔ SPL',
          inputs: `${forward ? v(inp.power, 'W') : v(inp.targetSpl, 'dB SPL')}, ${v(inp.sensitivity, 'dB/W/m')}, ${q('distance', inp.distance, 1)}`,
          output: forward ? `${fmtDb(r.value)} dB SPL` : `${formatNumber(r.value, 0)} W`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Amp Power to SPL"
      info={{
        what: 'Maximum SPL a speaker produces at a distance from a given amplifier power — or the power needed for a target SPL.',
        when: 'Checking a system can hit the level the show needs, with headroom.',
        formula:
          'SPL = sensitivity + 10·log₁₀(P) − 20·log₁₀(d)\nP = 10^((SPL − sensitivity + 20·log₁₀(d)) / 10)',
      }}
    >
      <Inputs>
        <SpeakerSelect
          speakerId={inp.speaker}
          initialCategory="point_source"
          onClear={() => set('speaker', null)}
          onSelect={(s) => {
            set('speaker', s.id)
            if (s.sensitivity !== null) set('sensitivity', s.sensitivity)
            if (s.ratedPowerW !== null) set('power', s.ratedPowerW)
          }}
        />
        <Segmented
          label="Solve for"
          hint="Find the SPL from your amp, or the amp power you need for a target SPL."
          value={inp.mode}
          onChange={(m) => set('mode', m)}
          options={[
            { value: 'forward', label: 'SPL' },
            { value: 'reverse', label: 'Required power' },
          ]}
        />
        {forward ? (
          <NumberField
            label="Amplifier power"
            hint="Amp power into the speaker."
            unit="W"
            value={inp.power}
            onChange={(x) => set('power', x)}
          />
        ) : (
          <NumberField
            label="Target SPL"
            hint="How loud you need it at that distance."
            unit="dB"
            value={inp.targetSpl}
            onChange={(x) => set('targetSpl', x)}
          />
        )}
        <NumberField
          label="Speaker sensitivity"
          hint="SPL from 1 W at 1 m, from the spec sheet."
          unit="dB/W/m"
          value={inp.sensitivity}
          onChange={(x) => set('sensitivity', x)}
        />
        <NumberField
          label="Distance"
          hint="Listener distance from the speaker."
          kind="distance"
          value={inp.distance}
          onChange={(x) => set('distance', x)}
        />
      </Inputs>
      {r.ok ? (
        <Outputs>
          {forward ? (
            <>
              <Output
                label="Maximum level at the listener"
                value={fmtDb(r.value)}
                unit="dB SPL"
                wide
              />
              <Verdict>
                {`At full power, ${formatNumber(inp.power, 0)} W into this speaker gives about ${fmtDb(r.value)} dB SPL at ${q('distance', inp.distance, 1)}. Keep 6–10 dB in reserve for peaks.`}
              </Verdict>
            </>
          ) : (
            <>
              <Output
                label="Amplifier power needed"
                help="Continuous power to reach the target level at that distance."
                value={formatNumber(r.value, 0)}
                unit="W"
                wide
              />
              <Verdict>
                {`To reach ${formatNumber(inp.targetSpl, 0)} dB SPL at ${q('distance', inp.distance, 1)}, you need about ${formatNumber(r.value, 0)} W. For 6 dB of headroom for peaks, use about ${formatNumber(r.value * 4, 0)} W.`}
              </Verdict>
            </>
          )}
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function CircuitLoadCard() {
  const id = 'power-electrical.circuit'
  const [inp, set] = useCalcInputs(id, {
    draws: [1500, 1500, 1200] as (number | null)[],
    voltage: 230 as number,
    breaker: 16 as number | null,
  })
  const r = circuitLoad(inp.draws, inp.voltage, inp.breaker)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Circuit Load',
          inputs: `${inp.draws.filter((d) => d !== null).length} amps, ${inp.voltage} V, ${v(inp.breaker, 'A')}`,
          output: `${formatNumber(r.value.totalAmps, 1)} A → ${r.value.circuitsRequired} circuit(s)`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Circuit Load"
      info={{
        what: 'Total current of your amplifiers and how many circuits they need under the 80% continuous-load rule.',
        when: 'Advancing power with a venue or generator supplier. Assumes power factor 1; check amp manuals for peak and inrush current.',
        formula: 'I = ΣP / V\ncircuits = ⌈I / (0.8 × breaker)⌉',
      }}
    >
      <Inputs>
        <Segmented
          label="Mains voltage"
          hint="Your country’s supply voltage."
          value={String(inp.voltage) as '230' | '120'}
          onChange={(x) => set('voltage', Number(x))}
          options={[
            { value: '230', label: '230 V (UK / EU / NG)' },
            { value: '120', label: '120 V (US)' },
          ]}
        />
        <NumberField
          label="Breaker size"
          hint="Rating of each circuit breaker, e.g. 13, 16 or 32 A."
          unit="A"
          value={inp.breaker}
          onChange={(x) => set('breaker', x)}
        />
      </Inputs>
      <InputGroup>
        <NumberListEditor
          itemLabel="Amplifier draw"
          unit="W"
          values={inp.draws}
          onChange={(x) => set('draws', x)}
        />
      </InputGroup>
      {r.ok ? (
        <Outputs>
          <Output
            label="Circuits needed"
            value={String(r.value.circuitsRequired)}
            wide
            help={`${inp.breaker ?? '—'} A breakers, each loaded to no more than 80%.`}
          />
          <Verdict>{r.value.recommendation}</Verdict>
          <Output
            label="Total current draw"
            help="Current the amps draw from the mains."
            value={formatNumber(r.value.totalAmps, 2)}
            unit="A"
          />
          <Output label="Total power" value={formatNumber(r.value.totalWatts, 0)} unit="W" />
          <Output
            label="Safe load per circuit"
            value={formatNumber(r.value.usableAmpsPerCircuit, 1)}
            unit="A"
            secondary
            wide
            help="80% of the breaker rating — the most you should run continuously."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function ConstantVoltageCard() {
  const id = 'power-electrical.constantVoltage'
  const [inp, set] = useCalcInputs(id, {
    taps: [10, 10, 10, 5] as (number | null)[],
    line: 100 as number,
  })
  const r = constantVoltageLine(inp.taps, inp.line)
  usePublishResult(
    id,
    r.ok
      ? {
          title: '70 V / 100 V Line',
          inputs: `${r.value.speakers} speakers on ${inp.line} V`,
          output: `${formatNumber(r.value.totalWatts, 1)} W load, amp ≥ ${formatNumber(r.value.ampWatts, 0)} W`,
        }
      : null,
  )
  return (
    <CalcCard
      title="70 V / 100 V Line System"
      info={{
        what: 'Total load, line impedance and amplifier size for a constant-voltage distributed system.',
        when: 'Designing background music / paging zones with tapped ceiling speakers.',
        formula: 'P = Σ taps\nZ = V² / P\namp ≥ 1.25 × P',
      }}
    >
      <Inputs>
        <Segmented
          label="Line voltage"
          hint="The constant-voltage line your amplifier outputs."
          value={String(inp.line) as '70' | '100'}
          onChange={(x) => set('line', Number(x))}
          options={[
            { value: '70', label: '70 V' },
            { value: '100', label: '100 V' },
          ]}
        />
      </Inputs>
      <InputGroup>
        <NumberListEditor
          itemLabel="Speaker tap"
          unit="W"
          values={inp.taps}
          onChange={(x) => set('taps', x)}
          max={100}
        />
      </InputGroup>
      {r.ok ? (
        <Outputs>
          <Output
            label="Amplifier needed"
            help="Total load plus 25% headroom."
            value={formatNumber(r.value.ampWatts, 0)}
            unit="W"
            wide
          />
          <Verdict>
            {`${r.value.speakers} speaker${r.value.speakers > 1 ? 's' : ''} draw ${formatNumber(r.value.totalWatts, 1)} W in total. Use an amplifier of at least ${formatNumber(r.value.ampWatts, 0)} W on the ${inp.line} V line.`}
          </Verdict>
          <Output label="Total speaker load" value={formatNumber(r.value.totalWatts, 1)} unit="W" />
          <Output
            label="Line impedance"
            value={formatNumber(r.value.impedance, 1)}
            unit="Ω"
            help="Must be above the amp’s minimum rated load."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function ImpedanceCard() {
  const id = 'power-electrical.impedance'
  const [inp, set] = useCalcInputs(id, {
    impedances: [8, 8] as (number | null)[],
    mode: 'parallel' as WiringMode,
    perString: 2 as number | null,
  })
  const r = totalImpedance(inp.impedances, inp.mode, inp.perString ?? 0)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Impedance',
          inputs: `${inp.impedances.filter((z) => z !== null).join(' / ')} Ω, ${inp.mode}`,
          output: `${formatNumber(r.value.total, 2)} Ω`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Impedance Calculator"
      info={{
        what: 'Total load impedance of several speakers wired to one amplifier channel.',
        when: 'Before daisy-chaining boxes: make sure the load does not drop below what the amplifier is rated for.',
        formula:
          'Series: Z = Z₁ + Z₂ + …\nParallel: 1/Z = 1/Z₁ + 1/Z₂ + …\nSeries-parallel: strings in series, strings in parallel',
      }}
    >
      <Inputs>
        <Segmented
          label="Wiring"
          hint="How the speakers are connected on one amp channel."
          value={inp.mode}
          onChange={(m) => set('mode', m)}
          options={[
            { value: 'series', label: 'Series' },
            { value: 'parallel', label: 'Parallel' },
            { value: 'series-parallel', label: 'Series-parallel' },
          ]}
        />
        {inp.mode === 'series-parallel' && (
          <NumberField
            label="Speakers per series string"
            hint="How many speakers are chained in series in each string."
            value={inp.perString}
            onChange={(x) => set('perString', x)}
            step={1}
          />
        )}
      </Inputs>
      <InputGroup>
        <NumberListEditor
          itemLabel="Speaker"
          unit="Ω"
          values={inp.impedances}
          onChange={(x) => set('impedances', x)}
        />
      </InputGroup>
      {r.ok ? (
        <Outputs>
          <Output
            label="Total impedance"
            help="The load the amp channel sees."
            value={formatNumber(r.value.total, 2)}
            unit="Ω"
            wide
          />
          <Verdict>
            {(() => {
              const ok = r.value.compatibility
                .filter((c) => c.compatible)
                .map((c) => c.ratedMinimum)
              return ok.length === 0
                ? `${formatNumber(r.value.total, 1)} Ω is below every standard amplifier rating — rewire (more speakers in series) or use more amplifier channels.`
                : `Safe on any amplifier rated for ${Math.max(...ok)} Ω or lower loads.${ok.length < 3 ? ` Too low for amps that only handle ${[4, 8, 16].filter((x) => !ok.includes(x)).join(' or ')} Ω.` : ''}`
            })()}
          </Verdict>
          {r.value.compatibility.map((c) => (
            <Rating
              key={c.ratedMinimum}
              label={`Amp rated for ${c.ratedMinimum} Ω minimum`}
              value={c.compatible ? 'OK' : 'Too low'}
              tone={c.compatible ? 'good' : 'bad'}
            />
          ))}
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

const DOSE_TEXT: Record<DoseStatus, string> = {
  Safe: 'Safe',
  Monitor: 'Monitor — approaching limit',
  'Near limit': 'Near limit',
  Exceeded: 'Limit exceeded — damage risk',
}
const DOSE_TONE: Record<DoseStatus, 'good' | 'warn' | 'bad'> = {
  Safe: 'good',
  Monitor: 'warn',
  'Near limit': 'warn',
  Exceeded: 'bad',
}
const DOSE_MARK: Record<DoseStatus, string> = {
  Safe: '✓',
  Monitor: '⚠',
  'Near limit': '⚠',
  Exceeded: '✗',
}
const STANDARDS = Object.keys(NOISE_STANDARDS) as NoiseStandard[]

export function NoiseDoseCard() {
  const id = 'power-electrical.noiseDose'
  const [inp, set] = useCalcInputs(id, {
    level: 98 as number | null,
    hours: 3 as number | null,
    minutes: 0 as number | null,
    standard: 'UK HSE' as NoiseStandard,
  })
  const totalMinutes =
    inp.hours === null && inp.minutes === null ? null : (inp.hours ?? 0) * 60 + (inp.minutes ?? 0)
  const r = noiseDose(inp.level, totalMinutes, inp.standard)
  const all = STANDARDS.map((s) => ({ s, r: noiseDose(inp.level, totalMinutes, s) }))
  const spec = NOISE_STANDARDS[inp.standard]
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Noise Exposure',
          inputs: `${v(inp.level, 'dB(A)')} for ${formatHours((totalMinutes ?? 0) / 60)} (${inp.standard})`,
          output: `${formatNumber(r.value.dosePercent, 0)}% dose — ${r.value.status}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Noise Exposure / SPL Dose"
      info={{
        what: 'Works out how long ears can safely take an average sound level, and how much of the daily allowance a show uses up.',
        when: 'Festivals, long club nights, worship services, rehearsals — anywhere you, your crew or the audience are exposed for hours.',
        formula:
          'allowed time = reference time ÷ 2^((level − limit) ÷ exchange rate)\ndose = exposure time ÷ allowed time × 100%\nexchange rate: 3 dB (WHO, NIOSH, UK HSE) or 5 dB (OSHA)',
      }}
    >
      <Inputs>
        <NumberField
          label="Average level"
          unit="dB(A)"
          value={inp.level}
          onChange={(x) => set('level', x)}
          hint="The continuous average over the exposure (LAeq) — e.g. from your SPL meter’s show log."
        />
        <NumberField
          label="Exposure: hours"
          unit="h"
          value={inp.hours}
          onChange={(x) => set('hours', x)}
          hint="How long the exposure lasts."
        />
        <NumberField
          label="Exposure: minutes"
          unit="min"
          value={inp.minutes}
          onChange={(x) => set('minutes', x)}
        />
        <Segmented
          label="Standard"
          value={inp.standard}
          onChange={(x) => set('standard', x)}
          options={STANDARDS.map((s) => ({ value: s, label: s }))}
          hint={spec.note}
        />
      </Inputs>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <div className="col-span-2 flex flex-wrap gap-2">
              <ConstantBadge
                label={`${inp.standard} limit`}
                value={String(spec.limitDb)}
                unit="dB"
              />
              <ConstantBadge label="for" value={String(spec.referenceHours)} unit="h" />
              <ConstantBadge label="exchange rate" value={String(spec.exchangeRateDb)} unit="dB" />
            </div>
            <Output
              label="Daily noise dose used"
              value={formatNumber(r.value.dosePercent, 0)}
              unit="%"
              wide
              help="100% is the most allowed under this standard."
            />
            <Rating
              label="Status"
              value={`${DOSE_MARK[r.value.status]} ${DOSE_TEXT[r.value.status]}`}
              tone={DOSE_TONE[r.value.status]}
            />
            <Verdict>
              {r.value.noRisk
                ? `No exposure risk at this level under ${inp.standard}.`
                : r.value.status === 'Exceeded'
                  ? `At ${formatNumber(inp.level, 0)} dB(A) the safe limit is only ${formatHours(r.value.allowedHours)}. Turn down by about ${fmtDb(r.value.reductionDb)} dB, shorten the exposure, or wear hearing protection.`
                  : `At ${formatNumber(inp.level, 0)} dB(A) ears can take ${formatHours(r.value.allowedHours)}. You have ${formatHours(r.value.remainingHours)} left before reaching the limit.`}
            </Verdict>
            <Output
              label="Safe time at this level"
              value={formatHours(r.value.allowedHours)}
              help={`Under ${inp.standard}.`}
            />
            {r.value.dosePercent > 100 ? (
              <Output
                label="Turn down by"
                value={fmtDb(r.value.reductionDb)}
                unit="dB"
                help="To bring this exposure within the limit."
              />
            ) : (
              <Output
                label="Time remaining"
                value={formatHours(r.value.remainingHours)}
                help="Before reaching 100%."
              />
            )}
            <ResultTable
              caption="All four standards compared"
              headers={['Standard', 'Limit', 'Safe time', 'Your dose', 'Status']}
              rows={all.map(({ s, r: x }) =>
                x.ok
                  ? [
                      s,
                      `${NOISE_STANDARDS[s].limitDb} dB`,
                      formatHours(x.value.allowedHours),
                      `${formatNumber(x.value.dosePercent, 0)}%`,
                      `${DOSE_MARK[x.value.status]} ${x.value.status}`,
                    ]
                  : [s, '—', '—', '—', '—'],
              )}
            />
            <details className="group col-span-2 rounded-xl border border-dashed border-line">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[13px] font-medium text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
                <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
                  ›
                </span>
                About these limits
              </summary>
              <p className="px-4 pb-4 font-serif text-[15px] italic leading-relaxed text-fg-2">
                These calculations assume a constant level. Real exposure varies — use a calibrated
                sound level meter for compliance measurement. This calculator is a planning tool,
                not a substitute for a proper noise assessment.
              </p>
            </details>
          </Outputs>
        </>
      ) : (
        <CalcError
          message={
            inp.hours === 0 && inp.minutes === 0
              ? 'Invalid input — exposure time must be more than 0'
              : r.error
          }
        />
      )}
    </CalcCard>
  )
}
