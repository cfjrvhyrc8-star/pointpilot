const TRAVELPORT_AUTH="https://auth.pp.travelport.net/oauth/token";
const TRAVELPORT_AIR="https://api.pp.travelport.net/11/air";

let tokenCache={token:"",expiresAt:0};

function configured(){
  return Boolean(
    process.env.TRAVELPORT_USERNAME &&
    process.env.TRAVELPORT_PASSWORD &&
    process.env.TRAVELPORT_CLIENT_ID &&
    process.env.TRAVELPORT_CLIENT_SECRET &&
    process.env.TRAVELPORT_PCC
  );
}

export function travelportConfigured(){ return configured(); }

async function getToken(){
  if(!configured()) return {ok:false,status:503,data:{message:"Travelport credentials are not configured."}};
  if(tokenCache.token && Date.now() < tokenCache.expiresAt) return {ok:true,token:tokenCache.token};

  // Travelport trial credentials use username + password + client credentials.
  // Travelport's current authentication documentation explicitly lists all four
  // fields for trial users and the Flights DevKit OAuth request.
  const body=new URLSearchParams({
    grant_type:"password",
    username:process.env.TRAVELPORT_USERNAME,
    password:process.env.TRAVELPORT_PASSWORD,
    client_id:process.env.TRAVELPORT_CLIENT_ID,
    client_secret:process.env.TRAVELPORT_CLIENT_SECRET,
    scope:"openid"
  });

  const r=await fetch(TRAVELPORT_AUTH,{
    method:"POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      Accept:"application/json"
    },
    body,
    cache:"no-store"
  });
  const raw=await r.text();
  let data; try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,1000)}}
  if(!r.ok) return {ok:false,status:r.status,data};

  tokenCache={
    token:data.access_token,
    expiresAt:Date.now()+Math.max(60,Number(data.expires_in||86400)-300)*1000
  };
  return {ok:true,token:data.access_token};
}

async function requestAir(path,body){
  const auth=await getToken();
  if(!auth.ok) return {status:auth.status,data:auth.data};
  const r=await fetch(TRAVELPORT_AIR+path,{
    method:"POST",
    headers:{
      Accept:"application/json",
      "Accept-Encoding":"gzip, deflate",
      "Content-Type":"application/json",
      "Cache-Control":"no-cache",
      "Accept-Version":"11",
      "Content-Version":"11",
      Authorization:"Bearer "+auth.token,
      "TVP-PCC-Core":process.env.TRAVELPORT_PCC,
      TraceId:"pointpilot-"+crypto.randomUUID()
    },
    body:JSON.stringify(body),
    cache:"no-store"
  });
  const raw=await r.text();
  let data; try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,2000)}}
  return {
    status:r.status,
    data,
    trackingId:r.headers.get("e2etrackingid")||r.headers.get("transactionid")||""
  };
}

export async function searchFlights({
  origin,destination,departureDate,returnDate,adults=1,cabin="ECONOMY"
}){
  const passengerCount=Math.max(1,Math.min(9,Number(adults)||1));
  const flights=[
    {
      "@type":"SearchCriteriaFlight",
      departureDate,
      From:{value:origin.toUpperCase()},
      To:{value:destination.toUpperCase()}
    }
  ];
  if(returnDate){
    flights.push({
      "@type":"SearchCriteriaFlight",
      departureDate:returnDate,
      From:{value:destination.toUpperCase()},
      To:{value:origin.toUpperCase()}
    });
  }

  return requestAir("/catalog/search/catalogproductofferings",{
    "@type":"CatalogProductOfferingsQueryRequest",
    CatalogProductOfferingsRequest:{
      "@type":"CatalogProductOfferingsRequestAir",
      maxNumberOfUpsellsToReturn:2,
      offersPerPage:15,
      contentSourceList:["GDS"],
      PassengerCriteria:[{
        "@type":"PassengerCriteria",
        number:passengerCount,
        passengerTypeCode:"ADT"
      }],
      SearchCriteriaFlight:flights
    }
  });
}

export async function searchHotels(){
  return {
    status:501,
    data:{
      status:"not_available",
      message:"Travelport Stays access is a separate provisioning step. Flight search is ready first."
    }
  };
}
