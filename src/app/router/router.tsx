import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../layouts/AppLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { PlatformLayout } from '../layouts/PlatformLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { GuestOnly, RequireAuth } from '../../features/auth/components/RouteGuards'
import {
  AdminDashboardPage,
  AdminFspPortfolioPage,
  AdminSubmissionOverviewPage,
  AdminSubmissionQueuePage,
} from '../../features/admin/AdminPages'
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyPage,
} from '../../features/auth/AuthPages'
import {
  ForbiddenPage,
  NotFoundPage,
  RouteErrorPage,
  UnauthorizedPage,
} from '../../features/errors/ErrorPages'
import { FspDashboardPage, FspPlaceholderPage } from '../../features/fsp/FspPages'
import {
  AboutPage,
  ContactPage,
  HomePage,
  HowItWorksPage,
  PrivacyPage,
  TermsPage,
} from '../../features/public/PublicPages'
import {
  ActiveFspGuard,
  AppEntryRedirect,
  OnboardingGuard,
  SearchGuard,
} from '../../features/onboarding/components/OnboardingGuards'
import {
  TenantAccessGuard,
  WorkspaceProvidersRoute,
} from '../../features/tenant/components/TenantGuards'
import { OnboardingLayout } from '../../features/onboarding/components/OnboardingLayout'
import { AccountProfilePage } from '../../features/onboarding/pages/AccountProfilePage'
import {
  FindFspPage,
  OnboardingLandingPage,
  PendingOnboardingPage,
  ReviewFspPage,
} from '../../features/onboarding/pages/OnboardingPages'
import {
  StartSubmissionPage,
  SubmissionWorkflowPage,
} from '../../features/submissions/pages/SubmissionPages'
import { SubmissionHistoryPage } from '../../features/submissions/pages/SubmissionHistoryPage'
import { FspUsersPage, InvitationPage } from '../../features/users/UsersPages'
import { FspProfilePage } from '../../features/fspProfile/FspProfilePages'
import {
  NotificationPreferencesPage,
  NotificationsPage,
} from '../../features/notifications/NotificationPages'
import {
  FspRelationshipsSettingsPage,
  OrganisationSettingsPage,
  SettingsAccess,
  SettingsLayout,
  SubmissionPeriodsSettingsPage,
  TenantInvitationPage,
  TenantUsersSettingsPage,
} from '../../features/settings/SettingsPages'
import {
  PlatformAccessGuard,
  PlatformAppRedirectGuard,
} from '../../features/registry/PlatformAccessGuard'
import { RegistryDashboardPage, RegistryImportPage } from '../../features/registry/RegistryPages'
import {
  PlatformDashboardPage,
  PlatformQuestionnaireEditorPage,
  PlatformQuestionnairesPage,
  PlatformReferenceDataPage,
  PlatformTenantsPage,
} from '../../features/platformAdmin/PlatformAdminPages'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/how-it-works', element: <HowItWorksPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="login" replace /> },
      {
        path: 'login',
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        path: 'register',
        element: (
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <GuestOnly>
            <ForgotPasswordPage />
          </GuestOnly>
        ),
      },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify', element: <VerifyPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/invite/:token', element: <InvitationPage /> },
      { path: '/tenant-invite/:token', element: <TenantInvitationPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <PlatformAppRedirectGuard>
          <WorkspaceProvidersRoute />
        </PlatformAppRedirectGuard>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AppEntryRedirect /> },
      {
        element: <OnboardingGuard />,
        children: [
          {
            path: 'onboarding',
            element: <OnboardingLayout />,
            children: [
              { index: true, element: <OnboardingLandingPage /> },
              {
                path: 'find-fsp',
                element: (
                  <SearchGuard>
                    <FindFspPage />
                  </SearchGuard>
                ),
              },
              {
                path: 'fsp/:fspId',
                element: (
                  <SearchGuard>
                    <ReviewFspPage />
                  </SearchGuard>
                ),
              },
              { path: 'pending', element: <PendingOnboardingPage /> },
            ],
          },
        ],
      },
      {
        path: 'account',
        element: <OnboardingLayout />,
        children: [
          { path: 'profile', element: <AccountProfilePage /> },
          {
            path: 'notifications',
            element: (
              <NotificationsPage
                workspace="fsp"
                settingsPath="/app/account/notifications/settings"
              />
            ),
          },
          { path: 'notifications/settings', element: <NotificationPreferencesPage /> },
        ],
      },
      {
        element: (
          <ActiveFspGuard>
            <AppLayout />
          </ActiveFspGuard>
        ),
        children: [
          { path: 'dashboard', element: <FspDashboardPage /> },
          { path: 'profile', element: <FspProfilePage /> },
          { path: 'users', element: <FspUsersPage /> },
          { path: 'submissions', element: <SubmissionHistoryPage /> },
          { path: 'submissions/new', element: <StartSubmissionPage /> },
          { path: 'submissions/:id', element: <SubmissionWorkflowPage /> },
          { path: 'settings', element: <FspPlaceholderPage page="settings" /> },
          { path: 'notifications', element: <NotificationsPage workspace="fsp" /> },
          { path: 'notifications/settings', element: <NotificationPreferencesPage /> },
        ],
      },
    ],
  },
  {
    path: '/platform',
    element: (
      <RequireAuth>
        <WorkspaceProvidersRoute />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        element: <PlatformAccessGuard />,
        children: [
          {
            element: <PlatformLayout />,
            children: [
              { path: 'dashboard', element: <PlatformDashboardPage /> },
              { path: 'tenants', element: <PlatformTenantsPage /> },
              { path: 'reference-data', element: <PlatformReferenceDataPage /> },
              { path: 'questionnaires', element: <PlatformQuestionnairesPage /> },
              {
                path: 'questionnaires/:versionId',
                element: <PlatformQuestionnaireEditorPage />,
              },
              { path: 'registry', element: <RegistryDashboardPage /> },
              { path: 'registry/imports/:importId', element: <RegistryImportPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <WorkspaceProvidersRoute />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        element: (
          <TenantAccessGuard>
            <AdminLayout />
          </TenantAccessGuard>
        ),
        children: [
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'fsps', element: <AdminFspPortfolioPage /> },
          { path: 'submissions', element: <AdminSubmissionQueuePage /> },
          { path: 'submissions/:submissionId', element: <AdminSubmissionOverviewPage /> },
          { path: 'notifications', element: <NotificationsPage workspace="tenant" /> },
          { path: 'notifications/settings', element: <NotificationPreferencesPage /> },
          {
            path: 'settings',
            element: <SettingsAccess />,
            children: [
              {
                element: <SettingsLayout />,
                children: [
                  { index: true, element: <Navigate to="organisation" replace /> },
                  { path: 'organisation', element: <OrganisationSettingsPage /> },
                  { path: 'users', element: <TenantUsersSettingsPage /> },
                  { path: 'submission-periods', element: <SubmissionPeriodsSettingsPage /> },
                  { path: 'fsps', element: <FspRelationshipsSettingsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '/forbidden', element: <ForbiddenPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },
])
