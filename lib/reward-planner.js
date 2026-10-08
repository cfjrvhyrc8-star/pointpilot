import {AIRLINE_PROGRAMS,programForPartner} from "./airline-programs.js";

const clean=value=>String(value||"").toLowerCase().replace(/credit card|metal card|card|club|first|hdfc|icici|idfc|bank|american express india|scapia federal|federal/g,"").replace(/[^a-z0-9]/g,"");

export function cardMatchesRewardRule(cardName,rule){
 const card=clean(cardName),target=clean(rule?.card_name);
 return Boolean(card&&target&&(card.includes(target)||target.includes(card)));
}

export function redemptionRouteLabel(type){
 return ({direct_travel:"Direct travel",voucher:"Voucher",statement_credit:"Statement credit",hotel_transfer:"Hotel transfer",airline_transfer:"Airline transfer"})[type]||type||"Redemption";
}

export function transferRatioText(value){
 const ratio=Number(value);
 if(!Number.isFinite(ratio)||ratio<=0)return "Rate unavailable";
 if(Math.abs(ratio-1)<.0001)return "1:1";
 const received=1/ratio;
 return `1:${Number(received.toFixed(2))}`;
}

function redeemablePoints(balance,rule){
 const maximum=Math.min(balance,Number(rule.max_redeem_points||balance));
 const minimum=Number(rule.min_redeem_points||0);
 if(maximum<minimum)return 0;
 const increment=Number(rule.redeem_increment||0);
 return increment>0?Math.floor(maximum/increment)*increment:maximum;
}

export function buildDirectRedemptions(wallet,rules,targetCash=0){
 return wallet.flatMap(card=>(rules||[]).filter(rule=>cardMatchesRewardRule(card.card_name,rule)).map(rule=>{
  const rate=Number(rule.redemption_value);
  if(!["direct_travel","voucher","statement_credit"].includes(rule.partner_type)||!Number.isFinite(rate)||rate<=0)return null;
  const balance=Math.max(0,Number(card.points||0));
  const usable=redeemablePoints(balance,rule);
  if(!usable)return null;
  const coverageLimit=Number(rule.max_booking_coverage||(/up to 70%/i.test(rule.notes||"")?.7:1));
  const cashCap=Number(targetCash)>0?Number(targetCash)*coverageLimit:Infinity;
  const value=Math.min(usable*rate,cashCap);
  const increment=Number(rule.redeem_increment||1);
  const pointsUsed=Math.min(usable,Math.max(Number(rule.min_redeem_points||0),Math.ceil(Math.ceil(value/rate)/increment)*increment));
  return {card,rule,rate:pointsUsed?value/pointsUsed:0,pointsUsed,value,cashRemaining:Math.max(0,Number(targetCash||0)-value),type:redemptionRouteLabel(rule.partner_type)};
 }).filter(Boolean)).sort((a,b)=>b.value-a.value||b.rate-a.rate);
}

export function buildAwardFunding({wallet,rules,balances,programCode,milesRequired=0,cashFare=0,taxes=0}){
 const program=AIRLINE_PROGRAMS.find(item=>item.code===programCode)||AIRLINE_PROGRAMS[0];
 const target=Math.max(0,Number(milesRequired||0));
 const existing=Math.max(0,Number((balances||[]).find(item=>item.program_code===program.code)?.miles||0));
 let remaining=Math.max(0,target-existing);
 const candidates=(rules||[]).filter(rule=>rule.partner_type==="airline_transfer"&&programForPartner(rule.partner)?.code===program.code).flatMap(rule=>(wallet||[]).filter(card=>cardMatchesRewardRule(card.card_name,rule)).map(card=>({card,rule,ratio:Number(rule.transfer_ratio||0)}))).filter(item=>item.ratio>0).sort((a,b)=>a.ratio-b.ratio||Number(b.card.points||0)-Number(a.card.points||0));
 // Alternative rules for a card describe the same balance, not extra points.
 const seenCards=new Set();
 const routes=candidates.filter(item=>{
  const key=item.card.id||item.card;
  if(seenCards.has(key))return false;
  seenCards.add(key);return true;
 }).map(item=>{
  const balance=Math.max(0,Number(item.card.points||0));
  const transferable=Math.floor(balance/item.ratio);
  const contribution=Math.min(remaining,transferable);
  const pointsNeeded=Math.min(balance,Math.ceil(contribution*item.ratio));
  remaining=Math.max(0,remaining-contribution);
  return {...item,transferable,contribution,pointsNeeded};
 });
 const transferable=routes.reduce((sum,item)=>sum+item.transferable,0);
 const plannedTransfer=routes.reduce((sum,item)=>sum+item.contribution,0);
 const netCashValue=Math.max(0,Number(cashFare||0)-Number(taxes||0));
 return {program,target,existing,transferable,plannedTransfer,funded:existing+plannedTransfer,shortfall:remaining,coverage:target?Math.min(1,(existing+plannedTransfer)/target):0,valuePerMile:target?netCashValue/target:0,netCashValue,routes};
}

export function buildGoalPace({travelDate,shortfall=0,transferRatio=0,asOf=Date.now()}){
 const gap=Math.max(0,Math.ceil(Number(shortfall)||0));
 const targetTime=travelDate?new Date(`${travelDate}T12:00:00`).getTime():NaN;
 const daysRemaining=Number.isFinite(targetTime)?Math.ceil((targetTime-Number(asOf))/86400000):null;
 const monthsRemaining=daysRemaining==null?null:Math.max(1,Math.ceil(Math.max(0,daysRemaining)/30));
 const milesPerMonth=monthsRemaining?Math.ceil(gap/monthsRemaining):null;
 const ratio=Number(transferRatio);
 const pointsPerMonth=milesPerMonth!=null&&ratio>0?Math.ceil(milesPerMonth*ratio):null;
 const status=daysRemaining!=null&&daysRemaining<0?"date_passed":gap===0?"funded":travelDate?"building":"date_needed";
 return{gap,daysRemaining,monthsRemaining,milesPerMonth,pointsPerMonth,status};
}
