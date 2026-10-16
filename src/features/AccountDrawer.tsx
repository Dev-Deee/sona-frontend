import { errorMessage } from '../api/client'
import { authApi, usersApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { useAuth } from '../store/authStore'
import { toast } from '../store/toastStore'
import type { UserRole } from '../types/api'
import { AuthForms } from './AuthForms'
import { ROLE_OPTIONS } from './roles'

export function AccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user)
  const setUser = useAuth((s) => s.setUser)
  const clear = useAuth((s) => s.clear)

  const changeRole = async (role: UserRole) => {
    try {
      setUser(await usersApi.update({ role }))
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      /* already signed out server-side or offline — clear locally regardless */
    }
    clear()
    toast('Signed out')
    onClose()
  }

  return (
    <Drawer open={open} title={user ? 'Account' : 'Sign in'} onClose={onClose}>
      {user ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-fg-2">Signed in as</p>
            <p className="text-sm text-fg">{user.email}</p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">I mostly work as</span>
            <select
              value={user.role}
              onChange={(e) => void changeRole(e.target.value as UserRole)}
              className="h-11 rounded-md border border-line bg-input px-3 text-sm text-fg"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="ghost" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      ) : (
        <AuthForms onDone={onClose} />
      )}
    </Drawer>
  )
}
