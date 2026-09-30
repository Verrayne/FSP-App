import { Outlet } from 'react-router-dom'

import { Brand } from '../../components/shared/Brand'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_28rem]">
      <section className="bg-navy-950 hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand inverse />
        <div className="max-w-xl">
          <p className="text-brand-300 text-sm font-semibold">
            Built for South African financial services
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Compliance submissions, handled with clarity.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            A secure workspace for FSPs and insurers to manage annual B-BBEE information.
          </p>
        </div>
        <p className="text-xs text-slate-400">Secure by design · Tenant-aware · Audit-ready</p>
      </section>
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
