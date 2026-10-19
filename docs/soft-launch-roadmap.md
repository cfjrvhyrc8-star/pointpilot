# PointPilot — invite-only soft-launch roadmap

Updated: 19 October 2026. Approved product direction, not a claim that these features are implemented. Read alongside [launch-readiness.md](launch-readiness.md) and the dated QA reports.

## Core and scope

Help users earn, manage and use rewards through explainable comparisons. Keep cash fares, estimated redemption routes, checked award availability and confirmed bookings distinct. Do not encourage extra spending solely to earn rewards.

The user approved adding a completely paid concierge and recommendations for cards users do not own, with an eventual issuer/affiliate application revenue channel. The concierge fee is 5% of cash spent plus the agreed cash-equivalent value of points used. The points conversion methodology and final payable amount must be settled before checkout activation. No vendor agreement, payment provider or launch date has been approved yet. This roadmap does not authorize contracts or production activation.

### Owner decisions recorded — 19 October 2026

- Concierge fee: 5% of project cost, replacing the earlier fixed-fee recommendation. Concierge remains paid only.
- Fulfilment: expert-led service, initially fulfilled personally by Arvind Uppal; additional experts can be added later. Do not imply a staffed multi-person team at launch.
- Availability: Monday–Saturday, 9:30 AM–6:00 PM, Mumbai, India (IST; IANA timezone Asia/Kolkata). Closed Sundays; holiday exceptions and response-time commitments remain to be defined. Do not advertise 24/7 coverage.
- Invitees: owner will provide the initial list once the project is ready. Do not block development on the list; keep public onboarding closed until invitations are configured.
- Approved calculation: project cost = cash spent + cash-equivalent value of points used; concierge fee = project cost × 0.05. For multiple reward currencies, value each separately using its agreed conversion rate, then sum. Do not double-count the full cash fare as well as redeemed points, or include unused wallet balances.
- Points-to-cash conversion method remains open: do not hard-code a universal rate or silently reuse a recommendation-engine valuation as the billable rate. Show each programme, points quantity, cash-per-point rate, valuation basis/date and resulting cash equivalent for agreement.
- Each accepted quote must show cash spend, points valuation breakdown, total project-cost base, 5% fee, any separately applicable charges and final payable amount. Checkout remains disabled until the valuation and amount are settled and payment/refund terms are approved. A changed quote must be agreed again before payment.
- Remaining pricing details: treatment of supplier taxes/fees, service-fee taxes, minimum/maximum charges, scope changes and advisory-only work without a defined trip cost. No assumptions should enable payment automatically.

## Product backlog

### Implementation progress — 19 October 2026

- Save confirmation hardened: missing/malformed responses and non-success statuses cannot report a successful save. Valid minimal-return writes remain supported. Regression cases added.
- Draft concierge pricing engine and tests added: per-programme 10%-each-tail trimmed average; explicit minimum sample count (at least 10 as a technical floor, not a claim of statistical sufficiency); distinct sourced, dated, available INR samples; 5% cash-plus-points fee; versioned quote lines; duplicate funding-chain rejection; checkout always disabled.
- Preview commit `3e83e129a8b38e0c808a96b450fd854295cc43ef` deployed successfully on Vercel. Trip and monthly-plan reads now have bounded timeouts, cancellation and explicit retry; failed initial reads cannot expose editable blank forms.
- `/assist` is a preview-only, unsaved request-review screen with three service choices, the approved fee formula, named initial fulfiller and office hours. Draft review/reset and disabled checkout were browser-tested. At 375px, document width and scroll width both measured 375px. This is not a submitted request, staff queue or paid entitlement.
- Card-discovery calculations now exclude owned products and compare a capped allocation across the existing wallet against the wallet plus each candidate. Recurring fees are subtracted; stale/unsupported rules are rejected and application URLs remain null. This is a tested foundation, not a live recommendation catalogue.
- No actual billing rates published. Representative sampling, freshness review, quarterly publication, quote acceptance/locking, server-side enforcement and tax treatment remain pending. The draft helper is not a payment-security boundary. Funding-chain identifiers require trusted validation before any future checkout.
- Local validation passes, including load/save recovery, pricing, office hours and card-discovery regression cases. Local production build was not established: installed Node 24 is outside the declared range, a build stalled, and downloading Node 22 failed DNS resolution. The deployed Vercel success is separate build evidence.
- Remaining date/browser QA, authenticated request persistence/consent, staff controls and quote acceptance are next. Physical-phone and external-provider checks remain separate gates.

### P0 — reliability and controlled access, before inviting testers

New disabled implementation: saved Assist drafts, explicit scoping consent, restricted staff queue, customer-visible scoping events and append-only internal quote revisions. Local PostgreSQL isolation tests pass (23 checks). See [assist-request-workflow.md](assist-request-workflow.md). Hosted schema, staff grants, feature activation and browser persistence QA are not completed; quote acceptance/payment remain unavailable.

- [ ] Finish physical iPhone checks across all nine destinations: keyboard open/closed, bottom actions, safe areas, no horizontal page overflow and date selection/save/reload.
- [ ] Complete desktop Safari/Chrome keyboard traversal and responsive regression; investigate repeatable blank-page/client-error behaviour.
- [ ] Exercise live failure/recovery flows safely: failed load/save, interrupted connectivity, timeout and retry without falsely reporting success.
- [ ] Test account switching both ways, two tabs, sign-out/back navigation and delayed requests; run API-level isolation tests using two disposable users, including adversarial writes.
- [ ] Verify fresh, expired and reused email links; verify every enabled sign-in provider. Hide unsupported flows.
- [ ] Verify production environment scopes, redirect URLs, server-only secrets and a reproducible build/release rollback.
- [ ] Audit issuer rules for every card enabled in the pilot; reduce the pilot catalogue if necessary rather than treating all 30 entries as verified.
- [ ] Establish support contact, feedback/issue intake, error monitoring, backup/restore procedure, privacy/consent and account-deletion workflow.
- [ ] Implement server-enforced invitation access, small-cohort onboarding and feature flags. An unlisted URL alone is not an access control.
- [ ] Keep unverified live flight inventory disabled or clearly unavailable until Travelport production readiness is confirmed. Never infer awards from cash inventory.

Already evidenced: preview save-failure recovery implemented and unit-tested; desktop date alignment visually checked; one disposable account passed trip and monthly-plan create/edit/save/reload in Safari. Date persistence, browser delete flows, live failure injection and full authentication isolation are NOT established by that test. See persistence-check-2026-10-19.md.

### P1 — PointPilot Assist: paid concierge only

Initial services:

1. Rewards Redemption Review: compare cash/points, fees, transfer requirements, cancellation conditions and timestamped availability checks.
2. Card Benefits Assistance: explain activation/usage of benefits the user already owns, with issuer conditions and booking-channel restrictions.
3. Rewards Health Check: paid personalised review of expiries, unused benefits and milestones. Existing self-service tracking remains separate; no free human concierge tier.

Build checklist:

- [ ] Service catalogue with explicit scope, exclusions, fee or quote-first pricing, turnaround, staffed hours, revision limit and refund/cancellation terms.
- [ ] Trip-linked request form with traveller count, flexibility, preferences and explicit consent to share only selected wallet/trip fields with staff or a fulfilment partner.
- [ ] Quote acceptance and payment before concierge research/fulfilment starts. A short intake for scoping is not a free review. No price invented in code.
- [ ] Hosted checkout; server-verified, idempotent payment webhooks; paid entitlement checks; reconciliation and clear payment-pending/failure/refund states. Never trust a client success redirect.
- [ ] Request status and history: submitted → quoted → payment pending → paid → assigned → researching → delivered → closed; cancelled/refunded handled explicitly.
- [ ] Staff-only queue, assignment, least-privilege record access, audit history and secure messaging/deliverable upload.
- [ ] Standard comparison deliverable with source dates, total cash payable, points consumed, uncertain availability and explicit user approval before any booking or transfer.
- [ ] Configure Arvind Uppal as initial fulfilment owner; establish a capacity limit and test the operating procedure. Office-hours service only; no unlimited or 24/7 claims.
- [ ] Test failed/duplicate payment events, unauthorized request access, delivery, cancellation/refund and notifications before accepting money.

Commercial starting point: limited-capacity, paid concierge at 5% of an explicitly agreed project-cost base. Do not calculate the fee from inflated theoretical savings or an assumed points valuation. Do not invent a zero-cost or free tier for advisory-only requests; their pricing base needs owner clarification. A prepaid package/capped membership is a later option requiring separate approval. Optional WhatsApp notifications only with consent; keep the authoritative case history in the app. Never request OTPs, card numbers or loyalty passwords in chat.

### P1 — discover cards the user does not own

- [ ] Reuse the monthly spending profile; add optional travel preferences, fee tolerance and eligibility inputs with minimal data collection.
- [ ] Exclude owned cards by canonical product ID, including aliases/variants where appropriate; offer separate upgrade information rather than treating it as a new-card match.
- [ ] Compare existing-wallet strategy against existing wallet PLUS each candidate. Respect caps, exclusions and shared limits; do not double-count spend or benefits.
- [ ] Show estimated incremental annual value after recurring annual fees and applicable taxes; separate first-year/welcome offers, milestone assumptions and non-cash benefit estimates.
- [ ] Show why recommended, category gains, spend moved from existing cards, drawbacks, break-even assumptions, source date and uncertainty. Permit “no additional card is worthwhile.”
- [ ] Include user-adjustable assumptions and rankings independent of referral commission. Avoid guaranteed approval, credit-limit or savings claims.
- [ ] Add fixtures for owned-card exclusion, duplicate names, fee/cap boundaries, zero benefit, low spend, overlapping benefits and missing rules.

### P1 commercial gate — card applications through PointPilot

- [ ] Obtain approved issuer/affiliate arrangements and approved product-specific destinations; recommendations do not depend on having a commercial partner.
- [ ] Show a clear commission disclosure adjacent to Apply. Identify the destination issuer/partner and that application/approval happens there.
- [ ] Start with an outbound approved application link, not an embedded application/document collection flow. No PAN, Aadhaar, bank statements or card credentials collected by PointPilot for this MVP.
- [ ] Implement validated destination allowlist, stale-link disabling, appropriate attribution consent and minimal event retention. Do not send wallet/spend details in URLs.
- [ ] Label non-affiliate links accurately; hide revenue claims and unavailable Apply actions until arrangements exist. Link clicks are not approved applications or earned commissions.
- [ ] Track conversions only through permitted partner reporting; reconcile confirmed revenue and reversals. Complete applicable partner/compliance review before activation.

### P2 — after the small pilot

- [ ] Hotel value comparison: cash, points and eligible partner rates; itemise taxes, breakfast, usable credits, cancellation and loyalty eligibility. Conditional upgrades are not guaranteed cash savings. Requires hotel data/fulfilment readiness.
- [ ] Broader Trip Assistance Desk: complex itinerary/award-search help with paid, bounded scope and an operating partner where needed.
- [ ] Curated trip-linked experiences: dining/tours/events through vetted partners, clear pricing and availability; not a general luxury marketplace.
- [ ] Capped paid concierge memberships and optional notification integrations after measuring workload and demand.

Not in initial scope: luxury shopping/art/watch sourcing, private jets, medical assistance, broad corporate retreats, guaranteed VIP access and Apple login.

## UI placement — no additional bottom-navigation destinations

- My trip: Request a paid redemption review; trip-linked case status.
- Wallet: Benefits assistance; Discover cards you do not own.
- My plan: Compare incremental value of an additional card.
- Today: Pending paid requests, rewards-health actions and pilot feedback.
- Request details: quote, payment status, messages, deliverable and next action.

## Rollout and go/no-go

1. Reliability pilot: P0 gates passed, named invitees only, current core tools. Paid services/application features remain flagged off until their separate gates pass.
2. Paid Assist pilot: catalogue/prices approved, staffed fulfilment, tested payment/refund/security flows; limited case capacity. Concierge is never offered free as a trial by default.
3. Card discovery pilot: audited candidate rules and incremental-value tests passed. Affiliate Apply activates only after commercial approval and link/disclosure checks.
4. Expand only after reviewing support incidents, persistence/auth failures, recommendation feedback, delivery times, refunds and confirmed partner conversions.

Remaining business decisions: points-to-cash conversion methodology and fee/tax/refund details; holiday handling and turnaround; payment provider; issuer/affiliate partners. Initial fulfilment owner, project-cost formula, 5% fee rate and Monday–Saturday 9:30 AM–6:00 PM Asia/Kolkata schedule are decided. Invitee list/cohort size will be supplied when ready. Engineering can build behind disabled flags before the remaining decisions, but checkout stays disabled until the amount is settled and commercial activation gates are cleared.

## Inspiration reviewed

- MilesAhead: https://www.milesahead.co/our-services and https://www.milesahead.co/air-desk — personalised travel/mileage assistance.
- MilesAhead: https://www.milesahead.co/our-value — partner-specific perks, not universal entitlements.
- Indulge: https://indulge.global/ — convenient concierge intake and experience fulfilment; its broader luxury catalogue is intentionally outside PointPilot's core.

These are inspiration sources, not established PointPilot partnerships or verified supplier endorsements.
