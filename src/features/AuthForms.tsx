import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorMessage } from '../api/client'
import { authApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { useAuth } from '../store/authStore'
import { toast } from '../store/toastStore'
import { ROLE_OPTIONS } from './roles'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

const registerSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(72, 'At most 72 characters'),
  role: z.enum(['TOURING', 'INSTALLED', 'HOUSE_OF_WORSHIP', 'STUDENT', 'OTHER']),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

const fieldClass =
  'h-11 w-full rounded-md border border-line bg-input px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent'

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-xs text-bad">{message}</span> : null
}

export function AuthForms({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [serverError, setServerError] = useState<string | null>(null)
  const setSession = useAuth((s) => s.setSession)

  const login = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const register = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'TOURING' },
  })

  const onLogin = login.handleSubmit(async (values) => {
    setServerError(null)
    try {
      setSession(await authApi.login(values))
      toast('Signed in', 'success')
      onDone?.()
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })

  const onRegister = register.handleSubmit(async (values) => {
    setServerError(null)
    try {
      setSession(await authApi.register(values))
      toast('Account created', 'success')
      onDone?.()
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex rounded-md border border-line bg-input p-0.5">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setServerError(null)
            }}
            className={`min-h-10 flex-1 rounded text-sm ${mode === m ? 'bg-accent text-accent-fg' : 'text-fg-2'}`}
          >
            {m === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <p className="text-xs text-fg-2">
        An account syncs presets across devices and lets you share calculations. Every calculator
        works without one.
      </p>
      {mode === 'login' ? (
        <form onSubmit={onLogin} className="flex flex-col gap-3" noValidate>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">Email</span>
            <input
              type="email"
              autoComplete="email"
              className={fieldClass}
              {...login.register('email')}
            />
            <FieldError message={login.formState.errors.email?.message} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className={fieldClass}
              {...login.register('password')}
            />
            <FieldError message={login.formState.errors.password?.message} />
          </label>
          {serverError && (
            <p role="alert" className="text-sm text-bad">
              {serverError}
            </p>
          )}
          <Button type="submit" disabled={login.formState.isSubmitting}>
            Sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={onRegister} className="flex flex-col gap-3" noValidate>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">Email</span>
            <input
              type="email"
              autoComplete="email"
              className={fieldClass}
              {...register.register('email')}
            />
            <FieldError message={register.formState.errors.email?.message} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={fieldClass}
              {...register.register('password')}
            />
            <FieldError message={register.formState.errors.password?.message} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-2">I mostly work as</span>
            <select className={fieldClass} {...register.register('role')}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {serverError && (
            <p role="alert" className="text-sm text-bad">
              {serverError}
            </p>
          )}
          <Button type="submit" disabled={register.formState.isSubmitting}>
            Create account
          </Button>
        </form>
      )}
    </div>
  )
}
