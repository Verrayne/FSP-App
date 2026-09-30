# FSP claiming and onboarding

Prompt 04 answers which Financial Services Provider (FSP) an authenticated user may act for. It
does not implement the Prompt 05 dashboard or any submission workflow.

## State model

Onboarding state is derived on demand; it is not copied into another status column.

```text
NO_FSP
   │ request access
   ▼
LINK_PENDING
   ├── authorised review → ACTIVE
   └── rejection         → REJECTED
                              │ corrected/new request
                              └──────────────→ LINK_PENDING
```

`ACTIVE` wins whenever the user has at least one active membership attached to an active FSP.
Otherwise the newest pending request wins, followed by the newest rejection. `fsp_link_requests`
is evidence of a review workflow only; `fsp_users` remains the authoritative membership table.

## Routes

- `/app` resolves state without briefly rendering the FSP workspace.
- `/app/onboarding` introduces the link process and shows a rejection where relevant.
- `/app/onboarding/find-fsp` provides one debounced number/name search.
- `/app/onboarding/fsp/:fspId` shows the read-only confirmation projection.
- `/app/onboarding/pending` shows the user's pending request.
- `/app/account/profile` remains available before approval.
- `/app/dashboard` and the existing workspace routes require an active current FSP.

## Registry search and disclosure

`search_fsps_for_onboarding` searches the local PostgreSQL registry. It enforces authentication, a
two-character minimum, a maximum page size of 50 and server-side pagination. Matching covers the
FSP number, registered name and trade name with normalized spacing and case-insensitive comparison.
Trigram indexes support partial matching at registry scale.

The operation returns only organisation identifiers, regulatory status, status effective date and
the central claimability decision. It does not return source/import metadata, contacts or addresses.
`get_fsp_for_onboarding` returns one confirmation record plus one active primary address; it never
returns contact names, email addresses or telephone numbers.

Claimability is centralized in `private.fsp_is_claimable`. The prototype accepts active records
whose registry status is `AUTHORISED`, `AUTHORIZED` or `ACTIVE`. Other records may appear in search
but cannot be requested. This is an application eligibility rule over the current seed vocabulary,
not a representation of additional FSCA legal rules.

## Request lifecycle

The browser calls `request_fsp_link(fspId)` and supplies no user ID, status, reviewer, verification
method or membership role. The operation gets the user from `auth.uid()`, verifies eligibility and
checks the database for an active membership. A partial unique index allows only one pending request
per user/FSP. Repeated clicks return the existing request. A new request starts as `PENDING` with all
review fields null and writes `FSP_LINK_REQUESTED` to the append-only audit store.

Users can select only their own request rows through RLS. Browser roles still have no direct INSERT
or UPDATE grants on requests and no write access to `fsp_users` or `audit_events`.

## Prototype approval and rejection

`approve_fsp_link_request(requestId)` and `reject_fsp_link_request(requestId, reason)` are deliberately
not exposed as ordinary FSP UI controls. They are authenticated PostgreSQL operations for the
development/reviewer workflow. The actor must have an active `ADMIN` or `REVIEWER` membership in an
active tenant that is actively mapped to the request's FSP. Self-review is explicitly denied.

Elevated implementations live in the non-exposed `private` schema because they perform controlled
writes or constrained projections that browser roles are otherwise never allowed to make. The Data
API exposes only `SECURITY INVOKER` gateway functions. Private implementations have an empty
`search_path`, derive the actor from `auth.uid()` and perform operation-specific authorization.
`PUBLIC` and `anon` execution is revoked throughout and only `authenticated` may use the gateways.
No secret/service key is present in the browser.

Approval locks the request and FSP row, rechecks `PENDING`, creates or reactivates the membership,
updates the request and appends audit events in one PostgreSQL transaction. The first active member
for an FSP receives `ADMIN` and becomes primary; later approved users receive the trusted initial
`VIEWER` role. The requester's input never controls this role. Repeated approval is rejected and the
unique membership constraint prevents duplication. Events are:

- `FSP_LINK_APPROVED`
- `FSP_MEMBERSHIP_CREATED`
- `FSP_LINK_REJECTED`

The current mechanism is suitable for controlled development and automated security testing. It is
not production-grade proof of identity or authority. Prompt 09 owns the operational reviewer UI,
review queues and richer verification processes. Production notification and support workflows also
remain deferred.

## Current FSP context

`FspProvider` loads only active memberships through `get_my_fsp_memberships`. One FSP is selected as
the application context, preferring a still-valid locally remembered selection, then the primary
membership, then the first permitted membership. A stored ID is discarded if it is no longer in the
server result. Users with more than one membership receive a compact switcher.

This state is convenience, not authorization. Every later query must continue to carry its FSP key
and pass database RLS/server checks. Revoked, suspended and inactive memberships disappear on query
refresh and cannot be restored from local storage.

## Verification and testing

The database test matrix lives in `supabase/tests/database/fsp_onboarding.test.sql`. It covers registry
disclosure, request ownership, duplicate prevention, direct-write denial, cross-user privacy,
self-approval denial, mapped-reviewer authorization, atomic approval, initial role assignment,
audit events, rejection/retry and inactive-FSP denial. UI tests cover state routing, search states,
confirmation, pending/rejected presentation, context restoration and multi-FSP switching.

The Supabase CLI currently requires Docker/Podman to run the checked-in pgTAP file, even with the
linked option in this environment. Equivalent hosted transactional pgTAP checks are therefore run
through the Supabase database connection and rolled back after completion.

## Deferred

Dashboard data, FSP profile editing, invitations/user administration, questionnaires, submissions,
documents, insurer queues, notifications and FSCA import/synchronisation remain assigned to later
prompts.
