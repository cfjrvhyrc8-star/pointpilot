// Quote comparison, not an award-availability or booking guarantee.
export function buildBookingDecision({cashFare,taxes,award,direct}) {
 const cash=Number(cashFare),fees=Number(taxes);
 if(!Number.isFinite(cash)||cash<=0||!Number.isFinite(fees)||fees<0)return null;
 const choices=[{kind:"cash",cash,points:0}];
 if(direct?.rule?.route_status==="verified"&&direct.rule.active!==false&&Number.isFinite(direct.cashRemaining)&&direct.cashRemaining>=0&&direct.pointsUsed>0)choices.push({kind:"direct",cash:direct.cashRemaining,points:direct.pointsUsed});
 const transfers=(award?.routes||[]).filter(route=>route.contribution>0);
 const verified=transfers.every(route=>route.rule?.route_status==="verified"&&route.rule.active!==false);
 const funded=Number(award?.target)>0&&award.shortfall===0;
 if(funded&&verified)choices.push({kind:"award",cash:fees,points:award.target});
 // Retain points when cash costs tie; otherwise keep stable input order.
 choices.sort((a,b)=>a.cash-b.cash||(a.kind==="cash"?-1:b.kind==="cash"?1:0));
 return {lowest:choices[0],cashSaved:Math.max(0,cash-choices[0].cash),awardValue:award?.target>0?(cash-fees)/award.target:null,awardEligible:funded&&verified,reason:!funded?"funding":!verified?"verification":null};
}
