export function bookingChecks(kind,hasTransfers=false){
 const checks=[{id:"itinerary",label:"I compared the same flights, dates, cabin, travellers and baggage."},{id:"total",label:"I checked the final checkout total, including all taxes and fees."},{id:"cancellation",label:"I reviewed cancellation, change and refund conditions."}];
 if(kind==="direct")checks.push({id:"portal",label:"The issuer portal accepts this flight and my points at the quoted price."});
 if(kind==="award"){
  checks.push({id:"availability",label:"I checked bookable award seats for every traveller directly with the airline—not just cash seats."});
  if(hasTransfers)checks.push({id:"transfer",label:"I confirmed transfer minimums, increments, caps, account eligibility and processing time."},{id:"risk",label:"I understand seats can disappear during transfer and transferred points may not be reversible."});
 }
 return checks;
}
