import type { Mounting } from '../../../calculators/coverage'
import { NumberField, Segmented } from '../fields'

/** Flown / ground-stacked switch plus the height fields that go with it. */
export function MountingFields({
  what,
  mounting,
  centre,
  stage,
  stack,
  onMounting,
  onCentre,
  onStage,
  onStack,
}: {
  /** e.g. "Main speaker". */
  what: string
  mounting: Mounting
  centre: number | null
  stage: number | null
  stack: number | null
  onMounting: (m: Mounting) => void
  onCentre: (x: number | null) => void
  onStage: (x: number | null) => void
  onStack: (x: number | null) => void
}) {
  return (
    <>
      <Segmented
        label={`${what} mounting`}
        value={mounting}
        onChange={onMounting}
        options={[
          { value: 'flown', label: 'Flown' },
          { value: 'ground', label: 'Ground-stacked' },
        ]}
        hint={
          mounting === 'flown'
            ? 'Hung from rigging or a tower.'
            : 'Stacked on the stage, a riser or the floor.'
        }
      />
      {mounting === 'flown' ? (
        <NumberField
          label={`${what} height`}
          kind="distance"
          value={centre}
          onChange={onCentre}
          hint="Above the floor, to the centre of the array or box."
        />
      ) : (
        <>
          <NumberField
            label="Stage or riser height"
            kind="distance"
            value={stage}
            onChange={onStage}
            hint="What the stack stands on — 0 if it is on the floor."
          />
          <NumberField
            label="Stack height"
            kind="distance"
            value={stack}
            onChange={onStack}
            hint="Bottom to top of the stacked boxes. Sona uses the middle of the stack."
          />
        </>
      )}
    </>
  )
}
