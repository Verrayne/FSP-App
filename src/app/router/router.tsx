import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '../layouts/AdminLayout'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { AdminDashboardPage, AdminPlaceholderPage } from '../../features/admin/AdminPages'
import { AuthPlaceholderPage, LoginPage } from '../../features/auth/AuthPages'
import {
  ForbiddenPage,
  NotFoundPage,
  RouteErrorPage,
  UnauthorizedPage,
} from '../../features/errors/ErrorPages'
import {
  FspDashboardPage,
  FspPlaceholderPage,
  SubmissionListPreview,
} from '../../features/fsp/FspPages'
import { HomePage, PublicInfoPage } from '../../features/public/PublicPages'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <PublicInfoPage page="about" /> },
      { path: '/how-it-works', element: <PublicInfoPage page="how-it-works" /> },
      { path: '/contact', element: <PublicInfoPage page="contact" /> },
      { path: '/privacy', element: <PublicInfoPage page="privacy" /> },
      { path: '/terms', element: <PublicInfoPage page="terms" /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="login" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <AuthPlaceholderPage page="register" /> },
      { path: 'forgot-password', element: <AuthPlaceholderPage page="forgot-password" /> },
      { path: 'reset-password', element: <AuthPlaceholderPage page="reset-password" /> },
      { path: 'verify', element: <AuthPlaceholderPage page="verify" /> },
    ],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <FspDashboardPage /> },
      { path: 'profile', element: <FspPlaceholderPage page="profile" /> },
      { path: 'users', element: <FspPlaceholderPage page="users" /> },
      { path: 'submissions', element: <SubmissionListPreview /> },
      { path: 'submissions/new', element: <FspPlaceholderPage page="new" /> },
      { path: 'submissions/:id', element: <FspPlaceholderPage page="submission" /> },
      { path: 'settings', element: <FspPlaceholderPage page="settings" /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'fsps', element: <AdminPlaceholderPage page="fsps" /> },
      { path: 'submissions', element: <AdminPlaceholderPage page="submissions" /> },
      { path: 'users', element: <AdminPlaceholderPage page="users" /> },
      { path: 'settings', element: <AdminPlaceholderPage page="settings" /> },
    ],
  },
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },
])
