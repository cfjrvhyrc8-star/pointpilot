# Assist request workflow — disabled implementation

Implemented locally on 19 October 2026. This is not live intake or a payment-ready service.

## Included

- `/assist/requests`: private draft editing, saved-version consent review and submission; customer-visible scoping history.
- Same authenticated workspace shows authorised staff a submitted queue, append-only scoping messages and internal quote revisions calculated using the draft pricing helper.
- Database ownership and staff membership are authoritative, not email matching or editable JWT metadata. Staff cannot read private drafts. Users cannot enrol themselves as staff.
- Submitted briefs are immutable. Only the brief, service, traveller count and flexibility are shared with staff after explicit consent; no wallet/trip records are copied automatically.
- Quote revisions have a unique request/revision pair and no client update/delete grants. Conflicting writes fail rather than overwrite an existing revision. Draft calculations remain untrusted for payment purposes; there is no quote publication, customer acceptance or payment entitlement.
- Bounded load/save errors and retry; returned row IDs are required before reporting successful writes. Reload after an ambiguous timeout before retrying.

## Gates and evidence

- Both preview environment gate and `POINTPILOT_ASSIST_REQUESTS=true` are required. The latter is intentionally unset. Production route remains unavailable by default.
- `supabase/proposals/assist.sql` is a local schema proposal, not a migration. Supabase CLI is unavailable in this project; generate a migration using the CLI after review rather than inventing a timestamped migration file.
- Isolated PGlite test: `node scripts/test-assist-rls.mjs /path/to/@electric-sql/pglite/dist/index.js`. Tests two synthetic customers plus one staff member, consent, draft isolation, self-enrolment denial, immutable revisions and anonymous denial. No hosted database connections.
- Test caught and fixed SQL NULL consent-check bypass. 23 checks pass. Main validation also parses both workspace modules.
- Hosted schema deployment, database advisors, API-level isolation, browser persistence/auth-switch tests and full keyboard/mobile validation are still required. No staff member has been granted live access.
- Staff queue is limited to 100 recent requests; events and internal quotes to 200. Pagination/case-level fetching needed before larger cohorts.
- Account deletion/retention, request cancellation, quote publication/acceptance, paid entitlement, notifications and uploads remain unfinished.

## Deployment order

1. Confirm an isolated preview database (do not apply to shared production implicitly).
2. Generate/review migration, run security advisors and API tests against that database.
3. Configure staff membership only after named-account access approval; never infer it from an email suffix.
4. Enable the preview-only feature flag and run disposable-account browser QA.
5. Keep checkout disabled; do not enable paid research or publish a quote until rate, tax, terms and payment gates pass.

Security approach follows [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security): explicit grants plus operation-specific ownership policies. The current changelog was reviewed; no new runtime integration was introduced.
