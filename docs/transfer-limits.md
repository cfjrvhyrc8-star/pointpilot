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
