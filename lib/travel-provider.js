const DUFFEL_BASE="https://api.duffel.com";

function headers(){
  return {
    Accept:"application/json",
    "Content-Type":"application/json",
    "Duffel-Version":"v2",
    Authorization:`Bearer ${process.env.DUFFEL_ACCESS_TOKEN||""}`
  };
}

export function duffelConfigured(){
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN);
}

async function request(path,body){
  if(!duffelConfigured()) return {status:503,data:{status:"not_configured",message:"Duffel access token is not configured."}};
  const r=await fetch(DUFFEL_BASE+path,{method:"POST",headers:headers(),body:JSON.stringify({data:body}),cache:"no-store"});
  const raw=await r.text(); let data; try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,1000)}}
  return {status:r.status,data};
}

export async function searchFlights({origin,destination,departureDate,returnDate,adults=1,cabin="ECONOMY"}){
  const slices=[{origin:origin.toUpperCase(),destination:destination.toUpperCase(),departure_date:departureDate}];
  if(returnDate)slices.push({origin:destination.toUpperCase(),destination:origin.toUpperCase(),departure_date:returnDate});
  return request("/air/offer_requests",{
    slices,
    passengers:Array.from({length:Number(adults)||1},()=>({type:"adult"})),
    cabin_class:cabin.toLowerCase()
  });
}

export async function searchHotels(){
  return {status:501,data:{status:"not_available",message:"Hotel live search is the next provider integration. Duffel Stays access requires separate provider approval."}};
}