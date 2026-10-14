"use client";

import {useEffect,useRef,useState} from "react";
import {clearPointPilotSession,getSupabase} from "../../../lib/supabase-browser.js";
import {authStep} from "../../../lib/auth-timeout.js";

export default function AuthCallback(){
  const[message,setMessage]=useState("Securing your PointPilot account…");
  const[failed,setFailed]=useState(false);
  const attempt=useRef(null);

  useEffect(()=>{
    let active=true;
    if(!attempt.current)attempt.current=(async()=>{
      const params=new URLSearchParams(window.location.search);
      const authError=params.get("error_description")||params.get("error");
      if(authError)throw new Error(authError);
      const code=params.get("code");
      if(!code)throw new Error("This sign-in link is incomplete or has expired. Please request a new one.");

      const flowId=params.get("sb_flow_id");
      const supabase=getSupabase();
      const{error:exchangeError}=await authStep(()=>supabase.auth.exchangeCodeForSession(code,flowId?{flowId}:undefined),"Sign-in link verification");
      if(exchangeError)throw new Error("This link could not be verified. Request a fresh link and open it in the same browser that requested it.");
      const{data:{user},error:userError}=await authStep(()=>supabase.auth.getUser(),"Account verification");
      if(userError||!user)throw userError||new Error("Supabase could not verify this account.");

      const expected=String(window.localStorage.getItem("pointpilot_expected_email")||"").toLowerCase();
      const actual=String(user.email||"").toLowerCase();
      if(expected&&actual!==expected){
        throw new Error(`The link signed in ${actual||"a different account"}, not ${expected}. Please request a fresh link for ${expected}.`);
      }
      const expectedName=String(window.localStorage.getItem("pointpilot_expected_name")||"").trim();
      if(expectedName){
        const{error:nameError}=await authStep(()=>supabase.auth.updateUser({data:{full_name:expectedName}}),"Profile update");
        if(nameError)throw nameError;
      }
      return user;
    })();
    attempt.current.then(user=>{
      if(!active)return;
      window.localStorage.removeItem("pointpilot_expected_email");
      window.localStorage.removeItem("pointpilot_expected_name");
      window.localStorage.setItem("pointpilot_authenticated_user_id",user.id);
      window.location.replace("/dashboard");
    }).catch(error=>{
      if(!active)return;
      setFailed(true);
      setMessage(error?.message||"PointPilot could not complete this sign-in.");
      // Error recovery must not wait behind a stalled auth request or lock.
      void clearPointPilotSession().catch(()=>{});
    });
    return()=>{active=false};
  },[]);

  return <main className="page"><div className="loadFailure"><div className="eyebrow">SECURE SIGN-IN</div><h1>{failed?"We stopped this sign-in.":"Verifying your account"}</h1><p role={failed?"alert":"status"}>{message}</p>{failed&&<a className="btn primary" href="/login?switch=1">Request a new sign-in link</a>}</div></main>;
}
