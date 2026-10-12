// Manual quote arithmetic only; this does not verify availability or issuer terms.
export function evaluateAwardQuote({cashFare,taxes,milesRequired}) {
 const fields={cashFare,taxes,milesRequired};
 const invalid=Object.keys(fields).filter(key=>{
  const raw=fields[key],number=Number(raw);
  if(!['string','number'].includes(typeof raw)||String(raw).trim()===''||!Number.isFinite(number))return true;
  return key==='milesRequired'?!Number.isSafeInteger(number)||number<=0:key==='cashFare'?number<=0:number<0;
 });
 if(invalid.length)return {complete:false,invalid};
 const net=Number(cashFare)-Number(taxes);
 return {complete:true,invalid:[],net,perMile:net/Number(milesRequired),miles:Number(milesRequired)};
}

// Validate before constructing a saved goal: never coerce unknown quotes to zero.
export function tripQuoteFields(goal) {
 const quote=evaluateAwardQuote({cashFare:goal.cash_fare,taxes:goal.taxes,milesRequired:goal.miles_required});
 return quote.complete?{cash_fare:Number(goal.cash_fare),taxes:Number(goal.taxes),miles_required:quote.miles}:null;
}
