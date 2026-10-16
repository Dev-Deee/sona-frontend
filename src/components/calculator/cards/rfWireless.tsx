import { fmtDb, formatNumber } from '../../../calculators/format'
import {
  IM3_WINDOW_MHZ,
  linkBudget,
  MAX_COORDINATED_FREQUENCIES,
  thirdOrderIntermod,
} from '../../../calculators/rfWireless'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { CalcCard, InputGroup, Inputs, Optional, Outputs } from '../CalcCard'
import { NumberField, Segmented } from '../fields'
import { CalcError, Output, Rating, Verdict, Warnings } from '../outputs'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/icons'
import { RATING_TONES, useQ, v } from './shared'

const fmtMHz = (x: number) => formatNumber(x, 3)

const LINK_ADVICE: Record<string, string> = {
  Excellent: 'Rock solid — plenty of margin for bodies, walls and moving performers.',
  Good: 'Should be reliable. Keep antennas in line of sight to the stage.',
  Marginal:
    'Expect dropouts when performers move or the crowd fills in. Move antennas closer, use directional paddles, or cut cable losses.',
  'No link':
    'The signal is below the receiver’s sensitivity — this link will not work. Shorten the distance or improve the antennas.',
}

export function LinkBudgetCard() {
  const id = 'rf-wireless.linkBudget'
  const [inp, set] = useCalcInputs(id, {
    txPower: 13 as number | null,
    txGain: 0 as number | null,
    txCable: 0 as number | null,
    mode: 'auto' as 'auto' | 'manual',
    frequency: 600 as number | null,
    distance: 60 as number | null,
    manualLoss: 70 as number | null,
    rxGain: 6 as number | null,
    rxCable: 2 as number | null,
    multicoupler: 3 as number | null,
    sensitivity: -95 as number | null,
  })
  const q = useQ()
  const r = linkBudget({
    txPowerDbm: inp.txPower,
    txGainDbi: inp.txGain,
    txCableLossDb: inp.txCable,
    pathLossMode: inp.mode,
    frequencyMHz: inp.frequency,
    distanceM: inp.distance,
    manualPathLossDb: inp.manualLoss,
    rxGainDbi: inp.rxGain,
    rxCableLossDb: inp.rxCable,
    multicouplerLossDb: inp.multicoupler,
    rxSensitivityDbm: inp.sensitivity,
  })
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'RF Link Budget',
          inputs: `${v(inp.txPower, 'dBm')} TX, ${inp.mode === 'auto' ? `${v(inp.frequency, 'MHz')} @ ${q('distance', inp.distance, 1)}` : `${v(inp.manualLoss, 'dB')} path`}`,
          output: `margin ${fmtDb(r.value.marginDb)} dB — ${r.value.status}`,
        }
      : null,
  )
  return (
    <CalcCard
      title="RF Link Budget"
      info={{
        what: 'Received signal strength and fade margin for a wireless mic/IEM link.',
        when: 'Checking a long throw or an antenna/cable/combiner chain before the show. Free-space loss is a best case — bodies and walls add more.',
        formula:
          'FSPL = 20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π/c)\nRX = TX + G_tx − L_tx − FSPL + G_rx − L_rx − L_mc\nmargin = RX − sensitivity',
      }}
    >
      <Inputs>
        <NumberField
          label="TX power"
          hint="Transmitter output, e.g. 10–50 mW ≈ 10–17 dBm."
          unit="dBm"
          value={inp.txPower}
          onChange={(x) => set('txPower', x)}
        />
        <Segmented
          label="Path loss"
          hint="Free space assumes clear line of sight. Choose Manual if you’ve measured it."
          value={inp.mode}
          onChange={(m) => set('mode', m)}
          options={[
            { value: 'auto', label: 'Free space (auto)' },
            { value: 'manual', label: 'Manual' },
          ]}
        />
        {inp.mode === 'auto' ? (
          <>
            <NumberField
              label="Frequency"
              hint="Carrier frequency in MHz."
              unit="MHz"
              value={inp.frequency}
              onChange={(x) => set('frequency', x)}
            />
            <NumberField
              label="Distance"
              hint="Distance from the transmitter to the receive antenna."
              kind="distance"
              value={inp.distance}
              onChange={(x) => set('distance', x)}
            />
          </>
        ) : (
          <NumberField
            label="Path loss"
            hint="Free space assumes clear line of sight. Choose Manual if you’ve measured it."
            unit="dB"
            value={inp.manualLoss}
            onChange={(x) => set('manualLoss', x)}
          />
        )}
        <NumberField
          label="RX antenna gain"
          hint="Paddle antennas ≈ 6–9 dBi; whips ≈ 0 dBi."
          unit="dBi"
          value={inp.rxGain}
          onChange={(x) => set('rxGain', x)}
        />
        <NumberField
          label="Receiver sensitivity"
          hint="From the receiver spec sheet, e.g. −95 dBm."
          unit="dBm"
          value={inp.sensitivity}
          onChange={(x) => set('sensitivity', x)}
        />
      </Inputs>
      <Optional
        title="Cable and distribution losses"
        active={
          inp.txGain !== 0 || inp.txCable !== 0 || inp.rxCable !== 2 || inp.multicoupler !== 3
        }
      >
        <NumberField
          label="TX antenna gain"
          hint="0 dBi for a standard bodypack antenna."
          unit="dBi"
          value={inp.txGain}
          onChange={(x) => set('txGain', x)}
        />
        <NumberField
          label="TX cable loss"
          hint="Usually 0 for a bodypack."
          unit="dB"
          value={inp.txCable}
          onChange={(x) => set('txCable', x)}
        />
        <NumberField
          label="RX cable loss"
          hint="Loss in the coax to the receiver (check the cable’s dB per 100 m)."
          unit="dB"
          value={inp.rxCable}
          onChange={(x) => set('rxCable', x)}
        />
        <NumberField
          label="Multicoupler loss"
          hint="Loss in antenna distribution (0 if none)."
          unit="dB"
          value={inp.multicoupler}
          onChange={(x) => set('multicoupler', x)}
        />
      </Optional>
      {r.ok ? (
        <Outputs>
          <Output
            label="Spare signal (link margin)"
            help="How far the signal can fade before dropouts. Aim for 20 dB or more."
            value={fmtDb(r.value.marginDb)}
            unit="dB"
            wide
          />
          <Rating label="Link quality" value={r.value.status} tone={RATING_TONES[r.value.status]} />
          <Verdict>{LINK_ADVICE[r.value.status]}</Verdict>
          <Output
            label="Signal at the receiver"
            value={fmtDb(r.value.receivedDbm)}
            unit="dBm"
            secondary
            help="Compare with the receiver’s sensitivity."
          />
          <Output
            label="Lost over the air"
            value={fmtDb(r.value.pathLossDb)}
            unit="dB"
            secondary
            help="Free-space loss: best case with clear line of sight."
          />
        </Outputs>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}

export function FrequencyCoordinationCard() {
  const id = 'rf-wireless.coordination'
  const [inp, set] = useCalcInputs(id, { frequencies: [518.2, 520.6, 523.0] as (number | null)[] })
  const freqs = inp.frequencies
  const r = thirdOrderIntermod(freqs)
  const conflicts = r.ok ? r.value.filter((p) => p.conflict).length : 0
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Frequency Coordination',
          inputs:
            freqs
              .filter((f) => f !== null)
              .map((f) => fmtMHz(f as number))
              .join(', ') + ' MHz',
          output:
            conflicts === 0
              ? 'No IM3 conflicts'
              : `${conflicts} IM3 conflict${conflicts > 1 ? 's' : ''}`,
        }
      : null,
  )
  const update = (index: number, value: number | null) =>
    set(
      'frequencies',
      freqs.map((f, i) => (i === index ? value : f)),
    )
  return (
    <CalcCard
      title="Frequency Coordination (IM3)"
      info={{
        what: 'Checks every pair of wireless frequencies for third-order intermodulation products landing on another channel.',
        when: 'A first pass before a full coordination tool: catches the IM3 hits that cause most dropouts.',
        formula: `IM3 = 2f₁ − f₂ and 2f₂ − f₁ for every pair\nconflict if within ±${IM3_WINDOW_MHZ * 1000} kHz of any channel`,
      }}
    >
      <InputGroup>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {freqs.map((f, i) => (
            <div key={i} className="flex items-end gap-1">
              <div className="flex-1">
                <NumberField
                  label={`Channel ${i + 1}`}
                  unit="MHz"
                  value={f}
                  onChange={(x) => update(i, x)}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove channel ${i + 1}`}
                onClick={() =>
                  set(
                    'frequencies',
                    freqs.filter((_, j) => j !== i),
                  )
                }
                className="inline-flex h-12 w-11 items-center justify-center rounded-md text-fg-muted hover:bg-input hover:text-bad"
              >
                <Icon.Trash size={18} />
              </button>
            </div>
          ))}
        </div>
        <div>
          <Button
            variant="ghost"
            disabled={freqs.length >= MAX_COORDINATED_FREQUENCIES}
            onClick={() => set('frequencies', [...freqs, null])}
          >
            <Icon.Plus size={16} /> Add frequency ({freqs.length}/{MAX_COORDINATED_FREQUENCIES})
          </Button>
        </div>
      </InputGroup>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Rating
              label="Result"
              value={
                conflicts === 0
                  ? 'No IM3 conflicts'
                  : `${conflicts} conflict${conflicts > 1 ? 's' : ''}`
              }
              tone={conflicts === 0 ? 'good' : 'bad'}
            />
            <Verdict>
              {conflicts === 0
                ? 'No channel sits on another pair’s third-order intermod product. Still run a full coordination tool for large systems.'
                : `Move the channel${conflicts > 1 ? 's' : ''} marked “Yes” below: intermod from two other transmitters lands within 200 kHz of ${conflicts > 1 ? 'them' : 'it'} and can cause noise or dropouts.`}
            </Verdict>
            <div className="col-span-2 overflow-x-auto rounded-xl border border-divider">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Third-order intermodulation products</caption>
                <thead className="bg-input text-fg-2">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Pair (MHz)
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      IM3 (MHz)
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Conflict
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Hits
                    </th>
                  </tr>
                </thead>
                <tbody className="font-num tabular-nums">
                  {r.value.map((p, i) => (
                    <tr key={i} className={`border-t border-divider ${p.conflict ? 'bg-out' : ''}`}>
                      <td className="px-3 py-1.5 text-fg-2">
                        {fmtMHz(p.pair[0])} / {fmtMHz(p.pair[1])}
                      </td>
                      <td className="px-3 py-1.5 text-out-fg">{fmtMHz(p.product)}</td>
                      <td
                        className={`px-3 py-1.5 ${p.conflict ? 'font-semibold text-bad' : 'text-good'}`}
                      >
                        {p.conflict ? 'Yes' : 'No'}
                      </td>
                      <td className="px-3 py-1.5 text-fg-2">
                        {p.conflictsWith === null ? '—' : fmtMHz(p.conflictsWith)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
