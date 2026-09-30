# Production-readiness assessment

Assessment date: 11 September 2026  
Scope: repository, linked Supabase project `mmxvzswqxhccgcxgjmtb`, browser/API/database boundaries, deployment configuration, operations and recovery.

## Decision

**NOT READY FOR PRODUCTION.** The application is suitable for continued development and a controlled, non-production pilot using fictional data. It must not receive real FSP compliance documents or personal information until every P1 release condition below is closed and independently verified.

No P0 issue remains open. One P0 database privilege issue was fixed and applied during this assessment. The code build, lint, 124 unit/component tests, 30 enabled browser tests, production dependency audit, RLS probes and integrity probes now pass. Three browser tests remain explicitly skipped because dedicated destructive-workflow fixture IDs are not configured. Local pgTAP execution could not run because Docker/Podman is not installed; equivalent high-risk live RLS probes were executed, but that does not replace the complete database suite.

## What is implemented

- Public, authentication, FSP, insurer and platform-admin route areas with explicit guards.
- Supabase Auth identity and relationship-based PostgreSQL authorization; no authorization decision uses user-editable metadata.
- 46 public application tables, all with RLS enabled and forced; no public views.
- Private compliance-document and registry-import Storage buckets.
- Metadata-driven submissions, typed responses, declarations, immutable attempts, review workflows and curated audit/history projections.
- Tenant/FSP user administration, scoped invitations, notifications and an FSCA manual CSV registry-import workflow.
- Vercel API functions for privileged document access, invitations, workers and imports.
- Durable worker queues with retry/lease behavior and explicit service-role gateways.

## Architecture and trust boundaries

| Component         | Responsibility                                                     | Trust boundary                                                           |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Browser React app | UI, validation, scoped reads and RPC calls                         | Publishable key only; browser identifiers never prove access             |
| Supabase Auth     | Identity, session and recovery                                     | Authorization comes from database relationships, not Auth metadata       |
| Vercel Functions  | Validate caller/input and perform privileged operations            | Secret key is server-only; functions must authorize before data access   |
| PostgreSQL        | Constraints, transactions, RLS, immutable history and worker state | Forced RLS on every public table; explicit function grants               |
| Supabase Storage  | Private evidence and import binaries                               | Access is policy/RPC-mediated; no public buckets                         |
| Vercel Cron       | AI, registry and notification workers                              | Requires `CRON_SECRET`; worker RPCs are service-role only                |
| Resend            | Invitation and notification email                                  | Production-only provider; content excludes evidence and tokens from logs |

Detailed boundaries are in [architecture.md](architecture.md), [security.md](security.md) and [operations.md](operations.md).

## Route inventory

| Area                   | Routes                                                                                                                                      | Access                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Public                 | `/`, `/about`, `/how-it-works`, `/contact`, `/privacy`, `/terms`                                                                            | Anonymous                                              |
| Auth/invites           | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify`, `/invite/:token`, `/tenant-invite/:token` | Anonymous/session-aware; tokens are hashed server-side |
| FSP onboarding/account | `/app/onboarding/*`, `/app/account/profile`, `/app/account/notifications*`                                                                  | Authenticated                                          |
| FSP workspace          | `/app/dashboard`, `/app/profile`, `/app/users`, `/app/submissions*`, `/app/notifications*`                                                  | Active FSP membership; writes capability-checked       |
| Insurer workspace      | `/admin/dashboard`, `/admin/fsps`, `/admin/submissions*`, `/admin/notifications*`                                                           | Active membership in active selected tenant            |
| Insurer settings       | `/admin/settings/organisation`, `/users`, `/submission-periods`, `/fsps`                                                                    | Active tenant administrator                            |
| Platform               | `/platform/registry`, `/platform/registry/imports/:importId`                                                                                | Active platform administrator                          |

## Server API inventory

| Boundary         | Endpoints                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Health           | `GET /api/health` (database-aware, generic 200/503 result)                                 |
| Invitations      | `/api/fsp-users/invitations*`, `/api/tenant-users/invitations*`                            |
| FSP documents    | certificate upload/finalise and immutable attempt download APIs under `/api/submissions/*` |
| Tenant documents | authorised current/attempt downloads under `/api/admin/submissions/*`                      |
| Registry         | `/api/registry/template`, `/imports`, `/imports/:id`, `/confirm`, `/process`               |
| Workers          | `/api/ai-review/process`, `/api/notifications/process`, `/api/notifications/reminders`     |

Every mutating endpoint uses a bounded Zod schema. User-facing errors use a generic envelope; raw SQL errors and secrets are not returned.

## Database and Storage inventory

Domains: identity (`profiles`), organisations and relationships (`tenants`, `fsps`, memberships, invitations, `tenant_fsps`), questionnaire/versioning, submissions/responses/declarations/documents, reviews/history/audit, notifications, platform access and registry imports/provenance. The complete table list can be generated with the query in [security.md](security.md). Buckets are `compliance-documents` (PDF, 4 MB) and `registry-imports` (CSV/text, 4 MB), both private.

## Verification evidence

| Check                     | Result                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run build`           | Pass; one 957 kB pre-gzip chunk warning                                                                |
| `npm run lint`            | Pass                                                                                                   |
| `npm run test`            | Pass: 26 files, 124 tests                                                                              |
| Playwright                | Pass: 30 enabled; 3 skipped because dedicated destructive-workflow fixture IDs are not configured      |
| `npm audit --omit=dev`    | Pass: 0 production vulnerabilities                                                                     |
| Full `npm audit`          | 5 development-only transitive advisories in `@vercel/node` tooling                                     |
| Secret scan               | No tracked secret file in Git history; browser `sb_secret_` text is SDK key-format logic, not a value  |
| Linked migration          | `20260911134538_revoke_broad_function_execution.sql` applied; local/remote histories match             |
| Supabase security advisor | One warning: leaked-password protection disabled                                                       |
| Forced RLS                | Pass: 0 public tables missing enabled/forced RLS                                                       |
| Isolation probes          | Cross-FSP, cross-tenant, shared-FSP, multi-membership, revoked membership and platform escalation pass |
| Integrity probes          | All 10 read-only checks returned zero                                                                  |
| Vercel project            | `fsp` exists on Node 24.x; no production URL/deployment yet                                            |
| pgTAP                     | Not executable locally: Docker and Podman unavailable                                                  |

## Release-blocking conditions (P1)

1. Enable compromised-password protection and require MFA for tenant/platform administrators; document break-glass recovery.
2. Configure automated PostgreSQL and Storage backups, approve RPO/RTO, and complete a timed restore drill into an isolated environment.
3. Install production monitoring, alerting and error aggregation for API failures, worker backlog/dead letters, auth anomalies and database availability.
4. Add malware/content scanning and quarantine before uploaded compliance documents are trusted or exposed to reviewers.
5. Replace placeholder Privacy/Terms content with approved POPIA/legal text, operator/Information Officer details, retention schedule, subprocessors and cross-border arrangements.
6. Link the existing but undeployed `fsp` Vercel project to this checkout and verify its production configuration, custom domain, environment separation, secret rotation, Supabase redirect allow-list and Resend domain; perform a clean staging deployment rehearsal.
7. Decide the production review mode. Keep AI review disabled unless a provider, data-processing terms, data residency, minimisation and human-override controls are approved and implemented.
8. Obtain and document authority to use the chosen FSCA dataset and validate the first production snapshot with a four-eyes reconciliation process.

The tracked backlog and owners are in [production-readiness-backlog.md](production-readiness-backlog.md).

## Fixed during this assessment

- **P0:** revoked PostgreSQL's implicit `PUBLIC` execution on private `SECURITY DEFINER` functions; explicit authenticated/anonymous/service grants remain and were verified live.
- **P1:** upgraded `csv-parse` to 7.0.2, removing the production dependency advisory.
- **P1:** added CSP, clickjacking protection, HSTS, COOP and existing MIME/referrer/permissions headers.
- **P1:** production invitation/action origins must now be configured HTTPS URLs; mutation stops before a token is created when configuration is invalid.
- **P2:** outbound email now has a 10-second timeout; health checks now include database reachability without exposing internals.
- Declared Node 22–24 compatibility to avoid an unsupported Node 20 deployment.

## Approval gate

Production approval requires: zero open P0/P1 findings; a clean build/test/audit; migration and rollback review; verified backups and restore; monitoring alerts exercised; legal/privacy approval; production environment evidence; security sign-off; and named release/rollback owners. Use [production-release-checklist.md](production-release-checklist.md).
