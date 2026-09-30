# Tenant administration settings

Prompt 10 adds an administrator-only settings area to the insurer workspace. The routes are
`/admin/settings/organisation`, `/admin/settings/users`, `/admin/settings/submission-periods`, and
`/admin/settings/fsps`. The Settings navigation item and route tree use the central tenant capability
map, while PostgreSQL independently authorizes every read and mutation against the caller's current
active tenant membership.

## Organisation and users

Tenant administrators may edit only the organisation display name. The tenant code and status are
stable, read-only values. Tenant user administration exposes human-readable Tenant Administrator and
Compliance Reviewer roles; platform roles are never assignable from this workflow. Removing a tenant
membership is a soft revocation and does not delete the Auth user, profile, or other workspace access.

Invitations use a cryptographically random token. Only its SHA-256 digest is stored. The public lookup
returns the insurer name, assigned role, and expiry only, and acceptance requires an authenticated user
whose verified Auth email matches the invited email. Invitations expire after seven days, may be
resent or revoked, and cannot be reused. Local development captures the link; deployed environments
send through the configured Resend integration.

The database locks the tenant row before administrator-count changes. Demotion, removal, and invite
acceptance use the same lock order, so concurrent requests cannot leave an active tenant without an
active Tenant Administrator.

## Submission periods

Administrators can create periods only from published questionnaire versions that are global or owned
by their tenant. Open dates must precede close dates, and open periods may not overlap for the same
tenant. Draft periods with no submissions may be deleted.

Once a period is open, its year, open date, and questionnaire version are fixed; only its name, close
date, and transition to Closed may change. Closed or archived periods are read-only. A questionnaire
version cannot change after submissions exist, preserving historical interpretation.

## FSP relationships

The registry search returns a limited non-sensitive projection of global FSP records. Linking adds or
reactivates the tenant-to-FSP relationship and may set a tenant-specific broker reference. It never
creates an FSP user membership. Delinking is soft: future portfolio participation stops while
submissions, responses, documents, and audit history remain intact. A global FSP may remain linked to
another tenant independently.

## Security and verification

RLS is enabled and forced on the invitation table and direct invitation-table access is removed.
Narrow security-invoker gateways call private trusted implementations that derive the actor from
`auth.uid()`, validate tenant ownership, lock mutable authorization rows consistently, constrain roles
and questionnaire scope, and append audit events. Browser-provided tenant identifiers are selectors,
never proof of access.

The pgTAP suite in `supabase/tests/database/tenant_admin_settings.test.sql` covers cross-tenant denial,
role escalation, final-administrator protection, invitation lifecycle and identity checks, period
rules, shared-FSP behavior, history preservation, and auditing. Frontend tests cover role routing,
validation, and tenant-scoped query keys.

Prompt 11 review decisions, comments, assignments, notifications, questionnaire authoring, platform
administration, support impersonation, and FSCA imports remain outside this implementation.
