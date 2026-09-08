import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { AppProviders } from './app/providers/AppProviders'
import { router } from './app/router/router'
import './styles.css'

const root = document.getElementById('root')

if (!root) throw new Error('Application root element was not found.')

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
