# Insurer dashboard reporting

The dashboard at `/admin/dashboard` separates the current open period and Total FSPs
from submission metrics. Total FSPs opens the full insurer portfolio, with all 26
requested columns, search, continuous scrolling, Excel download, and report email.
The table starts with 20 rows and progressively appends batches of 20 while open,
with a spinner while more rows are being prepared.

The Last day / Last week / Last month selector shows portfolio status at the end
of a rolling window ending now. The totals therefore remain current. Comparison descriptions are omitted from
the status cards. The open period and Total FSPs do not change when selecting a
window.

## Report definitions

- **Complete / incomplete**: current-period B-BBEE submission status `COMPLETED`
  versus all other linked FSPs, including those with no submission.
- **Valid / expired**: the recorded certificate/affidavit expiry date, inclusive
  of that date. A submitted certificate or signed affidavit attachment must also
  exist. Missing or malformed expiry data is “Not recorded”, not expired.
- **Enterprise type**: explicitly recorded `ENTERPRISE_TYPE` questionnaire answers.
  Every active option in an `ENTERPRISE_TYPE` value set appears, including zero
  counts. Until that set exists, EME, QSE and Generic from the reference report
  appear alongside “Not recorded”. Enterprise type is never inferred from revenue.

Each graph and its top-right expand button open a modal with current counts,
horizontal monthly bars, and an exact 12-month data table. The close control stays
at the top right while scrolling. Excel exports include current data, monthly
figures, two editable native bar charts, and explicit gaps in historical coverage.
Percentage fields, FSP numbers and contact information are available in the
portfolio workbook. All text is encoded as Excel strings rather than formulas.

## Source data and missing fields

FSP identity, classification and FSCA status come from the FSP registry. Region
comes from the primary/business address; portal registration means an active FSP
membership attached to an active application profile. Contacts come from the
primary contact, with submitted `CONTACT_NAME` / `CONTACT_EMAIL` answers taking
precedence. Link date belongs to the insurer's relationship with the FSP.

Compliance answers come from the latest immutable submitted attempt for that
insurer-FSP relationship, never an unfinished draft. The relevant questionnaire
question codes are:

```text
TIA_FSP_NUMBER
BBEEE_CONTRIBUTOR
BBEEE_LEVEL
BBEEE_PERCENTAGE
BLACK_OWNERSHIP_PERCENTAGE
BLACK_FEMALE_OWNERSHIP_PERCENTAGE
BLACK_DESIGNATED_GROUP_OWNERSHIP_PERCENTAGE
BLACK_YOUTH_PERCENTAGE
BLACK_DISABLED_PERCENTAGE
BLACK_UNEMPLOYED_PERCENTAGE
BLACK_RURAL_PERCENTAGE
BLACK_MILITARY_VETERANS_PERCENTAGE
BBEEE_CERTIFICATE_EXPIRY_DATE (or CERTIFICATE_EXPIRY_DATE)
CONTACT_NAME
CONTACT_EMAIL
ENTERPRISE_TYPE
ENTERPRISE_NATURE
```

The current seeded questionnaire does not collect many of these fields. Their
columns are present and marked “Not recorded”; adding the relevant questions to
a future questionnaire version will populate them after submission. Tia FSP
numbers are separate from broker references; the report does not assume they
are equivalent. The attachment date is the latest certificate or signed
affidavit version included in the submitted attempt.

## Historical capture and security

Private portfolio snapshots start on 1 October 2026. Deferred database triggers
capture changes to registry, membership, contact, submission and questionnaire
sources at transaction end. A Supabase `pg_cron` job also captures portfolios at
midnight South African time, so automatic period/date transitions are recorded.
Unchanged states are carried forward; no historical values are invented before
capture began. Existing client reports must be imported through a separately
validated import process to fill earlier months.

The reporting RPC verifies the authenticated user's active insurer membership and
tenant status. Snapshot tables have no browser grants and cannot be populated by
the browser. Query cache keys include both tenant and selected window. Reports
for another insurer cannot be requested by changing an ID in the browser.

## Email delivery and hosting

The recipient form sends the selected report as a real `.xlsx` attachment via
`POST /api/reports/email`. The server authenticates the bearer token, requires an
active insurer ADMIN or REVIEWER role, regenerates the report from authorized
database data, and permits at most five requests per user per ten minutes.
The body cannot supply arbitrary report rows. Viewers can inspect/download reports
but cannot email them. Recipient details and report contents are not logged.

The endpoint reuses the existing `registry-admin` Vercel function, retaining the
eight-function deployment layout. It needs these Vercel variables:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (already configured).
- `RESEND_API_KEY`: server-only Resend credential.
- `EMAIL_FROM`: verified sender, for example `FSP Reports <reports@example.com>`.

Report reads and email authorization use a user-scoped publishable client and do
not require the privileged Supabase secret. Live report email is enabled only on
Vercel's Production target; local/preview capture is never reported as delivery.
Missing email configuration produces a clear error while Excel downloads remain
available. A successful response means the provider accepted delivery, not that
the recipient has received it.

## Validation

Tests cover completion/expiry semantics, South African date boundaries, all
enterprise types, missing versus zero history, modal/window/export interactions,
safe Excel text, native chart XML, email authentication and throttling. The
tenant-dashboard SQL suite checks cross-tenant and anonymous denial, private
history privileges, duplicate/quota enforcement, automatic snapshots and the
active daily capture job, inside a rolled-back transaction.
