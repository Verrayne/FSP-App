# Database foundation

The Supabase/PostgreSQL schema implements the approved Prompt 02 model. DrawSQL remains the detailed design source; this document explains implementation and security boundaries.

## Schema overview

| Area                      | Tables                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and FSP registry | `profiles`, `fsps`, `addresses`, `contacts`, `fsp_users`, `fsp_link_requests`                                                                                                            |
| Tenancy                   | `tenants`, `tenant_memberships`, `tenant_invitations`, `tenant_fsps`                                                                                                                     |
| Questionnaire engine      | `question_types`, `value_sets`, `value_set_options`, `questions`, `questionnaires`, `questionnaire_versions`, `questionnaire_sections`, `questionnaire_questions`, `question_conditions` |
| Submission management     | `submission_periods`, `submissions`, `submission_responses`, `submission_response_options`                                                                                               |
| Controlled documents      | `documents`, `document_versions`                                                                                                                                                         |
| Auditing                  | `audit_events`                                                                                                                                                                           |

All application primary keys are UUIDs. Timestamps use `timestamptz`, date-only values use `date`, and typed questionnaire answers use purpose-specific scalar columns. Multi-select answers use the relational `submission_response_options` join table, not JSON. A shared, security-invoker trigger updates `update_date` consistently.

## Identity and authorization relationships

Supabase Auth is the credential source of truth. `profiles.id` references `auth.users.id`; an Auth trigger creates the corresponding profile. First and last name may be copied from sign-up metadata for display, but authorization never reads user-editable metadata.

An FSP is global and independent of an insurer. `fsp_users` connects a user to one or more FSPs with a controlled role and membership status. `tenant_fsps` connects a global FSP to one or more tenants without duplicating the FSP. `tenant_memberships` independently controls insurer-side access. This permits one FSP to participate with multiple tenants while keeping each tenant's periods, submissions, responses, documents, and audit events isolated.

Delete rules favour historical integrity: core identity, registry, questionnaire, submission, document, and audit references are restricted. Inactive/status fields retire records that must remain interpretable. Cascades are limited to structural children whose parent cannot be meaningfully removed independently.

## Questionnaire and submissions

Question definitions and reusable value sets are separate from questionnaire versions. A version contains ordered sections and `questionnaire_questions`; responses reference that exact versioned question record. A submission period pins one questionnaire version, and validation triggers reject responses from another version.

`submission_responses` supports text, numeric, date, boolean, and single-select values. A constraint prevents more than one scalar answer on a row. Database triggers validate single- and multi-select options against the question's configured value set. Published versions referenced by history cannot be casually deleted, and configuration/options use active or retired states rather than destructive deletion.

## Documents, Storage, and auditing

`documents` is the logical record and `document_versions` is immutable version metadata. A deferred composite foreign key guarantees that `documents.current_version_id` belongs to the same document. Storage paths use:

```text
tenant/{tenant_uuid}/fsp/{fsp_uuid}/submission/{submission_uuid}/{object_uuid}
```

The `compliance-documents` bucket is private. Authenticated uploads are allowed only for active FSP administrators/submitters or tenant administrators/reviewers whose database relationships match every identifier in the path. Reads require a visible `document_versions` row for the object path. No update or delete policy exists; replacement creates a new object and version. The secret/service key remains server-only.

`audit_events` accepts inserts from trusted server workflows and permits a null actor for system events. A trigger rejects update and delete operations, making the application audit log append-only.

## RLS model

RLS is enabled and forced on every application table in `public`. `anon` has no application-table privileges. `authenticated` receives explicit read privileges and can update only its own non-authoritative profile fields. Authorization and workflow tables intentionally have no direct client write grant; later server APIs must authenticate, validate, authorize from controlled membership rows, and then use the server client.

Read paths are relationship-aware:

- FSP-side users traverse active `fsp_users` memberships.
- Tenant-side users traverse active `tenant_memberships` and `tenant_fsps` relationships.
- Submission children traverse their parent submission, preserving tenant context even for an FSP shared by two tenants.
- System questionnaire reference data is available to authenticated participants; tenant-owned configuration stays tenant-scoped.
- Storage visibility additionally requires RLS-visible database metadata.

The pgTAP suites in `supabase/tests/database` cover legitimate and denied FSP, tenant, shared-FSP, response, document, audit, and Storage paths plus core integrity constraints and Auth-triggered profile provisioning.

## Seed data

The seed is fictional and safe for local/development use. It includes two tenants, four FSPs (tenant-specific, shared, and unlinked cases), a published questionnaire with six representative questions, four sections, reference options, four submission states, typed responses, a relational multi-select response, and tenant-scoped audit events.

All seeded Auth users use the local-only password `LocalDevOnly!123`:

| Email                            | Access                                          |
| -------------------------------- | ----------------------------------------------- |
| `fsp.admin@example.test`         | FSP A administrator                             |
| `fsp.submitter@example.test`     | FSP A submitter                                 |
| `fsp.viewer@example.test`        | FSP B viewer                                    |
| `fsp.multi@example.test`         | Viewer of FSP A and FSP B                       |
| `tenant.a.admin@example.test`    | Tenant A administrator                          |
| `tenant.a.reviewer@example.test` | Tenant A reviewer                               |
| `tenant.b.admin@example.test`    | Tenant B administrator                          |
| `tenant.b.reviewer@example.test` | Tenant B reviewer                               |
| `tenant.multi@example.test`      | Tenant A admin and Tenant B reviewer            |
| `onboarding.user@example.test`   | No organisation memberships; onboarding fixture |

Never reuse these identities or their password in production.

## Migration and verification workflow

Create changes with `npx supabase migration new <name>` and review the generated SQL. For local development with Docker running:

```bash
npm run db:start
npm run db:reset
npm run db:test
```

Apply reviewed migrations to the linked non-production project with `npx supabase db push --linked`. Regenerate checked-in types after every schema change:

```bash
npm run db:types
```

`src/types/database.types.ts` is generated output and must not be edited manually. Both browser and server Supabase clients use `Database` as their generic schema type.

The Prompt 04 migrations add a partial unique pending-request index, onboarding lookup indexes,
constrained registry and membership functions, idempotent request creation, transactional reviewer
approval/rejection, RLS-only membership reads, and private elevated implementations behind
security-invoker Data API gateways. See [onboarding.md](./onboarding.md) for the disclosure and
authorization model.

Prompt 08 adds narrowly allowlisted profile/address/contact gateways. Authenticated table grants remain
read-only; the private implementations derive the actor from `auth.uid()`, require an active FSP
administrator, lock the FSP while coordinating primary rows, validate row ownership, soft-deactivate
removed records, and append PII-minimised audit events. Address type, South African postal-code, and
contact email constraints provide a final integrity layer. See [fsp-profile.md](./fsp-profile.md).

At implementation time all 50 hosted assertions passed: 42 Prompt 02 RLS/integrity/Storage checks and 8 Prompt 03 profile-provisioning/RLS checks. The local CLI test command was also attempted, but the current machine had neither Docker nor Podman, so local reset/test execution could not start. Run the three local commands above on a Docker-enabled machine before merging changes that alter migrations.

The Supabase advisors should be rerun after DDL changes. The current schema has no security/RLS lint finding and no unindexed-foreign-key finding. The project-level leaked-password-protection warning remains until enabled in Auth settings. Newly created indexes naturally appear as unused on the tiny seed dataset; retain them until production-like query statistics justify removal.

## Intentionally deferred

Questionnaire administration, operational insurer review UI, comments, notifications, imports, and
future enhancement tables remain deferred to later prompts. Tenant settings are implemented through
trusted, audited gateways; see [tenant-settings.md](./tenant-settings.md). FSP
invitations and membership administration are implemented through digest-only tokens and trusted,
audited database functions; see [users-and-permissions.md](./users-and-permissions.md).
