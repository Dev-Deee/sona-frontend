import { formatNumber } from '../../../calculators/format'
import {
  HOIST_CAPACITIES_KG,
  inputListToCsv,
  moveItem,
  riggingLoad,
  type InputChannel,
  type SafetyFactor,
} from '../../../calculators/showTools'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import type { InputValue } from '../../../store/inputsStore'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/icons'
import { CalcCard, Inputs, Outputs } from '../CalcCard'
import { NumberField, Segmented, SelectField, TextField } from '../fields'
import { CalcError, Output, Rating, Verdict, Warnings } from '../outputs'
import { downloadCsv } from './download'
import { useQ, v } from './shared'

const newChannel = (): InputChannel => ({
  id: crypto.randomUUID(),
  channel: 0,
  source: '',
  type: 'mic',
  micType: '',
  stand: '',
  phantom: false,
  notes: '',
})

export function InputListCard() {
  const id = 'show-tools.inputList'
  const [inp, set] = useCalcInputs(id, {
    rows: [
      { ...newChannel(), id: 'kick', source: 'Kick In', micType: 'Beta 91A', stand: 'None' },
      { ...newChannel(), id: 'snare', source: 'Snare Top', micType: 'SM57', stand: 'Short boom' },
      { ...newChannel(), id: 'vox', source: 'Lead Vox', micType: 'Beta 58A', stand: 'Tall boom' },
    ] as unknown as InputValue,
  })
  const rows = inp.rows as unknown as InputChannel[]
  const setRows = (next: InputChannel[]) => set('rows', next as unknown as InputValue)
  const update = (index: number, patch: Partial<InputChannel>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  usePublishResult(
    id,
    rows.length
      ? {
          title: 'Input List',
          inputs: `${rows.length} channels`,
          output: rows.map((r) => r.source || '?').join(', '),
        }
      : null,
  )

  return (
    <CalcCard
      layout="stacked"
      title="Input List Generator"
      info={{
        what: 'Builds a channel-by-channel input list you can export as CSV for the advance or the patch.',
        when: 'Advancing a show, or handing a stage patch to the monitor and stage teams.',
        formula: 'CSV columns: Channel, Source, Mic/Line, Mic type, Stand, 48V, Notes',
      }}
    >
      <ol className="flex flex-col gap-3" aria-label="Input channels">
        {rows.map((row, i) => (
          <li key={row.id} className="rounded-xl border border-divider bg-input/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-num text-sm text-out-fg">Ch {i + 1}</span>
              <div className="flex">
                <button
                  type="button"
                  aria-label={`Move channel ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => setRows(moveItem(rows, i, i - 1))}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-2 hover:bg-input disabled:opacity-30"
                >
                  <Icon.Up size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`Move channel ${i + 1} down`}
                  disabled={i === rows.length - 1}
                  onClick={() => setRows(moveItem(rows, i, i + 1))}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-2 hover:bg-input disabled:opacity-30"
                >
                  <Icon.Down size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`Remove channel ${i + 1}`}
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:bg-input hover:text-bad"
                >
                  <Icon.Trash size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Source"
                value={row.source}
                onChange={(x) => update(i, { source: x })}
                placeholder="e.g. Kick In"
              />
              <Segmented
                label="Mic / Line"
                value={row.type}
                onChange={(t) => update(i, { type: t })}
                options={[
                  { value: 'mic', label: 'Mic' },
                  { value: 'line', label: 'Line' },
                ]}
              />
              <TextField
                label="Mic type"
                value={row.micType}
                onChange={(x) => update(i, { micType: x })}
              />
              <TextField
                label="Stand"
                value={row.stand}
                onChange={(x) => update(i, { stand: x })}
              />
              <Segmented
                label="Phantom (48V)"
                value={row.phantom ? 'yes' : 'no'}
                onChange={(p) => update(i, { phantom: p === 'yes' })}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
              />
              <TextField
                label="Notes"
                value={row.notes}
                onChange={(x) => update(i, { notes: x })}
              />
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setRows([...rows, newChannel()])}>
          <Icon.Plus size={16} /> Add channel
        </Button>
        <Button
          disabled={rows.length === 0}
          onClick={() => downloadCsv('sona-input-list.csv', inputListToCsv(rows))}
        >
          <Icon.Download size={16} /> Export CSV
        </Button>
      </div>
    </CalcCard>
  )
}

export function RiggingLoadCard() {
  const id = 'show-tools.rigging'
  const [inp, set] = useCalcInputs(id, {
    weight: 900 as number | null,
    points: 2 as number | null,
    angle: 15 as number | null,
    factor: 10 as number,
    hoist: 1000 as number,
  })
  const q = useQ()
  const { show, label } = useUnits()
  const r = riggingLoad({
    weightKg: inp.weight,
    points: inp.points,
    bridleAngleDeg: inp.angle,
    safetyFactor: inp.factor as SafetyFactor,
    hoistCapacityKg: inp.hoist,
  })
  const w = (kg: number) => formatNumber(show('weight', kg), 1)
  usePublishResult(
    id,
    r.ok
      ? {
          title: 'Rigging Load',
          inputs: `${q('weight', inp.weight, 0)} on ${v(inp.points)} points @ ${v(inp.angle, '°')}`,
          output: `${w(r.value.loadPerPoint)} ${label('weight')} per point`,
        }
      : null,
  )
  return (
    <CalcCard
      title="Rigging Load"
      info={{
        what: 'Static load on each rigging point, including bridle-angle tension, and the strength hardware needs at your safety factor.',
        when: 'A sanity check while planning a hang. This is not a substitute for a qualified rigger’s calculation.',
        formula:
          'load/point = (W / n) / cos(bridle angle)\nrequired strength = load × safety factor',
      }}
    >
      <Inputs>
        <NumberField
          label="Array weight"
          hint="Total weight of the boxes, frame and cabling."
          kind="weight"
          value={inp.weight}
          onChange={(x) => set('weight', x)}
        />
        <NumberField
          label="Rigging points"
          hint="Number of motors or hang points sharing the load."
          value={inp.points}
          onChange={(x) => set('points', x)}
          step={1}
        />
        <NumberField
          label="Bridle angle (from vertical)"
          hint="0 if each point hangs straight down."
          unit="°"
          value={inp.angle}
          onChange={(x) => set('angle', x)}
        />
        <Segmented
          label="Safety factor"
          hint="Hardware must hold this many times the working load."
          value={String(inp.factor) as '10' | '7'}
          onChange={(x) => set('factor', Number(x))}
          options={[
            { value: '10', label: '10:1 (default)' },
            { value: '7', label: '7:1 (dynamic)' },
          ]}
        />
        <SelectField
          label="Hoist capacity (WLL)"
          hint="Working load limit of each motor."
          value={inp.hoist}
          onChange={(x) => set('hoist', x)}
          options={HOIST_CAPACITIES_KG.map((kg) => ({
            value: kg,
            label: `${kg} kg (${formatNumber(kg * 2.20462, 0)} lb)`,
          }))}
        />
      </Inputs>
      {r.ok ? (
        <>
          <Warnings warnings={r.warnings} />
          <Outputs>
            <Output
              label="Load per point"
              help="What each motor or point actually carries."
              value={w(r.value.loadPerPoint)}
              unit={label('weight')}
            />
            <Output
              label="Hardware must be rated for"
              value={w(r.value.requiredStrength)}
              unit={label('weight')}
              help={`Load per point × ${inp.factor} (safety factor ${inp.factor}:1) — minimum breaking strength.`}
            />
            <Rating
              label={`vs ${inp.hoist} kg hoist`}
              value={r.value.exceedsHoist ? 'Exceeds hoist rating' : 'Within hoist rating'}
              tone={r.value.exceedsHoist ? 'bad' : 'good'}
            />
            <Verdict>
              {r.value.exceedsHoist
                ? `Each point carries ${w(r.value.loadPerPoint)} ${label('weight')}, more than the ${inp.hoist} kg hoist is rated for. Add points, use bigger hoists, or reduce the bridle angle.`
                : `Each point carries ${w(r.value.loadPerPoint)} ${label('weight')}, within the ${inp.hoist} kg hoist rating. Have a qualified rigger check the plan before you hang.`}
            </Verdict>
          </Outputs>
        </>
      ) : (
        <CalcError message={r.error} />
      )}
    </CalcCard>
  )
}
