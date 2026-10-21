import { formatNumber } from '../../../calculators/format'
import { HOIST_CAPACITIES_KG, riggingLoad, type SafetyFactor } from '../../../calculators/showTools'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import { useUnits } from '../../../hooks/useUnits'
import { CalcCard, Inputs, Outputs } from '../CalcCard'
import { findSpeaker } from '../../../data/speakers'
import { NumberField, Segmented, SelectField } from '../fields'
import { SpeakerSelect } from '../SpeakerPicker'
import { CalcError, Output, Rating, Verdict, Warnings } from '../outputs'
import { useQ, v } from './shared'

export function RiggingLoadCard() {
  const id = 'show-tools.rigging'
  const [inp, set] = useCalcInputs(id, {
    weight: 900 as number | null,
    points: 2 as number | null,
    angle: 15 as number | null,
    factor: 10 as number,
    hoist: 1000 as number,
    speaker: null as string | null,
    boxes: 12 as number | null,
  })
  const box = findSpeaker(inp.speaker)
  const boxKg = box?.weightKg ?? null
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
        <SpeakerSelect
          label="Pick the box you’re hanging"
          speakerId={inp.speaker}
          initialCategory="line_array"
          onClear={() => set('speaker', null)}
          onSelect={(s) => {
            set('speaker', s.id)
            if (s.weightKg !== null && inp.boxes !== null) set('weight', s.weightKg * inp.boxes)
          }}
        />
        {boxKg !== null && (
          <NumberField
            label="Boxes in the hang"
            hint={`${formatNumber(boxKg, 1)} kg each. Add the frame and cable weight to the total below.`}
            value={inp.boxes}
            onChange={(x) => {
              set('boxes', x)
              if (x !== null) set('weight', boxKg * x)
            }}
          />
        )}
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
