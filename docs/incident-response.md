# Incident response

## Severity

- SEV-1: confirmed/suspected cross-tenant exposure, credential compromise, destructive corruption or broad outage.
- SEV-2: material feature/worker outage, isolated unauthorized access attempt or recovery objective at risk.
- SEV-3: degraded non-critical behavior with a workaround.

## Response

1. Declare an incident, assign commander, scribe and technical lead, and record times in a restricted channel.
2. Preserve evidence. Do not paste tokens, documents, personal data or secrets into chat/tickets.
3. Contain: pause affected crons/deployments, revoke sessions/keys, disable the affected capability, or restrict access. Do not delete logs or production rows.
4. Determine affected tenants/FSPs/users, data types, time window and access path from immutable audit, provider and platform logs.
5. Eradicate and recover with reviewed fixes, credential rotation, integrity checks and scoped verification.
6. Obtain Security/Information Officer approval before reopening. Communicate using approved legal templates and applicable POPIA notification assessment.
7. Complete a blameless review with root cause, timeline, impact, detection gap, corrective owners/dates and evidence.

For suspected tenant isolation failure, immediately disable the affected endpoint/RPC, preserve database/API logs, run wrong-tenant probes and the integrity query, and rotate the secret key if the server boundary may be compromised. For leaked invitation tokens, revoke invitations and assess access/audit events; do not rely solely on token expiry. For malicious uploads, quarantine objects without destroying forensic evidence and identify every download/reviewer exposure.

Contacts, regulator/customer notification authority and out-of-band communication details must be populated in the private operational directory before launch.
