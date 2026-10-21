import { useState } from 'react'
import type { InputChannel } from '../../../calculators/showTools'
import {
  CHANNEL_COLORS,
  channelCount,
  type ChannelColor,
  colorHex,
  MAX_ROWS,
  newRow,
  normaliseSheet,
  type PatchRow,
  type PatchSheet,
  rowLabel,
  rowNumbers,
  type SectionDef,
  type SectionId,
  SECTIONS,
  sectionTable,
  sheetTables,
  sheetToText,
  tableToCsv,
  TEMPLATES,
  textOn,
} from '../../../calculators/patchSheet'
import { moveItem } from '../../../calculators/showTools'
import { usePublishResult, useCalcInputs } from '../../../hooks/useCalcInputs'
import type { InputValue } from '../../../store/inputsStore'
import { toast } from '../../../store/toastStore'
import { exportPdf, exportXlsx, fileStem } from '../../../features/listExport'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/icons'
import { CalcCard } from '../CalcCard'
import { NumberField, Segmented, SelectField, TextField } from '../fields'
import { downloadCsv } from './download'

const DEFAULT_TEMPLATE = 'band'
const fresh = () =>
  (TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE) as (typeof TEMPLATES)[number]).make()

/** Lists saved before the patch sheet were a flat array of input channels. */
function fromLegacy(rows: unknown): PatchSheet | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const sheet = TEMPLATES[0].make()
  sheet.sections.inputs = (rows as InputChannel[]).map((r) =>
    newRow({
      name: r.source ?? '',
      type: r.type,
      micType: r.micType,
      stand: r.stand,
      phantom: r.phantom,
      notes: r.notes,
    }),
  )
  return sheet
}

const iconBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-2 hover:bg-input disabled:opacity-30'

function RowEditor({
  def,
  row,
  number,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  def: SectionDef
  row: PatchRow
  number: number
  index: number
  count: number
  onChange: (patch: Partial<PatchRow>) => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const hex = colorHex(row.color)
  const label = `${def.prefix} ${rowLabel(number, row.stereo)}`
  const hasDetails = def.details.some((f) => row[f.key]) || (def.id === 'inputs' && row.phantom)
  return (
    <li
      className="rounded-xl border border-divider bg-input/40 p-3 sm:p-4"
      style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="font-num rounded-md px-2 py-0.5 text-sm font-semibold"
          style={hex ? { background: hex, color: textOn(hex) } : undefined}
        >
          {label}
        </span>
        <div className="flex">
          <button
            type="button"
            aria-label={`Move ${label} up`}
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            className={iconBtn}
          >
            <Icon.Up size={18} />
          </button>
          <button
            type="button"
            aria-label={`Move ${label} down`}
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
            className={iconBtn}
          >
            <Icon.Down size={18} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={onRemove}
            className={`${iconBtn} text-fg-muted hover:text-bad`}
          >
            <Icon.Trash size={18} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Name"
          value={row.name}
          onChange={(name) => onChange({ name })}
          placeholder={def.id === 'inputs' ? 'e.g. Kick In' : 'Spare'}
        />
        {def.inline.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            value={row[f.key] ?? ''}
            onChange={(x) => onChange({ [f.key]: x })}
            placeholder={f.placeholder}
          />
        ))}
        {def.id === 'inputs' && (
          <Segmented
            label="Mic / Line"
            value={row.type ?? 'mic'}
            onChange={(type) => onChange({ type })}
            options={[
              { value: 'mic', label: 'Mic' },
              { value: 'line', label: 'Line' },
            ]}
          />
        )}
        {def.stereo && (
          <Segmented
            label="Channels"
            value={row.stereo ? 'stereo' : 'mono'}
            onChange={(x) => onChange({ stereo: x === 'stereo' })}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'stereo', label: 'Stereo (L/R)' },
            ]}
          />
        )}
        <SelectField
          label="Colour"
          value={(row.color ?? '') as ChannelColor}
          onChange={(color) => onChange({ color: color || undefined })}
          options={CHANNEL_COLORS.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>
      <details className="group mt-2" open={hasDetails || undefined}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          Details
        </summary>
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
          {def.details.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              value={row[f.key] ?? ''}
              onChange={(x) => onChange({ [f.key]: x })}
              placeholder={f.placeholder}
            />
          ))}
          {def.id === 'inputs' && (
            <Segmented
              label="Phantom (48V)"
              value={row.phantom ? 'yes' : 'no'}
              onChange={(p) => onChange({ phantom: p === 'yes' })}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' },
              ]}
            />
          )}
        </div>
      </details>
    </li>
  )
}

export function PatchSheetCard() {
  const id = 'show-tools.inputList'
  const [inp, set] = useCalcInputs(id, {
    sheet: null as InputValue,
    section: 'inputs' as SectionId,
    addCount: 1 as number | null,
    addStereo: 'mono' as 'mono' | 'stereo',
    template: 'worship',
  })
  // Built once so unsaved default rows keep stable ids (and focus) until the first edit saves them.
  const [fallback] = useState(() => fromLegacy((inp as Record<string, unknown>).rows) ?? fresh())
  const sheet = normaliseSheet(inp.sheet, fallback)
  const save = (next: PatchSheet) => set('sheet', next as unknown as InputValue)
  const sectionId = SECTIONS.some((s) => s.id === inp.section) ? inp.section : 'inputs'
  const def = SECTIONS.find((s) => s.id === sectionId) as SectionDef
  const rows = sheet.sections[sectionId]
  const numbers = rowNumbers(rows)
  const setRows = (next: PatchRow[]) =>
    save({ ...sheet, sections: { ...sheet.sections, [sectionId]: next } })
  const [confirmTemplate, setConfirmTemplate] = useState(false)

  const counts = SECTIONS.map((s) => ({ def: s, n: channelCount(sheet.sections[s.id]) }))
  const tables = sheetTables(sheet)
  const stem = fileStem(sheet.title)

  usePublishResult(
    id,
    tables.length
      ? {
          title: 'Patch sheet',
          inputs: sheet.title || 'Untitled show',
          output: counts
            .filter((c) => c.n)
            .map((c) => `${c.n} ${c.def.title.toLowerCase()}`)
            .join(', '),
        }
      : null,
  )

  const addRows = () => {
    const room = MAX_ROWS - rows.length
    const n = Math.min(Math.max(Math.round(inp.addCount ?? 1), 1), room)
    if (n <= 0) return toast(`A section holds at most ${MAX_ROWS} rows`, 'error')
    const stereo = def.stereo && inp.addStereo === 'stereo'
    setRows([...rows, ...Array.from({ length: n }, () => newRow({ stereo: stereo || undefined }))])
  }

  const loadTemplate = (templateId: string) => {
    const t = TEMPLATES.find((x) => x.id === templateId)
    if (!t) return
    save({ ...t.make(), title: sheet.title })
    setConfirmTemplate(false)
    toast(`${t.label} loaded`, 'success')
  }
  const isEmpty = SECTIONS.every((s) => !sheet.sections[s.id].some((r) => r.name.trim()))

  const run = async (label: string, job: () => Promise<void>) => {
    try {
      await job()
    } catch {
      toast(`${label} failed — please try again`, 'error')
    }
  }
  const copyText = () =>
    run('Copy', async () => {
      await navigator.clipboard.writeText(sheetToText(sheet))
      toast('Patch sheet copied — paste it into WhatsApp, email or notes', 'success')
    })
  const share = () =>
    run('Share', async () => {
      await navigator.share({ title: sheet.title || 'Patch sheet', text: sheetToText(sheet) })
    })
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <CalcCard
      layout="stacked"
      title="Patch Sheet"
      info={{
        what: 'Builds the show patch: inputs, DCAs, mix buses, outputs and personal-monitor channels, numbered the way the console sees them.',
        when: 'Advancing a show, labelling the desk, or sending the patch to the band, monitor and stage teams.',
        formula:
          'Stereo rows take two consecutive numbers (L then R).\nInput total counts every channel, stereo as two.\nExports: text (WhatsApp/email), Excel (.xlsx, one sheet per section), PDF, CSV.',
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Show or event"
          value={sheet.title}
          onChange={(title) => save({ ...sheet, title })}
          placeholder="e.g. Sunday service"
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <SelectField
                label="Start from a template"
                value={inp.template}
                onChange={(t) => {
                  set('template', t)
                  setConfirmTemplate(false)
                }}
                options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => (isEmpty ? loadTemplate(inp.template) : setConfirmTemplate(true))}
            >
              Load
            </Button>
          </div>
          {confirmTemplate && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-warn/50 px-3 py-2 text-[13px] text-fg"
            >
              This replaces the whole sheet.
              <Button variant="danger" onClick={() => loadTemplate(inp.template)}>
                Replace
              </Button>
              <Button variant="ghost" onClick={() => setConfirmTemplate(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Patch sections"
        className="fade-edges -mx-1 flex gap-1 overflow-x-auto px-1"
      >
        {counts.map(({ def: s, n }) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === sectionId}
            onClick={() => set('section', s.id)}
            className={`press min-h-10 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
              s.id === sectionId
                ? 'border-transparent bg-accent text-accent-fg'
                : 'border-line text-fg-2 hover:border-fg-muted hover:text-fg'
            }`}
          >
            {s.id === 'personal' ? sheet.personalLabel || s.title : s.title}
            <span className="font-num ml-1.5 opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={def.title} className="flex flex-col gap-3">
        {sectionId === 'personal' && (
          <TextField
            label="Personal mixer name"
            value={sheet.personalLabel}
            onChange={(personalLabel) => save({ ...sheet, personalLabel })}
            placeholder="e.g. P16, IEM mixer"
          />
        )}
        {sectionId === 'inputs' && rows.length > 0 && (
          <p className="text-[13px] text-fg-2">
            Total: <span className="font-num font-semibold text-fg">{channelCount(rows)}</span>{' '}
            inputs
          </p>
        )}
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center font-serif text-[15px] text-fg-2">
            No {def.title.toLowerCase()} yet. Add some below.
          </p>
        ) : (
          <ol className="flex flex-col gap-3" aria-label={def.title}>
            {rows.map((row, i) => (
              <RowEditor
                key={row.id}
                def={def}
                row={row}
                number={numbers[i]}
                index={i}
                count={rows.length}
                onChange={(patch) =>
                  setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
                }
                onMove={(to) => setRows(moveItem(rows, i, to))}
                onRemove={() => setRows(rows.filter((_, j) => j !== i))}
              />
            ))}
          </ol>
        )}

        <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-dashed border-line p-3 sm:grid-cols-[minmax(0,8rem)_minmax(0,16rem)_auto]">
          <NumberField
            label={`How many ${def.noun}s`}
            value={inp.addCount}
            onChange={(x) => set('addCount', x)}
            min={1}
            max={MAX_ROWS}
          />
          {def.stereo ? (
            <Segmented
              label="As"
              value={inp.addStereo}
              onChange={(x) => set('addStereo', x)}
              options={[
                { value: 'mono', label: 'Mono' },
                { value: 'stereo', label: 'Stereo pairs' },
              ]}
            />
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={addRows} disabled={rows.length >= MAX_ROWS}>
            <Icon.Plus size={16} /> Add
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-2 border-t border-divider pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">
          Export the whole sheet
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!tables.length} onClick={copyText}>
            <Icon.Clipboard size={16} /> Copy as text
          </Button>
          {canShare && (
            <Button variant="ghost" disabled={!tables.length} onClick={share}>
              <Icon.Share size={16} /> Share
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={!tables.length}
            onClick={() => run('Excel export', () => exportXlsx(tables, sheet.title))}
          >
            <Icon.Download size={16} /> Excel (.xlsx)
          </Button>
          <Button
            variant="ghost"
            disabled={!tables.length}
            onClick={() => run('PDF export', () => exportPdf(tables, sheet.title))}
          >
            <Icon.Download size={16} /> PDF
          </Button>
          <Button
            variant="ghost"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(`${stem}-${sectionId}.csv`, tableToCsv(sectionTable(sheet, sectionId)))
            }
          >
            <Icon.Download size={16} /> CSV ({def.title.toLowerCase()})
          </Button>
        </div>
      </div>
    </CalcCard>
  )
}
