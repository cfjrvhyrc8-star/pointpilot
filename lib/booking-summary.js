// Rank only fully valued scenarios; no provider availability is implied.
export function bookingSummary(model){
 if(!model?.complete||!model.rows?.length||model.rows.some(row=>!Number.isFinite(row.total)))return null;
 const rows=[...model.rows].sort((a,b)=>a.total-b.total||(a.kind==='cash'?-1:b.kind==='cash'?1:0));
 const best=rows[0],next=rows[1];
 const cash=rows.find(row=>row.kind==='cash');
 const margin=next?next.total-best.total:null;
 return {best,margin,tied:margin!=null&&margin<0.005,saving:cash?cash.total-best.total:null,
  checks:best.kind==='award'?[
   'Confirm bookable award seats for every traveller directly with the airline.',
   'Check final taxes, transfer timing and eligibility before moving any points.',
   'Review cancellation terms. A transfer may be irreversible and seats can disappear.'
  ]:best.kind==='direct'?[
   'Confirm the same flight, cabin, baggage and travellers on the issuer portal.',
   'Check the final points debit, cash payable and redemption fees against this estimate.',
   'Review portal cancellation and refund terms before paying.'
  ]:[
   'Confirm the final cash price, baggage and cancellation terms.',
   'Recheck any excluded points route before concluding cash is best overall.',
   'Choose a payment card only after checking its applicable reward rules.'
  ]};
}

export function bookingDecisionText(model,reason,generatedAt=new Date()){
 const summary=bookingSummary(model);
 if(!summary||model.rows.some(row=>!Number.isFinite(row.cash)||!Number.isFinite(row.pointsValue)))return null;
 const labels={cash:'Pay cash',direct:'Selected card redemption',award:'Airline award'};
 const money=value=>'INR '+value.toFixed(2);
 return [
  'PointPilot — personal booking comparison',
  'Generated UTC: '+generatedAt.toISOString(),
  'Conditional estimate from your inputs. Not a booking offer, award-seat confirmation or permission to transfer.',
  'This snapshot does not identify an itinerary. Match the flights, cabin, baggage and travellers before using it.',
  '',
  ...model.rows.map(row=>`${labels[row.kind]||row.kind}: cash payable ${money(row.cash)}; points value given up ${money(row.pointsValue)}; modeled cost ${money(row.total)}.`),
  '',
  summary.tied?'The leading options are tied at displayed precision.':`${labels[summary.best.kind]} leads on modeled cost.`,
  summary.saving!=null?`Modeled saving versus cash: ${money(summary.saving)}. Not a guaranteed cash saving.`:'No cash benchmark available.',
  reason?`Airline award excluded: ${reason==='funding'?'mileage target is not fully funded or is missing':'required transfer rules or limits need verification'}.`:'Only eligible scenarios and the selected card route were compared.',
  '',
  'Before acting:',
  ...summary.checks.map((check,index)=>`${index+1}. ${check}`),
  '',
  'Included: entered booking and transfer fees and your personal points valuations. Transferred miles are not valued a second time.',
  'Excluded: unentered fees, foregone rewards, cancellation costs and voucher leftovers. Recheck quotes and assumptions with providers.',
  'Personal financial scenario: review before sharing. No wallet balances or account identifiers are included.'
 ].join('\n')+'\n';
}
