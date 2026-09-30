# FSP Compliance Platform

A multi-tenant SaaS foundation for South African insurers to collect annual B-BBEE compliance information from their Financial Services Provider (FSP) partners.

This repository contains the Prompt 00–15 platform: public website, migration-driven Supabase data,
email/password authentication, FSP onboarding and dashboard, the annual metadata-driven B-BBEE
submission workflow, the insurer portal, administrator-only tenant settings, and durable in-app and email notifications.

## Stack

- React, TypeScript, Vite and React Router
- Tailwind CSS with compact, reusable UI primitives
- TanStack Query for server state
- React Hook Form and Zod for forms and validation
- Supabase Auth, PostgreSQL and private Storage
- Vercel static hosting and TypeScript Functions
- Vitest, React Testing Library and Playwright
- ESLint and Prettier

## Repository structure

```text
api/                      Vercel Functions and shared API responses
docs/                     Architecture and security decisions
public/                   Static assets
src/
  app/                    Router, providers and layout shells
  components/             Shared UI and cross-feature components
  config/                 Validated public configuration
  features/               Auth, FSP, submission, user and admin areas
  hooks/                  Cross-feature hooks (when justified)
  lib/                    API, Supabase, validation and utilities
  types/                  Cross-feature types (when justified)
supabase/
  migrations/             Versioned database and Auth/profile migrations
  seed/                   Fictional local/development seed data
tests/e2e/                Playwright smoke tests
```

## Local setup

Requirements: a current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The public website runs without Supabase values. Authentication forms show a clear unavailable state until both public Supabase values are provided.

## Environment variables

| Variable                        | Runtime     | Purpose                                                |
| ------------------------------- | ----------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Browser     | Supabase project URL                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser     | `sb_publishable_…` key, constrained by RLS             |
| `VITE_APP_URL`                  | Browser     | Application origin used for fixed Auth redirects       |
| `VITE_APP_ENV`                  | Browser     | `local`, `development`, `staging`, or `production`     |
| `SUPABASE_URL`                  | Server only | Supabase project URL for trusted functions             |
| `SUPABASE_SECRET_KEY`           | Server only | `sb_secret_…` key; bypasses RLS and must remain secret |
| `APP_ENV`                       | Server only | Server environment name                                |
| `APP_URL`                       | Server only | Origin used to build invitation links                  |
| `PUBLIC_APP_URL`                | Server only | Origin used for notification email actions             |
| `RESEND_API_KEY`                | Server only | Production invitation email provider credential        |
| `EMAIL_FROM`                    | Server only | Verified invitation sender                             |
| `CRON_SECRET`                   | Server only | Authorises durable AI-review and notification workers  |
| `AI_REVIEW_ADAPTER`             | Server only | Disabled by default; local mock only                   |
| `AI_REVIEW_MOCK_SCENARIO`       | Server only | Deterministic local/test review scenario               |

Use separate Supabase and Vercel projects/environment values for non-production and production. Never put secret credentials in a `VITE_` variable or commit any `.env*` file other than `.env.example`.

## Commands

```bash
npm run dev          # local Vite server
npm run build        # strict TypeScript check and production bundle
npm run lint         # ESLint
npm run format:check # Prettier verification
npm run test         # Vitest and React Testing Library
npm run test:e2e     # Playwright smoke test
npm run db:start     # start the local Supabase stack (Docker required)
npm run db:reset     # rebuild the local database and load seed data
npm run db:test      # run pgTAP database, RLS and Storage tests locally
npm run db:types     # regenerate TypeScript types from the linked project
```

Install Playwright Chromium once on a new machine if needed: `npx playwright install chromium`.

## Supabase boundary

`src/lib/supabase/client.ts` creates one lazy PKCE browser client using only the publishable key. `AuthProvider` restores the initial session, reacts to Auth events, and retrieves the user's own profile through RLS. Browser reads remain protected by explicit Row Level Security policies.

`src/lib/supabase/server.ts` is server-only infrastructure using the secret key. It must only be imported by trusted Vercel Functions after authenticating the caller, deriving tenant/FSP access from controlled relationships, authorizing the requested action and validating its input. A browser-supplied `tenant_id` is never proof of access.

Sensitive operations—claims, invitations, permission changes, finalisation, reviews, controlled documents and imports—belong behind the API boundary. The interfaces under feature `services/` reserve these seams without implementing insecure stubs.

## Database and migration workflow

Prompt 02 implements 25 application tables through ordered migrations, links Supabase Auth to profiles, forces relationship-aware RLS, and creates the private `compliance-documents` Storage bucket. Fictional seed data exercises multi-FSP, cross-tenant, shared-FSP, questionnaire-version, typed-response, and multi-select cases. Generated schema types are checked in at `src/types/database.types.ts` and used by both Supabase clients.

Create migrations through `supabase migration new <name>`, verify locally with `npm run db:reset && npm run db:test`, and regenerate types after schema changes. Commit migration and seed files, never project credentials or real personal data.

See [docs/database.md](docs/database.md) for the schema, RLS paths, Storage policy, development identities and exact workflow, [docs/fsp-profile.md](docs/fsp-profile.md) for profile data ownership and trusted mutations, [docs/insurer-portal.md](docs/insurer-portal.md) for the tenant workspace and security model, [docs/tenant-settings.md](docs/tenant-settings.md) for tenant administration and lifecycle rules, [docs/submission-review.md](docs/submission-review.md) for review modes and AI limitations, [docs/submission-history.md](docs/submission-history.md) for immutable attempts and the audit projection, and [docs/architecture.md](docs/architecture.md) for the wider system boundary. The authoritative release decision, open blockers and operational controls are in [docs/production-readiness.md](docs/production-readiness.md).

FSP claiming, approval state, current-FSP context and the prototype reviewer mechanism are documented
in [docs/onboarding.md](docs/onboarding.md).

The start/resume workflow, typed questionnaire renderer, certificate and affidavit branches, private
document versioning and atomic final submission are documented in
[docs/submissions.md](docs/submissions.md).

FSP team visibility, role capabilities, invitation delivery/acceptance, and final-administrator
protection are documented in [docs/users-and-permissions.md](docs/users-and-permissions.md).

## Authentication

The functional Auth routes are `/auth/register`, `/auth/verify`, `/auth/login`, `/auth/forgot-password`, and `/auth/reset-password`. Email confirmation is required by the linked development project. Routes under `/app/*` require a restored Supabase session and FSP membership where appropriate. Routes under `/admin/*` require a current active membership of an active insurer; the database repeats that check for every tenant-scoped read.

Before using email links, add the local and deployed application origins to the Supabase Auth redirect allow list. Local Supabase messages are available through Inbucket at `http://localhost:54324` when the Docker stack is running. See [docs/authentication.md](docs/authentication.md) for session behavior, redirect configuration, recovery security and testing details.

## Public website

The unauthenticated website explains the planned FSP compliance workflow and is available at:

- `/` — product overview, process summary, certificate/affidavit guidance and security principles
- `/about` — purpose and planned benefits for FSP and insurer teams
- `/how-it-works` — detailed seven-step submission journey
- `/contact` — prototype-only validated support form
- `/privacy` — structured privacy-notice placeholder
- `/terms` — structured terms-of-use placeholder

Header calls to action lead to the functional `/auth/login` and `/auth/register` flows.

The contact form performs client-side validation only. It explicitly confirms that no request was sent. A later support/notification integration must add authenticated or abuse-resistant server-side delivery, server validation, safe logging and an approved destination.

Privacy and Terms content require legal review before production. Outstanding decisions include the service operator, contact and Information Officer details, retention periods, recipients/subprocessors, hosting and cross-border arrangements, governing law, liability wording, and change-notification processes. See [docs/public-website.md](docs/public-website.md).
