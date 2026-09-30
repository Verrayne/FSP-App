import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'

import { Input } from '../../../components/ui'

export function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </header>
  )
}

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ id, ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <Input
          id={id}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

export function AuthLoading({ label = 'Checking your session…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-sm text-slate-600">
      <span className="border-brand-700 size-4 animate-spin rounded-full border-2 border-t-transparent" />
      {label}
    </div>
  )
}
