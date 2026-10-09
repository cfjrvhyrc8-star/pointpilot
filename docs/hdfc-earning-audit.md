# HDFC Diners Club Black Metal earning audit — 9 October 2026

Official issuer source: https://v.hdfc.bank.in/htdocs/amp/personal/pay/cards/credit-cards/diners-club-black-metal-edition.html

The issuer specifies 5 Reward Points per ₹150 spent. Corrected the repository catalogue and seed base earning description from 1 to 5. At the existing conditional ₹1/point SmartBuy travel valuation, the proportional estimate is 3.3333%, not 0.6667%. This is not cash back; redemption limits and eligible transaction exclusions still apply. Transaction-level rounding is not modeled by the percentage engine.

Access was restored on 9 October. The live general spend rule was corrected to 3.3333%. Dining, flights and hotels were subsequently changed to explicitly labeled base-only estimates at 3.3333%; unmodeled bonuses are excluded. Personal balances and schema were not changed. The seed file is not a migration and must not be run wholesale against production; its accelerated rows remain outdated.

Accelerated dining, flight and hotel seed rates remain pending review of current caps and conditions. Do not treat this base-rate correction as certification of those rates or of the full 30-card catalogue.

## Separate dining scenario

SpendSmart now provides a conditional DCB Metal dining scenario, separate from rankings and monthly forecasts. Inputs require purchase date, eligible MCC, direct non-EMI/non-wallet standalone-restaurant confirmation without other promotions, and known prior daily bonus usage. Unknown inputs exclude bonus. The model uses 5 base RP per complete ₹150, another 5 on eligible weekend dining, and remaining allowance from a 1,000 RP daily bonus cap. It does not verify merchant coding or remaining statement/category base limits, and explicitly says so. It does not persist inputs or modify balances.

Sources: the Metal product page above states the daily dining cap; its Metal terms (diners4.pdf) specify Saturday/Sunday, MCC 5812/5813/5814 and payment restrictions. The linked Diners terms (diners3.pdf, titled Diners Club Black) explain the separate base/bonus cap treatment. This scenario remains conditional, not a guaranteed issuer quote; current SmartBuy caps remain unverified and no SmartBuy bonus is enabled.

Regression coverage: 16 checks for eligibility, missing inputs, dates, invalid amounts, ₹150 blocks and exhausted/partly used daily caps.
