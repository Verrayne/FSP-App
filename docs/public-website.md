# Public website

Prompt 01 creates the complete unauthenticated product website while preserving the Prompt 00 application architecture.

## Audience and content boundaries

The primary audience is South African Financial Services Providers responding to insurer B-BBEE information requests. The copy explains planned account, FSP-access, document and submission workflows without presenting eligibility decisions or legal advice. Affidavit language is deliberately conditional because requirements can vary by legislation, sector code, submission period and tenant configuration.

The product preview on the homepage is decorative demo content. Its 2026 period, status and deadline are not application data and do not establish a real submission period.

## Placeholder functionality

- Login and registration routes remain Prompt 00 placeholders.
- The contact form validates locally and does not transmit or persist information.
- Operator identity, support email and business hours are visible placeholders.
- No analytics, advertising tracker or CMS has been added.
- FSP lookup, access requests, documents and submissions are explanatory only.

## Required operational and legal work

Before production launch, obtain legal review and replace or confirm:

- service-operator and company details;
- support and privacy contact channels;
- Information Officer details and data-subject request process;
- information categories, recipients and subprocessors;
- retention schedules;
- hosting locations and cross-border safeguards;
- cookie/session notice requirements;
- governing law, jurisdiction, liability and service-availability terms;
- effective dates and change-notification processes.

Connect the contact form only through an approved server-side support/notification service. The integration must revalidate input, apply anti-abuse controls, avoid sensitive logging, provide accurate delivery feedback and document retention.

Any future analytics integration requires an explicit product/privacy decision and should be limited to the minimum data needed.
