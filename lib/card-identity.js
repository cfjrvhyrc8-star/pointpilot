const normalize=value=>String(value||'').toLowerCase().replace(/\b(credit|card|edition|club|first|hdfc|icici|idfc|bank|american|express|amex|india|federal)\b/g,'').replace(/[^a-z0-9]/g,'');
// Explicit product aliases only: never strip "metal" globally, since Diners
// Black and Black Metal have different reward terms. Keep Scapia's product name.
const aliases=new Map([['timesblackmetal','timesblack'],['one','onecard']]);
const identity=value=>{const key=normalize(value);return aliases.get(key)||key;};
export function cardNamesMatch(card,rule){
 const a=identity(card),b=identity(rule);
 return Boolean(a&&b&&a===b);
}
