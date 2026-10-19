// Draft calculations only. No published rates, payment entitlement or checkout.
const amount=(value,name)=>{if(typeof value!=="number"||!Number.isFinite(value)||value<0)throw new Error(`Invalid ${name}`);return value};
const round=value=>{if(!Number.isFinite(value)||value>Number.MAX_SAFE_INTEGER/100)throw new Error('Amount exceeds supported precision');return Math.round((value+Number.EPSILON)*100)/100};

export function draftProgrammeAverage({programme,samples,minSamples}){
 if(!programme||!Array.isArray(samples)||!Number.isInteger(minSamples)||minSamples<10)throw new Error('Specify a programme and a reviewed minimum sample count of at least 10');
 const seen=new Set();
 const values=samples.map(sample=>{
  if(!sample.id||seen.has(sample.id)||sample.programme!==programme||sample.currency!=="INR"||sample.verified!==true||sample.available!==true||!sample.source||!sample.checkedAt||!Number.isFinite(Date.parse(sample.checkedAt)))throw new Error('Samples must be distinct, sourced, dated, verified INR quotes for one programme');
  seen.add(sample.id);
  const cash=amount(sample.cashPrice,'cash price'),fees=amount(sample.awardFees,'award fees');
  if(!Number.isSafeInteger(sample.points)||sample.points<=0||cash<=fees)throw new Error('Invalid redemption sample');
  return (cash-fees)/sample.points;
 }).sort((a,b)=>a-b);
 if(values.length<minSamples)throw new Error('Insufficient verified samples');
 const trim=Math.floor(values.length*.1),retained=values.slice(trim,values.length-trim);
 const rate=retained.reduce((sum,value)=>sum+value,0)/retained.length;
 if(!Number.isFinite(rate))throw new Error('Invalid average');
 return {programme,currency:"INR",rate,sampleCount:values.length,trimmedEachEnd:trim,retainedCount:retained.length,status:"draft",checkoutEnabled:false};
}

export function draftConciergeQuote({cashSpent,redemptions=[]}){
 amount(cashSpent,'cash spent');
 if(!Array.isArray(redemptions))throw new Error('Invalid redemptions');
 const seen=new Set();
 const lines=redemptions.map(line=>{
  // One final redemption per funding chain: transferred source points are not billed twice.
  if(!line.fundingChainId||seen.has(line.fundingChainId)||line.kind!=="final-redemption"||!line.programme||!line.rateVersion)throw new Error('Provide unique final redemptions and versioned programme rates');
  seen.add(line.fundingChainId);
  if(!Number.isSafeInteger(line.points)||line.points<=0)throw new Error('Invalid points used');
  if(amount(line.rate,'programme rate')===0)throw new Error('A reviewed positive rate is required');
  return {...line,cashEquivalent:round(line.points*line.rate)};
 });
 const pointsEquivalent=round(lines.reduce((sum,line)=>sum+line.cashEquivalent,0));
 const projectCost=round(cashSpent+pointsEquivalent);
 if(projectCost<=0)throw new Error('Manual quote required for work without a project cost');
 return {currency:"INR",cashSpent:round(cashSpent),lines,pointsEquivalent,projectCost,feePercent:5,serviceFee:round(projectCost*.05),taxes:null,status:"draft",checkoutEnabled:false};
}
