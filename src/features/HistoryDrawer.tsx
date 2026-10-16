import { Drawer } from '../components/ui/Drawer'
import { Button } from '../components/ui/Button'
import { useHistory } from '../store/historyStore'

const time = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, clear } = useHistory()
  return (
    <Drawer open={open} title="Calculation history" onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-sm text-fg-2">
          Results appear here a moment after you finish entering values. History is kept for this
          session only (up to 50 entries).
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {entries.map((e) => (
              <li key={e.id} className="rounded-md border border-divider bg-input p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-fg">{e.calculator}</span>
                  <time
                    className="shrink-0 font-num text-[11px] text-fg-muted"
                    dateTime={new Date(e.timestamp).toISOString()}
                  >
                    {time.format(e.timestamp)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-fg-2">{e.inputs}</p>
                <p className="mt-1 font-num text-sm text-out-fg">{e.output}</p>
              </li>
            ))}
          </ol>
          <Button variant="ghost" className="mt-4 w-full" onClick={clear}>
            Clear history
          </Button>
        </>
      )}
    </Drawer>
  )
}
