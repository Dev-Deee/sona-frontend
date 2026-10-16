import { useState } from 'react'
import { errorMessage } from '../api/client'
import { shareApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { useOnline } from '../hooks/useOnline'
import { useAuth } from '../store/authStore'
import type { CalcEntry } from '../tabs/calculators'
import type { TabId } from '../tabs/registry'
import type { Json } from '../types/api'
import { AuthForms } from './AuthForms'
import { captureCalc, captureCalcOutputs, shareUrl } from './snapshot'

export function ShareDrawer({
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
  const loggedIn = useAuth((s) => s.accessToken !== null)
  const online = useOnline()
  const [singleUse, setSingleUse] = useState(false)
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const created = await shareApi.create({
        calculatorTab: tab,
        inputs: { ...captureCalc(calc.calcId as string), slug: calc.slug } as unknown as Json,
        outputs: captureCalcOutputs(calc.calcId as string),
        singleUse,
      })
      setLink({ url: shareUrl(created.token), expiresAt: created.expiresAt })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copy failed — select the link and copy it manually')
    }
  }

  const close = () => {
    setLink(null)
    setError(null)
    onClose()
  }

  return (
    <Drawer open={open} title={`Share ${calc.label}`} onClose={close}>
      {!loggedIn ? (
        <>
          <p className="mb-4 text-sm text-fg-2">Sign in to create a share link.</p>
          <AuthForms />
        </>
      ) : !online ? (
        <p className="text-sm text-fg-2">
          Share links need a connection. Your calculations are safe — try again when you’re back
          online.
        </p>
      ) : link ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">Share link</span>
            <input
              readOnly
              value={link.url}
              onFocus={(e) => e.target.select()}
              className="h-11 rounded-md border border-line bg-input px-3 font-num text-xs text-fg"
            />
          </label>
          <p className="text-xs text-fg-muted">
            Expires {new Date(link.expiresAt).toLocaleString()}.
          </p>
          <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy link'}</Button>
          <Button variant="ghost" onClick={() => setLink(null)}>
            Create another
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-2">
            Creates a link to this calculator’s current inputs and results. Anyone with the link can
            open it for 7 days.
          </p>
          <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
            <input
              type="checkbox"
              checked={singleUse}
              onChange={(e) => setSingleUse(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent-ink)]"
            />
            One-time link (works once)
          </label>
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          <Button disabled={busy} onClick={() => void create()}>
            Create share link
          </Button>
        </div>
      )}
    </Drawer>
  )
}
