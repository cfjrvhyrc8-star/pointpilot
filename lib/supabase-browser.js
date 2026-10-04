"use client";

import {createClient} from "@supabase/supabase-js";

let browserClient;

export function getSupabase(){
  if(!browserClient){
    browserClient=createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {auth:{flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}}
    );
  }
  return browserClient;
}

export async function clearPointPilotSession(){
  const supabase=getSupabase();
  await supabase.auth.signOut({scope:"local"}).catch(()=>{});
  if(typeof window!=="undefined"){
    const projectRef=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
    const prefix=`sb-${projectRef}-auth-token`;
    Object.keys(window.localStorage).filter(key=>key.startsWith(prefix)).forEach(key=>window.localStorage.removeItem(key));
  }
}
