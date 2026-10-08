# Transfer limit contract

The planner only enforces limits when a rule explicitly provides:

- `transfer_unit: "card_points"`: source currency, not airline miles.
- `transfer_limits_verified: true`: provenance must be reviewed before setting this.
- `min_transfer`: integer source points, zero for an explicitly verified absence of a minimum.
- `transfer_increment`: positive integer; transfers are multiples of this block from zero.
- `max_transfer`: integer available cap, or null for a verified absence of a cap.

A periodic cap must be reduced by prior usage before it is supplied here. Rules with offset increments or other unmodeled conditions must not be marked verified.

These additional normalized fields are not yet populated in the live reward catalogue. No database migration or issuer limit updates were made with this engine change. Existing ambiguous min/max fields are not interpreted as source points without the explicit unit and verification metadata.

Missing metadata produces a ratio-only estimate, excluded from the booking recommendation. Invalid verified metadata produces no usable transfer. Excess miles from minimum/block rounding are reported separately; personal value counts all source points consumed and gives no credit for surplus miles.

## Issuer evidence review — 8 October 2026

### ICICI Times Black → Air India Maharaja Club

Source: https://www.timesblack.com/benefits/signature-benefits/maharaja-points-timesblack

The official card page confirms a 1:1 conversion, no minimum requirement and no conversion cap. It does not explicitly document transfer increments. Do not infer an increment of one from the conversion ratio or absence of a minimum.

Timing is inconsistent within the same page: its headline describes instant conversion, whereas the claim instructions specify credit within five working days. Do not promise an instant transfer or recommend transferring to secure an expiring award seat based on this page alone.

Decision: keep `transfer_limits_verified` unset. The verified ratio, minimum and cap statements do not establish the complete execution contract. Obtain current transfer-screen terms or written issuer confirmation of permitted increments and timing before enabling verified funding. Do not request account credentials or unredacted personal information for that check.

### HDFC Diners Club Black Metal

The public card page and benefits document reviewed did not establish a complete, partner-specific source-point minimum, increment and available cap. This is an evidence gap, not a claim that limits do not exist. Do not borrow ratios or limits from another HDFC card or a general redemption form.

Decision: leave normalized limits unverified until current partner-specific transfer terms are available. Existing ratio data is not re-certified by this review.

This review changes documentation only: no live catalogue, account data or database schema was modified.
