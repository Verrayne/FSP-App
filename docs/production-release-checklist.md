# Production release checklist

Release: __________ Commit: __________ Window: __________  
Release owner: __________ Rollback owner: __________ Security approver: __________

## Stop conditions

- [ ] No open P0 or P1 finding in the readiness backlog.
- [ ] Legal/Information Officer approved Privacy, Terms, retention and processor/cross-border records.
- [ ] Current backup is healthy and a timed DB + Storage restore drill has passed.
- [ ] Monitoring and security/worker alerts are installed and exercised.

## Build and security

- [ ] `npm ci`, format check, lint, build and unit tests pass on the release commit.
- [ ] All Playwright and pgTAP tests pass in an isolated resettable staging environment.
- [ ] `npm audit --omit=dev`, secret scanning and Supabase advisors are reviewed.
- [ ] Integrity query returns only zero/expected counts.
- [ ] Wrong-FSP, wrong-tenant/shared-FSP, revoked-user and platform-escalation probes pass.
- [ ] Upload validation, malware quarantine and authorised downloads pass.

## Configuration

- [ ] Production Vercel/Supabase project IDs and custom domain are recorded and isolated from staging.
- [ ] Node 22–24, exact HTTPS app origins and Auth redirects are verified.
- [ ] Secret/publishable keys are correctly separated; secrets are rotated and access reviewed.
- [ ] Resend domain/from address and email links are verified.
- [ ] AI is disabled or the approved provider/privacy configuration is tested.
- [ ] FSCA source authority and first snapshot reconciliation are approved.

## Deploy and observe

- [ ] Migration order/rollback-forward plan reviewed; pre-deploy backup verified.
- [ ] Staging rehearsal used the same artifact/migrations.
- [ ] Health endpoint and deployed security headers pass.
- [ ] Public/Auth/FSP/tenant/platform smoke journeys pass.
- [ ] Invitation, document, notification and registry worker canaries pass without sensitive logs.
- [ ] Error rate, latency, DB and queue backlog are observed through the agreed window.
- [ ] Release evidence and decision are stored; stakeholders are notified.
