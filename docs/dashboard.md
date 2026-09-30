# FSP dashboard

## Scope and route

The authenticated FSP dashboard is served at `/app/dashboard`. It uses the active membership from
`FspProvider`; the page does not re-fetch identity or allow an FSP identifier from the URL to bypass
onboarding. Start, continue and view actions now connect to the Prompt 06 workflow documented in
[submissions.md](./submissions.md).

Normal application pages use one clear heading and should not add generic explanatory subtitles when
the page purpose is already evident from its heading and content. The dashboard therefore renders the
heading `Dashboard` without an eyebrow, welcome banner or description.

## Data and tenant context

The read path follows `FSP → tenant_fsps → submissions → submission_periods`. The first RLS-protected
query fetches only active `tenant_fsps` rows for the current FSP, with the associated tenant name. A
second query pair is explicitly filtered by both the selected tenant ID and tenant-FSP relationship ID;
it fetches at most 12 recent periods and 12 recent submissions and does not fetch responses, documents,
binaries or audit history.

Most FSPs have one active tenant relationship and need no extra UI. A globally shared FSP can have more
than one relationship, so the dashboard shows a compact `Reporting relationship` selector. Selecting an
insurer changes the tenant-FSP ID used by the summary query. It never merges submissions from two
tenants. This is a reporting-context choice, not a new authorization mechanism; PostgreSQL RLS remains
authoritative.

## Current period and submission

Period resolution uses the South African calendar date and is deterministic:

1. the open period containing today with the nearest closing date;
2. otherwise the next draft/open period by opening date;
3. otherwise the most recently closed, non-archived period;
4. otherwise no period.

PostgreSQL `date` values are parsed as calendar dates and formatted in `Africa/Johannesburg`, avoiding a
UTC conversion that could move the displayed day. The current submission is the row whose
`submission_period_id` matches the resolved period and whose `tenant_fsp_id` matches the selected
relationship. If no row exists, the UI presents `Not started` without creating a placeholder row.

## Status, actions and roles

Status labels and actions are centralized in `dashboardPresentation.ts`:

| Database status | Label        | ADMIN/SUBMITTER                       | VIEWER                                 |
| --------------- | ------------ | ------------------------------------- | -------------------------------------- |
| `NOT_STARTED`   | Not started  | Start submission while period is open | View existing row, otherwise read-only |
| `IN_PROGRESS`   | In progress  | Continue submission                   | View submission                        |
| `SUBMITTED`     | Submitted    | View submission                       | View submission                        |
| `UNDER_REVIEW`  | Under review | View submission                       | View submission                        |
| `COMPLETED`     | Completed    | View submission                       | View submission                        |
| `REJECTED`      | Rejected     | View submission                       | View submission                        |

Actions navigate to the submission start or detail routes. The dashboard itself performs no submission
writes; the start route calls the idempotent trusted operation. Hiding mutating actions from viewers is a
usability measure and PostgreSQL independently enforces every workflow write.

## Loading, caching and failures

TanStack Query keys are:

- `['fsp-dashboard', 'relationships', fspId]`
- `['fsp-dashboard', 'summary', fspId, tenantId, tenantFspId]`

The full FSP and tenant context in each key prevents cache contamination. A newly selected FSP shows a
layout-matched skeleton until that exact context is ready; data from the previous FSP is never used as
placeholder data. Valid content remains visible during background refetches. Initial loading has a short
minimum display interval so the skeleton is perceptible and avoids a flash of incomplete content.
Skeleton bars are hidden from assistive technology, the containing region reports busy status, and
animation stops under `prefers-reduced-motion`.

Relationship and critical summary failures replace loading with a generic, retryable error. Missing
relationships and missing periods have separate deliberate empty states and never fabricate status,
deadline or action values.

## Security boundary

The browser uses only the publishable Supabase key. Every query is explicitly filtered to the active FSP,
tenant and tenant-FSP relationship in addition to existing RLS. Prompt 05 adds no schema, policy, index,
generated-type or seed change. Database tests cover authorized and denied FSP reads, multi-FSP reads,
shared-FSP relationship scoping and the absence of viewer write access.
