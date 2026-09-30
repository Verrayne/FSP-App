import { Outlet } from 'react-router-dom'

import { PublicFooter } from '../../features/public/components/PublicFooter'
import { PublicHeader } from '../../features/public/components/PublicHeader'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main id="main-content">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
