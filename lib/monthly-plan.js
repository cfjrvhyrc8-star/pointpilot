import {selectSpendRule,spendValue} from './spend-estimate.js';
export const safeSpend=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
export function buildMonthlyPlan({wallet,rules,spend,categories}){
 const estimate=(card,key,amount)=>{
  const rule=selectSpendRule(card.card_name,key,rules,amount);
  const result=spendValue(rule,amount);
  return result?{card,rule,...result}:null;
 };
 const plans=categories.map(category=>{
  const amount=safeSpend(spend[category.key]);
  const ranked=wallet.map(card=>estimate(card,category.key,amount)).filter(Boolean).sort((a,b)=>b.value-a.value);
  return {...category,amount,winner:ranked[0]||null,ranked};
 });
 const optimized=plans.reduce((sum,row)=>sum+(row.winner?.value||0),0);
 // A fair one-card baseline must cover every entered category that has a
 // modeled recommendation. Otherwise partial coverage can inflate savings.
 const singleCards=wallet.map(card=>{
  const estimates=plans.filter(row=>row.amount>0&&row.winner).map(row=>estimate(card,row.key,row.amount));
  return estimates.length&&estimates.every(Boolean)?{card,value:estimates.reduce((sum,row)=>sum+row.value,0)}:null;
 }).filter(Boolean).sort((a,b)=>b.value-a.value);
 const baseline=singleCards[0]||null;
 const monthlySpend=plans.reduce((sum,row)=>sum+row.amount,0);
 const coveredSpend=plans.reduce((sum,row)=>sum+(row.winner?.eligibleSpend||0),0);
 const incremental=baseline?Math.max(0,optimized-baseline.value):null;
 return {plans,optimized,baseline,monthlySpend,coveredSpend,unmodeledSpend:Math.max(0,monthlySpend-coveredSpend),incremental,annualIncremental:incremental==null?null:incremental*12,annualOptimized:optimized*12};
}
