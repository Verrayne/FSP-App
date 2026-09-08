# FSP Compliance Platform

A multi-tenant SaaS foundation for South African insurers to collect annual B-BBEE compliance information from their Financial Services Provider (FSP) partners.

This repository currently contains **Prompt 00 only**: application structure, route and layout shells, security boundaries, shared UI primitives, typed API conventions, and test tooling. It deliberately contains no production database schema or business workflows.

## Stack

- React, TypeScript, Vite and React Router
- Tailwind CSS with compact, reusable UI primitives
- TanStack Query for server state
- React Hook Form and Zod for forms and validation
- Supabase Auth, PostgreSQL and private Storage (infrastructure only)
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
  migrations/             Prompt 02-owned database migrations
  seed/                   Prompt 02-owned seed data
tests/e2e/                Playwright smoke tests
```

## Local setup

Requirements: a current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The shell and placeholder routes run without Supabase values. Supabase-dependent operations fail clearly until both public values are provided.

## Environment variables

| Variable                        | Runtime     | Purpose                                                |
| ------------------------------- | ----------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Browser     | Supabase project URL                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser     | `sb_publishable_…` key, constrained by RLS             |
| `VITE_APP_ENV`                  | Browser     | `local`, `development`, `staging`, or `production`     |
| `SUPABASE_URL`                  | Server only | Supabase project URL for trusted functions             |
| `SUPABASE_SECRET_KEY`           | Server only | `sb_secret_…` key; bypasses RLS and must remain secret |
| `APP_ENV`                       | Server only | Server environment name                                |

Use separate Supabase and Vercel projects/environment values for non-production and production. Never put secret credentials in a `VITE_` variable or commit any `.env*` file other than `.env.example`.

## Commands

```bash
npm run dev          # local Vite server
npm run build        # strict TypeScript check and production bundle
npm run lint         # ESLint
npm run format:check # Prettier verification
npm run test         # Vitest and React Testing Library
npm run test:e2e     # Playwright smoke test
```

Install Playwright Chromium once on a new machine if needed: `npx playwright install chromium`.

## Supabase boundary

`src/lib/supabase/client.ts` creates a lazy browser client using only the publishable key. Browser reads must eventually be protected by explicit Row Level Security policies.

`src/lib/supabase/server.ts` is server-only infrastructure using the secret key. It must only be imported by trusted Vercel Functions after authenticating the caller, deriving tenant/FSP access from controlled relationships, authorizing the requested action and validating its input. A browser-supplied `tenant_id` is never proof of access.

Sensitive operations—claims, invitations, permission changes, finalisation, reviews, controlled documents and imports—belong behind the API boundary. The interfaces under feature `services/` reserve these seams without implementing insecure stubs.

## Database and migration workflow

Prompt 02 owns the schema, RLS, storage policies and seed data. When it begins:

1. Inspect the installed Supabase CLI with `supabase --help` and confirm current official docs.
2. Create migration files through `supabase migration new <name>` rather than inventing filenames.
3. Iterate against a non-production project/local stack.
4. Enable RLS on every exposed table and write relationship-aware policies.
5. Run database/security advisors and verify policies with multiple identities.
6. Commit reviewed migration and seed files—never credentials or real personal information.

Uploaded binaries belong in private Storage buckets; PostgreSQL stores their controlled metadata. Production buckets and policies are intentionally not created yet.

See [docs/architecture.md](docs/architecture.md) for the system boundary and deferred security work.
