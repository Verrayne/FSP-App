# FSP profile

`/app/profile` is the organisation profile for the FSP selected by `FspProvider`; `/app/account/profile` remains the signed-in person's account profile. Profile, address, and contact requests use separate TanStack Query keys containing the selected FSP ID, so a switch cannot display another FSP's cached data. Failure of either secondary collection does not hide the master profile.

## Data ownership

| Data class                   | Examples                                                                           | Owner and edit rule                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Regulatory/source-controlled | FSP number, registered name, registration number, FSP type, status, effective date | Read-only for FSP users. The current development seed identifies its source; no live FSCA import or refresh exists.  |
| FSP-maintained master data   | Trading name, addresses, contacts                                                  | Global to the FSP, not duplicated per insurer. Active FSP administrators may change only explicitly accepted fields. |
| Submission snapshot          | Revenue, ownership declarations, B-BBEE level, certificate or affidavit facts      | Belongs to a submission and reporting period. Profile edits neither relocate nor rewrite historical submission data. |

The current `fsps` schema has no organisation VAT number, telephone, email, or website columns. Those values were not invented. A contact is business directory information and is deliberately separate from a platform user or `fsp_users` membership: adding or removing a contact never grants or revokes access.

## Authorization and mutation lifecycle

All active FSP roles may read their authorised FSP profile. Only the per-FSP `ADMIN` role receives `profile:edit`, `addresses:manage`, and `contacts:manage` capabilities in the central frontend permission map. PostgreSQL repeats that decision from `auth.uid()` and active `fsp_users` state; hidden controls are not the security boundary.

Authenticated clients retain read-only table grants. Public security-invoker gateways expose narrow operations for trading-name update and address/contact save or removal. Private security-definer implementations have an empty search path, validate the selected FSP and row ownership, accept no protected FSP columns or replacement `fsp_id`, and serialize primary changes by locking the FSP row. Existing partial unique indexes enforce at most one active primary contact per FSP and one active primary address per FSP and address type.

Removal is audited soft deactivation (`active = false`, `primary = false`). Profile and collection mutations append actor-derived audit events. Metadata records field/type context only and does not copy contact or address PII.

## Validation and presentation

React Hook Form and Zod provide immediate validation, while trusted PostgreSQL functions repeat length, required-field, country-code, email, telephone, and South African postal-code checks. Forms preserve entered values after a save error. Source-controlled fields are grouped separately and explicitly labelled read-only; the UI says that regulatory import/refresh is not active rather than implying live FSCA synchronisation.

The profile test matrix covers validation, loading and partial errors, per-role actions, cache isolation, allowlisting/mass assignment, cross-FSP ownership, primary behaviour, revoked memberships, per-FSP roles, auditing, and the contact/platform-user separation. Playwright covers administrator profile/address/contact workflows, multi-FSP viewer switching, read-only actions, and mobile overflow where hosted seed identities are configured.

## Deferred

FSCA import/refresh, insurer review workflow, notifications, comments, tenant settings, submission prefill/snapshot enhancements, and Prompt 09 work remain deferred.
