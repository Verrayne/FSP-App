# Submission history and audit trail

Prompt 12 adds immutable submission history without introducing another history store. `submission_attempts`, `submission_attempt_documents`, `submission_reviews`, `submission_review_findings`, and `submission_status_history` from Prompt 11 remain authoritative. The current mutable response and document rows are never used to reconstruct a submitted version.

## FSP experience

`/app/submissions` lists every submission visible to the selected FSP, newest reporting periods first. Period and status filters are represented in the URL. The canonical `/app/submissions/:id` route remains editable only while the current workflow is editable. Submitted records show a version selector labelled “Original submission” and “Resubmission N”, defaulting to the latest attempt.

Each selected attempt renders its snapshotted responses against that attempt's questionnaire version. Option labels are resolved without filtering inactive historical options. Affidavit text and acknowledgement data come from the attempt's declaration snapshot and referenced template. Certificate metadata comes from `submission_attempt_documents`, and downloads authorize the exact attempt/document-version pair on every request.

The FSP timeline deliberately suppresses tenant reviewer identities, internal review summaries, findings, and audit metadata. Tenant-originated user transitions are shown as “Insurer”.

## Tenant experience

The existing `/admin/submissions` queue remains the entry point. `/admin/submissions/:submissionId` adds the immutable version selector, exact historical content, review history, lifecycle status history, and a tenant-only audit trail. The audit projection is capped at 50 rows per request, displayed newest first, and returns only curated labels and a small allowlist of safe details. Unknown event types are humanized so older/newer events do not break the page.

## Authorization and storage

Migration `20260911095133_implement_submission_history.sql` removes direct browser reads from the internal attempt, status-history, and raw audit tables. Public security-invoker gateways call scope-checking private functions. Every FSP request proves an active membership of the submission's FSP. Every tenant request proves an active ADMIN or REVIEWER membership and ownership of the submission period. Parent, attempt, and document-version identifiers must match; mismatches return no document.

Historical document Vercel Functions authenticate the bearer token, call the matching authorization RPC, fetch the already-authorized storage path with the server client, and stream the private object with `Cache-Control: private, no-store`. Storage paths and signed URLs are not returned to the browser.

TanStack Query keys include role scope, FSP/tenant, submission, selected attempt, and audit page. The entire query cache is cleared on sign-out to prevent data from a prior identity surviving in memory.

## Verification

- `supabase/tests/database/submission_history.test.sql` covers gateway existence, direct-read denial, FSP and tenant access, cross-scope IDOR denial, document-version mismatch denial, and append-only audit enforcement.
- Component/unit tests cover existing submission and review behavior through the new history boundary.
- `npm run lint`, `npm test -- --run`, and `npm run build` verify the application.

Local pgTAP execution requires Docker. The linked project can be checked with transactional role/JWT probes and Supabase security/performance advisors.
