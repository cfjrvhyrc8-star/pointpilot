"use client";

import {useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";

const getSupabase=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

function money(n,currency="INR"){return Number(n||0).toLocaleString("en-IN",{style:"currency",currency,maximumFractionDigits:0})}

const FALLBACK_REWARD_RULES=[
 {issuer:"IDFC FIRST Bank",card_name:"Mayura",currency:"IDFC FIRST Reward Points",partner:"IDFC FIRST Travel & Shop",partner_type:"direct_travel",redemption_value:0.50,redemption_currency:"INR",route_status:"verified",notes:"1 Reward Point = ₹0.50 for hotel & flight bookings via Travel & Shop; ₹0.25 elsewhere.",verified_at:"2026-09-21",source_url:"https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Mayura-CC-Rewards-Structure-TnC-28-05-25.pdf"},
 {issuer:"IDFC FIRST Bank",card_name:"Wealth",currency:"IDFC FIRST Reward Points",partner:"IDFC FIRST Rewards",partner_type:"direct_travel",redemption_value:0.25,redemption_currency:"INR",route_status:"verified",notes:"1 Reward Point = ₹0.25.",verified_at:"2026-09-21",source_url:"https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Wealth-CC-Rewards-Structure-TnC-28-05-25-copy.pdf"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Air India",partner_type:"voucher",redemption_value:0.30,redemption_currency:"INR",min_redeem_points:20000,max_redeem_points:40000,redeem_increment:20000,route_status:"verified",notes:"20,000 points = ₹6,000 or ₹12,000 voucher at 40,000 points.",verified_at:"2026-09-21",source_url:"https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Marriott Bonvoy",partner_type:"hotel_transfer",transfer_ratio:1.0,route_status:"verified",confidence:"medium",notes:"1 Membership Reward point = 1 Marriott Bonvoy point.",verified_at:"2026-09-21"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Hilton Honors",partner_type:"hotel_transfer",transfer_ratio:0.6666666667,route_status:"verified",confidence:"medium",notes:"1 Membership Reward point = 1.5 Hilton Honors points. Current 2026 base route; promotional rates are not used.",verified_at:"2026-09-21"}
];
function cardMatchesRule(cardName,rule){
 const n=String(cardName||"").toLowerCase();
 const target=String(rule?.card_name||"").toLowerCase();
 return target && (n.includes(target)||target.includes(n.replace(/credit card|metal card|card/g,"").trim()));
}
function rulesForCard(cardName,rules){
 return (rules||[]).filter(r=>cardMatchesRule(cardName,r));
}
function formatTransferRatio(r){
 const n=Number(r?.transfer_ratio);
 if(!Number.isFinite(n)||n<=0)return "rate unavailable";
 if(Math.abs(n-1)<0.0001)return "1:1";
 if(n>1)return String(n.toFixed(n%1?1:0))+":1";
 const received=1/n;
 return "1:"+String(received.toFixed(received%1?1:0));
}
function buildRewardOptions(wallet,cashFare,airline,rules){
 return wallet.map(w=>{
   const cardRules=rulesForCard(w.card_name,rules);
   const direct=cardRules.find(r=>r.partner_type==="direct_travel"||r.partner_type==="voucher");
   const transfers=cardRules.filter(r=>r.partner_type==="airline_transfer"||r.partner_type==="hotel_transfer");
   const balance=Number(w.points||0);
   const transferText=transfers.map(r=>r.partner+" "+formatTransferRatio(r)).join(" • ");
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
 const [rewardRules,setRewardRules]=useState(FALLBACK_REWARD_RULES);
 useEffect(()=>{getSupabase().auth.getUser().then(async({data})=>{if(!data.user)return;const sb=getSupabase();const[{data:w},{data:r}]=await Promise.all([sb.from("wallet_cards").select("*").eq("user_id",data.user.id).order("created_at"),sb.from("reward_rules").select("*").eq("active",true).order("issuer").order("partner")]);setWallet(w||[]);if(r?.length)setRewardRules(r)})},[]);
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
 {state.status==="live"&&<div className="results"><div className="resultMeta"><b>{roundTrip?roundTrips.length:offers.length} live {roundTrip?"round-trip fare groups":"leg offers"}</b><span>Travelport • fetched {new Date().toLocaleTimeString()}</span></div>{roundTrip?roundTrips.map((g,i)=>{const o=g.outbound;const ret=g.inbound;const airline=g.airline;const rewards=buildRewardOptions(wallet,g.price,airline,rewardRules);return <article className="result" key={g.key||i}><div><strong>{form.origin} → {form.destination} → {form.origin}</strong><span>{airline} • Out {g.outTime}–{g.outArr} • Return {g.inTime}–{g.inArr}</span><span>{g.outStops===0?"Outbound nonstop":g.outStops+" outbound stop"+(g.outStops>1?"s":"")} • {g.inStops===0?"Return nonstop":g.inStops+" return stop"+(g.inStops>1?"s":"")} • {g.cabin}</span><span>Combinable fare group {g.key}</span></div><div className="resultRight"><b>INR {Number(g.price||0).toLocaleString("en-IN")}</b><span>Live Travelport round-trip fare</span></div><div className="rewardPanel"><strong>PointPilot reward fit</strong>{rewards.slice(0,4).map((r,j)=><div className="rewardRow" key={r.card+j}><div><b>{r.card}</b><span>{r.status}</span></div><div>{r.value?<>Save up to <b>₹{Math.round(r.value).toLocaleString("en-IN")}</b> • {Math.round(r.pointsUsed).toLocaleString("en-IN")} pts • ₹{Number(r.effective||0).toFixed(2)}/pt • ₹{Math.round(r.remaining||0).toLocaleString("en-IN")} cash left</>:<span>{r.detail}</span>}{r.transferRoutes?.length>0&&<small className="transferRoutes">Verified transfer routes: {r.transferRoutes.map((t,k)=><span key={t.id||k}>{t.partner} {formatTransferRatio(t)}{t.partner_type==="hotel_transfer"?" 🏨":" ✈️"}{k<r.transferRoutes.length-1?" • ":""}</span>)}</small>}</div></div>)}<small>Reward fit uses verified redemption rules. Transfer routes show the current card→partner ratio; award availability, taxes and transfer completion are not inferred from cash availability.</small></div></article>}) : offers.map((o,i)=>{const info=offerInfo(o);const first=info.flightDetails[0];const last=info.flightDetails[info.flightDetails.length-1];const stops=Math.max(0,info.flightDetails.length-1);return <article className="result" key={o.id||o.Identifier?.value||i}><div><strong>{first?.Departure?.location||form.origin} → {last?.Arrival?.location||form.destination}</strong><span>{first?.carrier||"Airline"} {first?.number||""} • {formatTime(first?.Departure?.time)}–{formatTime(last?.Arrival?.time)} • {stops===0?"Nonstop":stops+" stop"+(stops>1?"s":"")} • {info.cabin}</span></div><div className="resultRight"><b>{offerPrice(o)}</b><span>{info.combination?("Combination "+info.combination+" • "):""}Live Travelport offer</span></div></article>})}</div>}
 </section>
}

function HotelSearch(){
 const [wallet,setWallet]=useState([]);
 const [rewardRules,setRewardRules]=useState(FALLBACK_REWARD_RULES);
 const [form,setForm]=useState({hotel:"Marriott Bonvoy",cash:25000,taxes:0,nights:5});
 useEffect(()=>{getSupabase().auth.getUser().then(async({data})=>{if(!data.user)return;const sb=getSupabase();const[{data:w},{data:r}]=await Promise.all([sb.from("wallet_cards").select("*").eq("user_id",data.user.id).order("created_at"),sb.from("reward_rules").select("*").eq("active",true).order("issuer").order("partner")]);setWallet(w||[]);if(r?.length)setRewardRules(r)})},[]);
 const partner=form.hotel;
 const hotelRules=rewardRules.filter(r=>r.partner===partner&&r.partner_type==="hotel_transfer"&&r.route_status==="verified");
 const directRules=rewardRules.filter(r=>r.partner_type==="direct_travel"&&r.route_status==="verified");
 const cash=Math.max(0,Number(form.cash)||0);
 const taxes=Math.max(0,Number(form.taxes)||0);
 const net=Math.max(0,cash-taxes);
 const amex=wallet.find(w=>String(w.card_name||"").toLowerCase().includes("platinum travel"));
 const selected=hotelRules[0];
 const ratio=selected?Number(selected.transfer_ratio):0;
 const receivedPerMR=ratio>0?1/ratio:0;
 const amexPoints=receivedPerMR>0?Math.ceil(net/1):0;
 const maxHotelPoints=amex?Number(amex.points||0)*receivedPerMR:0;
 const requiredMR=selected?Math.ceil(net*ratio):0;
 const enough=Boolean(amex&&requiredMR<=Number(amex.points||0));
 const hotelPointRate=selected?ratio:0;
 const cardDirect=directRules.map(r=>{const card=wallet.find(w=>cardMatchesRule(w.card_name,r));if(!card)return null;const value=Math.min(net,Number(card.points||0)*Number(r.redemption_value||0));const pts=value>0?Math.ceil(value/Number(r.redemption_value||1)):0;return {card:card.card_name,pointsUsed:pts,value,effective:Number(r.redemption_value),remaining:net-value,detail:r.notes};}).filter(Boolean);
 const transferLabel=selected?formatTransferRatio(selected):"";
 return <section className="toolCard"><div className="toolIntro"><div><span className="pill cyan">HOTEL REWARDS OPTIMISER</span><h3>Turn hotel prices into points decisions.</h3><p>Enter the cash price of a hotel stay. PointPilot converts it into the points needed through your verified hotel-transfer routes and compares direct travel redemptions from your wallet.</p></div></div>
 <div className="searchGrid hotelGrid"><label>Hotel programme<select value={form.hotel} onChange={e=>setForm({...form,hotel:e.target.value})}><option>Marriott Bonvoy</option><option>Hilton Honors</option></select></label><label>Stay price (₹)<input type="number" min="0" value={form.cash} onChange={e=>setForm({...form,cash:e.target.value})}/></label><label>Taxes & fees (₹)<input type="number" min="0" value={form.taxes} onChange={e=>setForm({...form,taxes:e.target.value})}/></label><label>Nights<input type="number" min="1" value={form.nights} onChange={e=>setForm({...form,nights:e.target.value})}/></label></div>
 <div className="hotelPlanner"><div className="hotelHero"><small>NET HOTEL VALUE</small><strong>₹{Math.round(net).toLocaleString("en-IN")}</strong><span>{form.nights} night{Number(form.nights)==1?"":"s"} • {partner}</span></div>
 <div className="hotelOptions"><article><small>AMEX PLATINUM TRAVEL → {partner.toUpperCase()}</small><strong>{selected?requiredMR.toLocaleString("en-IN")+" MR points":"Route unavailable"}</strong><span>{selected?("Transfer "+transferLabel+" • "+Math.round(requiredMR*receivedPerMR).toLocaleString("en-IN")+" "+partner+" points"): "No verified route loaded."}</span>{selected&&<em>{enough?"Your Amex balance covers this illustrative hotel value.":"Your current Amex balance does not cover this illustrative hotel value."}</em>}</article>{cardDirect.map((r,i)=><article key={r.card+i}><small>{r.card.toUpperCase()} → DIRECT TRAVEL</small><strong>₹{Math.round(r.value).toLocaleString("en-IN")} value</strong><span>{r.pointsUsed.toLocaleString("en-IN")} points • ₹{r.effective.toFixed(2)}/point</span><em>₹{Math.round(r.remaining).toLocaleString("en-IN")} cash remaining</em></article>)}</div></div>
 <div className="notice">Hotel points are calculated from the verified card→programme transfer ratio. This is a value-planning calculation, not confirmed award availability. Hotel award pricing, taxes and resort fees must be checked with the loyalty programme before booking.</div>
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