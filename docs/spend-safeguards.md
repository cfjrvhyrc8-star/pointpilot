# Spend safeguards — 10 October 2026

SpendSmart and MonthlyRewardPlan share selection and valuation functions. Automatic rankings reject weekend/portal/unknown channels, invalid rates and caps, inactive rules, and domestic-only rules for international spending. Unsupported category-specific rules fall back to eligible general rules. Candidate rules are compared by modeled value after their spend cap, not headline percentage. Exact normalized card names prevent Black and Black Metal from matching each other.

These are still conditional percentage estimates, not transaction-accurate forecasts. Remaining shared monthly caps, merchant exclusions, statement limits, transaction rounding and FX fees are not fully modeled. The separate dining scenario is not incorporated into ranking. A category is not proof of merchant eligibility.

Funding labels now use route_status, matching BookingComparison, rather than an absent verified boolean. Transfer limits must independently be verified before labeling funding covered. Award-seat availability remains separate.

The local HDFC seed rates now match the live conservative base-only treatment. The whole schema seed must never be run on production to apply this change. No live database changes were needed in this release. This supersedes the older audit note that accelerated seed rows remained outdated.

Validation adds 20 spend cases and a funding-schema regression. SmartBuy cap research, full 30-card rule audits, shared-cap allocation and browser/mobile acceptance testing remain pending.
