# Notifications

Notifications use a durable PostgreSQL outbox. Authoritative claim, period, submission, review, and invitation transitions publish idempotent `notification_events` in the same transaction as the business change. A scheduled Vercel worker claims events with `FOR UPDATE SKIP LOCKED`, resolves current active recipients, creates one inbox item per user, and queues optional email delivery. A second scheduled pass claims email deliveries and records provider acceptance as `SENT`; it does not claim mailbox delivery.

## Recipient rules

- Claim results are sent only to the claimant. Claim approval and rejection email cannot be disabled.
- Submission start, submit, and resubmit confirmations go to the initiating user.
- Human-review and AI-review alerts go to active tenant reviewers. Tenant administrators are included according to tenant defaults.
- Changes requested and rejected outcomes go to active FSP administrators and submitters and their email cannot be disabled.
- Completed outcomes also appear in-app for active FSP viewers.
- Period openings and deadline reminders go to active administrators and submitters of linked FSPs.
- Recipient lists are deduplicated by `(event_id, user_id)`. Email access is checked again immediately before sending.

Invitation emails retain their token-specific API flow, but now share the email-provider abstraction. Invitation tokens never enter the notification outbox, metadata, application logs, or inbox copy.

## Scheduling and delivery

Vercel calls `/api/notifications/process` every minute and `/api/notifications/reminders` daily at 06:00 UTC (08:00 SAST). Both require `Authorization: Bearer $CRON_SECRET`. Production email requires `RESEND_API_KEY`, `EMAIL_FROM`, and `PUBLIC_APP_URL`. Non-production delivery uses `LOCAL_CAPTURE` and makes no external email request.

Event and delivery claims recover locks older than ten minutes. Failures use bounded retries and safe error codes; user addresses and message bodies are not logged. Provider webhooks are intentionally out of scope, so `SENT` means accepted by the provider.

## Security and testing

Outbox and delivery tables have forced RLS and are inaccessible to browser roles. Users can select only their own inbox and explicit preferences. All mutations use narrowly granted RPCs, and internal action paths are constrained to `/app` or `/admin`. The authenticated query cache is cleared at sign-out.

`supabase db reset --local` creates representative unread/read inbox entries and `PENDING`, `SENT`, and `FAILED` delivery records. Use `fsp.admin@example.test` or `tenant.a.reviewer@example.test` with the local seed password. Run `npm run db:test` for RLS, IDOR, idempotency, preference, and worker-materialization coverage.
