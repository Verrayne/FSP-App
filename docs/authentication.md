# Authentication and registration

Prompt 03 establishes identity only: who the user is and whether a valid Supabase session exists. FSP selection, claiming, membership approval, roles, tenant access and onboarding remain Prompt 04 concerns.

## Supported method and routes

The prototype supports Supabase email/password authentication only. Social login, magic-link-first login, phone authentication, SSO, passkeys and invitations are not enabled.

| Route                   | Purpose                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `/auth/register`        | Create an Auth identity and its application profile                                    |
| `/auth/verify`          | Explain email confirmation, resend confirmation safely, and handle the confirmed state |
| `/auth/login`           | Establish an email/password session                                                    |
| `/auth/forgot-password` | Request recovery without revealing whether an account exists                           |
| `/auth/reset-password`  | Update a password only inside a valid recovery session                                 |

The forms use React Hook Form and Zod, persistent labels, browser autocomplete, visible requirements, field-linked errors, busy states and password visibility controls. The application does not log passwords, tokens or raw Auth errors.

## Registration and profiles

`supabase.auth.signUp` receives the email, password, a fixed application-owned verification redirect, and the registration display fields. The existing `private.create_profile_for_auth_user` trigger remains the only profile-provisioning mechanism. It creates `profiles.id = auth.users.id` in the same database transaction and copies bounded, trimmed first name, last name, optional contact number and optional job title.

These display fields pass through `raw_user_meta_data` only to provision the profile. Metadata is never consulted for authorization. Browser-supplied role, tenant or FSP values cannot create membership records, and the trigger function is not executable by browser roles. Once authenticated, the existing RLS policy permits a user to read their own profile and update only the approved profile columns.

The linked development project currently has email signup enabled, signup enabled and email autoconfirm disabled, so registration requires confirmation. When autoconfirm is intentionally enabled in a local-only environment, a returned session proceeds directly to the authenticated shell.

## Verification and redirects

The browser Supabase client uses PKCE with automatic URL session detection. Registration supplies `/auth/verify?confirmed=1` as `emailRedirectTo`; confirmation links are exchanged by Supabase Auth, and the central Auth listener receives the resulting session. `/auth/verify` never displays token values or raw query-string errors. Resend uses `auth.resend({ type: 'signup' })` and produces controlled success/error messages.

Redirect targets are built from `VITE_APP_URL`, falling back to `window.location.origin`, plus fixed application paths. No user-provided redirect URL is accepted. Configure each exact deployed origin in Supabase Auth URL Configuration; use a Vercel preview wildcard only when that risk is acceptable for the development project.

## Sessions and route protection

`AuthProvider` owns the single `onAuthStateChange` subscription. It handles `INITIAL_SESSION`, sign-in, sign-out, token refresh, user update and `PASSWORD_RECOVERY` session changes without scattering `getSession` calls through components. While the initial event and RLS-backed profile read are pending, guards render a loading state rather than redirecting.

Anonymous `/app/*` requests redirect to `/auth/login` with the intended in-app destination stored in router state. Only destinations beginning with `/app` are accepted after login. Authentication alone grants access to the application shell; FSP membership is deliberately not checked yet. Authenticated users are redirected away from ordinary login/register pages.

`/admin/*` first requires authentication and then remains closed. Prompt 03 does not infer administrator status from email or metadata, so ordinary authenticated users receive `/forbidden` until a later controlled authorization model is connected.

The account menu shows the RLS-backed profile and calls `supabase.auth.signOut`; clearing React state without terminating the Supabase session is never treated as logout.

## Password recovery

Forgot password calls `resetPasswordForEmail` with the fixed `/auth/reset-password` redirect. Except for a useful rate-limit message, the UI always returns the neutral response: “If an account exists for this email address, password reset instructions have been sent.”

The provider records only the presence of a `PASSWORD_RECOVERY` event in session storage—never a token. The reset page requires both that recovery context and an authenticated recovery session before calling `updateUser({ password })`. Invalid, expired, reused or directly visited reset routes show a generic recovery-link error.

## Environment and local testing

Browser-safe variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_URL
VITE_APP_ENV
```

`VITE_APP_URL` is the browser origin only, for example `http://localhost:5173`; it contains no secret. `SUPABASE_SECRET_KEY` remains server-only and is not used for registration, login, profile reads or recovery.

For local Supabase Auth:

1. Start Docker and run `npm run db:start`.
2. Run `npm run db:reset` to apply migrations and seed identities.
3. Start Vite with `npm run dev`.
4. Open local confirmation and recovery messages in Inbucket at `http://localhost:54324`.
5. Keep the local Site URL and additional redirects in `supabase/config.toml` aligned with `http://localhost:5173`.

Do not disable production email confirmation to simplify local testing. Hosted environments must configure their Site URL and allow-list `/auth/verify` and `/auth/reset-password` destinations before exercising email links.

## Verification coverage and deferred work

Component tests cover registration fields and validation, mismatched passwords, verification state, login success/error, neutral recovery, reset validation, route guards, admin denial and logout. Provider tests cover `INITIAL_SESSION`, profile restoration, sign-out and listener cleanup. Service tests assert the exact Supabase Auth calls and ensure registration metadata contains no authorization attributes. Hosted Playwright coverage verifies real login, refresh restoration and logout using a seeded confirmed development identity.

End-to-end confirmation and recovery email clicks require either local Inbucket or access to the hosted test mailbox. The current machine has no Docker/Podman, so those two email-link journeys remain documented but were not falsely reported as executed.

Prompt 04 can rely on `useAuth()` for `status`, `session`, `user`, `profile` and `profileError`. It must derive onboarding state from controlled FSP relationship tables, not Auth metadata.
