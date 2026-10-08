"use client";

import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser.js";
import {buildAwardFunding} from "../../lib/reward-planner.js";
const fmt=value=>Number(value||0).toLocaleString("en-IN");
const daysUntil=value=>value?Math.ceil((new Date(`${value}T23:59:59`).getTime()-Date.now())/86400000):null;

export default function ActionCentre({wallet,userId,onTrip,onPlan,onMilestones,onSpend,onUsePoints,onPlanTrip,onMiles,onWallet}){
  const [mileBalances,setMileBalances]=useState([]);
  const [goal,setGoal]=useState(null);
  const [rewardRules,setRewardRules]=useState([]);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const refresh=()=>setRevision(value=>value+1);window.addEventListener("pointpilot:trip-saved",refresh);window.addEventListener("pointpilot:miles-changed",refresh);return()=>{window.removeEventListener("pointpilot:trip-saved",refresh);window.removeEventListener("pointpilot:miles-changed",refresh)}},[]);

  useEffect(()=>{
    if(!userId)return;
    let active=true;
    const sb=getSupabase();
    Promise.all([sb.from("airline_mile_balances").select("program_code,miles,expiry_date").eq("user_id",userId),sb.from("user_trip_goals").select("*").eq("user_id",userId).maybeSingle(),sb.from("reward_rules").select("*").eq("active",true)]).then(([balancesResult,goalResult,rulesResult])=>{
      if(!active)return;
      if(!balancesResult.error)setMileBalances(balancesResult.data||[]);
      if(!goalResult.error)setGoal(goalResult.data||null);
      if(!rulesResult.error)setRewardRules(rulesResult.data||[]);
    }).catch(()=>{if(active){setGoal(null);setMileBalances([])}});
    return()=>{active=false};
  },[userId,revision]);

  const insight=useMemo(()=>{
    const sorted=[...wallet].sort((a,b)=>Number(b.points||0)-Number(a.points||0));
    const top=sorted[0];
    const total=wallet.reduce((sum,card)=>sum+Number(card.points||0),0);
    const withBalance=wallet.filter(card=>Number(card.points||0)>0).length;
    const expiring=mileBalances
      .map(row=>({...row,days:daysUntil(row.expiry_date)}))
      .filter(row=>row.days!=null&&row.days>=0&&row.days<=90)
      .sort((a,b)=>a.days-b.days)[0];
    const tripFunding=goal&&Number(goal.miles_required)>0?buildAwardFunding({wallet,rules:rewardRules,balances:mileBalances,programCode:goal.program_code,milesRequired:goal.miles_required,cashFare:goal.cash_fare,taxes:goal.taxes}):null;
    return{top,total,withBalance,expiring,totalMiles:mileBalances.reduce((sum,row)=>sum+Number(row.miles||0),0),tripFunding};
  },[wallet,mileBalances,goal,rewardRules]);

  const actions=[];
  if(insight.expiring){
    actions.push({tone:"urgent",number:"01",label:"EXPIRY WATCH",title:`${fmt(insight.expiring.miles)} miles need attention`,detail:`${insight.expiring.program_code} has a recorded expiry in ${insight.expiring.days} day${insight.expiring.days===1?"":"s"}. Check the airline before transferring or booking.`,cta:"Review miles",onClick:onMiles});
  }
  if(goal&&insight.tripFunding){
    const percent=Math.round(insight.tripFunding.coverage*100),days=daysUntil(goal.travel_date);
    actions.push({tone:"violet",number:String(actions.length+1).padStart(2,"0"),label:"SAVED TRIP",title:`${goal.origin} → ${goal.destination} is ${percent}% funded`,detail:insight.tripFunding.shortfall?`${fmt(insight.tripFunding.shortfall)} miles remain${days!=null&&days>=0?` with ${days} days to go`:""}. Open the plan for the monthly pace and verified funding sequence.`:"Your current balances can fund the target. Confirm live award space before transferring.",cta:"Open my trip",onClick:onTrip});
  }
  if(!goal)actions.push({tone:"violet",number:String(actions.length+1).padStart(2,"0"),label:"NEXT TRIP",title:"Set the trip your points should fund",detail:"Save the route, cabin, award programme and target date so every balance has a measurable job.",cta:"Set my trip",onClick:onTrip||onPlanTrip});
  actions.push({tone:"navy",number:String(actions.length+1).padStart(2,"0"),label:"MONTHLY PLAN",title:"Find the value hiding in your month",detail:"Route every spend category across your wallet and measure the annual improvement over using one default card.",cta:"Build my plan",onClick:onPlan});
  actions.push({tone:"urgent",number:String(actions.length+1).padStart(2,"0"),label:"TARGET WATCH",title:"Protect milestone value and annual fees",detail:"Record statement spend once, then see the verified threshold, remaining amount and benefit before the cycle closes.",cta:"Track targets",onClick:onMilestones});
  if(insight.top){
    actions.push({tone:"violet",number:String(actions.length+1).padStart(2,"0"),label:"POINTS TO DEPLOY",title:`Put ${insight.top.card_name} to work`,detail:`Your largest card balance is ${fmt(insight.top.points)} points. Compare only verified redemption routes before moving them.`,cta:"Find best use",onClick:onUsePoints});
  }
  actions.push({tone:"mint",number:String(actions.length+1).padStart(2,"0"),label:"BEFORE YOU PAY",title:"Rank the purchase, not just the card",detail:"Enter the merchant and amount to see the best verified return from cards you already hold.",cta:"Choose a card",onClick:onSpend});
  if(!wallet.length){
    actions.unshift({tone:"urgent",number:"01",label:"SETUP",title:"Add your first card",detail:"PointPilot needs the cards and balances you choose to share before it can personalise decisions.",cta:"Open wallet",onClick:onWallet});
  }

  return <section className="actionCentre" aria-labelledby="action-centre-title">
    <div className="actionIntro">
      <div><span className="sectionKicker">YOUR ACTION CENTRE</span><h2 id="action-centre-title">What deserves attention now.</h2><p>A short, personal decision queue built from the balances you added—not generic card rankings.</p></div>
      <div className="actionStats">
        <div><small>CARD POINTS</small><b>{fmt(insight.total)}</b></div>
        <div><small>AIRLINE MILES</small><b>{fmt(insight.totalMiles)}</b></div>
        <div><small>ACTIVE BALANCES</small><b>{insight.withBalance}/{wallet.length}</b></div>
      </div>
    </div>
    <div className="actionGrid">{actions.slice(0,4).map((action,index)=><button className={`actionCard ${action.tone}`} onClick={action.onClick} key={`${action.label}-${index}`}>
      <div className="actionCardTop"><i>{action.number}</i><span>{action.label}</span></div>
      <h3>{action.title}</h3><p>{action.detail}</p><b>{action.cta}<em>↗</em></b>
    </button>)}</div>
  </section>;
}
