# Operations runbook

## Environments

Use isolated Supabase and Vercel projects for development, staging and production. Production requires Node 22–24, HTTPS `APP_URL`/`PUBLIC_APP_URL`, production Supabase URL/publishable/secret keys, a high-entropy `CRON_SECRET`, verified Resend credentials and an approved `EMAIL_FROM`. Keep AI disabled unless separately approved.

Never copy development seed identities or real production evidence between environments. Validate the Supabase Auth site URL and exact redirect allow-list. Rotate secrets after staff changes, suspected exposure and at the documented cadence; redeploy and test workers after rotation.

## Deploy

1. Review migration diff and backward compatibility; take/verify a backup.
2. Run format, lint, build, unit, browser, pgTAP, production audit and integrity checks.
3. Apply migrations to staging; deploy the same commit; smoke-test every role and worker.
4. Apply additive migrations before application code when compatible. Deploy during the approved window.
5. Verify `/api/health`, security headers, Auth redirects, one invitation, one notification and worker queue drain.
6. Record commit, migration versions, approvers, start/end time and evidence links.

Rollback application code to the last known-good deployment only when its schema contract remains compatible. Database migrations use reviewed forward fixes; do not destructively revert production data. Stop workers first when queue processing caused the incident.

## Monitoring and alerts

Required before production: external availability and latency probes; Vercel function error/timeout alerts; Supabase database/Auth/Storage health; failed login and privilege anomaly signals; pending/processing age and failed/dead-letter counts for AI, registry and notification jobs; email failure rate; backup freshness and restore-drill age. Alerts need a named primary/secondary, severity, acknowledgement target and escalation path.

Logs must be structured and include timestamp, environment, request/correlation ID, route, safe actor ID, safe scope IDs, outcome, latency and stable error code. Exclude request bodies, evidence, tokens, passwords, secrets and full email addresses.

## Worker operations

Vercel invokes notification and registry workers each minute and reminders daily at 06:00 UTC; AI is scheduled each minute but should remain disabled until approved. Leases recover stuck jobs. Inspect queue counts and oldest age before retrying. Do not manually mark work successful. Resolve configuration/provider errors, then use the approved retry path. Repeated failures require incident handling.

## Routine cadence

- Daily: availability, worker backlog, failed jobs, backup freshness.
- Weekly: audit security signals, dependency notices, delivery failures.
- Monthly: access review, restore sample, cost/capacity trend, advisor review.
- Quarterly: secret rotation where required, privileged access recertification, disaster exercise and retention/deletion review.
