// Conditional DCB Metal dining scenario, not an issuer eligibility verification.
export function diningEstimate({amount,date,mcc,confirmed=false,bonusUsed=""}) {
  const spend=Number(amount);
  if(!Number.isFinite(spend)||spend<0)return null;
  const basePoints=Math.floor(spend/150)*5;
  const day=/^\d{4}-\d{2}-\d{2}$/.test(date||"")?new Date(`${date}T12:00:00Z`):null;
  const validDate=day&&!Number.isNaN(day.getTime())&&day.toISOString().slice(0,10)===date;
  const weekend=validDate&&[0,6].includes(day.getUTCDay());
  const used=Number(bonusUsed);
  const known=String(bonusUsed).trim()!==""&&Number.isFinite(used)&&used>=0&&Number.isInteger(used);
  const eligible=confirmed&&weekend&&["5812","5813","5814"].includes(String(mcc))&&known;
  const bonusPoints=eligible?Math.min(basePoints,Math.max(0,1000-used)):0;
  return {basePoints,bonusPoints,totalPoints:basePoints+bonusPoints,eligible:Boolean(eligible),capApplied:Boolean(eligible&&bonusPoints<basePoints)};
}
