# Booking comparison mobile check — 12 October 2026

Tested the production-built BookingComparison component with synthetic data, not a signed-in wallet. Used a local static preview after the Next development server stalled.

## Observed

- 390px viewport: stacked cost cards, readable totals and long product names; no page-wide horizontal scrolling in the inspected views.
- 320px viewport: expanded settings, route selector, checkbox and allowance input fit the viewport.
- Entered ₹1 per existing mile and ₹0.50 per card point: card redemption total ₹48,750; award total ₹53,500; correct leading option and ₹4,750 margin.
- An enabled but blank allowance blocks comparison results.
- Desktop/mobile representations use the same calculation rows.

## Corrections from this pass

- Summary explicitly labels enabled blank/invalid portal quotes and allowances as incomplete.
- Full selected card and route are printed below the selector, where long native option labels can be clipped on a phone.

## Limits

This was browser viewport testing of the comparison component, not a full-dashboard or physical iOS/Android test. Account isolation, issuer-rule currency, and Travelport production access are separate release checks. No test balances or trip goals were saved. The temporary preview route is not shipped.
