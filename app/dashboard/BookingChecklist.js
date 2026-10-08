"use client";
import {useState} from "react";
import {bookingChecks} from "../../lib/booking-checklist.js";

export default function BookingChecklist({hasTransfers}){
 const [kind,setKind]=useState("cash");
 const [checked,setChecked]=useState({});
 const checks=bookingChecks(kind,hasTransfers);
 const count=checks.filter(item=>checked[item.id]).length;
 return <details className="personalValue"><summary>Before you book or transfer</summary>
  <p>Personal checklist only—not provider verification, a seat hold or permission to transfer. Checks are not saved and reset when comparison inputs change. Recheck them if your itinerary changes.</p>
  <label>Booking method<select value={kind} onChange={event=>{setKind(event.target.value);setChecked({});}}><option value="cash">Cash</option><option value="direct">Direct card redemption</option><option value="award">Airline award</option></select></label>
  <div>{checks.map(item=><p key={item.id}><label><input type="checkbox" checked={Boolean(checked[item.id])} onChange={event=>setChecked(previous=>({...previous,[item.id]:event.target.checked}))}/> {item.label}</label></p>)}</div>
  <p role="status">{count} of {checks.length} personal checks completed.{count===checks.length?" This does not verify availability or override unverified transfer rules. Reconfirm with the provider before paying.":" Complete the remaining checks with the relevant provider."}</p>
 </details>;
}
