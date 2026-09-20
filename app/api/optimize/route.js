import {NextResponse} from "next/server";
import {travelportConfigured,searchFlights,searchHotels} from "../../../lib/travel-provider.js";

export async function GET(){
  return NextResponse.json({
    ok:true,
    provider:"Travelport",
    flightsConfigured:travelportConfigured(),
    environment:"pre-production",
    hotelsStatus:"separate_stays_access_required"
  });
}

export async function POST(req){
  try{
    const p=await req.json();

    if(p.mode==="flight"){
      if(!p.origin||!p.destination||!p.departureDate)
        return NextResponse.json({status:"error",message:"Origin, destination and departure date are required."},{status:400});

      if(!travelportConfigured())
        return NextResponse.json({
          status:"not_configured",
          message:"Add the Travelport credentials in Vercel Environment Variables to enable live flight search."
        },{status:503});

      const result=await searchFlights(p);

      if(result.status>=200&&result.status<300)
        return NextResponse.json({status:"live",provider:"Travelport",data:result.data});

      const providerMessage=
        result.data?.error_description||
        result.data?.error||
        result.data?.errors?.[0]?.message||
        result.data?.errors?.[0]?.detail||
        result.data?.errors?.[0]?.error_description||
        result.data?.Error?.[0]?.Message||
        result.data?.Error?.[0]?.message||
        result.data?.Result?.Error?.[0]?.Message||
        result.data?.Result?.Error?.[0]?.message||
        result.data?.Result?.errors?.[0]?.message||
        result.data?.detail||
        result.data?.faultstring||
        result.data?.message||
        "Travelport returned an error.";

      return NextResponse.json({
        status:"provider_error",
        provider:"Travelport",
        code:result.status,
        message:String(providerMessage),
        data:result.data
      },{status:502});
    }

    if(p.mode==="hotel"){
      const result=await searchHotels(p);
      return NextResponse.json(result.data,{status:result.status});
    }

    return NextResponse.json({status:"error",message:"Unknown search mode."},{status:400});
  }catch(e){
    return NextResponse.json({
      status:"error",
      message:e?.message||"Unexpected server error"
    },{status:500});
  }
}
