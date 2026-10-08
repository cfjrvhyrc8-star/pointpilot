// Limits must explicitly use source card points. Null maximum means uncapped
// only when transfer_limits_verified is true; missing metadata is not proof.
export function planTransfer({balance,ratio,milesNeeded,rule={}}){
 const available=Math.max(0,Math.floor(Number(balance)||0));
 const rate=Number(ratio),gap=Math.max(0,Math.ceil(Number(milesNeeded)||0));
 const known=rule.transfer_unit==="card_points"&&rule.transfer_limits_verified===true;
 const supplied=[rule.min_transfer,rule.transfer_increment,...(rule.max_transfer==null?[]:[rule.max_transfer])];
 const valid=known&&supplied.every(v=>v!=null&&String(v).trim()!==""&&Number.isSafeInteger(Number(v))&&Number(v)>=0)&&Number(rule.transfer_increment)>0;
 const status=!known?"needs_verification":!valid?"invalid":"verified";
 if(!Number.isFinite(rate)||rate<=0||status==="invalid")return {transferable:0,contribution:0,pointsNeeded:0,milesReceived:0,surplusMiles:0,limitsStatus:"invalid"};
 const minimum=valid?Number(rule.min_transfer):0;
 const increment=valid?Number(rule.transfer_increment):1;
 const maximum=valid&&rule.max_transfer!=null?Number(rule.max_transfer):available;
 const usable=Math.floor(Math.min(available,maximum)/increment)*increment;
 const transferable=usable>=minimum?Math.floor(usable/rate):0;
 const requested=Math.ceil(Math.max(minimum,Math.ceil(gap*rate))/increment)*increment;
 const pointsNeeded=gap>0&&transferable>0?Math.min(usable,requested):0;
 const milesReceived=Math.floor(pointsNeeded/rate);
 const contribution=Math.min(gap,milesReceived);
 return {transferable,contribution,pointsNeeded,milesReceived,surplusMiles:Math.max(0,milesReceived-contribution),limitsStatus:status};
}
