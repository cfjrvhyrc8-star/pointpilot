import {cardNamesMatch} from './card-identity.js';

// Audited simple-rate model only. Shared caps, conditional bonuses and transaction
// rounding require a separate reviewed model, never a guessed fallback.
export function discoverUnownedCards({owned=[],candidates=[],spend={},asOf}){
 const now=Date.parse(asOf);if(!Number.isFinite(now))throw new Error('An explicit review date is required');
 const entries=Object.entries(spend);
 if(entries.some(([,value])=>typeof value!=='number'||!Number.isFinite(value)||value<0))throw new Error('Invalid spending profile');
 const usable=card=>card.id&&card.name&&card.reviewed===true&&card.model==='simple-category-rates'&&card.sourceUrl?.startsWith('https://')&&Number.isFinite(Date.parse(card.validUntil))&&Date.parse(card.validUntil)>=now&&typeof card.annualFeeTotal==='number'&&Number.isFinite(card.annualFeeTotal)&&card.annualFeeTotal>=0&&entries.every(([category,value])=>value===0||(card.rates?.[category]&&Number.isFinite(card.rates[category].percent)&&card.rates[category].percent>=0&&Number.isFinite(card.rates[category].monthlySpendCap)&&card.rates[category].monthlySpendCap>=0));
 // Unknown existing-wallet earnings cannot safely be treated as zero.
 if(owned.some(card=>!usable(card)))return {status:'review-required',reason:'Existing wallet rules need review before incremental value can be calculated.',recommendations:[]};
 // Allocate the same spend once, highest rate first, then use remaining caps.
 // This model is valid only for independent category caps (no shared caps).
 const allocate=(cards,key,value)=>{
  let remaining=value,total=0;const allocations=[];
  for(const card of [...cards].sort((a,b)=>(b.rates?.[key]?.percent||0)-(a.rates?.[key]?.percent||0)||a.id.localeCompare(b.id))){
   const rate=card.rates?.[key];if(!rate||rate.percent<=0||remaining<=0)continue;
   const spend=Math.min(remaining,rate.monthlySpendCap),reward=spend*rate.percent/100;
   if(spend>0)allocations.push({cardId:card.id,spend,reward});
   remaining-=spend;total+=reward;
  }
  return {total,allocations,unmodeledSpend:remaining};
 };
 const uniqueOwned=owned.filter((card,index)=>owned.findIndex(other=>other.id===card.id||cardNamesMatch(other.name,card.name))===index);
 const baseline=entries.map(([key,value])=>({key,value,...allocate(uniqueOwned,key,value)}));
 const seen=new Set();
 const recommendations=candidates.filter(card=>{
  if(!usable(card)||seen.has(card.id)||owned.some(existing=>existing.id===card.id||cardNamesMatch(existing.name,card.name)))return false;
  seen.add(card.id);return true;
 }).map(card=>{
  const categories=baseline.map(row=>{const combined=allocate([...uniqueOwned,card],row.key,row.value);return {key:row.key,value:row.value,best:row.total,baselineAllocations:row.allocations,combinedAllocations:combined.allocations,unmodeledSpend:combined.unmodeledSpend,gain:Math.max(0,combined.total-row.total)}});
  const annualGain=categories.reduce((sum,row)=>sum+row.gain,0)*12;
  return {id:card.id,name:card.name,annualGain,annualFeeTotal:card.annualFeeTotal,annualNetGain:annualGain-card.annualFeeTotal,categories,sourceUrl:card.sourceUrl,applyUrl:null};
 }).filter(card=>card.annualNetGain>0).sort((a,b)=>b.annualNetGain-a.annualNetGain||a.id.localeCompare(b.id));
 return {status:recommendations.length?'matches':'no-additional-card',recommendations};
}
