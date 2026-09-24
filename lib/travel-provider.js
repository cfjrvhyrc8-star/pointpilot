const isProduction=()=>String(process.env.TRAVELPORT_ENV||"pre-production").toLowerCase()==="production";
const authEndpoint=()=>isProduction()?"https://auth.travelport.net/oauth/token":"https://auth.pp.travelport.net/oauth/token";
const airEndpoint=()=>isProduction()?"https://api.travelport.net/11/air":"https://api.pp.travelport.net/11/air";
const staysEndpoint=()=>isProduction()?"https://api.travelport.net/12/hotel":"https://api.pp.travelport.net/12/hotel";

let tokenCache={token:"",expiresAt:0};

async function fetchWithTimeout(url,options,timeoutMs=Number(process.env.TRAVELPORT_TIMEOUT_MS||25000),attempts=2){
  let lastError;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      clearTimeout(timer);
      if(attempt<attempts&&(response.status===429||response.status>=500)){await new Promise(resolve=>setTimeout(resolve,250*attempt));continue;}
      return response;
    }catch(error){
      clearTimeout(timer);lastError=error;
      if(attempt<attempts){await new Promise(resolve=>setTimeout(resolve,250*attempt));continue;}
    }
  }
  throw lastError;
}

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
export function travelportEnvironment(){return isProduction()?"production":"pre-production";}

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

  const r=await fetchWithTimeout(authEndpoint(),{
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
  const r=await fetchWithTimeout(airEndpoint()+path,{
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
      SearchCriteriaFlight:flights,
      SearchModifiersAir:{
        "@type":"SearchModifiersAir",
        CabinPreference:[{
          "@type":"CabinPreference",
          preferenceType:"Permitted",
          cabins:[
            cabin==="PREMIUM_ECONOMY"?"PremiumEconomy":
            cabin==="BUSINESS"?"Business":
            cabin==="FIRST"?"First":"Economy"
          ]
        }]
      }
    }
  });
}

let staysTokenCache={token:"",expiresAt:0};

function staysConfigured(){
  return Boolean(
    process.env.TRAVELPORT_CLIENT_ID &&
    process.env.TRAVELPORT_CLIENT_SECRET &&
    (process.env.TRAVELPORT_STAYS_ACCESSGROUP || process.env.TRAVELPORT_PCC)
  );
}

async function getStaysToken(){
  if(!staysConfigured()){
    return {ok:false,status:503,data:{message:"Travelport Stays access is not configured."}};
  }
  if(staysTokenCache.token && Date.now() < staysTokenCache.expiresAt){
    return {ok:true,token:staysTokenCache.token};
  }

  const body=new URLSearchParams({
    grant_type:"client_credentials",
    client_id:process.env.TRAVELPORT_CLIENT_ID,
    client_secret:process.env.TRAVELPORT_CLIENT_SECRET
  });

  const r=await fetchWithTimeout(authEndpoint(),{
    method:"POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      Accept:"application/json"
    },
    body,
    cache:"no-store"
  });
  const raw=await r.text();
  let data; try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,1200)}}
  if(!r.ok) return {ok:false,status:r.status,data};

  staysTokenCache={
    token:data.access_token,
    expiresAt:Date.now()+Math.max(60,Number(data.expires_in||86400)-300)*1000
  };
  return {ok:true,token:data.access_token};
}

async function requestStays(body){
  const auth=await getStaysToken();
  if(!auth.ok) return {status:auth.status,data:auth.data};

  const headers={
    Accept:"application/json",
    "Content-Type":"application/json",
    "Cache-Control":"no-cache",
    "TVP-Trace-Id":"pointpilot-"+crypto.randomUUID(),
    "TVP-Cache-Control":"no-cache",
    "TVP-Enable-Error-Details":"true",
    Authorization:"Bearer "+auth.token
  };

  headers["XAUTH_TRAVELPORT_ACCESSGROUP"]=
    process.env.TRAVELPORT_STAYS_ACCESSGROUP||process.env.TRAVELPORT_PCC;

  const r=await fetchWithTimeout(staysEndpoint()+"/search/searchcomplete/",{
    method:"POST",
    headers,
    body:JSON.stringify(body),
    cache:"no-store"
  });
  const raw=await r.text();
  let data; try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,3000)}}
  return {
    status:r.status,
    data,
    trackingId:r.headers.get("tvp-trace-id")||r.headers.get("traceId")||""
  };
}

export function travelportStaysConfigured(){ return staysConfigured(); }

export async function searchHotels({
  checkInDate,
  checkOutDate,
  adults=2,
  children=0,
  rooms=1,
  cityCode="",
  propertyName="",
  currency="INR"
}){
  if(!checkInDate||!checkOutDate||!cityCode){
    return {status:400,data:{status:"error",message:"City/airport, check-in and check-out are required."}};
  }

  const adultCount=Math.max(1,Math.min(9,Number(adults)||2));
  const roomCount=Math.max(1,Math.min(9,Number(rooms)||1));
  const childCount=Math.max(0,Math.min(8,Number(children)||0));
  const code=String(cityCode).trim().toUpperCase();

  const body={
    stayDetails:{
      checkInDateLocal:checkInDate,
      checkOutDateLocal:checkOutDate,
      guests:{
        numberOfAdults:adultCount,
        numberOfChildren:childCount
      },
      rooms:roomCount
    },
    propertyFilter:{
      location:{
        type:"airportIATACode",
        details:{iataCode:code},
        radius:{value:25,unit:"mi"}
      },
      returnOnlyAvailableProperties:true,
      returnRateSummaryInfo:true,
      imageSize:"LARGE",
      returnAllImageURLs:true,
      ...(propertyName.trim()?{hotelNameContains:propertyName.trim()}: {})
    },
    requestedCurrency:currency
  };

  return requestStays(body);
}
