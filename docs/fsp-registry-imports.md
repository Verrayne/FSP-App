# FSP registry imports

The platform keeps one global FSP master. Insurer relationships and FSP-maintained profile fields are deliberately outside the registry import boundary.

## Supported sources

- `FSCA_MANUAL_CSV` is the production-ready path for an authorised FSCA extract.
- `DEVELOPMENT_FIXTURE` exercises the same parser and worker outside production only.
- `FSCA_AUTHORISED` is an inert adapter boundary for a future licensed API or file feed. No scraper or undocumented endpoint is implemented.

Schema version 1 requires `fsp_number`, `registered_name`, and `regulatory_status`. It optionally accepts `status_effective_date`, `registration_number`, and `fsp_type`. Dates are strict ISO `YYYY-MM-DD`. Blank optional values do not clear existing data. Unknown columns are reported and ignored.

## Security and operations

Only an active `PLATFORM_ADMIN` can view imports, upload files, or confirm a preview. This is distinct from an insurer tenant administrator. The original CSV is stored in the private `registry-imports` bucket and is only handled by server-side code. Import/source/change tables have forced RLS and no authenticated browser access.

The browser upload is capped at 3 MB and 10,000 rows so its base64 JSON envelope remains below the serverless request limit; the private bucket independently enforces a 4 MB ceiling. Validation stages row-level records and proposed changes without altering the FSP master. Confirmation queues valid rows. `/api/registry/process` claims at most 50 records per invocation, uses row leases, and can recover abandoned work. Each row is applied transactionally and recalculated against current values. Failed and conflicting rows remain visible without rolling back successful rows.

Full-snapshot imports do not infer that a missing FSP is withdrawn, inactive, or deleted. Absence is retained as source context only until an authorised provider contract defines explicit, reviewable removal semantics.

Registry ownership is limited to the FSP number, registered name, registration number, FSP type, regulatory status, status effective date, and source provenance. Trade names, addresses, contacts, tenant relationships, and submissions are never updated by an import.

## Local testing

Sign in as `tenant.a.admin@example.test` with the local development password. That seeded account has the separate platform-admin membership. Open `/platform/registry`, download the template, add rows, upload, review the preview, and confirm it. Run the authenticated registry worker endpoint or wait for the scheduled worker. The development fixture source is disabled when `VERCEL_ENV=production`.

Never upload a file unless its acquisition and use are authorised. Source configuration must not contain credentials; any future provider secret belongs in server environment configuration.
