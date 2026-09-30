# Platform administration

The platform administration workspace is for the operator of the FSP compliance product. It is separate from insurer tenant administration and FSP access.

## Access

- Route: `/platform/dashboard`
- Required role: an active `PLATFORM_ADMIN` membership
- Local/development account: `platform.admin@example.test`
- Local/development password: `LocalDevOnly!123`

The seeded platform administrator has no tenant or FSP memberships. Tenant administrators and FSP users cannot access platform routes or platform administration RPCs.

## Initial capability scope

The workspace provides:

- a platform dashboard with tenant, FSP, questionnaire and registry summaries;
- tenant listing, creation, activation and suspension;
- initial tenant administrator invitations;
- shared reference-data value sets;
- a global system question bank;
- global and tenant-specific questionnaire creation;
- draft questionnaire editing with ordered sections and questions;
- questionnaire publication and immutable published versions;
- creation of a new draft version copied from an existing questionnaire; and
- links to the existing FSP registry import and synchronisation tools.

All platform writes pass through role-gated database functions and create audit-log entries. Published questionnaire versions cannot be edited; changes must be made in a new draft version.

## Tenant creation

Creating a tenant also creates its first administrator invitation. The server API generates the invitation token and sends it through the configured email provider. In local capture mode, the delivery is recorded without sending a real email.

## Production setup

Do not use the seeded development credentials in production. Create the production operator in Supabase Auth, grant only the `PLATFORM_ADMIN` role, require a strong unique password, and enable the configured authentication protections before launch.
