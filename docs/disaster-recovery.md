# Disaster recovery

## Objectives and authority

Product must set maximum tolerable downtime/data loss; Operations must translate them into approved RTO/RPO. A named incident commander authorises failover/restore, Security controls credential rotation, and the Information Officer approves regulated communications.

## Recovery order

1. Confirm scope and preserve provider/audit evidence.
2. Freeze deployments and pause cron workers to prevent duplicate processing.
3. Restore/establish PostgreSQL and Auth configuration in the approved region/project.
4. Restore private Storage and validate metadata-to-object hashes/paths.
5. Apply the exact reviewed migration chain and deploy the last known-good application commit.
6. Rotate Supabase, cron, email and any affected credentials; update exact Auth/domain configuration.
7. Run health, integrity, RLS, role journey and queue-idempotency checks.
8. Resume workers one class at a time, watch backlog/errors, then reopen traffic.

If regional failover changes URLs, update server/browser configuration and exact redirect allow-lists together. Do not redirect production users to an unverified project. Notification, registry and AI jobs use idempotency/leases, but operators must verify queue state before replay.

Exercise at least quarterly and after material architecture changes. Record gaps in the readiness backlog.
