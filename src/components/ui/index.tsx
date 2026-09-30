import { cva, type VariantProps } from 'class-variance-authority'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle, Inbox, X } from 'lucide-react'

import { cn } from '../../lib/utils/cn'
import { buttonVariants } from './buttonVariants'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

const controlClass =
  'h-9 w-full rounded-md border bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlClass, className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(controlClass, className)} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(controlClass, 'h-auto min-h-24 py-2', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn('accent-navy-900 size-4 rounded border-slate-300', className)}
      {...props}
    />
  ),
)
Checkbox.displayName = 'Checkbox'

interface RadioOption {
  value: string
  label: string
  description?: string
}
interface RadioGroupProps {
  legend: string
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
  required,
  invalid,
  describedBy,
}: RadioGroupProps) {
  return (
    <fieldset className="space-y-2" aria-invalid={invalid} aria-describedby={describedBy}>
      <legend className="text-sm font-medium text-slate-800">
        {legend}{' '}
        {required && (
          <span className="text-red-700" aria-label="required">
            *
          </span>
        )}
      </legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-2 rounded-md border bg-white p-3 text-sm"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            required={required}
            onChange={() => onChange?.(option.value)}
            className="accent-navy-900 mt-0.5"
          />
          <span>
            <span className="block font-medium">{option.label}</span>
            {option.description && <span className="text-slate-500">{option.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shadow-panel rounded-lg border bg-white', className)} {...props} />
}

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        neutral: 'bg-slate-100 text-slate-700',
        success: 'bg-emerald-100 text-emerald-800',
        warning: 'bg-amber-100 text-amber-900',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export function Alert({
  title,
  children,
  variant = 'info',
}: {
  title: string
  children?: ReactNode
  variant?: 'info' | 'danger'
}) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border p-3 text-sm',
        variant === 'danger'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-blue-200 bg-blue-50 text-blue-900',
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </div>
  )
}

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border-0 bg-white p-0 shadow-xl backdrop:bg-slate-950/40"
    >
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 id={titleId} className="font-semibold">
          {title}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}

export function Dropdown({
  label,
  labelText,
  children,
  placement = 'bottom',
}: {
  label: ReactNode
  labelText: string
  children: ReactNode
  placement?: 'top' | 'bottom'
}) {
  return (
    <details className="group relative">
      <summary
        role="button"
        aria-label={labelText}
        className="cursor-pointer list-none rounded-md [&::-webkit-details-marker]:hidden"
      >
        {label}
      </summary>
      <div
        className={cn(
          'absolute right-0 z-30 min-w-48 rounded-md border bg-white p-1 shadow-lg',
          placement === 'top' ? 'bottom-full mb-2' : 'mt-2',
        )}
      >
        {children}
      </div>
    </details>
  )
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse bg-white text-left text-sm">{children}</table>
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div role="tablist" aria-label="Sections" className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium',
            active === tab.id
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-600 hover:text-slate-900',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span title={label} aria-label={label}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded bg-slate-200 motion-reduce:animate-none', className)}
    />
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed bg-white px-6 py-10 text-center">
      <Inbox className="mx-auto size-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        {eyebrow && (
          <p className="text-brand-700 mb-1 text-xs font-semibold tracking-wide uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </header>
  )
}

export function FormError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-700">
      {children}
    </p>
  )
}
