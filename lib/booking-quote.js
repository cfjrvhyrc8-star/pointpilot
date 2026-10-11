import {buildDirectRedemptions} from './reward-planner.js';

// A user-entered portal quote is a scenario, not a provider verification.
export function repriceDirectRoute(route,quote,remainingAllowance){
 if(!route||quote==null||String(quote).trim()==='')return null;
 const fare=Number(quote);
 if(!Number.isFinite(fare)||fare<=0)return null;
 if(remainingAllowance!==undefined&&!validRedemptionAllowance(remainingAllowance))return null;
 // Restrict a copy of the available balance; never debit the real wallet.
 // This also handles zero, which legacy max_redeem_points treats as absent.
 const card=remainingAllowance===undefined?route.card:{...route.card,points:Math.min(Number(route.card.points),Number(remainingAllowance))};
 const result=buildDirectRedemptions([card],[route.rule],fare)[0];
 return result?{...result,card:route.card}:null;
}

export function validRedemptionAllowance(value){
 return value!=null&&typeof value!=='boolean'&&String(value).trim()!==''&&Number.isSafeInteger(Number(value))&&Number(value)>=0;
}

export function directBreakEven(decision){
 const cash=decision?.choices.find(row=>row.kind==='cash');
 const direct=decision?.choices.find(row=>row.kind==='direct');
 if(!cash||!direct||!Number.isFinite(direct.points)||direct.points<=0)return null;
 const saving=cash.cash-direct.cash;
 return {saving,perPoint:saving/direct.points};
}
