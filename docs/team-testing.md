# Hosted team testing

The team test site is https://fspapp.work.imber.me. It uses the existing `fsp`
Supabase project (`mmxvzswqxhccgcxgjmtb`), including the shared test accounts and
their seeded organisation memberships. Changes made through the local app and
hosted app affect the same database when both use this project.

## Vercel configuration

Set these variables on the Vercel `fsp` project's Production environment (the
Vercel deployment target is Production, but this application is for development
testing):

| Variable                        | Value                                      |
| ------------------------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`             | `https://mmxvzswqxhccgcxgjmtb.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's `sb_publishable_…` key       |
| `VITE_APP_URL`                  | `https://fspapp.work.imber.me`             |
| `VITE_APP_ENV`                  | `development`                              |
| `SUPABASE_URL`                  | `https://mmxvzswqxhccgcxgjmtb.supabase.co` |
| `APP_URL`                       | `https://fspapp.work.imber.me`             |
| `PUBLIC_APP_URL`                | `https://fspapp.work.imber.me`             |
| `APP_ENV`                       | `development`                              |

Server workflows additionally require `SUPABASE_SECRET_KEY`, stored as a Vercel
secret. Never prefix this key with `VITE_` or put it in source control. Browser
sign-in and RLS-backed reads use the publishable key instead.

Vite embeds browser variables at build time. Redeploy after changing them;
changing environment settings alone does not update an existing bundle.

For registration confirmation and password recovery, configure the Supabase
Auth Site URL as `https://fspapp.work.imber.me`, and allow these redirect URLs:

- `https://fspapp.work.imber.me/auth/verify`
- `https://fspapp.work.imber.me/auth/reset-password`

Keep localhost redirects if local testing continues. Ensure the Supabase project
is active before testing; a paused project cannot authenticate users.

## Test accounts

The account table and shared development password are in [database.md](database.md#seed-data).
The additional `platform.admin@example.test` account has platform administration
access. All 11 seeded accounts have confirmed emails and application profiles.
These are fictional shared testing identities; use this environment for test
data only. Do not reset the shared database to recreate accounts that already
exist.
