"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import BestUseSection from "./BestUseSection.js";
import SpendSmart from "./SpendSmart.js";

const getSupabase=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const within=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms))]);

function money(n,currency="INR"){return Number(n||0).toLocaleString("en-IN",{style:"currency",currency,maximumFractionDigits:0})}

const FALLBACK_REWARD_RULES=[
 {issuer:"IDFC FIRST Bank",card_name:"Mayura",currency:"IDFC FIRST Reward Points",partner:"IDFC FIRST Travel & Shop",partner_type:"direct_travel",redemption_value:0.50,redemption_currency:"INR",route_status:"verified",notes:"1 Reward Point = ₹0.50 for hotel & flight bookings via Travel & Shop; ₹0.25 elsewhere.",verified_at:"2026-09-21",source_url:"https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Mayura-CC-Rewards-Structure-TnC-28-05-25.pdf"},
 {issuer:"IDFC FIRST Bank",card_name:"Wealth",currency:"IDFC FIRST Reward Points",partner:"IDFC FIRST Rewards",partner_type:"direct_travel",redemption_value:0.25,redemption_currency:"INR",route_status:"verified",notes:"1 Reward Point = ₹0.25.",verified_at:"2026-09-21",source_url:"https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Wealth-CC-Rewards-Structure-TnC-28-05-25-copy.pdf"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Air India",partner_type:"voucher",redemption_value:0.30,redemption_currency:"INR",min_redeem_points:20000,max_redeem_points:40000,redeem_increment:20000,route_status:"verified",notes:"20,000 points = ₹6,000 or ₹12,000 voucher at 40,000 points.",verified_at:"2026-09-21",source_url:"https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Marriott Bonvoy",partner_type:"hotel_transfer",transfer_ratio:1.0,route_status:"verified",confidence:"medium",notes:"1 Membership Reward point = 1 Marriott Bonvoy point.",verified_at:"2026-09-21"},
 {issuer:"American Express India",card_name:"Platinum Travel",currency:"Membership Rewards",partner:"Hilton Honors",partner_type:"hotel_transfer",transfer_ratio:0.6666666667,route_status:"verified",confidence:"medium",notes:"1 Membership Reward point = 1.5 Hilton Honors points. Current 2026 base route; promotional rates are not used.",verified_at:"2026-09-21"}
];
function cardMatchesRule(cardName,rule){
 const clean=v=>String(v||"").toLowerCase().replace(/credit card|metal card|card|club|first|hdfc|icici|idfc|bank|american express india|scapia federal|federal/g,"").replace(/[^a-z0-9]/g,"");
 const n=clean(cardName),target=clean(rule?.card_name);
 return Boolean(target&&(n.includes(target)||target.includes(n)));
}
function cardMatchesCatalog(cardName,catalogCard){
 const aliases={
   "scapia":["scapia","scapia federal credit card"],
   "onecard":["onecard","one credit card"],
   "dinersblackmetal":["diners black metal","diners club black metal"]
 };
 const clean=v=>String(v||"").toLowerCase().replace(/american express india|federal|credit|metal|club|card|first|hdfc|icici|idfc|bank/g,"").replace(/[^a-z0-9]/g,"");
 const wallet=clean(cardName),catalog=clean(catalogCard?.card_name);
 if(wallet&&catalog&&(wallet===catalog||wallet.includes(catalog)||catalog.includes(wallet)))return true;
 return Object.entries(aliases).some(([key,names])=>wallet===key&&names.some(name=>clean(name)===catalog));
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
 const submit=async e=>{e.preventDefault();setState({status:"loading",data:null,error:""});const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);try{const r=await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"flight",...form,returnDate:roundTrip?form.returnDate:""}),signal:controller.signal});const d=await r.json();if(!r.ok||["error","provider_error","not_configured"].includes(d.status))throw new Error(d.message||d.error||"Flight provider returned an error");setState({status:d.status,data:d,error:""});}catch(err){setState({status:"error",data:null,error:err?.name==="AbortError"?"The flight provider is taking too long. Please try again shortly.":err.message});}finally{clearTimeout(timer)}};
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
 {state.status==="live"&&<div className="results"><div className="resultMeta"><b>{roundTrip?roundTrips.length:offers.length} live {roundTrip?"round-trip fare groups":"leg offers"}</b><span>Travelport • fetched {new Date().toLocaleTimeString()}</span></div>{roundTrip?(roundTrips.length?roundTrips.map((g,i)=>{const o=g.outbound;const ret=g.inbound;const airline=g.airline;const rewards=buildRewardOptions(wallet,g.price,airline,rewardRules);return <article className="result" key={g.key||i}><div><strong>{form.origin} → {form.destination} → {form.origin}</strong><span>{airline} • Out {g.outTime}–{g.outArr} • Return {g.inTime}–{g.inArr}</span><span>{g.outStops===0?"Outbound nonstop":g.outStops+" outbound stop"+(g.outStops>1?"s":"")} • {g.inStops===0?"Return nonstop":g.inStops+" return stop"+(g.inStops>1?"s":"")} • {g.cabin}</span><span>Combinable fare group {g.key}</span></div><div className="resultRight"><b>INR {Number(g.price||0).toLocaleString("en-IN")}</b><span>Live Travelport round-trip fare</span></div><div className="rewardPanel"><strong>PointPilot reward fit</strong>{rewards.slice(0,4).map((r,j)=><div className="rewardRow" key={r.card+j}><div><b>{r.card}</b><span>{r.status}</span></div><div>{r.value?<>Save up to <b>₹{Math.round(r.value).toLocaleString("en-IN")}</b> • {Math.round(r.pointsUsed).toLocaleString("en-IN")} pts • ₹{Number(r.effective||0).toFixed(2)}/pt • ₹{Math.round(r.remaining||0).toLocaleString("en-IN")} cash left</>:<span>{r.detail}</span>}{r.transferRoutes?.length>0&&<small className="transferRoutes">Verified transfer routes: {r.transferRoutes.map((t,k)=><span key={t.id||k}>{t.partner} {formatTransferRatio(t)}{t.partner_type==="hotel_transfer"?" 🏨":" ✈️"}{k<r.transferRoutes.length-1?" • ":""}</span>)}</small>}</div></div>)}<small>Reward fit uses verified redemption rules. Transfer routes show the current card→partner ratio; award availability, taxes and transfer completion are not inferred from cash availability.</small></div></article>}):<div className="notice">Travelport did not return a bookable round-trip fare for these dates and cabin. Try different dates, cabin, or search one-way.</div>) : (offers.length?offers.map((o,i)=>{const info=offerInfo(o);const first=info.flightDetails[0];const last=info.flightDetails[info.flightDetails.length-1];const stops=Math.max(0,info.flightDetails.length-1);return <article className="result" key={o.id||o.Identifier?.value||i}><div><strong>{first?.Departure?.location||form.origin} → {last?.Arrival?.location||form.destination}</strong><span>{first?.carrier||"Airline"} {first?.number||""} • {formatTime(first?.Departure?.time)}–{formatTime(last?.Arrival?.time)} • {stops===0?"Nonstop":stops+" stop"+(stops>1?"s":"")} • {info.cabin}</span></div><div className="resultRight"><b>{offerPrice(o)}</b><span>{info.combination?("Combination "+info.combination+" • "):""}Live Travelport offer</span></div></article>}):<div className="notice">Travelport did not return any fares for this search. Try different dates, airports, or cabin.</div>)}</div>}
 </section>
}

function HotelSearch(){
 const [wallet,setWallet]=useState([]),[rewardRules,setRewardRules]=useState(FALLBACK_REWARD_RULES),[live,setLive]=useState({status:"idle",data:null,error:""});
 const [form,setForm]=useState({city:"BOM",checkIn:"2026-12-15",checkOut:"2026-12-18",adults:2,rooms:1,children:0,hotel:"",cash:25000,taxes:0,awardPoints:25000,nights:3});
 const [programme,setProgramme]=useState("Marriott Bonvoy");
 useEffect(()=>{getSupabase().auth.getUser().then(async({data})=>{if(!data.user)return;const sb=getSupabase();const results=await Promise.all([sb.from("wallet_cards").select("*").eq("user_id",data.user.id).order("created_at"),sb.from("reward_rules").select("*").eq("active",true).order("issuer").order("partner")]);setWallet(results[0].data||[]);if(results[1].data?.length)setRewardRules(results[1].data)})},[]);
 const hotelRules=rewardRules.filter(r=>r.partner===programme&&r.partner_type==="hotel_transfer"&&r.route_status==="verified");
 const directRules=rewardRules.filter(r=>r.partner_type==="direct_travel"&&r.route_status==="verified");
 const cash=Math.max(0,Number(form.cash)||0),taxes=Math.max(0,Number(form.taxes)||0),net=Math.max(0,cash-taxes);
 const amex=wallet.find(w=>String(w.card_name||"").toLowerCase().includes("platinum travel"));
 const selected=hotelRules[0],ratio=selected?Number(selected.transfer_ratio):0,receivedPerMR=ratio>0?1/ratio:0;
 const awardPoints=Math.max(0,Number(form.awardPoints)||0),requiredMR=selected&&receivedPerMR>0?Math.ceil(awardPoints/receivedPerMR):0;
 const maxHotelPoints=amex?Math.floor(Number(amex.points||0)*receivedPerMR):0;
 const enough=Boolean(amex&&requiredMR<=Number(amex.points||0));
 const cardDirect=directRules.map(r=>{const card=wallet.find(w=>cardMatchesRule(w.card_name,r));if(!card)return null;const rate=Number(r.redemption_value||0);if(rate<=0)return null;const value=Math.min(net,Number(card.points||0)*rate);const pts=value>0?Math.ceil(value/rate):0;return{card:card.card_name,pointsUsed:pts,value,effective:rate,remaining:net-value,detail:r.notes}}).filter(Boolean);

 const runHotel=async e=>{e.preventDefault();setLive({status:"loading",data:null,error:""});try{const r=await fetch("/api/optimize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"hotel",checkInDate:form.checkIn,checkOutDate:form.checkOut,cityCode:form.city,propertyName:form.hotel,adults:form.adults,rooms:form.rooms,children:form.children})});const d=await r.json();if(d.status==="live"){setLive({status:"live",data:d.data,error:""});return}if(d.status==="not_configured"){setLive({status:"not_configured",data:null,error:d.message||"Hotel inventory is not provisioned yet."});return}throw new Error(d.message||"Hotel provider returned an error")}catch(err){setLive({status:"error",data:null,error:err.message})}};

 const liveItems=useMemo(()=>{
   const data=live.data;
   if(!data)return[];
   const root=data.hotelsResponse||data.HotelSearchResponse||data;
   const hotels=root.hotels||root.propertyItems||root.PropertyItems||[];
   const rows=[];
   hotels.forEach(h=>{
     const info=h.propertyInfo||h.PropertyInfo||h;
     const name=info.propertyName||info.name||h.propertyName||h.name||"Hotel";
     const rating=Number(info.rating||info.starRating||h.rating||h.starRating||0)||0;
     const address=(h.location&&h.location.address)||info.address||h.address||"";
     const images=h.images||h.Images||info.images||[];
     let image="";
     if(images[0]) image=images[0].url||images[0].URL||images[0].value||images[0];
     image=image||h.imageURL||h.imageUrl||"";
     const rates=h.rates||h.Rates||h.rateOptions||[];
     rates.forEach(rate=>{
       const pricing=rate.pricing||rate.Pricing||{};
       const total=pricing.total||rate.total||rate.Total||rate.price||rate.Price||{};
       const offer=typeof total==="object"?Number(total.value||total.Value||0):Number(total||0);
       const currency=typeof total==="object"?(total.currencyCode||total.CurrencyCode||"INR"):"INR";
       const room=(rate.roomType&&rate.roomType.name)||rate.roomName||(rate.room&&rate.room.name)||"Room";
       const rules=rate.rateRules||rate.RateRules||{};
       const cp=rules.cancelPolicy||rules.CancelPolicy;
       const cancel=typeof cp==="object"?(cp.description||cp.Description||"Cancellation policy available"):cp;
       const promo=(rate.promotion&&rate.promotion.description)||(rate.promotion&&rate.promotion.name)||(rate.ratePlan&&rate.ratePlan.name)||"";
       const breakfast=rate.breakfastIncluded||(rate.mealPlan&&rate.mealPlan.name)||"";
       const base=Number((pricing.base&&pricing.base.value)||pricing.base||rate.base||0)||0;
       const tax=Number((pricing.totalTaxes&&pricing.totalTaxes.value)||pricing.totalTaxes||rate.totalTaxes||0)||0;
       const fees=Number((pricing.totalFees&&pricing.totalFees.value)||pricing.totalFees||rate.totalFees||0)||0;
       const original=Number((rate.originalPrice&&rate.originalPrice.value)||rate.originalPrice||(rate.rackRate&&rate.rackRate.value)||rate.rackRate||0)||0;
       const discount=original>offer&&offer>0?Math.round((1-offer/original)*100):0;
       rows.push({name,rating,address,image,room,value:offer,currency,base,tax,fees,original,discount,cancel,promo,breakfast,rateKey:rate.rateKey||rate.RateKey});
     });
   });
   return rows.filter(x=>x.value>0).sort((a,b)=>a.value-b.value).slice(0,40);
 },[live.data]);

 const formatRate=x=>(x.currency==="INR"?"₹":x.currency+" ")+Number(x.value||0).toLocaleString("en-IN");
 const pointPanel=x=>{
   const best=cardDirect.slice().sort((a,b)=>b.value-a.value)[0];
   return <div className="hotelPointPanel"><div><span className="pointEyebrow">POINTPILOT</span><strong>Pay cash vs use points</strong><small>{best?"Using "+best.card+" saves up to ₹"+Math.round(best.value).toLocaleString("en-IN")+" at ₹"+best.effective.toFixed(2)+"/point.":"No verified direct hotel redemption is loaded for this wallet."}</small></div><div className="pointDecision">{best?<><b>₹{Math.round(best.value).toLocaleString("en-IN")} saved</b><span>{best.pointsUsed.toLocaleString("en-IN")} pts • ₹{best.effective.toFixed(2)}/pt • ₹{Math.round(best.remaining).toLocaleString("en-IN")} cash left</span></>:<b>Cash route shown</b>}<span>Live hotel cash price: {formatRate(x)}</span></div></div>;
 };

 return <section className="toolCard"><div className="toolIntro"><div><span className="pill cyan">LIVE HOTEL INVENTORY</span><h3>Hotels that look like real booking results.</h3><p>Live cash rates from Travelport Stays, with room, offer, taxes, cancellation and a PointPilot cash-vs-points panel. Award availability is never inferred from cash inventory.</p></div></div>
 <form className="searchGrid hotelSearchGrid" onSubmit={runHotel}><label>City / airport<input value={form.city} maxLength="3" onChange={e=>setForm({...form,city:e.target.value.toUpperCase()})}/><small>IATA code, e.g. BOM</small></label><label>Check-in<input type="date" value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})}/></label><label>Check-out<input type="date" value={form.checkOut} onChange={e=>setForm({...form,checkOut:e.target.value})}/></label><label>Adults<input type="number" min="1" max="9" value={form.adults} onChange={e=>setForm({...form,adults:e.target.value})}/></label><label>Rooms<input type="number" min="1" max="9" value={form.rooms} onChange={e=>setForm({...form,rooms:e.target.value})}/></label><label>Hotel name (optional)<input value={form.hotel} onChange={e=>setForm({...form,hotel:e.target.value})} placeholder="Marriott / Hilton / etc."/></label><button className="btn primary searchBtn" disabled={live.status==="loading"}>{live.status==="loading"?"Searching hotels…":"Search live hotels →"}</button></form>
 {live.status==="not_configured"&&<div className="notice"><b>Live inventory connection:</b> Travelport Stays requires separate account provisioning. PointPilot will not pretend hotel inventory is live until the provider grants access.</div>}
 {live.status==="error"&&<div className="errorBox">{live.error}</div>}
 {live.status==="live"&&<div className="hotelResults"><div className="resultMeta"><b>{liveItems.length} live cash offers</b><span>Travelport Stays • fresh provider response</span></div>{liveItems.length?liveItems.map((x,i)=><article className="hotelCard" key={x.rateKey||i}><div className="hotelPhoto">{x.image?<img src={x.image} alt="" loading="lazy"/>:<div className="hotelPhotoFallback">🏨</div>}</div><div className="hotelMain"><div className="hotelTop"><div><h4>{x.name}</h4><div className="hotelMeta">{x.rating>0?<span>{"★".repeat(Math.min(5,Math.round(x.rating)))} {x.rating} star</span>:<span>Hotel</span>}{x.address&&<span> • {String(x.address)}</span>}</div></div>{x.discount>0&&<b className="discountBadge">{x.discount}% OFF</b>}</div><div className="hotelRoom"><strong>{x.room}</strong>{x.promo&&<span className="promoBadge">{String(x.promo)}</span>}{x.breakfast&&<span>🥐 {String(x.breakfast)}</span>}</div><div className="hotelTerms">{x.cancel?<span>✓ {String(x.cancel)}</span>:<span>Cancellation policy available</span>}{x.base>0&&<span>Base {formatRate({...x,value:x.base})}</span>}{x.tax>0&&<span>Taxes {formatRate({...x,value:x.tax})}</span>}{x.fees>0&&<span>Fees {formatRate({...x,value:x.fees})}</span>}</div></div><div className="hotelPrice"><small>OFFER PRICE</small>{x.original>x.value&&<del>{formatRate({...x,value:x.original})}</del>}<strong>{formatRate(x)}</strong><span>Taxes & fees shown in the rate breakdown</span><b>Pay cash →</b></div><div className="hotelPointWrap">{pointPanel(x)}</div></article>):<div className="notice">Travelport returned a successful response but no displayable hotel rates.</div>}</div>}
 <div className="plannerDivider"><span>REWARDS PLANNER</span></div>
 <div className="plannerHeader"><div><h4>Hotel award calculator</h4><p>Use the actual award points shown by Marriott or Hilton. PointPilot calculates the Membership Rewards required using the verified transfer route.</p></div><div className="miniStat"><small>AMEX MR AVAILABLE</small><strong>{amex?Number(amex.points).toLocaleString("en-IN"):"—"}</strong></div></div>
 <div className="searchGrid hotelGrid"><label>Hotel programme<select value={programme} onChange={e=>setProgramme(e.target.value)}><option>Marriott Bonvoy</option><option>Hilton Honors</option></select></label><label>Stay price (₹)<input type="number" min="0" value={form.cash} onChange={e=>setForm({...form,cash:e.target.value})}/></label><label>Taxes & fees (₹)<input type="number" min="0" value={form.taxes} onChange={e=>setForm({...form,taxes:e.target.value})}/></label><label>Award points required<input type="number" min="0" value={form.awardPoints} onChange={e=>setForm({...form,awardPoints:e.target.value})}/></label><label>Nights<input type="number" min="1" value={form.nights} onChange={e=>setForm({...form,nights:e.target.value})}/></label></div>
 <div className="hotelPlanner"><div className="hotelHero"><small>NET HOTEL VALUE</small><strong>₹{Math.round(net).toLocaleString("en-IN")}</strong><span>{form.nights} night{Number(form.nights)==1?"":"s"} • {programme}</span></div><div className="hotelOptions"><article><small>AMEX PLATINUM TRAVEL → {programme.toUpperCase()}</small><strong>{selected?requiredMR.toLocaleString("en-IN")+" MR points":"Route unavailable"}</strong><span>{selected?"Transfer "+formatTransferRatio(selected)+" • "+awardPoints.toLocaleString("en-IN")+" "+programme+" points":"No verified route loaded."}</span>{selected&&<em>{enough?"Your Amex balance covers the requested award points.":"Your current Amex balance does not cover the requested award points."}</em>}{selected&&<small className="transferRoutes">Your current balance can generate up to {maxHotelPoints.toLocaleString("en-IN")} {programme} points.</small>}</article>{cardDirect.map((r,i)=><article key={r.card+i}><small>{r.card.toUpperCase()} → DIRECT TRAVEL</small><strong>₹{Math.round(r.value).toLocaleString("en-IN")} value</strong><span>{r.pointsUsed.toLocaleString("en-IN")} points • ₹{r.effective.toFixed(2)}/point</span><em>₹{Math.round(r.remaining).toLocaleString("en-IN")} cash remaining</em></article>)}</div></div>
 <div className="notice">Cash inventory and cash rates never imply award availability. Future live award sources will be labelled with source, timestamp, award points, taxes/fees, transfer time and effective ₹/point.</div>
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

function CardDetails({wallet}){
 const [cards,setCards]=useState([]);
 useEffect(()=>{getSupabase().from("card_catalog").select("*").eq("active",true).order("issuer").order("card_name").then(({data})=>setCards(data||[]))},[]);
 const enriched=wallet.map(w=>{const c=cards.find(x=>cardMatchesCatalog(w.card_name,x));return{wallet:w,card:c}});
 return <section className="cardDetails"><div className="sectionHead"><div><h2>Your cards, fully mapped</h2><p>Benefits, earning, travel perks, fees and redemption rules • issuer-verified metadata</p></div></div><div className="cardDetailGrid">{enriched.map(({wallet:w,card:c})=><article className="cardDetail" key={w.id}><div className="cardTop"><div><small>{c?.issuer||"Card"}</small><h3>{w.card_name}</h3></div><span>{Number(w.points||0).toLocaleString("en-IN")} pts</span></div>{c?<><div className="detailChips"><b>{c.network||"—"}</b><b>{c.annual_fee==null?"Fee n/a":c.annual_fee===0?"Lifetime free":"₹"+Number(c.annual_fee).toLocaleString("en-IN")+" + GST"}</b><b>{c.forex_markup==null?"Forex n/a":c.forex_markup===0?"0% forex":c.forex_markup+"% forex"}</b></div><dl><div><dt>Base rewards</dt><dd>{c.base_reward}</dd></div><div><dt>Accelerated rewards</dt><dd>{c.accelerated_reward}</dd></div><div><dt>Lounge</dt><dd>{c.lounge_benefit}</dd></div><div><dt>Travel</dt><dd>{c.travel_benefit}</dd></div><div><dt>Milestones</dt><dd>{c.milestone_benefit}</dd></div><div><dt>Redemption</dt><dd>{c.redemption_summary}</dd></div></dl><details><summary>All key benefits</summary><ul>{(c.key_benefits||[]).map((b,i)=><li key={i}>{b}</li>)}</ul></details><a className="sourceLink" href={c.source_url} target="_blank" rel="noreferrer">View issuer source ↗</a><small className="verifiedLine">Verified {String(c.verified_at||"").slice(0,10)||"—"}</small></>:<div className="notice">Detailed catalogue data is being added for this card.</div>}</article>)}</div></section>
}

function CommandDeck({wallet,onPlanTrip,onValue,onWallet,onRoutes}){
 const total=wallet.reduce((sum,card)=>sum+Number(card.points||0),0);
 const hdfc=wallet.find(card=>String(card.card_name||"").toLowerCase().includes("diners black"));
 const icici=wallet.find(card=>String(card.card_name||"").toLowerCase().includes("times black"));
 const leaders=[...wallet].sort((a,b)=>Number(b.points||0)-Number(a.points||0)).slice(0,3);
 const smartBuy=Math.min(Number(hdfc?.points||0),75000);
 return <section className="atlas" aria-label="PointPilot reward atlas">
   <article className="atlasHero">
     <div className="atlasEyebrow"><span className="atlasMark">✦</span> POINTPILOT ATLAS <span className="atlasLive">LIVE WALLET</span></div>
     <h2>Your next best trip<br/><em>starts with what you own.</em></h2>
     <p>Make one clear decision at a time: choose a trip, check a verified route, then use points with confidence.</p>
     <div className="atlasActions"><button className="atlasPrimary" onClick={onPlanTrip}>Find a flight <span>↗</span></button><button className="atlasGhost" onClick={onValue}>Calculate a redemption</button></div>
     <div className="atlasFootnote"><span>●</span> Cash fares are live. Award seats are only shown when a live award source confirms them.</div>
   </article>
   <article className="atlasRoute">
     <div className="atlasSectionTop"><span>YOUR BEST START</span><b>01 / 03</b></div>
     <h3>{hdfc?"Unlock SmartBuy value":"Map your strongest route"}</h3>
     <p>{hdfc?<>You have <b>{smartBuy.toLocaleString("en-IN")} HDFC points</b> ready for SmartBuy this month—up to ₹{smartBuy.toLocaleString("en-IN")} in direct travel value, subject to the 70% booking limit.</>:<>Your wallet has <b>{wallet.length} cards</b>. Start by mapping a real trip against the routes you already hold.</>}</p>
     <div className="routePath"><div><i>01</i><span>Wallet</span><b>{total.toLocaleString("en-IN")} pts</b></div><strong>→</strong><div><i>02</i><span>Cash fare</span><b>Live check</b></div><strong>→</strong><div><i>03</i><span>Best route</span><b>Verified</b></div></div>
   </article>
   <article className="atlasSignals">
     <div className="atlasSectionTop"><span>TRANSFER SIGNALS</span><b>WATCHLIST</b></div>
     {icici&&<div className="signalLine"><div className="signalIcon">AI</div><div><b>Times Black → Air India</b><span>1:1 Maharaja Points · transfer only after confirming award space</span></div></div>}
     <div className="signalLine"><div className="signalIcon">₹</div><div><b>Every value is explainable</b><span>Caps, taxes, points consumed and source dates stay visible.</span></div></div>
   </article>
   <article className="atlasBalances">
     <div><span>FLEXIBILITY LEDGER</span><h3>Where your options live</h3></div>
     <div className="ledgerList">{leaders.map((card,index)=><div key={card.id||card.card_name}><i>0{index+1}</i><span>{card.card_name}</span><b>{Number(card.points||0).toLocaleString("en-IN")} <small>pts</small></b></div>)}</div>
   </article>
   <nav className="atlasNav" aria-label="Reward tools">
     <button onClick={onPlanTrip}><i>01</i><span>Trip intelligence</span><small>Compare a live fare</small></button>
     <button onClick={onRoutes}><i>02</i><span>Route intelligence</span><small>See verified value</small></button>
     <button onClick={onWallet}><i>03</i><span>Wallet ledger</span><small>Track every balance</small></button>
     <button onClick={onValue}><i>04</i><span>Value lab</span><small>Calculate ₹ / point</small></button>
   </nav>
 </section>}

export default function Dashboard(){
 const[wallet,setWallet]=useState([]),[user,setUser]=useState(null),[status,setStatus]=useState("loading"),[loadError,setLoadError]=useState(""),[tab,setTab]=useState("flights");
 const loadWallet=useCallback(async()=>{
   setStatus("loading"); setLoadError("");
   try{
     const supabase=getSupabase();
     // Read the magic-link session from local storage before asking Auth over the network.
     // The following wallet request still carries the JWT, so owner-only RLS remains enforced.
     const {data:{session},error:sessionError}=await within(supabase.auth.getSession(),12000,"The saved sign-in session took too long to respond.");
     if(sessionError) throw sessionError;
     if(!session?.user){location.replace("/login");return}
     setUser(session.user);
     const {data:w,error:walletError}=await within(supabase.from("wallet_cards").select("*").eq("user_id",session.user.id).order("created_at"),12000,"The wallet request timed out. Please try again.");
     if(walletError) throw walletError;
     setWallet(w||[]); setStatus("ready");
   }catch(error){
     console.error("Unable to load PointPilot wallet",error);
     setLoadError(error?.message||"PointPilot could not load your wallet.");
     setStatus("error");
   }
 },[]);
 useEffect(()=>{loadWallet()},[loadWallet]);
 const total=useMemo(()=>wallet.reduce((a,x)=>a+Number(x.points||0),0),[wallet]); const holderName=String(user?.user_metadata?.full_name||user?.user_metadata?.name||"").trim()||"Wallet holder"; const holderEmail=user?.email||"";
 if(status==="loading")return <main className="page"><div className="loader">Loading your wallet…</div></main>;
 if(status==="error")return <main className="page"><div className="loadFailure"><div className="eyebrow">WALLET CONNECTION</div><h1>Your sign-in worked.</h1><p>We couldn’t retrieve the wallet just yet. Your cards have not been changed.</p><div className="errorBox">{loadError}</div><button className="btn primary" onClick={loadWallet}>Try loading wallet again</button><button className="linkBtn" onClick={()=>getSupabase().auth.signOut().finally(()=>location.replace("/login"))}>Sign in again</button></div></main>;
 return <main className="page"><nav className="nav"><b>Point<span>Pilot</span></b><div className="navAccount"><div><strong>{holderName}</strong><small>{holderEmail}</small></div><button className="linkBtn" onClick={()=>getSupabase().auth.signOut().then(()=>location.href="/")}>Sign out</button></div></nav>
 <section className="dashHero atlasHeader"><div><div className="eyebrow">REWARDS INTELLIGENCE / INDIA</div><h1>Good evening, {holderName.split(" ")[0]||"there"}.</h1><p>Your rewards are ready to become something more useful than a number on a statement.</p></div><div className="total"><small>POINTS UNDER MANAGEMENT</small><strong>{total.toLocaleString("en-IN")}</strong><span>{wallet.length} cards · verified routes first</span></div></section>
 <CommandDeck wallet={wallet} onPlanTrip={()=>{setTab("flights");setTimeout(()=>document.querySelector(".toolArea")?.scrollIntoView({behavior:"smooth",block:"start"}),0)}} onValue={()=>{setTab("value");setTimeout(()=>document.querySelector(".toolArea")?.scrollIntoView({behavior:"smooth",block:"start"}),0)}} onWallet={()=>document.querySelector(".wallet")?.scrollIntoView({behavior:"smooth",block:"start"})} onRoutes={()=>document.querySelector(".bestUse")?.scrollIntoView({behavior:"smooth",block:"start"})}/>
 <SpendSmart wallet={wallet}/>
 <WalletSection wallet={wallet} setWallet={setWallet}/>
 <BestUseSection wallet={wallet}/>
 <CardDetails wallet={wallet}/>
 <section className="toolArea"><div className="toolTabs"><button className={tab==="flights"?"active":""} onClick={()=>setTab("flights")}>✈️ Flights</button><button className={tab==="value"?"active":""} onClick={()=>setTab("value")}>₹ Value Engine</button></div>{tab==="flights"?<FlightSearch/>:<ValueEngine/>}</section>
 <section className="featureGrid"><article className="feature"><div className="icon">🔄</div><h3>Reward routes next</h3><p>Verified transfer ratios, caps, timing, expiry and source dates will be layered onto live travel results.</p></article><article className="feature"><div className="icon">🧮</div><h3>Transparent value</h3><p>Every redemption will show net value, points consumed, taxes and effective ₹/point.</p></article><article className="feature"><div className="icon">🛡️</div><h3>No fake award availability</h3><p>Cash inventory is labelled live. Award availability will only be labelled confirmed when a live award source supports it.</p></article></section><footer>PointPilot production • Travel-provider credentials stay server-side. Flight search: Travelport. Hotels: intentionally deferred.</footer></main>
}