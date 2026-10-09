# HDFC Diners Club Black Metal earning audit — 9 October 2026

Official issuer source: https://v.hdfc.bank.in/htdocs/amp/personal/pay/cards/credit-cards/diners-club-black-metal-edition.html

The issuer specifies 5 Reward Points per ₹150 spent. Corrected the repository catalogue and seed base earning description from 1 to 5. At the existing conditional ₹1/point SmartBuy travel valuation, the proportional estimate is 3.3333%, not 0.6667%. This is not cash back; redemption limits and eligible transaction exclusions still apply. Transaction-level rounding is not modeled by the percentage engine.

The live Supabase read was denied. No live reference rows, balances or schema were changed. The seed file is not a migration and must not be run wholesale against production to apply this correction. An authorised operator must inspect the current HDFC spend_rules and card-benefit rows and apply a narrowly scoped update.

Accelerated dining, flight and hotel seed rates remain pending review of current caps and conditions. Do not treat this base-rate correction as certification of those rates or of the full 30-card catalogue.
