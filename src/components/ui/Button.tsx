import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-125 border border-transparent',
  ghost: 'bg-transparent text-fg-2 hover:text-fg hover:bg-input border border-line',
  danger: 'bg-transparent text-bad hover:bg-input border border-line',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`press inline-flex h-11 min-w-11 items-center justify-center rounded-full px-2 hover:bg-input ${
        active ? 'bg-accent text-accent-fg' : 'text-fg-2 hover:text-fg'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
