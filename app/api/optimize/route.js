import {NextResponse} from "next/server";
import {travelportConfigured,travelportStaysConfigured,searchFlights,searchHotels} from "../../../lib/travel-provider.js";

function providerMessage(result){
 return result.data?.error_description||result.data?.error||result.data?.errors?.[0]?.message||result.data?.errors?.[0]?.detail||result.data?.Error?.[0]?.Message||result.data?.Result?.Error?.[0]?.Message||result.data?.detail||result.data?.faultstring||result.data?.message||(result.data?JSON.stringify(result.data).slice(0,900):"")||"Travelport returned an error.";
}
export async function GET(){
 return NextResponse.json({ok:true,provider:"Travelport",flightsConfigured:travelportConfigured(),hotelsConfigured:travelportStaysConfigured(),environment:"pre-production"});
}
export async function POST(req){
 try{
  const p=await req.json();
  if(p.mode==="flight"){
   if(!p.origin||!p.destination||!p.departureDate)return NextResponse.json({status:"error",message:"Origin, destination and departure date are required."},{status:400});
   if(!travelportConfigured())return NextResponse.json({status:"not_configured",message:"Add the Travelport credentials in Vercel Environment Variables to enable live flight search."},{status:503});
   const result=await searchFlights(p);
   if(result.status>=200&&result.status<300)return NextResponse.json({status:"live",provider:"Travelport",data:result.data,trackingId:result.trackingId||""});
   return NextResponse.json({status:"provider_error",provider:"Travelport",code:result.status,message:String(providerMessage(result)),trackingId:result.trackingId||"",data:result.data},{status:502});
  }
  if(p.mode==="hotel"){
   const result=await searchHotels(p);
   if(result.status>=200&&result.status<300)return NextResponse.json({status:"live",provider:"Travelport Stays",data:result.data,trackingId:result.trackingId||""});
   return NextResponse.json({status:result.data?.status||"provider_error",provider:"Travelport Stays",code:result.status,message:String(providerMessage(result)),trackingId:result.trackingId||"",data:result.data},{status:result.status===503?503:502});
  }
  return NextResponse.json({status:"error",message:"Unknown search mode."},{status:400});
 }catch(e){return NextResponse.json({status:"error",message:e?.message||"Unexpected server error"},{status:500})}
}
