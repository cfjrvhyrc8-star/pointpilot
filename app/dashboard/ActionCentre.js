"use client";

import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser.js";
const fmt=value=>Number(value||0).toLocaleString("en-IN");
const daysUntil=value=>value?Math.ceil((new Date(`${value}T23:59:59`).getTime()-Date.now())/86400000):null;

export default function ActionCentre({wallet,userId,onPlan,onMilestones,onSpend,onUsePoints,onPlanTrip,onMiles,onWallet}){
  const [mileBalances,setMileBalances]=useState([]);

  useEffect(()=>{
    if(!userId)return;
    let active=true;
    getSupabase().from("airline_mile_balances").select("program_code,miles,expiry_date").eq("user_id",userId).then(({data,error})=>{
      if(!active||error)return;
      setMileBalances(data||[]);
    });
    return()=>{active=false};
  },[userId]);

  const insight=useMemo(()=>{
    const sorted=[...wallet].sort((a,b)=>Number(b.points||0)-Number(a.points||0));
    const top=sorted[0];
    const total=wallet.reduce((sum,card)=>sum+Number(card.points||0),0);
    const withBalance=wallet.filter(card=>Number(card.points||0)>0).length;
    const expiring=mileBalances
      .map(row=>({...row,days:daysUntil(row.expiry_date)}))
      .filter(row=>row.days!=null&&row.days>=0&&row.days<=90)
      .sort((a,b)=>a.days-b.days)[0];
    return{top,total,withBalance,expiring,totalMiles:mileBalances.reduce((sum,row)=>sum+Number(row.miles||0),0)};
  },[wallet,mileBalances]);

  const actions=[];
  if(insight.expiring){
    actions.push({tone:"urgent",number:"01",label:"EXPIRY WATCH",title:`${fmt(insight.expiring.miles)} miles need attention`,detail:`${insight.expiring.program_code} has a recorded expiry in ${insight.expiring.days} day${insight.expiring.days===1?"":"s"}. Check the airline before transferring or booking.`,cta:"Review miles",onClick:onMiles});
  }
  actions.push({tone:"navy",number:String(actions.length+1).padStart(2,"0"),label:"MONTHLY PLAN",title:"Find the value hiding in your month",detail:"Route every spend category across your wallet and measure the annual improvement over using one default card.",cta:"Build my plan",onClick:onPlan});
  actions.push({tone:"urgent",number:String(actions.length+1).padStart(2,"0"),label:"TARGET WATCH",title:"Protect milestone value and annual fees",detail:"Record statement spend once, then see the verified threshold, remaining amount and benefit before the cycle closes.",cta:"Track targets",onClick:onMilestones});
  if(insight.top){
    actions.push({tone:"violet",number:String(actions.length+1).padStart(2,"0"),label:"POINTS TO DEPLOY",title:`Put ${insight.top.card_name} to work`,detail:`Your largest card balance is ${fmt(insight.top.points)} points. Compare only verified redemption routes before moving them.`,cta:"Find best use",onClick:onUsePoints});
  }
  actions.push({tone:"mint",number:String(actions.length+1).padStart(2,"0"),label:"BEFORE YOU PAY",title:"Rank the purchase, not just the card",detail:"Enter the merchant and amount to see the best verified return from cards you already hold.",cta:"Choose a card",onClick:onSpend});
  actions.push({tone:"violet",number:String(actions.length+1).padStart(2,"0"),label:"NEXT TRIP",title:"Start with the live cash fare",detail:"Then compare that fare with your verified points routes—without treating cash seats as award availability.",cta:"Plan a trip",onClick:onPlanTrip});
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
