// Quote comparison, not an award-availability or booking guarantee.
export function bookingFeeTotals(extraFees={}) {
 const result={};
 for(const key of ["cash","direct","award","transfer"]){
  const raw=extraFees[key]??0;
  if(String(raw).trim()===""||!Number.isFinite(Number(raw))||Number(raw)<0)return null;
  result[key]=Number(raw);
 }
 return result;
}
export function buildBookingDecision({cashFare,taxes,award,direct,extraFees={}}) {
 const cash=Number(cashFare),fees=Number(taxes);
 const extras=bookingFeeTotals(extraFees);
 if(!extras||!Number.isFinite(cash)||cash<=0||!Number.isFinite(fees)||fees<0)return null;
 const cashTotal=cash+extras.cash,awardTotal=fees+extras.award+extras.transfer;
 const choices=[{kind:"cash",cash:cashTotal,points:0}];
 if(direct?.rule?.route_status==="verified"&&direct.rule.active!==false&&Number.isFinite(direct.cashRemaining)&&direct.cashRemaining>=0&&direct.pointsUsed>0)choices.push({kind:"direct",cash:direct.cashRemaining+extras.direct,points:direct.pointsUsed});
 const transfers=(award?.routes||[]).filter(route=>route.contribution>0);
 const verified=transfers.every(route=>route.rule?.route_status==="verified"&&route.rule.active!==false);
 const funded=Number(award?.target)>0&&award.shortfall===0;
 if(funded&&verified)choices.push({kind:"award",cash:awardTotal,points:award.target});
 if(choices.some(choice=>!Number.isFinite(choice.cash)))return null;
 // Retain points when cash costs tie; otherwise keep stable input order.
 choices.sort((a,b)=>a.cash-b.cash||(a.kind==="cash"?-1:b.kind==="cash"?1:0));
 return {choices,lowest:choices[0],cashSaved:Math.max(0,cashTotal-choices[0].cash),awardValue:award?.target>0?(cashTotal-awardTotal)/award.target:null,awardEligible:funded&&verified,reason:!funded?"funding":!verified?"verification":null};
}

export const cardValueKey=card=>`card:${card.id||card.card_name}`;
export function buildPersonalValue({decision,direct,award,values={}}){
 if(!decision)return null;
 const requirements=new Map();
 const add=(key,label,amount)=>{if(amount>0)requirements.set(key,{key,label});return {key,amount};};
 const rows=decision.choices.map(choice=>{
  let consumed=[];
  if(choice.kind==="direct")consumed=[add(cardValueKey(direct.card),`${direct.card.card_name} · ₹ per point`,direct.pointsUsed)];
  if(choice.kind==="award")consumed=[add(`miles:${award.program.code}`,`${award.program.name} · ₹ per existing mile`,Math.min(award.existing,award.target)),...award.routes.filter(r=>r.contribution>0).map(r=>add(cardValueKey(r.card),`${r.card.card_name} · ₹ per point`,r.pointsNeeded))];
  let pointsValue=0,complete=true;
  for(const item of consumed){
   if(item.amount<=0)continue;
   const raw=values[item.key];
   if(raw==null||String(raw).trim()===""||!Number.isFinite(Number(raw))||Number(raw)<0){complete=false;continue;}
   pointsValue+=item.amount*Number(raw);
  }
  return {...choice,pointsValue:complete?pointsValue:null,total:complete?choice.cash+pointsValue:null};
 });
 const complete=rows.every(row=>row.total!=null&&Number.isFinite(row.total));
 const ranked=complete?[...rows].sort((a,b)=>a.total-b.total||(a.kind==="cash"?-1:b.kind==="cash"?1:0)):[];
 return {requirements:[...requirements.values()],rows,complete,best:ranked[0]||null};
}
