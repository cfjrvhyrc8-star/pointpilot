"use client";

import {useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";

const getSupabase=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const seed=[["Amex Platinum Travel",151000,"Membership Rewards","Travel transfers"],["OneCard",101900,"OneCard points","Direct redemption"],["HDFC Diners Black Metal",84700,"HDFC Reward Points","Travel/direct"],["IDFC FIRST Mayura",82000,"IDFC Reward Points","Travel & Shop"],["Scapia",49000,"Scapia Coins","Travel"],["IDFC FIRST Wealth",8500,"IDFC Reward Points","Direct redemption"],["ICICI Times Black Metal",7841,"ICICI Reward Points","Travel/transfer"]];

function money(n,currency="INR"){return Number(n||0).toLocaleString("en-IN",{style:"currency",currency,maximumFractionDigits:0})}

function FlightSearch(){
 const [form,setForm]=useState({origin:"BOM",destination:"LHR",departureDate:"2026-12-15",returnDate:"2026-12-22",adults:1,cabin:"BUSINESS"});
 const [state,setState]=useState({status:"idle",data:null,error:""}); const [roundTrip,setRoundTrip]=useState(true);
 const submit=async e=>{e.preventDefault();setState({status:"loading",data:null,error:""});try{const r=await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"flight",...form,returnDate:roundTrip?form.returnDate:""})});const d=await r.json();if(!r.ok||["error","provider_error","not_configured"].includes(d.status))throw new Error(d.message||d.error||"Flight provider returned an error");setState({status:d.status,data:d,error:""});}catch(err){setState({status:"error",data:null,error:err.message})}};
 const response=state.data?.data?.CatalogProductOfferingsResponse||{};
 const offers=response?.CatalogProductOfferings?.CatalogProductOffering||state.data?.data?.CatalogProductOfferings?.CatalogProductOffering||state.data?.data?.CatalogProductOfferings||[];
 const refs=response?.ReferenceList||[];
 const products=refs.flatMap(x=>x?.Product||[]);
 const flights=refs.flatMap(x=>x?.Flight||[]);
 const findProduct=id=>products.find(p=>p?.id===id);
 const findFlight=id=>flights.find(f=>f?.id===id);
 const offerInfo=o=>{
   const pbo=o?.ProductBrandOptions?.[0]?.ProductBrandOffering?.[0];
   const productRef=pbo?.Product?.[0]?.productRef;
   const product=findProduct(productRef);
   const flightRefs=(product?.FlightSegment||[]).map(s=>s?.Flight?.FlightRef).filter(Boolean);
   const flightDetails=flightRefs.map(findFlight).filter(Boolean);
   const passengerFlight=product?.PassengerFlight?.[0]?.FlightProduct?.[0];
   const price=pbo?.BestCombinablePrice;
   return {pbo,product,flightDetails,cabin:passengerFlight?.cabin||"Cabin not returned",price,combination:pbo?.CombinabilityCode?.[0]||""};
 };
 const formatTime=v=>v?v.slice(0,5):"";
 const offerPrice=o=>{const p=offerInfo(o).price;return p?.TotalPrice!=null?((p?.CurrencyCode?.value||"")+" "+Number(p.TotalPrice).toLocaleString("en-IN")):(o?.Price?.TotalPrice||o?.TotalPrice||"Price returned by provider")};
 return <section className="toolCard"><div className="toolIntro"><div><span className="pill">LIVE PROVIDER SEARCH</span><h3>Find the cash fare first.</h3><p>Then PointPilot can compare the trip against your reward routes. Cash availability is live-provider data; award availability is never inferred.</p></div></div>
 <form className="searchGrid" onSubmit={submit}><label>From<input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value.toUpperCase()})} maxLength={3}/><small>IATA code</small></label><label>To<input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value.toUpperCase()})} maxLength={3}/><small>IATA code</small></label><label>Departure<input type="date" value={form.departureDate} onChange={e=>setForm({...form,departureDate:e.target.value})}/></label><label>Return<input type="date" disabled={!roundTrip} value={form.returnDate} onChange={e=>setForm({...form,returnDate:e.target.value})}/></label><label>Adults<input type="number" min="1" max="9" value={form.adults} onChange={e=>setForm({...form,adults:e.target.value})}/></label><label>Cabin<select value={form.cabin} onChange={e=>setForm({...form,cabin:e.target.value})}><option value="ECONOMY">Economy</option><option value="PREMIUM_ECONOMY">Premium Economy</option><option value="BUSINESS">Business</option><option value="FIRST">First</option></select></label><label className="check"><input type="checkbox" checked={roundTrip} onChange={e=>setRoundTrip(e.target.checked)}/> Round trip</label><button className="btn primary searchBtn" disabled={state.status==="loading"}>{state.status==="loading"?"Searching…":"Search flights →"}</button></form>
 {state.status==="not_configured"&&<div className="notice">Add Travelport credentials to Vercel Environment Variables to enable live flight search.</div>}{state.status==="error"&&<div className="errorBox">{state.error}</div>}
 {state.status==="live"&&<div className="results"><div className="resultMeta"><b>{offers.length} live leg offers</b><span>Travelport • fetched {new Date().toLocaleTimeString()}</span></div>{offers.map((o,i)=>{const info=offerInfo(o);const first=info.flightDetails[0];const last=info.flightDetails[info.flightDetails.length-1];const stops=Math.max(0,info.flightDetails.length-1);return <article className="result" key={o.id||o.Identifier?.value||i}><div><strong>{first?.Departure?.location||form.origin} → {last?.Arrival?.location||form.destination}</strong><span>{first?.carrier||"Airline"} {first?.number||""} • {formatTime(first?.Departure?.time)}–{formatTime(last?.Arrival?.time)} • {stops===0?"Nonstop":stops+" stop"+(stops>1?"s":"")} • {info.cabin}</span></div><div className="resultRight"><b>{offerPrice(o)}</b><span>{info.combination?("Combination "+info.combination+" • "):""}Live Travelport offer</span></div></article>})}</div>}
 </section>
}

function HotelSearch(){
 const [form,setForm]=useState({cityCode:"DXB",checkInDate:"2026-12-15",checkOutDate:"2026-12-20",adults:2}); const [state,setState]=useState({status:"idle",data:null,error:""});
 const submit=async e=>{e.preventDefault();setState({status:"loading",data:null,error:""});try{const r=await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"hotel",...form})});const d=await r.json();if(!r.ok||["error","provider_error"].includes(d.status))throw new Error(d.message||d.error||"Hotel provider returned an error");setState({status:d.status,data:d,error:""});}catch(err){setState({status:"error",data:null,error:err.message})}};
 const hotels=state.data?.data?.data||[];
 return <section className="toolCard"><div className="toolIntro"><div><span className="pill cyan">LIVE HOTEL SEARCH</span><h3>See real hotel offers.</h3><p>Hotel search is kept separate from flights so PointPilot can add a dedicated hotel/stays provider without coupling the rewards engine to one inventory source.</p></div></div>
 <form className="searchGrid hotelGrid" onSubmit={submit}><label>City code<input value={form.cityCode} onChange={e=>setForm({...form,cityCode:e.target.value.toUpperCase()})} maxLength={3}/><small>Example: DXB, DEL, LHR</small></label><label>Check-in<input type="date" value={form.checkInDate} onChange={e=>setForm({...form,checkInDate:e.target.value})}/></label><label>Check-out<input type="date" value={form.checkOutDate} onChange={e=>setForm({...form,checkOutDate:e.target.value})}/></label><label>Adults<input type="number" min="1" max="9" value={form.adults} onChange={e=>setForm({...form,adults:e.target.value})}/></label><button className="btn primary searchBtn" disabled={state.status==="loading"}>{state.status==="loading"?"Searching…":"Search hotels →"}</button></form>
 {state.status==="not_configured"&&<div className="notice">Hotel live search is not enabled yet. PointPilot will add a dedicated stays provider next.</div>}{state.status==="error"&&<div className="errorBox">{state.error}</div>}
 {state.status==="live"&&<div className="results"><div className="resultMeta"><b>{hotels.length} live offers</b><span>Provider: Amadeus • fetched {new Date().toLocaleTimeString()}</span></div>{hotels.map((o,i)=><article className="result" key={o.id||i}><div><strong>{o.hotel?.name||"Hotel offer"}</strong><span>{o.hotel?.rating?o.hotel.rating+"★ • ":""}{o.hotel?.cityCode||form.cityCode}</span></div><div className="resultRight"><b>{o.offers?.[0]?.price?.currency} {Number(o.offers?.[0]?.price?.total||0).toLocaleString("en-IN")}</b><span>{o.offers?.[0]?.room?.typeEstimated?.category||"Room offer"}</span></div></article>)}</div>}
 </section>
}

function ValueEngine(){
 const [v,setV]=useState({cash:50000,taxes:5000,points:50000}); const net=Math.max(0,Number(v.cash)-Number(v.taxes)); const per=Number(v.points)>0?net/Number(v.points):0;
 return <section className="toolCard"><div className="toolIntro"><div><span className="pill coral">REDEMPTION MATH</span><h3>Calculate your real ₹/point.</h3><p>Net cash value saved divided by the original points consumed. Taxes and fees remain visible.</p></div></div><div className="valueLayout"><div className="valueInputs"><label>Cash price (₹)<input type="number" min="0" value={v.cash} onChange={e=>setV({...v,cash:e.target.value})}/></label><label>Taxes & fees (₹)<input type="number" min="0" value={v.taxes} onChange={e=>setV({...v,taxes:e.target.value})}/></label><label>Points used<input type="number" min="0" value={v.points} onChange={e=>setV({...v,points:e.target.value})}/></label></div><div className="valueResult"><small>NET CASH VALUE</small><strong>{money(net)}</strong><span>÷ {Number(v.points||0).toLocaleString("en-IN")} points</span><div className="bigRate">₹{per.toFixed(2)}<small>/ point</small></div></div></div></section>
}

export default function Dashboard(){
 const[wallet,setWallet]=useState([]),[ready,setReady]=useState(false),[tab,setTab]=useState("flights");
 useEffect(()=>{const supabase=getSupabase();supabase.auth.getUser().then(async({data})=>{if(!data.user){location.href="/login";return}let{data:w}=await supabase.from("wallet_cards").select("*").order("created_at");if(!w?.length){await supabase.from("wallet_cards").insert(seed.map(x=>({user_id:data.user.id,card_name:x[0],points:x[1],currency:x[2],role:x[3]})));w=(await supabase.from("wallet_cards").select("*").order("created_at")).data||[]}setWallet(w||[]);setReady(true)})},[]);
 const total=useMemo(()=>wallet.reduce((a,x)=>a+Number(x.points||0),0),[wallet]);
 if(!ready)return <main className="page"><div className="loader">Loading your wallet…</div></main>;
 return <main className="page"><nav className="nav"><b>Point<span>Pilot</span></b><button className="linkBtn" onClick={()=>getSupabase().auth.signOut().then(()=>location.href="/")}>Sign out</button></nav>
 <section className="dashHero"><div><div className="eyebrow">YOUR REWARDS COMMAND CENTRE</div><h1>Make every point work harder.</h1><p>Start with what you hold. Then compare the trip you want.</p></div><div className="total"><small>TOTAL POINTS</small><strong>{total.toLocaleString("en-IN")}</strong><span>across {wallet.length} cards</span></div></section>
 <div className="quick"><button onClick={()=>setTab("flights")}>✈️ Flights<span>Live fare search →</span></button><button onClick={()=>setTab("hotels")}>🏨 Hotels<span>Hotel search →</span></button><button onClick={()=>setTab("value")}>₹ Value Engine<span>Calculate ₹/point →</span></button></div>
 <section className="wallet"><div className="sectionHead"><div><h2>Your wallet</h2><p>{wallet.length} cards • {total.toLocaleString("en-IN")} points</p></div></div><div className="walletGrid">{wallet.map(w=><article key={w.id}><small>{w.card_name}</small><strong>{Number(w.points).toLocaleString("en-IN")}</strong><span>{w.currency}</span><em>{w.role}</em></article>)}</div></section>
 <section className="toolArea"><div className="toolTabs"><button className={tab==="flights"?"active":""} onClick={()=>setTab("flights")}>✈️ Flights</button><button className={tab==="hotels"?"active":""} onClick={()=>setTab("hotels")}>🏨 Hotels</button><button className={tab==="value"?"active":""} onClick={()=>setTab("value")}>₹ Value Engine</button></div>{tab==="flights"?<FlightSearch/>:tab==="hotels"?<HotelSearch/>:<ValueEngine/>}</section>
 <section className="featureGrid"><article className="feature"><div className="icon">🔄</div><h3>Reward routes next</h3><p>Verified transfer ratios, caps, timing, expiry and source dates will be layered onto live travel results.</p></article><article className="feature"><div className="icon">🧮</div><h3>Transparent value</h3><p>Every redemption will show net value, points consumed, taxes and effective ₹/point.</p></article><article className="feature"><div className="icon">🛡️</div><h3>No fake award availability</h3><p>Cash inventory is labelled live. Award availability will only be labelled confirmed when a live award source supports it.</p></article></section><footer>PointPilot production • Travel-provider credentials stay server-side. Flight search: Travelport. Hotel search: dedicated stays provider.</footer></main>
}