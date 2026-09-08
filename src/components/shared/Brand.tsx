import { Link } from 'react-router-dom'

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="bg-brand-500 grid size-8 place-items-center rounded-md text-xs font-bold text-white">
        FC
      </span>
      <span className={inverse ? 'text-white' : 'text-navy-900'}>FSP Compliance</span>
    </Link>
  )
}
