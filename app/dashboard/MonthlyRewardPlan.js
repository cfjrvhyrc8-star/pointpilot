"use client";

import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser.js";
const categories=[
 {key:"general",label:"Everyday & shopping",icon:"◎",hint:"Retail, groceries and other eligible spend"},
 {key:"dining",label:"Dining & delivery",icon:"◒",hint:"Restaurants and eligible food delivery"},
 {key:"travel",label:"Local travel",icon:"↗",hint:"Eligible travel excluding flights and hotels"},
 {key:"flights",label:"Flights",icon:"✈",hint:"Airfare and eligible booking portals"},
 {key:"hotels",label:"Hotels",icon:"▤",hint:"Stays and eligible booking portals"},
 {key:"international",label:"International",icon:"◉",hint:"Foreign-currency and international merchant spend"}
];
const emptySpend=Object.fromEntries(categories.map(category=>[category.key,0]));
const exampleSpend={general:30000,dining:12000,travel:5000,flights:15000,hotels:10000,international:8000};
const fmt=value=>Number(value||0).toLocaleString("en-IN");
const money=value=>Number(value||0).toLocaleString("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});
const clean=value=>String(value||"").toLowerCase().replace(/credit card|metal edition|metal card|card|club|first|hdfc|icici|idfc|bank|american express india|scapia federal|federal/g,"").replace(/[^a-z0-9]/g,"");
const matches=(cardName,ruleName)=>{const a=clean(cardName),b=clean(ruleName);return Boolean(a&&b&&(a.includes(b)||b.includes(a)))};
const bestRule=(cardName,category,rules)=>{
 const cardRules=rules.filter(rule=>matches(cardName,rule.card_name));
 const candidates=cardRules.filter(rule=>rule.category===category);
 const usable=candidates.length?candidates:cardRules.filter(rule=>rule.category==="general");
 return [...usable].sort((a,b)=>Number(b.value_rate_percent||0)-Number(a.value_rate_percent||0))[0];
};
const valueFor=(rule,spend)=>{
 if(!rule||rule.value_rate_percent==null)return 0;
 const eligible=rule.cap_amount==null?spend:Math.min(spend,Number(rule.cap_amount));
 return eligible*Number(rule.value_rate_percent)/100;
};

export default function MonthlyRewardPlan({wallet,userId}){
 const[spend,setSpend]=useState(emptySpend),[rules,setRules]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(!userId)return;let active=true;(async()=>{const sb=getSupabase();const[{data:profile,error:profileError},{data:ruleRows,error:ruleError}]=await Promise.all([sb.from("user_spend_profiles").select("monthly_spend").eq("user_id",userId).maybeSingle(),sb.from("spend_rules").select("*").eq("active",true)]);if(!active)return;if(profileError&&profileError.code!=="PGRST116")throw profileError;if(ruleError)throw ruleError;if(profile?.monthly_spend)setSpend({...emptySpend,...profile.monthly_spend});setRules(ruleRows||[]);setLoading(false)})().catch(err=>{if(active){setError(err?.message||"Unable to load your monthly plan.");setLoading(false)}});return()=>{active=false}},[userId]);
 const model=useMemo(()=>{
  const plans=categories.map(category=>{
   const amount=Math.max(0,Number(spend[category.key])||0);
   const ranked=wallet.map(card=>{const rule=bestRule(card.card_name,category.key,rules);return{card,rule,value:valueFor(rule,amount)}}).filter(row=>row.rule).sort((a,b)=>b.value-a.value);
   return{...category,amount,winner:ranked[0]||null,ranked};
  });
  const optimized=plans.reduce((sum,row)=>sum+Number(row.winner?.value||0),0);
  const singleCards=wallet.map(card=>({card,value:plans.reduce((sum,row)=>sum+valueFor(bestRule(card.card_name,row.key,rules),row.amount),0)})).sort((a,b)=>b.value-a.value);
  const baseline=singleCards[0]||null;
  const monthlySpend=plans.reduce((sum,row)=>sum+row.amount,0);
  const coveredSpend=plans.reduce((sum,row)=>sum+(row.winner?row.amount:0),0);
  const incremental=Math.max(0,optimized-Number(baseline?.value||0));
  return{plans,optimized,baseline,monthlySpend,coveredSpend,incremental,annualIncremental:incremental*12,annualOptimized:optimized*12};
 },[spend,wallet,rules]);
 const save=async()=>{setSaving(true);setSaved(false);setError("");const{error:saveError}=await getSupabase().from("user_spend_profiles").upsert({user_id:userId,monthly_spend:Object.fromEntries(categories.map(category=>[category.key,Math.max(0,Number(spend[category.key])||0)])),updated_at:new Date().toISOString()},{onConflict:"user_id"});setSaving(false);if(saveError){setError(saveError.message);return}setSaved(true)};
 const update=(key,value)=>{setSaved(false);setSpend(previous=>({...previous,[key]:Math.max(0,Number(value)||0)}))};
 return <section className="monthlyPlan" id="monthly-plan">
  <div className="sectionHead monthlyPlanHead"><div><span className="sectionKicker">MY REWARD PLAN</span><h2>Route your whole month—not one purchase.</h2><p>See what your current wallet could return when every category is assigned to its strongest verified card.</p></div><span className="planPreview">FOUNDING PREVIEW</span></div>
  {loading?<div className="notice">Building your monthly reward plan…</div>:error&&!rules.length?<div className="errorBox">{error}</div>:<div className="monthlyPlanShell">
   <div className="planInputs"><div className="planInputsTop"><div><small>01 / YOUR MONTH</small><h3>Monthly spending profile</h3></div><button className="planExample" onClick={()=>{setSaved(false);setSpend(exampleSpend)}}>Load an example</button></div><div className="planCategoryGrid">{categories.map(category=><label key={category.key}><i>{category.icon}</i><span><b>{category.label}</b><small>{category.hint}</small></span><div><em>₹</em><input type="number" min="0" step="500" value={spend[category.key]||""} placeholder="0" onChange={event=>update(category.key,event.target.value)}/></div></label>)}</div><div className="planSave"><button onClick={save} disabled={saving||!userId}>{saving?"Saving…":"Save my monthly plan"}</button>{saved&&<span>✓ Plan saved securely</span>}{error&&<span className="planError">{error}</span>}</div></div>
   <aside className="planValue"><small>02 / VALUE OPPORTUNITY</small><h3>Your wallet&apos;s modeled upside</h3><div className="annualValue"><span>ESTIMATED ANNUAL INCREMENTAL VALUE</span><strong>{money(model.annualIncremental)}</strong><p>versus putting the same spending on the strongest single card in this wallet</p></div><dl><div><dt>Monthly spend entered</dt><dd>{money(model.monthlySpend)}</dd></div><div><dt>Spend with a verified match</dt><dd>{money(model.coveredSpend)}</dd></div><div><dt>Optimized annual reward value</dt><dd>{money(model.annualOptimized)}</dd></div><div><dt>Best one-card baseline</dt><dd>{model.baseline?.card.card_name||"Not available"}</dd></div></dl>{model.annualIncremental>0?<div className="planPayback">At the planned ₹999/year Plus price, this modeled improvement is <b>{(model.annualIncremental/999).toFixed(1)}× the membership fee.</b></div>:<div className="planPayback neutral">Add monthly spending—or more verified card rules—to reveal an incremental opportunity.</div>}</aside>
  </div>}
  {!loading&&<div className="categoryRouting"><div className="planInputsTop"><div><small>03 / CATEGORY ROUTING</small><h3>Your recommended monthly playbook</h3></div><span>{money(model.optimized)} modeled value / month</span></div><div className="routingRows">{model.plans.filter(row=>row.amount>0).map(row=><article key={row.key}><i>{row.icon}</i><div><small>{row.label} · {money(row.amount)}</small><b>{row.winner?.card.card_name||"No verified match yet"}</b><span>{row.winner?row.winner.rule.reward_label:"This amount is excluded from the value calculation until a verified rule is available."}</span></div><strong>{row.winner?money(row.winner.value):"—"}<small>{row.winner?`${Number(row.winner.rule.value_rate_percent).toFixed(2)}% modeled`:"unmodeled"}</small></strong></article>)}{model.monthlySpend===0&&<div className="planEmpty">Enter your normal monthly spending to generate a personalised card-routing plan.</div>}</div></div>}
  <div className="spendGuardrail"><span>ⓘ</span><p>This is an estimate from verified fixed-value rules currently loaded for your cards. Temporary offers, merchant coding, milestone bonuses, changing caps and excluded transactions can alter actual rewards. Unverified categories are left out instead of being guessed.</p></div>
 </section>;
}
