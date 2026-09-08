import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-navy-900 text-white hover:bg-navy-800',
        secondary: 'border bg-white text-slate-700 hover:bg-slate-50',
        ghost: 'text-slate-700 hover:bg-slate-100',
        danger: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: { sm: 'h-8 px-2.5 text-xs', md: 'h-9 px-3', lg: 'h-10 px-4' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
