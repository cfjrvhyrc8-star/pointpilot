import {NextResponse} from "next/server";
import {duffelConfigured,searchFlights,searchHotels} from "@/lib/travel-provider";

export async function GET(){
 return NextResponse.json({
  ok:true,
  provider:"Duffel",
  flightsConfigured:duffelConfigured(),
  hotelsStatus:"separate_access_required"
 });
}

export async function POST(req){
 try{
  const p=await req.json();
  if(p.mode==="flight"){
   if(!p.origin||!p.destination||!p.departureDate)
    return NextResponse.json({status:"error",message:"Origin, destination and departure date are required."},{status:400});
   if(!duffelConfigured())
    return NextResponse.json({status:"not_configured",message:"Add DUFFEL_ACCESS_TOKEN in Vercel Environment Variables to enable live flight search."},{status:503});
   const result=await searchFlights(p);
   if(result.status>=200&&result.status<300)
    return NextResponse.json({status:"live",provider:"Duffel",data:result.data});
   return NextResponse.json({
    status:"provider_error",
    provider:"Duffel",
    code:result.status,
    message:result.data?.errors?.[0]?.message||result.data?.message||"Duffel returned an error.",
    data:result.data
   },{status:502});
  }
  if(p.mode==="hotel"){
   const result=await searchHotels(p);
   return NextResponse.json(result.data,{status:result.status===501?501:result.status});
  }
  return NextResponse.json({status:"error",message:"Unknown search mode."},{status:400});
 }catch(e){
  return NextResponse.json({status:"error",message:e?.message||"Unexpected server error"},{status:500});
 }
}