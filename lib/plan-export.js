// Always quote fields and neutralize spreadsheet formula prefixes in text.
export function csvCell(value){
 let text=String(value??'');
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
const amount=value=>Number.isFinite(Number(value))?Number(value).toFixed(2):'';
export function monthlyPlanCsv(model,generatedAt=new Date()){
 const rows=[
  ['PointPilot monthly plan','Generated UTC',generatedAt.toISOString()],
  ['Scenario only','Current inputs; may include unsaved edits or example spending. Not a statement or guaranteed return.'],
  ['Currency','INR; point valuations are conditional, not cashback.'],
  ['Limitations','Excludes fees, interest, FX costs, unmodeled shared caps and transaction rounding. Annual estimates repeat this month 12 times.'],
  [],
  ['Category','Monthly spend INR','Suggested card','Modeled spend INR','Outside cap or unmatched INR','Modeled reward value INR','Rule','Conditions','Exclusions','Issuer source','Rule checked date']
 ];
 for(const row of model.plans.filter(row=>row.amount>0)){
  const winner=row.winner,rule=winner?.rule;
  rows.push([row.label||row.key,amount(row.amount),winner?.card.card_name||'No modeled match',amount(winner?.eligibleSpend||0),amount(row.amount-(winner?.eligibleSpend||0)),winner?amount(winner.value):'',rule?.reward_label,rule?.condition_text,rule?.exclusions_text,/^https:\/\//.test(rule?.source_url||'')?rule.source_url:'',String(rule?.verified_at||'').slice(0,10)]);
 }
 rows.push([],['Monthly spend',amount(model.monthlySpend)],['Spend inside modeled caps',amount(model.coveredSpend)],['Outside caps or unmatched',amount(model.unmodeledSpend)],['Monthly modeled reward value',amount(model.optimized)],['One-card comparison',model.baseline?.card.card_name||'Not comparable'],['Illustrative annual difference',model.annualIncremental==null?'Not comparable':amount(model.annualIncremental)]);
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
