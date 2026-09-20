"use client";

import {useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";

const getSupabase=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

function money(n,currency="INR"){return Number(n||0).toLocaleString("en-IN",{style:"currency",currency,maximumFractionDigits:0})}

const FALLBACK_REWARD_RULES=[
 {issuer:"IDFC FIRST Bank",card_name:"Mayura",currency:"IDFC FIRST Reward Points",partner:"IDFC FIRST Travel & Shop",partner_type:"direct_travel",redemption_value:0.50,redemption_currency:"INR",route_status:"verified",notes:"1 Reward Point = ₹0.50 for hotel & flight bookings via Travel & Shop; ₹0.25 elsewhere.",verified_at:"2026-09-21",source_url:"https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Mayura-CC-Rewards-Structure-TnC-28-05-25.pdf"},
 {issuer:"IDFC FIRST Bank",card_name:"Wealth",currency:"IDFC FIRST Reward Points",partner:"IDFC FIRST Rewards",partner_type:"direct_travel",redemption_value:0.25,redemption_currency:"INR",route_status:"verified",notes:"1 Reward Point = ₹0.25.",verified_at:"2026-09-21",source_url:"https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Wealth-CC-Rewards-Structure-TnC-28-05-25-copy.pdf"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Air India",partner_type:"voucher",redemption_value:0.30,redemption_currency:"INR",min_redeem_points:20000,max_redeem_points:40000,redeem_increment:20000,route_status:"verified",notes:"20,000 points = ₹6,000 or 40,000 points = ₹12,000.",verified_at:"2026-09-21",source_url:"https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/"}
];
function cardMatchesRule(cardName,rule){
 const n=String(cardName||"").toLowerCase();
 const target=String(rule?.card_name||"").toLowerCase();
 return target && (n.includes(target)||target.includes(n.replace(/credit card|metal card|card/g,"").trim()));
}
function rulesForCard(cardName,rules){
 return (rules||[]).filter(r=>cardMatchesRule(cardName,r));
}
function buildRewardOptions(wallet,cashFare,airline,rules){
 return wallet.map(w=>{
   const cardRules=rulesForCard(w.card_name,rules);
   const direct=cardRules.find(r=>r.partner_type==="direct_travel"||r.partner_type==="voucher");
   const transfers=cardRules.filter(r=>r.partner_type==="airline_transfer"||r.partner_type==="hotel_transfer");
   const balance=Number(w.points||0);
   const transferText=transfers.map(r=>`${r.partner} ${Number(r.transfer_ratio||0)}:1`).join(" • ");
   if(!direct && transfers.length){
     return {card:w.card_name,points:balance,status:"verified transfer routes available",detail:`Transfer routes: ${transferText}. Award availability and taxes are not checked.`,transferRoutes:transfers};
   }
   if(!direct) return {card:w.card_name,points:balance,status:"route not yet valued",detail:"No verified direct redemption or transfer ratio is loaded for this card yet."};
   const mode=direct.partner_type;
   if(mode==="voucher" && String(direct.partner||"").toLowerCase()==="air india" && !String(airline||"").toLowerCase().includes("air india") && String(airline||"")!=="AI"){
     return {card:w.card_name,points:balance,status:"voucher route not applicable to this fare",detail:direct.notes||"Verified Air India voucher route only.",transferRoutes:transfers};
   }
   if(direct.route_status==="dynamic_rate"||direct.redemption_value==null){
     return {card:w.card_name,points:balance,status:"dynamic redemption rate",detail:direct.notes||"Point value must be read from the live redemption catalogue.",transferRoutes:transfers};
   }
   const valuePerPoint=Number(direct.redemption_value);
   const maxPoints=Number(direct.max_redeem_points||Infinity);
   const maxCoverage=mode==="direct_travel"?1:1;
   const usable=Math.min(balance,maxPoints);
   const value=Math.min(cashFare,usable*valuePerPoint,cashFare*maxCoverage);
   const pts=Math.min(usable,Math.ceil(value/valuePerPoint));
   return {card:w.card_name,points:balance,status:pts>0&&pts<=balance?"eligible direct redemption":"insufficient points",pointsUsed:pts,value,remaining:Math.max(0,cashFare-value),effective:value/(pts||1),detail:direct.notes,source:direct.issuer,verified:String(direct.verified_at||"").slice(0,10),sourceUrl:direct.source_url,transferRoutes:transfers};
 }).sort((a,b)=>(b.value||0)-(a.value||0));
}

function FlightSearch(){
 const [wallet,setWallet]=useState([]);
 useEffect(()=>{getSupabase().auth.getUser().then(async({data})=>{if(!data.user)return;const{data:w}=await getSupabase().from("wallet_cards").select("*").eq("user_id",data.user.id).order("created_at");setWallet(w||[])})},[]);
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
 const parsed=offers.map((o,i)=>{const info=offerInfo(o);const first=info.flightDetails[0];const last=info.flightDetails[info.flightDetails.length-1];const price=Number(info.price?.TotalPrice||o?.Price?.TotalPrice||o?.TotalPrice||0);const dep=String(first?.Departure?.location||"").toUpperCase();return {o,info,first,last,price,direction:dep===String(form.origin).toUpperCase()?"outbound":"inbound",index:i};});
 const groups={};parsed.forEach(x=>{const k=x.info.combination||("unpaired-"+x.index);if(!groups[k])groups[k]={key:k,outbound:[],inbound:[]};groups[k][x.direction].push(x)});
 const roundTrips=Object.values(groups).filter(g=>g.outbound.length&&g.inbound.length).map(g=>{const out=[...g.outbound].sort((a,b)=>a.price-b.price)[0];const ret=[...g.inbound].sort((a,b)=>a.price-b.price)[0];const prices=[...g.outbound,...g.inbound].map(x=>x.price).filter(Boolean);const p=out.price||ret.price||0;const airline=String(out.first?.carrier||ret.first?.carrier||"Airline");return {key:g.key,outbound:out,inbound:ret,price:p,airline,outTime:formatTime(out.first?.Departure?.time),outArr:formatTime(out.last?.Arrival?.time),inTime:formatTime(ret.first?.Departure?.time),inArr:formatTime(ret.last?.Arrival?.time),outStops:Math.max(0,out.info.flightDetails.length-1),inStops:Math.max(0,ret.info.flightDetails.length-1),cabin:out.info.cabin||ret.info.cabin};});
 const offerPrice=o=>{const p=offerInfo(o).price;return p?.TotalPrice!=null?((p?.CurrencyCode?.value||"")+" "+Number(p.TotalPrice).toLocaleString("en-IN")):(o?.Price?.TotalPrice||o?.TotalPrice||"Price returned by provider")};
 return <section className="toolCard"><div className="toolIntro"><div><span className="pill">LIVE PROVIDER SEARCH</span><h3>Find the cash fare first.</h3><p>Then PointPilot can compare the trip against your reward routes. Cash availability is live-provider data; award availability is never inferred.</p></div></div>
 <form className="searchGrid" onSubmit={submit}><label>From<input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value.toUpperCase()})} maxLength={3}/><small>IATA code</small></label><label>To<input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value.toUpperCase()})} maxLength={3}/><small>IATA code</small></label><label>Departure<input type="date" value={form.departureDate} onChange={e=>setForm({...form,departureDate:e.target.value})}/></label><label>Return<input type="date" disabled={!roundTrip} value={form.returnDate} onChange={e=>setForm({...form,returnDate:e.target.value})}/></label><label>Adults<input type="number" min="1" max="9" value={form.adults} onChange={e=>setForm({...form,adults:e.target.value})}/></label><label>Cabin<select value={form.cabin} onChange={e=>setForm({...form,cabin:e.target.value})}><option value="ECONOMY">Economy</option><option value="PREMIUM_ECONOMY">Premium Economy</option><option value="BUSINESS">Business</option><option value="FIRST">First</option></select></label><label className="check"><input type="checkbox" checked={roundTrip} onChange={e=>setRoundTrip(e.target.checked)}/> Round trip</label><button className="btn primary searchBtn" disabled={state.status==="loading"}>{state.status==="loading"?"Searching…":"Search flights →"}</button></form>
 {state.status==="not_configured"&&<div className="notice">Add Travelport credentials to Vercel Environment Variables to enable live flight search.</div>}{state.status==="error"&&<div className="errorBox">{state.error}</div>}
 {state.status==="live"&&<div className="results"><div className="resultMeta"><b>{roundTrip?roundTrips.length:offers.length} live {roundTrip?"round-trip fare groups":"leg offers"}</b><span>Travelport • fetched {new Date().toLocaleTimeString()}</span></div>{roundTrip?roundTrips.map((g,i)=>{const o=g.outbound;const ret=g.inbound;const airline=g.airline;const rewards=buildRewardOptions(wallet,g.price,airline,rewardRules);return <article className="result" key={g.key||i}><div><strong>{form.origin} → {form.destination} → {form.origin}</strong><span>{airline} • Out {g.outTime}–{g.outArr} • Return {g.inTime}–{g.inArr}</span><span>{g.outStops===0?"Outbound nonstop":g.outStops+" outbound stop"+(g.outStops>1?"s":"")} • {g.inStops===0?"Return nonstop":g.inStops+" return stop"+(g.inStops>1?"s":"")} • {g.cabin}</span><span>Combinable fare group {g.key}</span></div><div className="resultRight"><b>INR {Number(g.price||0).toLocaleString("en-IN")}</b><span>Live Travelport round-trip fare</span></div><div className="rewardPanel"><strong>PointPilot reward fit</strong>{rewards.slice(0,4).map((r,j)=><div className="rewardRow" key={r.card+j}><div><b>{r.card}</b><span>{r.status}</span></div><div>{r.value?<>Save up to <b>₹{Math.round(r.value).toLocaleString("en-IN")}</b> • {Math.round(r.pointsUsed).toLocaleString("en-IN")} pts • ₹{Number(r.effective||0).toFixed(2)}/pt • ₹{Math.round(r.remaining||0).toLocaleString("en-IN")} cash left</>:<span>{r.detail}</span>}{r.transferRoutes?.length>0&&<small className="transferRoutes">Verified transfers: {r.transferRoutes.map((t,k)=><span key={t.id||k}>{t.partner} {Number(t.transfer_ratio).toFixed(Number(t.transfer_ratio)%1?1:0)}:1{k<r.transferRoutes.length-1?" • ":""}</span>)}</small>}</div></div>)}<small>Reward fit uses only verified direct-redemption rules. Transfer/award availability is not inferred from cash availability.</small></div></article>}) : offers.map((o,i)=>{const info=offerInfo(o);const first=info.flightDetails[0];const last=info.flightDetails[info.flightDetails.length-1];const stops=Math.max(0,info.flightDetails.length-1);return <article className="result" key={o.id||o.Identifier?.value||i}><div><strong>{first?.Departure?.location||form.origin} → {last?.Arrival?.location||form.destination}</strong><span>{first?.carrier||"Airline"} {first?.number||""} • {formatTime(first?.Departure?.time)}–{formatTime(last?.Arrival?.time)} • {stops===0?"Nonstop":stops+" stop"+(stops>1?"s":"")} • {info.cabin}</span></div><div className="resultRight"><b>{offerPrice(o)}</b><span>{info.combination?("Combination "+info.combination+" • "):""}Live Travelport offer</span></div></article>})}</div>}
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

function WalletSection({wallet,setWallet}){
 const [showAdd,setShowAdd]=useState(false);
 const [form,setForm]=useState({card_name:"",points:"",currency:"Reward points",role:"Travel / rewards"});
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const addCard=async e=>{e.preventDefault();setError("");if(!form.card_name.trim()||Number(form.points)<0){setError("Enter a card name and a valid points balance.");return}setSaving(true);const supabase=getSupabase();const{data:{user}}=await supabase.auth.getUser();if(!user){location.href="/login";return}const{data,error:rowError}=await supabase.from("wallet_cards").insert({user_id:user.id,card_name:form.card_name.trim(),points:Math.round(Number(form.points)||0),currency:form.currency.trim()||"Reward points",role:form.role.trim()||"Travel / rewards"}).select().single();setSaving(false);if(rowError){setError(rowError.message);return}setWallet([...wallet,data]);setForm({card_name:"",points:"",currency:"Reward points",role:"Travel / rewards"});setShowAdd(false)};
 const removeCard=async id=>{if(!window.confirm("Remove this card from your wallet?"))return;const{error}=await getSupabase().from("wallet_cards").delete().eq("id",id);if(error){setError(error.message);return}setWallet(wallet.filter(x=>x.id!==id))};
 return <section className="wallet"><div className="sectionHead"><div><h2>Your wallet</h2><p>{wallet.length} cards • {wallet.reduce((a,x)=>a+Number(x.points||0),0).toLocaleString("en-IN")} points</p></div><button className="btn primary" onClick={()=>{setError("");setShowAdd(!showAdd)}}>{showAdd?"Close":"＋ Add card"}</button></div>
 {showAdd&&<form className="searchGrid" onSubmit={addCard}><label>Card name<input required value={form.card_name} placeholder="e.g. HDFC Diners Black Metal" onChange={e=>setForm({...form,card_name:e.target.value})}/></label><label>Points / miles<input required type="number" min="0" value={form.points} placeholder="0" onChange={e=>setForm({...form,points:e.target.value})}/></label><label>Points currency<input value={form.currency} placeholder="Reward points" onChange={e=>setForm({...form,currency:e.target.value})}/></label><label>Role<input value={form.role} placeholder="Travel / rewards" onChange={e=>setForm({...form,role:e.target.value})}/></label><button className="btn primary searchBtn" disabled={saving}>{saving?"Saving…":"Save card"}</button></form>}
 {error&&<div className="errorBox">{error}</div>}
 {wallet.length===0&&!showAdd&&<div className="notice">Your wallet is empty. Add your first card and points to get started.</div>}
 <div className="walletGrid">{wallet.map(w=><article key={w.id}><small>{w.card_name}</small><strong>{Number(w.points).toLocaleString("en-IN")}</strong><span>{w.currency}</span><em>{w.role}</em><button className="linkBtn" onClick={()=>removeCard(w.id)}>Remove</button></article>)}</div></section>
}

export default function Dashboard(){
 const[wallet,setWallet]=useState([]),[ready,setReady]=useState(false),[tab,setTab]=useState("flights");
 useEffect(()=>{const supabase=getSupabase();supabase.auth.getUser().then(async({data})=>{if(!data.user){location.href="/login";return}const{data:w,error}=await supabase.from("wallet_cards").select("*").eq("user_id",data.user.id).order("created_at");if(error){console.error(error);setWallet([])}else{setWallet(w||[])}setReady(true)})},[]);
 const total=useMemo(()=>wallet.reduce((a,x)=>a+Number(x.points||0),0),[wallet]);
 if(!ready)return <main className="page"><div className="loader">Loading your wallet…</div></main>;
 return <main className="page"><nav className="nav"><b>Point<span>Pilot</span></b><button className="linkBtn" onClick={()=>getSupabase().auth.signOut().then(()=>location.href="/")}>Sign out</button></nav>
 <section className="dashHero"><div><div className="eyebrow">YOUR REWARDS COMMAND CENTRE</div><h1>Make every point work harder.</h1><p>Start with what you hold. Then compare the trip you want.</p></div><div className="total"><small>TOTAL POINTS</small><strong>{total.toLocaleString("en-IN")}</strong><span>across {wallet.length} cards</span></div></section>
 <div className="quick"><button onClick={()=>setTab("flights")}>✈️ Flights<span>Live fare search →</span></button><button onClick={()=>setTab("hotels")}>🏨 Hotels<span>Hotel search →</span></button><button onClick={()=>setTab("value")}>₹ Value Engine<span>Calculate ₹/point →</span></button></div>
 <WalletSection wallet={wallet} setWallet={setWallet}/>
 <section className="toolArea"><div className="toolTabs"><button className={tab==="flights"?"active":""} onClick={()=>setTab("flights")}>✈️ Flights</button><button className={tab==="hotels"?"active":""} onClick={()=>setTab("hotels")}>🏨 Hotels</button><button className={tab==="value"?"active":""} onClick={()=>setTab("value")}>₹ Value Engine</button></div>{tab==="flights"?<FlightSearch/>:tab==="hotels"?<HotelSearch/>:<ValueEngine/>}</section>
 <section className="featureGrid"><article className="feature"><div className="icon">🔄</div><h3>Reward routes next</h3><p>Verified transfer ratios, caps, timing, expiry and source dates will be layered onto live travel results.</p></article><article className="feature"><div className="icon">🧮</div><h3>Transparent value</h3><p>Every redemption will show net value, points consumed, taxes and effective ₹/point.</p></article><article className="feature"><div className="icon">🛡️</div><h3>No fake award availability</h3><p>Cash inventory is labelled live. Award availability will only be labelled confirmed when a live award source supports it.</p></article></section><footer>PointPilot production • Travel-provider credentials stay server-side. Flight search: Travelport. Hotel search: dedicated stays provider.</footer></main>
}