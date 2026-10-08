import assert from "node:assert/strict";
import {bookingChecks} from "../lib/booking-checklist.js";
assert.equal(bookingChecks("cash").length,3);
assert.ok(bookingChecks("direct").some(x=>x.id==="portal"));
assert.ok(bookingChecks("award").some(x=>x.id==="availability"));
assert.ok(!bookingChecks("award").some(x=>x.id==="transfer"));
assert.ok(bookingChecks("award",true).some(x=>x.id==="risk"));
assert.equal(new Set(bookingChecks("award",true).map(x=>x.id)).size,6);
console.log("Booking checklist: 6 checks passed.");
