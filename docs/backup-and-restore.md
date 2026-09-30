# Backup and restore

Database backups alone do not prove that private Storage objects can be restored. Production needs documented coverage for PostgreSQL, Auth configuration, Storage objects/bucket policies, Vercel configuration and externally managed email/domain settings.

## Required policy before production

- Product and Operations approve RPO/RTO and retention by data class.
- Enable the Supabase backup/PITR capability appropriate to the plan and independently protect Storage objects.
- Encrypt backups, restrict/recertify restore access, and monitor backup freshness/failure.
- Keep infrastructure/configuration and migration history in version control; keep secrets in provider secret stores, not backups or Git.

## Restore drill

Restore into an isolated, access-restricted non-production project. Record backup timestamp, start/end time, achieved RPO/RTO and operator. Apply any later migrations. Restore Storage and confirm hashes for a representative PDF and registry file. Run the integrity SQL, RLS/pgTAP suite and role-based browser smoke tests. Verify Auth redirects without sending real email. Destroy or sanitise the drill environment under the approved procedure.

A production release cannot be approved until a timed full drill has passed and its evidence/owner/date are recorded. This repository does not claim that such a drill has occurred.
