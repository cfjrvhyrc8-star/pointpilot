"use client";

import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser.js";

const categories=[
  ["general","Everyday spend"],
  ["dining","Dining"],
  ["travel","Travel"],
  ["flights","Flights"],
  ["hotels","Hotels"],
  ["international","International"]
];

const merchantIdeas=[
  ["Amazon","general"],
  ["Weekend dinner","dining"],
  ["MakeMyTrip flight","flights"],
  ["Hotel stay","hotels"],
  ["International purchase","international"]
];

function categoryForMerchant(value){
  const text=String(value||"").toLowerCase();
  if(/flight|airline|indigo|air india|vistara|spicejet/.test(text))return"flights";
  if(/hotel|stay|marriott|hilton|taj|itc/.test(text))return"hotels";
  if(/restaurant|dinner|dining|swiggy|zomato|food/.test(text))return"dining";
  if(/international|overseas|foreign|forex/.test(text))return"international";
  if(/travel|makemytrip|cleartrip|yatra/.test(text))return"travel";
  return"general";
}

function clean(value){
  return String(value||"").toLowerCase()
    .replace(/credit card|metal edition|metal card|card|club|first|hdfc|icici|idfc|bank|american express india|scapia federal|federal/g,"")
    .replace(/[^a-z0-9]/g,"");
}

function cardMatches(cardName,ruleName){
  const a=clean(cardName),b=clean(ruleName);
  return Boolean(a&&b&&(a.includes(b)||b.includes(a)));
}

function money(value){
  return Number(value||0).toLocaleString("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});
}

export default function SpendSmart({wallet}){
  const [rules,setRules]=useState([]);
  const [amount,setAmount]=useState(10000);
  const [category,setCategory]=useState("general");
  const [merchant,setMerchant]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    getSupabase().from("spend_rules").select("*").eq("active",true).order("card_name").then(({data,error})=>{
      if(!active)return;
      if(error)setError(error.message);
      setRules(data||[]);
      setLoading(false);
    }).catch(error=>{
      if(active){setError(error?.message||"Unable to load spend rules.");setLoading(false)}
    });
    return()=>{active=false};
  },[]);

  const ranked=useMemo(()=>{
    const spend=Math.max(0,Number(amount)||0);
    return wallet.map(card=>{
      const cardRules=rules.filter(rule=>cardMatches(card.card_name,rule.card_name));
      const exact=cardRules.filter(rule=>rule.category===category);
      const fallback=cardRules.filter(rule=>rule.category==="general");
      const candidates=exact.length?exact:fallback;
      const best=candidates.sort((a,b)=>Number(b.value_rate_percent||0)-Number(a.value_rate_percent||0))[0];
      if(!best||best.value_rate_percent==null)return{card,ranked:false};
      const eligibleSpend=best.cap_amount==null?spend:Math.min(spend,Number(best.cap_amount));
      const value=eligibleSpend*Number(best.value_rate_percent)/100;
      return{card,ranked:true,rule:best,value,rate:Number(best.value_rate_percent),eligibleSpend,unrewardedSpend:Math.max(0,spend-eligibleSpend),isFallback:best.category!==category};
    }).sort((a,b)=>{
      if(a.ranked!==b.ranked)return a.ranked?-1:1;
      return Number(b.value||0)-Number(a.value||0);
    });
  },[wallet,rules,amount,category]);

  const leader=ranked.find(item=>item.ranked);
  const runnerUp=ranked.filter(item=>item.ranked)[1];
  const advantage=Math.max(0,Number(leader?.value||0)-Number(runnerUp?.value||0));
  const categoryLabel=categories.find(([key])=>key===category)?.[1]||"Spend";

  const applyMerchant=(value,explicitCategory)=>{
    setMerchant(value);
    setCategory(explicitCategory||categoryForMerchant(value));
  };

  return <section className="spendSmart">
    <div className="sectionHead spendHead">
      <div><span className="sectionKicker">SPEND INTELLIGENCE</span><h2>Which card should you use?</h2><p>Rank your own wallet for a real purchase using only verified, fixed-value rules.</p></div>
      <span className="engineBadge">VERIFIED RULES</span>
    </div>

    <div className="spendWorkbench">
      <div className="spendControls">
        <label className="merchantField">Merchant or purchase
          <input value={merchant} placeholder="e.g. weekend dinner at ITC" onChange={event=>applyMerchant(event.target.value)}/>
          <small>We infer a category; you can override it.</small>
        </label>
        <label>Purchase amount
          <div className="moneyInput"><span>₹</span><input type="number" min="0" step="100" value={amount} onChange={event=>setAmount(event.target.value)}/></div>
        </label>
        <label>Spend category
          <select value={category} onChange={event=>setCategory(event.target.value)}>
            {categories.map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <div className="spendChips">{merchantIdeas.map(([label,value])=><button className={merchant===label?"active":""} onClick={()=>applyMerchant(label,value)} key={label}>{label}</button>)}</div>
      </div>

      {loading?<div className="spendState">Loading verified spend rules…</div>:error?<div className="errorBox">We couldn’t load spend intelligence: {error}</div>:leader?<div className="spendResults">
        <article className="spendWinner">
          <div className="spendWinnerTop"><span>BEST CURRENT MATCH</span><b>{categoryLabel}</b></div>
          <h3>{leader.card.card_name}</h3>
          <p>{merchant?<>Best verified match for <b>{merchant}</b>.</>:leader.rule.reward_label}</p>
          <div className="spendReturn"><strong>{money(leader.value)}</strong><span>estimated reward value · {money(leader.eligibleSpend)} eligible</span></div>
          <div className="winnerProof"><div><span>Verified rule</span><b>{leader.rule.reward_label}</b></div><div><span>Why it wins</span><b>{runnerUp?`${money(advantage)} more modeled value than ${runnerUp.card.card_name}`:"Only verified match in this wallet"}</b></div>{leader.unrewardedSpend>0&&<div><span>Cap applied</span><b>{money(leader.unrewardedSpend)} is outside this rule&apos;s modeled cap</b></div>}</div>
          <small>{leader.rule.condition_text||"Eligible spend"}{leader.isFallback?" · using the verified everyday rate because no category-specific rule is loaded":""}</small>
          {leader.rule.exclusions_text&&<small className="winnerExclusion">Exclusions: {leader.rule.exclusions_text}</small>}
          <a className="winnerSource" href={leader.rule.source_url} target="_blank" rel="noreferrer">Issuer source · verified {String(leader.rule.verified_at||"").slice(0,10)} ↗</a>
        </article>
        <div className="spendRanking">
          {ranked.map((item,index)=><article className={item.ranked?"":"unranked"} key={item.card.id||item.card.card_name}>
            <i>{String(index+1).padStart(2,"0")}</i>
            <div><b>{item.card.card_name}</b><span>{item.ranked?item.rule.reward_label:"Fixed monetary value not verified for this category"}</span></div>
            <div className="spendValue">{item.ranked?<><strong>{money(item.value)}</strong><span>{item.rate.toFixed(item.rate<1?2:1)}% modeled value{item.unrewardedSpend>0?" · capped":""}</span></>:<span>Not ranked</span>}</div>
          </article>)}
        </div>
      </div>:<div className="spendState">No verified fixed-value rule matches the cards in this wallet yet.</div>}
    </div>

    <div className="spendGuardrail"><span>ⓘ</span><p>Estimates exclude welcome offers, annual milestones and temporary promotions. Merchant coding, caps and exclusions can change the actual result. PointPilot always keeps the applicable condition visible.</p></div>
  </section>
}
