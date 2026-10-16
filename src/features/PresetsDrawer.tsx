import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { Icon } from '../components/ui/icons'
import { errorMessage } from '../api/client'
import { presetsApi } from '../api/endpoints'
import { useAuth } from '../store/authStore'
import { useLocalPresets } from '../store/presetsStore'
import { toast } from '../store/toastStore'
import type { CalcEntry } from '../tabs/calculators'
import type { TabId } from '../tabs/registry'
import type { Json } from '../types/api'
import { applySnapshot, captureCalc, snapshotCalcId } from './snapshot'

interface PresetRow {
  uuid: string
  name: string
  inputs: unknown
  createdAt: string
}

/**
 * Save/load the inputs of the calculator currently on screen. Stored in localStorage when logged
 * out, and on the server (POST /api/presets) when logged in. Each preset records its page and
 * calculator id, so it only ever restores that calculator.
 */
export function PresetsDrawer({
  open,
  onClose,
  tab,
  calc,
}: {
  open: boolean
  onClose: () => void
  tab: TabId
  calc: CalcEntry
}) {
  const calcId = calc.calcId as string
  const loggedIn = useAuth((s) => s.accessToken !== null)
  const local = useLocalPresets()
  // Server presets for this page, tagged with the page they were fetched for.
  const [remote, setRemote] = useState<{ tab: TabId; rows: PresetRow[] } | null>(null)
  const [name, setName] = useState('')

  const refresh = async () => {
    try {
      setRemote({ tab, rows: await presetsApi.list(tab) })
    } catch (e) {
      setRemote({ tab, rows: [] })
      toast(errorMessage(e), 'error')
    }
  }

  useEffect(() => {
    if (!open || !loggedIn) return
    let cancelled = false
    presetsApi
      .list(tab)
      .then((rows) => !cancelled && setRemote({ tab, rows }))
      .catch((e: unknown) => {
        if (cancelled) return
        setRemote({ tab, rows: [] })
        toast(errorMessage(e), 'error')
      })
    return () => {
      cancelled = true
    }
  }, [open, loggedIn, tab])

  const loading = loggedIn && remote?.tab !== tab
  const rows: PresetRow[] = loggedIn
    ? (remote?.tab === tab ? remote.rows : []).filter((r) => snapshotCalcId(r.inputs) === calcId)
    : local.presets.filter((p) => p.calcId === calcId)

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const snapshot = captureCalc(calcId)
    try {
      if (loggedIn) {
        await presetsApi.create({
          name: trimmed,
          calculatorTab: tab,
          inputs: snapshot as unknown as Json,
        })
        await refresh()
      } else {
        local.add({ name: trimmed, calculatorTab: tab, calcId, inputs: snapshot })
      }
      setName('')
      toast(`Saved preset “${trimmed}”`, 'success')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const load = (row: PresetRow) => {
    if (applySnapshot(row.inputs) !== null) {
      toast(`Loaded “${row.name}”`, 'success')
      onClose()
    } else {
      toast('That preset could not be read', 'error')
    }
  }

  const remove = async (row: PresetRow) => {
    try {
      if (loggedIn) {
        await presetsApi.remove(row.uuid)
        await refresh()
      } else {
        local.remove(row.uuid)
      }
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <Drawer open={open} title={`${calc.label} presets`} onClose={onClose}>
      <p className="mb-3 text-[13px] text-fg-2">
        Save this calculator’s current inputs and bring them back later.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="sr-only" htmlFor="preset-name">
          Preset name
        </label>
        <input
          id="preset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Arena — winter"
          maxLength={255}
          className="h-11 min-w-0 flex-1 rounded-md border border-line bg-input px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" disabled={!name.trim()}>
          Save
        </Button>
      </form>
      <p className="mt-2 text-[11px] text-fg-muted">
        {loggedIn
          ? 'Synced to your Sona account.'
          : 'Saved on this device. Sign in to sync presets across devices.'}
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {loading && <li className="text-sm text-fg-2">Loading…</li>}
        {!loading && rows.length === 0 && (
          <li className="text-sm text-fg-2">No presets for this calculator yet.</li>
        )}
        {rows.map((row) => (
          <li
            key={row.uuid}
            className="flex items-center gap-2 rounded-md border border-divider bg-input p-1 pl-3"
          >
            <button type="button" onClick={() => load(row)} className="min-h-11 flex-1 text-left">
              <span className="block text-sm text-fg">{row.name}</span>
              <span className="block text-[11px] text-fg-muted">
                {new Date(row.createdAt).toLocaleString()}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Delete preset ${row.name}`}
              onClick={() => void remove(row)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-bad"
            >
              <Icon.Trash size={18} />
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  )
}
