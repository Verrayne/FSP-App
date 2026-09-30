# Security model and verification

## Core model

Supabase Auth establishes identity. Active `fsp_users`, `tenant_memberships` and `platform_memberships` establish authorization. Tenant/FSP IDs supplied by the browser are selectors only and are re-authorized by RLS or scope-checking RPCs. User metadata is never an authorization source.

The browser receives only `VITE_SUPABASE_URL` and the publishable key. `SUPABASE_SECRET_KEY`, `CRON_SECRET`, email credentials and any future AI credential are server-only. Never log bearer tokens, invitation links/token hashes, request bodies, evidence content or secret values.

All public application tables have RLS enabled and forced. Sensitive tables such as raw audit, worker queues/deliveries, platform membership and registry staging are service-only; tenant users access curated, scope-checked projections. PostgreSQL function grants are explicit. Migration `20260911134538_revoke_broad_function_execution.sql` removes default `PUBLIC` execution from `public`, `private` and `registry_private` functions.

Storage buckets are private. A prepared, metadata-backed, generated object path is required before upload. PDFs are constrained by extension, MIME, 4 MB size and magic bytes in the API; SHA-256 and immutable versions are recorded. This validation is not malware scanning.

## Browser and API controls

- PKCE sessions; the entire TanStack Query cache is cleared on sign-out.
- Query keys include selected user/tenant/FSP/submission/import context.
- Safe fixed redirect destinations; production message origins must be HTTPS.
- Zod schemas reject unknown or unbounded server input.
- Generic error envelopes prevent SQL/stack disclosure.
- Cron endpoints use constant-time secret comparison.
- CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, HSTS, MIME, referrer, permissions and COOP headers are configured.
- Production mock email, registry and AI paths fail closed.

## Mandatory recurring checks

```sql
-- Every public table must return both values true.
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

-- Inventory function exposure before every release.
select n.nspname, p.proname,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private', 'registry_private')
order by 1, 2;
```

Run `npm audit --omit=dev`, secret scanning, Supabase security/performance advisors, all unit/browser/pgTAP tests, and [production-integrity.sql](production-integrity.sql). Test anonymous denial, wrong-FSP, wrong-tenant shared-FSP, viewer/reviewer/admin capability boundaries, revoked membership and FSP/tenant-to-platform escalation.

## Remaining controls before production

Enable compromised-password protection and MFA for privileged roles. Add rate limiting and anomaly alerts. Add malware scanning/quarantine. Approve retention/deletion and lawful processing. Establish central redacted logs and incident access. Perform an independent authorization and upload review after the P1 items are implemented.

Never weaken RLS or expose a bucket to solve a UI issue. Use an explicit scope-checking RPC or server endpoint, add a negative authorization test, and review the resulting grants.
