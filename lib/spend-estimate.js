const normalize=value=>String(value||'').toLowerCase().replace(/\b(credit|card|edition|club|first|hdfc|icici|idfc|bank|american|express|amex|india|federal)\b/g,'').replace(/[^a-z0-9]/g,'');
// Explicit product aliases only: never strip "metal" globally, since Diners
// Black and Black Metal have different reward terms. Keep Scapia's product name.
const aliases=new Map([['timesblackmetal','timesblack']]);
const identity=value=>{const key=normalize(value);return aliases.get(key)||key;};
export function spendCardMatches(card,rule){
 const a=identity(card),b=identity(rule);
 return Boolean(a&&b&&a===b);
}
export function spendValue(rule,amount){
 const spend=Number(amount),rate=Number(rule?.value_rate_percent),cap=rule?.cap_amount;
 if(!rule||rule.active===false||rule.value_rate_percent==null||!Number.isFinite(spend)||spend<0||!Number.isFinite(rate)||rate<0||(cap!=null&&(!Number.isFinite(Number(cap))||Number(cap)<0)))return null;
 const eligibleSpend=cap==null?spend:Math.min(spend,Number(cap));
 return {value:eligibleSpend*rate/100,rate,eligibleSpend,unrewardedSpend:spend-eligibleSpend};
}
// Unknown channels never imply weekend/portal eligibility. The user has not
// supplied transaction timing or shared bonus usage to these ranking surfaces.
export function selectSpendRule(cardName,category,rules,amount){
 const usable=rules.filter(rule=>spendCardMatches(cardName,rule.card_name)&&
  (rule.channel==='any'||(rule.channel==='domestic'&&category!=='international'))&&spendValue(rule,amount)!==null);
 const exact=usable.filter(rule=>rule.category===category);
 const candidates=exact.length?exact:usable.filter(rule=>rule.category==='general');
 return [...candidates].sort((a,b)=>spendValue(b,amount).value-spendValue(a,amount).value)[0];
}
