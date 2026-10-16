import { Button } from '../../ui/Button'
import { Icon } from '../../ui/icons'
import { NumberField } from '../fields'

/** Editable list of numbers (amp draws, speaker taps, impedances). */
export function NumberListEditor({
  itemLabel,
  unit,
  values,
  onChange,
  max = 32,
}: {
  itemLabel: string
  unit: string
  values: (number | null)[]
  onChange: (values: (number | null)[]) => void
  max?: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {values.map((value, i) => (
          <div key={i} className="flex items-end gap-1">
            <div className="flex-1">
              <NumberField
                label={`${itemLabel} ${i + 1}`}
                unit={unit}
                value={value}
                onChange={(x) => onChange(values.map((v, j) => (j === i ? x : v)))}
              />
            </div>
            <button
              type="button"
              aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
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
          disabled={values.length >= max}
          onClick={() => onChange([...values, values.at(-1) ?? null])}
        >
          <Icon.Plus size={16} /> Add {itemLabel.toLowerCase()}
        </Button>
      </div>
    </div>
  )
}
