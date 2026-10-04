"use client";

import {useEffect,useState} from "react";
import {clearPointPilotSession,getSupabase} from "../../../lib/supabase-browser.js";

export default function AuthCallback(){
  const[message,setMessage]=useState("Securing your PointPilot account…");

  useEffect(()=>{
    let active=true;
    (async()=>{
      const params=new URLSearchParams(window.location.search);
      const authError=params.get("error_description")||params.get("error");
      if(authError)throw new Error(authError);
      const code=params.get("code");
      if(!code)throw new Error("This sign-in link is incomplete or has expired. Please request a new one.");

      const flowId=params.get("sb_flow_id");
      const supabase=getSupabase();
      const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);
      if(exchangeError)throw exchangeError;
      const{data:{user},error:userError}=await supabase.auth.getUser();
      if(userError||!user)throw userError||new Error("Supabase could not verify this account.");

      const expected=String(window.localStorage.getItem("pointpilot_expected_email")||"").toLowerCase();
      const actual=String(user.email||"").toLowerCase();
      if(expected&&actual!==expected){
        await clearPointPilotSession();
        throw new Error(`The link signed in ${actual||"a different account"}, not ${expected}. Please request a fresh link for ${expected}.`);
      }
      const expectedName=String(window.localStorage.getItem("pointpilot_expected_name")||"").trim();
      if(expectedName){
        const{error:nameError}=await supabase.auth.updateUser({data:{full_name:expectedName}});
        if(nameError)throw nameError;
      }
      window.localStorage.removeItem("pointpilot_expected_email");
      window.localStorage.removeItem("pointpilot_expected_name");
      window.localStorage.setItem("pointpilot_authenticated_user_id",user.id);
      window.location.replace("/dashboard");
    })().catch(async error=>{
      await clearPointPilotSession();
      if(active)setMessage(error?.message||"PointPilot could not complete this sign-in.");
    });
    return()=>{active=false};
  },[]);

  return <main className="page"><div className="loadFailure"><div className="eyebrow">SECURE SIGN-IN</div><h1>{message.includes("Securing")?"Verifying your account":"We stopped this sign-in."}</h1><p>{message}</p>{!message.includes("Securing")&&<a className="btn primary" href="/login?switch=1">Request a new sign-in link</a>}</div></main>;
}
