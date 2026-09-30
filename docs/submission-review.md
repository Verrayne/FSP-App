# Submission review

Each submission period has one review method: **Automatic acceptance**, **Human review**, or **AI review**. The method is copied to a submission when it is created. Changing a period affects only future submissions and never reinterprets an existing record.

## State model

- Automatic acceptance: valid final submission → `COMPLETED` in the same transaction.
- Human review: valid final submission → `UNDER_REVIEW` → `COMPLETED`, `CHANGES_REQUESTED`, or `REJECTED` after a reviewer decision.
- AI review: valid final submission → `SUBMITTED` while durable work is queued → `COMPLETED` only for a high-confidence result without blocking or unresolved findings; every other result becomes `HUMAN_REVIEW_REQUIRED`.
- Changes requested: an authorised FSP administrator or submitter sees reviewer feedback, reopens the record to `IN_PROGRESS`, updates it, and resubmits. Each resubmission creates a new immutable attempt and review.

Human decisions include the status originally loaded by the reviewer. The database locks the submission and rejects a stale decision, preventing two reviewer tabs from overwriting one another. All transitions append status history and meaningful audit events.

## Evidence and access

`submission_attempts` records an immutable JSON snapshot of questionnaire responses, declaration acceptance, route, review method, actor, and timestamp. `submission_attempt_documents` pins exact document versions. Reviews and findings target an attempt rather than mutable draft data.

Browser users cannot insert, update, or delete attempts, reviews, findings, history, or AI jobs. Tenant reads are mediated by tenant-scoped RPCs; FSP feedback exposes only findings explicitly marked as visible. Compliance files remain in private storage with short-lived authorised downloads.

## AI boundary and current limitation

AI review is deliberately unavailable in production. The private `AI_REVIEW` capability defaults to false, the settings UI disables the option, and the database rejects attempts to select it. No production provider or model has been selected.

The durable worker endpoint is `/api/ai-review/process`. It claims queued jobs using the server-side Supabase secret, validates structured output with Zod, applies results idempotently, retries with bounded backoff, and escalates terminal technical failures to a human. The endpoint requires `CRON_SECRET`; job tables and worker RPCs are inaccessible to browser roles.

For local and automated testing only, set `AI_REVIEW_ADAPTER=mock` and choose `AI_REVIEW_MOCK_SCENARIO` from `PASS`, `ESCALATE_BLOCKING`, `ESCALATE_UNRESOLVED`, `TECHNICAL_FAILURE`, or `MALFORMED_RESPONSE`. The mock refuses to run when `VERCEL_ENV=production`.

Before production enablement, the provider must be approved with a documented lawful purpose, POPIA operator agreement, approved processing/storage region, no training or secondary use, retention/deletion controls, encryption, access logging, incident handling, and a completed DPIA. The present worker passes only immutable response values, declaration metadata, and document metadata. It does not pass public file URLs, credentials, user email addresses, or hidden reasoning, and it does not inspect document contents.

Deterministic validation remains authoritative. AI may recommend completion or escalation but never rejection. Low confidence, ambiguity, blocking findings, invalid output, and exhausted retries all require a human reviewer.

`CRON_SECRET` and `SUPABASE_SECRET_KEY` must remain server-only and must never use the `VITE_` prefix. Enabling AI requires a controlled database release that updates `private.system_capabilities` only after the provider adapter and security/privacy review are complete.
