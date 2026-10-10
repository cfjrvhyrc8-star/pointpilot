"use client";

import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser.js";
import {buildMonthlyPlan} from "../../lib/monthly-plan.js";
import {monthlyPlanCsv} from "../../lib/plan-export.js";
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
const money=value=>Number(value||0).toLocaleString("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});

export default function MonthlyRewardPlan({wallet,userId}){
 const[spend,setSpend]=useState(emptySpend),[rules,setRules]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(!userId)return;let active=true;(async()=>{const sb=getSupabase();const[{data:profile,error:profileError},{data:ruleRows,error:ruleError}]=await Promise.all([sb.from("user_spend_profiles").select("monthly_spend").eq("user_id",userId).maybeSingle(),sb.from("spend_rules").select("*").eq("active",true)]);if(!active)return;if(profileError&&profileError.code!=="PGRST116")throw profileError;if(ruleError)throw ruleError;if(profile?.monthly_spend)setSpend({...emptySpend,...profile.monthly_spend});setRules(ruleRows||[]);setLoading(false)})().catch(err=>{if(active){setError(err?.message||"Unable to load your monthly plan.");setLoading(false)}});return()=>{active=false}},[userId]);
 const model=useMemo(()=>buildMonthlyPlan({wallet,rules,spend,categories}),[spend,wallet,rules]);
 const downloadPlan=()=>{
  let url;
  try{
   const now=new Date();
   url=URL.createObjectURL(new Blob([monthlyPlanCsv(model,now)],{type:"text/csv;charset=utf-8"}));
   const link=document.createElement("a");
   link.href=url;link.download=`pointpilot-monthly-plan-${now.toISOString().slice(0,10)}.csv`;
   document.body.appendChild(link);link.click();link.remove();
  }catch{setError("Unable to download your plan. Please try again.")}
  finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000)}
 };
 const save=async()=>{setSaving(true);setSaved(false);setError("");const{error:saveError}=await getSupabase().from("user_spend_profiles").upsert({user_id:userId,monthly_spend:Object.fromEntries(categories.map(category=>[category.key,Math.max(0,Number(spend[category.key])||0)])),updated_at:new Date().toISOString()},{onConflict:"user_id"});setSaving(false);if(saveError){setError(saveError.message);return}setSaved(true)};
 const update=(key,value)=>{setSaved(false);setSpend(previous=>({...previous,[key]:Math.max(0,Number(value)||0)}))};
 return <section className="monthlyPlan" id="monthly-plan">
  <div className="sectionHead monthlyPlanHead"><div><span className="sectionKicker">MY REWARD PLAN</span><h2>Route your whole month—not one purchase.</h2><p>See what your current wallet could return when every category is assigned to its strongest verified card.</p></div><span className="planPreview">FOUNDING PREVIEW</span></div>
  {loading?<div className="notice">Building your monthly reward plan…</div>:error&&!rules.length?<div className="errorBox">{error}</div>:<div className="monthlyPlanShell">
   <div className="planInputs"><div className="planInputsTop"><div><small>01 / YOUR MONTH</small><h3>Monthly spending profile</h3></div><button className="planExample" onClick={()=>{setSaved(false);setSpend(exampleSpend)}}>Load an example</button></div><div className="planCategoryGrid">{categories.map(category=><label key={category.key}><i>{category.icon}</i><span><b>{category.label}</b><small>{category.hint}</small></span><div><em>₹</em><input type="number" min="0" step="500" value={spend[category.key]||""} placeholder="0" onChange={event=>update(category.key,event.target.value)}/></div></label>)}</div><div className="planSave"><button onClick={save} disabled={saving||!userId}>{saving?"Saving…":"Save my monthly plan"}</button>{saved&&<span>✓ Plan saved securely</span>}{error&&<span className="planError">{error}</span>}</div></div>
   <aside className="planValue"><small>02 / VALUE OPPORTUNITY</small><h3>Your wallet&apos;s modeled upside</h3><div className="annualValue"><span>ILLUSTRATIVE ANNUAL DIFFERENCE</span><strong>{model.annualIncremental==null?"Not comparable":money(model.annualIncremental)}</strong><p>Compared with the best one-card model covering the same modeled categories—not savings already achieved.</p></div><dl><div><dt>Monthly spend entered</dt><dd>{money(model.monthlySpend)}</dd></div><div><dt>Spend inside modeled caps</dt><dd>{money(model.coveredSpend)}</dd></div><div><dt>Outside caps or unmatched</dt><dd>{money(model.unmodeledSpend)}</dd></div><div><dt>Illustrative annual reward value</dt><dd>{money(model.annualOptimized)}</dd></div><div><dt>Comparable one-card baseline</dt><dd>{model.baseline?.card.card_name||"No complete comparison available"}</dd></div></dl><div className="planPayback neutral">Annual figures repeat this month 12 times. They exclude card fees, interest, FX costs and unmodeled shared caps. Conditional points values are not cashback or a guarantee that membership pays for itself.</div></aside>
  </div>}
  {!loading&&<div className="categoryRouting"><div className="planInputsTop"><div><small>03 / CATEGORY ROUTING</small><h3>Your recommended monthly playbook</h3></div><span>{money(model.optimized)} modeled value / month</span></div><div className="routingRows">{model.plans.filter(row=>row.amount>0).map(row=><article key={row.key}><i>{row.icon}</i><div><small>{row.label} · {money(row.amount)}</small><b>{row.winner?.card.card_name||"No verified match yet"}</b><span>{row.winner?row.winner.rule.reward_label:"This amount is excluded from the value calculation until a verified rule is available."}</span></div><strong>{row.winner?money(row.winner.value):"—"}<small>{row.winner?`${Number(row.winner.rule.value_rate_percent).toFixed(2)}% modeled`:"unmodeled"}</small></strong></article>)}{model.monthlySpend===0&&<div className="planEmpty">Enter your normal monthly spending to generate a personalised card-routing plan.</div>}</div></div>}
  {!loading&&<div className="planSave"><button onClick={downloadPlan} disabled={!model.monthlySpend||!rules.length}>Download plan (CSV)</button><small>Exports current inputs, including unsaved edits. Contains spending amounts and card names—keep the file private. Nothing is sent to another service.</small></div>}
  {!loading&&<details className="spendState"><summary>Review the assumptions behind your plan</summary><p>Unconfirmed weekend and portal bonuses are excluded. General rates may be used when no eligible category-specific rule exists. Shared monthly caps and transaction rounding are not modeled.</p>{model.plans.filter(row=>row.amount>0&&row.winner).map(row=><div key={row.key}><b>{row.label}: {money(row.winner.eligibleSpend)} modeled; {money(row.winner.unrewardedSpend)} outside this rule&apos;s cap.</b><p>{row.winner.rule.condition_text||"Eligible spend only"} · {row.winner.rule.exclusions_text||"Issuer exclusions apply"}</p>{/^https:\/\//.test(row.winner.rule.source_url||"")&&<a href={row.winner.rule.source_url} target="_blank" rel="noreferrer">Check issuer terms ↗</a>}</div>)}</details>}
  <div className="spendGuardrail"><span>ⓘ</span><p>This is a conditional estimate from the rules currently loaded for your cards. Merchant coding, milestone bonuses, changing caps and excluded transactions can alter actual rewards. An unmatched category is not evidence that a card earns no rewards.</p></div>
 </section>;
}
