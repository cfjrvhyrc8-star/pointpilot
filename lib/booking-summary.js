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
