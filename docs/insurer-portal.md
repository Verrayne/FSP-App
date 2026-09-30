# Insurer portal

The submission queue defaults to **Needs review** and supports work-state, review-method, route, period, and search filters. Administrators and reviewers can complete a review, request changes with a required reason, or reject with a required reason. Viewer access remains read-only. AI findings are displayed as structured source/severity records rather than hidden model reasoning.

## Workspace boundary and routes

The insurer workspace uses `/admin/dashboard`, `/admin/fsps`, `/admin/submissions`, and `/admin/submissions/:submissionId`. It is separate from the FSP workspace under `/app`. Both contexts restore after authentication so a user with both membership types can move deliberately between workspaces from the account menu. FSP roles never grant insurer permissions, and insurer roles never grant FSP permissions.

`TenantProvider` loads only active memberships for active insurers through `list_my_tenant_memberships()`. One insurer is selected automatically. Multi-insurer users can use the header selector; the last choice is stored per user in local storage and accepted only when it still appears in the authorised result. A removed, revoked, suspended, or fabricated preference is discarded.

Every insurer query key includes the selected insurer ID. Switching insurers therefore renders the new key's loading state and cannot label cached insurer-A data as insurer B. Deep links use the current validated context conservatively: a submission owned by another authorised insurer is not auto-discovered or auto-switched; the user must select the correct insurer first.

## Roles and permissions

Prompt 02 established `ADMIN`, `REVIEWER`, and `VIEWER` tenant roles, so Prompt 09 preserves that vocabulary. `src/features/tenant/permissions.ts` is the central UI capability map. All three roles can view the portal, dashboard, portfolio, and submissions. `ADMIN` reserves future settings access; `ADMIN` and `REVIEWER` reserve future review capability. Prompt 09 exposes no settings or review UI.

| Resource or capability                | FSP member        | Tenant `ADMIN`                   | Tenant `REVIEWER`                | Tenant `VIEWER`                  |
| ------------------------------------- | ----------------- | -------------------------------- | -------------------------------- | -------------------------------- |
| FSP workspace for an owned membership | Role-dependent    | Only if separately an FSP member | Only if separately an FSP member | Only if separately an FSP member |
| Insurer dashboard and FSP portfolio   | No                | Yes                              | Yes                              | Yes                              |
| Insurer submission queue/detail       | Own FSP path only | Own insurer                      | Own insurer                      | Own insurer, read-only           |
| Submission review actions             | No                | Prompt 11                        | Prompt 11                        | No                               |
| Insurer settings                      | No                | Prompt 10                        | No                               | No                               |

No trusted platform-administrator or support authority exists yet. Prompt 09 does not invent metadata flags or global roles for either; both remain restrictive and deferred.

## Dashboard definitions

`get_tenant_dashboard(tenant_id, today)` validates authenticated active membership and an active insurer, then aggregates in PostgreSQL against the current period. The current period is an `OPEN` row owned by the insurer whose inclusive `open_date`/`close_date` contains the supplied South African calendar date. If several overlap, the earliest closing period is chosen deterministically. No historical period is substituted when none is open.

- **Total FSPs:** active `tenant_fsps` relationships for the insurer.
- **Submitted:** active relationships with a current-period submission in `SUBMITTED`, `UNDER_REVIEW`, `COMPLETED`, or `REJECTED`.
- **Outstanding:** active relationships with no current-period submission, or one in `NOT_STARTED`/`IN_PROGRESS`.
- **Under review:** current-period submissions in `UNDER_REVIEW`.
- **Completed:** current-period submissions in `COMPLETED`.

The left join intentionally counts absence as outstanding without creating fake submissions. Metrics and recent submissions have independent queries and error states, so a local failure does not blank the other section.

## Portfolio and submission reads

`list_tenant_fsps` starts from `tenant_fsps`, not the global FSP table. It adds the global FSP identity plus only that relationship's broker reference/status and current-period submission. Search covers registered/trading name, FSP number, and tenant-specific broker reference. Submission, regulatory, and relationship filters plus allowlisted global sorting and 10/25/50-row pagination execute in PostgreSQL. Search wildcards are escaped and the count uses `count(*) over()` rather than loading all rows. Submission detail also exposes immutable attempt selection, lifecycle history, and a bounded curated audit projection as documented in [Submission history](submission-history.md).

`list_tenant_submissions` defaults to the current open period, permits only an explicitly tenant-owned historical period, and implements server search, status/route filters, allowlisted sorting, pagination, and count. URL parameters preserve useful table state; the RPC remains the authoritative validator.

An FSP remains one global `fsps` row even when linked to both insurers. Relationship IDs, broker references, periods, submissions, responses, and documents remain tenant-specific. A shared FSP never authorises access to the other insurer's submission.

## Read-only overview and documents

`get_tenant_submission_header` validates active membership and derives ownership from the submission's own `submission_periods.tenant_id`; it does not authorise through another relationship for the same global FSP. A wrong-context ID returns no row and the UI shows a non-disclosing not-found/access error.

The overview uses parent-scoped RLS reads for the exact `questionnaire_version_id`, stored response rows, single-select labels, relational multi-select options, declaration, and active document metadata. Only answered/applicable rows are rendered. Percentages are stored as percentage points in this schema, currency is ZAR, and dates use South African formatting.

The `compliance-documents` bucket stays private. `GET /api/admin/submissions/:submissionId/documents/:documentId` authenticates the bearer token, validates the insurer and submission through the tenant-owned header RPC, verifies the active document/current version through user-scoped RLS, and only then uses the server secret client to stream the object. It returns no storage path, uses a safe attachment filename, and sends `private, no-store`. A known ID or path alone grants nothing.

## Database security and performance

Migration `20260911070802_implement_insurer_portal.sql` adds private security-definer implementations behind explicitly granted public gateways. Each checks `auth.uid()`, active membership, role, and insurer, uses an empty search path, schema-qualifies objects, and validates allowlists. `20260911072824_harden_inactive_tenant_rls.sql` closes inactive-insurer tenant paths. `20260911073717_fix_inactive_tenant_rls_recursion.sql` uses the audited predicate in policies to avoid recursive joins while preserving the independent FSP path.

Indexes cover submission period/status/submitted-date access, active tenant relationships, and broker-reference trigram search. Existing FSP name/number trigram indexes support portfolio search. The small development fixture cannot establish production-scale planner behaviour, so plans should be rechecked with representative portfolio cardinality before launch.

The pgTAP matrix covers anonymous/FSP-only/tenant roles, tenant rows, relationships, submissions, responses, document metadata, Storage objects, shared FSPs, multi-insurer roles, revocation, inactive insurers, input validation, and continued FSP-side access. Local execution requires Docker Desktop or Podman.

## Seed identities and handoff

Fictional seeds include Tenant A/B administrators and reviewers plus `tenant.multi@example.test`, which is `ADMIN` for Cape Horizon and `REVIEWER` for Umoya Mutual. The insurers each link their own FSP and the same Ubuntu Meridian global FSP, with separate broker references and submissions.

Prompt 10 can add insurer settings and membership/period administration using the central permissions and context. Prompt 11 can add review actions beside the read-only overview, but must retain submission-owned tenant validation. Settings, tenant invitations, FSP linking, review decisions/comments, assignments, notifications, exports, advanced audit UI, FSCA import, platform administration, and support impersonation are intentionally deferred.
