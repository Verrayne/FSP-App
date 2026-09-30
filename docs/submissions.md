# B-BBEE submission workflow

Final submission routes through the period's snapshotted review method and creates an immutable attempt before review begins. Changes requested by an insurer can be reopened, updated, and resubmitted without altering prior attempts. See [Submission review](submission-review.md) for states, reviewer actions, and AI limitations, and [Submission history](submission-history.md) for exact historical rendering and document authorization.

## Lifecycle and ownership

`/app/submissions/new` calls the trusted `start_submission` operation and then replaces the URL with
`/app/submissions/:id`. The operation derives the actor from `auth.uid()`, verifies an active
`ADMIN`/`SUBMITTER` FSP membership, checks the tenant-FSP relationship, open period and its published
questionnaire version, and uses the existing unique `(submission_period_id, tenant_fsp_id)` key. A
concurrent or repeated start therefore returns the same FSP-owned submission. `NOT_STARTED` placeholders
become `IN_PROGRESS`; no user-owned draft model is introduced.

Configured non-read-only placement defaults are initialized once when the row first enters
`IN_PROGRESS`. Existing responses are never overwritten. The server's Africa/Johannesburg calendar date
is authoritative for start and submit period checks.

## Metadata-driven questionnaire

The read path starts at the submission period's exact `questionnaire_version_id`; it never asks for the
latest version. Only `PUBLISHED` versions with valid sections are accepted. Sections, placements,
questions, types, value sets, ordered options, defaults, required/read-only flags, help, placeholders,
validation JSON and conditions are loaded under RLS and mapped to a typed view model.

`QuestionField` renders by type rather than business-question code. Supported mappings are:

| Type            | Control                          | Persistence                   |
| --------------- | -------------------------------- | ----------------------------- |
| `TEXT`          | text input                       | `text_value`                  |
| `TEXTAREA`      | compact textarea                 | `text_value`                  |
| `NUMBER`        | numeric input                    | `numeric_value`               |
| `PERCENTAGE`    | numeric input with `%` semantics | `numeric_value`               |
| `CURRENCY`      | Rand-labelled decimal input      | `numeric_value`               |
| `DATE`          | date input                       | `date_value`                  |
| `MONTH`         | month input (`YYYY-MM`)          | `text_value`                  |
| `BOOLEAN`       | explicit Yes/No radio group      | `boolean_value`               |
| `SINGLE_SELECT` | ordered radio/select options     | `selected_option_id`          |
| `MULTI_SELECT`  | ordered checkbox options         | `submission_response_options` |

The browser interprets only known `min`/`minimum`, `max`/`maximum`, `minLength`, `maxLength`, `pattern`
and `decimalPlaces` rules. It never evaluates database code. The trusted save operation independently
checks type, range, length, pattern, month format, stable option membership, read-only placement and the
assigned questionnaire. A database trigger enforces configured numeric decimal precision.

Multiple conditions for one target use AND visibility semantics because the current schema has no
grouping model. `SHOW`, `HIDE`, `REQUIRE` and `DISABLE` actions and the configured equality, membership,
numeric and empty operators are interpreted centrally. A question that becomes hidden is excluded from
completion/final validation and its stale response is cleared through autosave. Nested Boolean groups
are intentionally deferred.

## Drafts, autosave and navigation

Text and numeric controls save on blur; radios, selects and checkboxes save immediately. One promise
queue per placement serializes rapid writes so an older request cannot overwrite a newer answer. The
header announces restrained `Saving…`, `Saved` or `Save failed` state, failed saves remain visible, and
`beforeunload` warns only while a save is pending or failed. Typed upserts preserve one response per
submission/placement and derive `answered_by` and answer time from the authenticated session.

The compact responsive section navigator follows metadata sort order and marks a section complete only
when all currently visible required answers are valid. Initial submission, questionnaire, response and
document loading uses a layout-matched, reduced-motion-aware skeleton. Submitted rows and viewers use a
read-only review view.

## Route, certificate and declaration

`submission_route_rules` binds ordered rules to an immutable questionnaire version and exact source
placement. The prototype seed routes the `LT_10M` development option to `AFFIDAVIT` and the two larger
development bands to `CERTIFICATE`. These are demonstration rules, not legal or B-BBEE advice. Route
derivation runs in PostgreSQL after saves, records route changes, and cannot be supplied by the browser.

For `CERTIFICATE`, the client accepts only a PDF with `%PDF-` signature and at most 4 MiB. Production
uploads send the authenticated raw file to the Vercel function. The function authenticates the bearer,
calls the user-scoped prepare operation, uploads with the server secret, then finalizes metadata. Local
development uses the same prepare/finalize operations with direct Storage RLS. Paths are generated as
`tenant/{tenant}/fsp/{fsp}/submission/{submission}/{version}`. Browser Storage RLS accepts only a path
already prepared in `document_versions` for the same authenticated uploader and mutable submission. The
bucket is private; signed download URLs last 60 seconds. Replacements create a new object and
`document_versions` row and only then move
`current_version_id`; prior objects and metadata are retained. Upload failure cancels pending metadata,
and the production handler attempts object and metadata cleanup after partial failure. Malware scanning
and scheduled orphan reconciliation are not included.

For `AFFIDAVIT`, `declaration_templates` versions the prototype text with the questionnaire version.
Acceptance is an explicit checkbox/action. PostgreSQL derives the active user's name, records timestamp
and template, and writes an audit event. Any later answer change invalidates the acknowledgement. This is
an authenticated acknowledgement only—not a qualified or advanced electronic-signature platform—and
the declaration requires legal review before production.

## Review, final transaction and permissions

Review displays section-grouped human-readable answers, the derived route, current certificate metadata
or declaration identity/date, and validation warnings. A native confirmation dialog explains that final
submission makes the record read-only.

`submit_submission` locks the row and atomically rechecks membership, mutable status, period dates,
visible/conditionally-required answers, route derivation, and the route-specific current certificate or
declaration. It then sets `SUBMITTED`, `submitted_by` and server time and appends exactly one
`SUBMISSION_SUBMITTED` audit event. Repeating the call returns the submitted row without another event.
All ordinary direct table writes remain revoked/RLS-protected, so submitted answers, declarations,
metadata and Storage paths cannot be changed through the application role.

`ADMIN` and `SUBMITTER` may start, save, upload, acknowledge and submit while their active membership and
relationship remain valid. `VIEWER` can read authorized submissions only. Query keys include FSP,
tenant-FSP and submission context; database policies and trusted operations remain authoritative for
cross-FSP and cross-tenant isolation. Trusted writes immediately reject revoked membership; the load
error retry refreshes FSP context instead of treating stale React state as authority.

Audit events cover submission start, route determination, declaration acceptance, document version
activation and final submission. Document binaries are not placed in audit metadata.

## Testing and deferred scope

Unit/component coverage exercises all ten type mappings, known validation, condition operators, hidden
required behavior, skeletons, ordering, saved state, autosave/error, conditional visibility, navigation,
certificate/declaration review, confirmation and read-only roles. pgTAP transaction suites exercise the
affidavit and certificate branches, actor attribution, idempotency, typed responses, invalid questions
and options, cross-FSP denial, private path policy, document activation, final state, audit uniqueness and
post-submit immutability. Full browser flows require resettable dedicated submission fixtures; they must
not reuse or permanently submit shared development rows.

The linked-project security and performance advisors were run after the migrations. No Prompt 06
database/RLS/function security finding remains. The security advisor reports the project-level leaked
password protection setting as disabled; enable it in Supabase Auth before production. The two new
foreign-key index findings were resolved. Remaining performance notices are unused-index observations on
the low-traffic development database, including newly created constraint-supporting indexes, so indexes
were retained rather than removed before representative production query statistics exist.

Prompt 07 owns user listing, invitations, role changes and access revocation UI. Insurer review,
comments, assignments, notifications, FSCA import, revision workflows, questionnaire administration,
malware scanning and advanced digital signing remain deferred.
