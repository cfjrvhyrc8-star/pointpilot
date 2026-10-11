import {buildDirectRedemptions} from './reward-planner.js';

// A user-entered portal quote is a scenario, not a provider verification.
export function repriceDirectRoute(route,quote){
 if(!route||quote==null||String(quote).trim()==='')return null;
 const fare=Number(quote);
 if(!Number.isFinite(fare)||fare<=0)return null;
 return buildDirectRedemptions([route.card],[route.rule],fare)[0]||null;
}

export function directBreakEven(decision){
 const cash=decision?.choices.find(row=>row.kind==='cash');
 const direct=decision?.choices.find(row=>row.kind==='direct');
 if(!cash||!direct||!Number.isFinite(direct.points)||direct.points<=0)return null;
 const saving=cash.cash-direct.cash;
 return {saving,perPoint:saving/direct.points};
}
