"use client";
import {useState} from "react";
import {buildPersonalValue} from "../../lib/booking-decision.js";
import {bookingSummary} from "../../lib/booking-summary.js";
const labels={cash:"Pay cash",direct:"Selected card redemption",award:"Airline award"};
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);
export default function PersonalValue({decision,direct,award}){
 const [values,setValues]=useState({});
 const model=buildPersonalValue({decision,direct,award,values});
 const summary=bookingSummary(model);
 if(!model||model.rows.length<2)return null;
 return <section className="personalValue" aria-label="Personal booking decision"><h4>Is using points actually better value?</h4><p>Enter the value you would give up by spending each kind of point. These are your assumptions, not PointPilot valuations. Leave an unknown value blank; enter zero only if you intentionally value it at zero.</p><div className="valueInputs">{model.requirements.map(item=><label key={item.key}>{item.label}<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Your value" value={values[item.key]??""} onChange={event=>setValues(previous=>({...previous,[item.key]:event.target.value}))}/></label>)}</div><p>Modeled cost = cash payable + value of points consumed. For an award, we count existing miles used plus the source card points transferred—not the newly transferred miles again.</p><div className="valueTable"><table><caption>Cash and points cost under your assumptions</caption><thead><tr><th scope="col">Option</th><th scope="col">Cash</th><th scope="col">Points value spent</th><th scope="col">Modeled cost</th></tr></thead><tbody>{model.rows.map(row=><tr key={row.kind}><th scope="row">{labels[row.kind]}</th><td>{money(row.cash)}</td><td>{row.pointsValue==null?"Value needed":money(row.pointsValue)}</td><td>{row.total==null?"—":money(row.total)}</td></tr>)}</tbody></table></div><div className="bookingDecision" aria-live="polite">
<small>YOUR DECISION SUMMARY · CONDITIONAL ESTIMATE</small>
{summary?<>
<h4>{summary.tied?"The leading options are tied":labels[summary.best.kind]+" leads on modeled cost"}</h4>
<p>{labels[summary.best.kind]}: {money(summary.best.total)}, including {money(summary.best.cash)} in cash and {money(summary.best.pointsValue)} in points value given up.</p>
{summary.saving>0&&<p>Modeled saving versus cash: {money(summary.saving)}. This includes your points valuation—it is not a guaranteed cash saving.</p>}
<p>{summary.tied?"There is no meaningful cost advantage at displayed precision. Compare flexibility and transfer risk; exact cash ties favour keeping your points.":"The lead over the next eligible option is "+money(summary.margin)+". Extra costs or a change in your points valuations can erase that advantage."}</p>
<h4>Before acting</h4><ol>{summary.checks.map(check=><li key={check}>{check}</li>)}</ol>
</>:<><h4>Value your points to see a fair comparison</h4><p>Add every required value above. We do not declare a winner when an option is only partially valued.</p></>}
{decision?.reason&&<p>The airline award is excluded from this ranking: {decision.reason==="funding"?"its mileage target is not fully funded (or a target is missing).":"a required transfer route or its limits still needs verification."}</p>}
<p>Only the selected card route and eligible scenarios are compared. This is not a search of every booking option or confirmation of award availability.</p>
</div><p>Entered booking and transfer fees are included in cash. Unentered fees, foregone reward earnings, cancellation costs and voucher leftovers are excluded. Estimates do not confirm an award seat. Values remain only in this comparison until you leave the page; recheck assumptions when changing your trip.</p><button type="button" onClick={()=>setValues({})}>Reset assumptions</button></section>;
}
