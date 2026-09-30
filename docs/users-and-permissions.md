# FSP users and permissions

`/app/users` is scoped to the FSP selected by `FspProvider`. Every active FSP member may view that FSP's active team. Only an active `ADMIN` may invite people, resend or revoke invitations, change roles, or revoke membership. `SUBMITTER` can prepare and submit compliance information; `VIEWER` remains read-only. These capabilities are defined centrally in `fspPermissions.ts` and consumed by the dashboard, submission workflow, and user administration UI.

## Invitation lifecycle

Application invitations are separate from Supabase Auth invitations. A Vercel Function creates 256 bits of randomness and sends the raw token only in `/invite/:token`. PostgreSQL stores its SHA-256 digest, normalized recipient email, role, FSP, actor, delivery state, and a database-controlled seven-day expiry. Resend rotates the token and invalidates the old link. Revocation and expiry retain history.

The public invitation lookup accepts a digest and returns only the FSP display name/number, role, and expiry for a currently valid invitation. Invalid, expired, accepted, and revoked tokens all return the same empty result. Acceptance requires an authenticated Supabase user with a verified email exactly matching the normalized recipient. It creates or reactivates the existing `fsp_users` row and audits the change. The browser replaces the token URL with `/app` after success.

## Authorization invariants

All membership mutations are trusted, `security definer` database operations that derive the actor from `auth.uid()`. The browser cannot directly write either membership or invitation records. Role change and revocation lock the FSP row before counting active administrators, serializing concurrent attempts so the last active administrator cannot be removed or demoted. Revocation preserves the membership row and records its actor and date; a later accepted invitation can reactivate it.

## Email delivery

Production uses the server-only Resend REST API and requires `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL`. Local, preview, and development environments do not send external email: the API records `CAPTURED` and returns a preview link only to the authenticated administrator who initiated the operation. Tokens and URLs are never logged or added to audit metadata. Provider failure records a safe error code and reports that the invitation was saved but not delivered, enabling an honest resend flow.

## Verification

Vitest covers the permission matrix and browser token hashing. The pgTAP suite covers table exposure, normalization, seven-day expiry, duplicate invitations, cross-FSP denial, viewer denial, and final-admin protection. Run `npm run db:reset && npm run db:test` on a machine with Docker, then `npm run test`, `npm run lint`, and `npm run build`.
